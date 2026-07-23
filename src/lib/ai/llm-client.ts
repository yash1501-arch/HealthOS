import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { z } from "zod"

import { logAIInteraction } from "@/lib/ai/audit-logger"
import { stripPHI } from "@/lib/ai/phii-filter"
import { getSystemPrompt, type AIRole } from "@/lib/ai/prompts"
import { checkRateLimit, type AIInteractionType } from "@/lib/ai/rate-limiter"
import { validateAIOutput } from "@/lib/ai/safety-engine"

const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRIES = 2
const MEDICAL_TEMPERATURE = 0.3
const LIFESTYLE_TEMPERATURE = 0.7

/** Approximate USD cost per 1M tokens (input / output). */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "claude-3.5-sonnet": { input: 3, output: 15 },
}

export type AIContentCategory = "medical" | "lifestyle"

export interface LLMCallOptions {
  userId: string
  role: AIRole
  userMessage: string
  interactionType?: AIInteractionType
  contentCategory?: AIContentCategory
  maxTokens?: number
  skipRateLimit?: boolean
  skipAuditLog?: boolean
  inputContext?: string
}

export interface LLMTokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface LLMCallResult<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T
  rawContent: string
  model: string
  provider: "openai" | "anthropic"
  usage: LLMTokenUsage
  costUsd: number
  latencyMs: number
  safetyWarnings: string[]
  emergencyDetected: boolean
}

const llmJsonSchema = z.record(z.string(), z.unknown())

/**
 * Maps AI roles to rate-limit interaction types.
 */
function roleToInteractionType(role: AIRole): AIInteractionType {
  const map: Record<AIRole, AIInteractionType> = {
    RECOMMENDATION_ENGINE: "recommendation",
    DIET_PLANNER: "diet",
    EXERCISE_PLANNER: "exercise",
    ROUTINE_PLANNER: "routine",
    REPORT_ANALYZER: "report",
    CHECKIN_ANALYST: "checkin",
    TIMELINE_QUERY: "timeline",
    SAFETY_REVIEWER: "safety",
  }
  return map[role]
}

/**
 * Computes estimated API cost from token usage.
 */
function estimateCost(model: string, usage: LLMTokenUsage): number {
  const pricing =
    MODEL_PRICING[model] ??
    (model.includes("claude") ? MODEL_PRICING["claude-3.5-sonnet"] : MODEL_PRICING["gpt-4o"])

  const inputCost = (usage.promptTokens / 1_000_000) * pricing.input
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.output
  return Number((inputCost + outputCost).toFixed(6))
}

/**
 * Parses JSON content from an LLM response string.
 */
function parseJsonResponse(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  try {
    return llmJsonSchema.parse(JSON.parse(trimmed))
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error("LLM response did not contain valid JSON")
    }
    return llmJsonSchema.parse(JSON.parse(match[0]))
  }
}

/**
 * Executes an async function with timeout and retries.
 */
async function withTimeoutAndRetries<T>(
  operation: (attempt: number) => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      const result = await Promise.race([
        operation(attempt),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`))
          })
        }),
      ])

      clearTimeout(timer)
      return result
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed after retries`)
}

/**
 * Unified LLM client with OpenAI primary, Anthropic fallback, safety, and audit logging.
 */
export class LLMClient {
  private openai: OpenAI | null
  private anthropic: Anthropic | null
  private primaryModel: string
  private fallbackModel: string

  constructor() {
    this.primaryModel = process.env.AI_PRIMARY_MODEL ?? "gpt-4o"
    this.fallbackModel = process.env.AI_FALLBACK_MODEL ?? "claude-3-5-sonnet-20241022"

    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS })
      : null

    this.anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: REQUEST_TIMEOUT_MS })
      : null
  }

  /**
   * Sends a structured JSON request to the configured LLM providers.
   */
  async generate<T extends Record<string, unknown> = Record<string, unknown>>(
    options: LLMCallOptions
  ): Promise<LLMCallResult<T>> {
    return this.complete(options)
  }

  /**
   * Sends a structured JSON request to the configured LLM providers.
   */
  async complete<T extends Record<string, unknown> = Record<string, unknown>>(
    options: LLMCallOptions
  ): Promise<LLMCallResult<T>> {
    const startedAt = Date.now()
    const interactionType = options.interactionType ?? roleToInteractionType(options.role)
    const contentCategory = options.contentCategory ?? "medical"
    const temperature =
      contentCategory === "lifestyle" ? LIFESTYLE_TEMPERATURE : MEDICAL_TEMPERATURE

    const sanitizedInput = stripPHI(options.userMessage)
    const systemPrompt = getSystemPrompt(options.role)

    if (!options.skipRateLimit) {
      const rate = await checkRateLimit(options.userId, interactionType)
      if (!rate.allowed) {
        throw new Error(
          `AI rate limit exceeded. Resets at ${rate.resetAt.toISOString()} (${rate.remaining} remaining)`
        )
      }
    }

    if (!this.openai && !this.anthropic) {
      throw new Error("No LLM API keys configured (OPENAI_API_KEY or ANTHROPIC_API_KEY required)")
    }

    let providerResult: {
      rawContent: string
      model: string
      provider: "openai" | "anthropic"
      usage: LLMTokenUsage
    }

    try {
      providerResult = await this.callWithFallback({
        systemPrompt,
        userMessage: sanitizedInput,
        temperature,
        maxTokens: options.maxTokens ?? 2048,
      })
    } catch (error) {
      console.error("LLM call failed:", error)
      throw error instanceof Error ? error : new Error("LLM call failed")
    }

    let parsed: Record<string, unknown>
    try {
      parsed = parseJsonResponse(providerResult.rawContent)
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to parse LLM JSON response"
      )
    }

    const serializedOutput = JSON.stringify(parsed)
    const safety = validateAIOutput(serializedOutput, options.role, options.inputContext ?? sanitizedInput)

    let finalData = parsed
    if (safety.emergencyDetected) {
      finalData = {
        ...parsed,
        emergency: true,
        message: safety.sanitizedOutput,
        disclaimer:
          "This platform cannot provide emergency care. Seek immediate medical attention.",
      }
    } else if (safety.warnings.length > 0) {
      try {
        finalData = parseJsonResponse(safety.sanitizedOutput)
      } catch {
        finalData = { ...parsed, sanitizedText: safety.sanitizedOutput }
      }
    }

    const latencyMs = Date.now() - startedAt
    const costUsd = estimateCost(providerResult.model, providerResult.usage)

    if (!options.skipAuditLog) {
      try {
        await logAIInteraction({
          userId: options.userId,
          interactionType,
          model: providerResult.model,
          tokensUsed: providerResult.usage.totalTokens,
          costUsd,
          safetyFlags: safety.warnings,
          input: sanitizedInput,
          output: serializedOutput,
          latencyMs,
          provider: providerResult.provider,
        })
      } catch (auditError) {
        console.error("AI audit logging failed:", auditError)
      }
    }

    return {
      data: finalData as T,
      rawContent: providerResult.rawContent,
      model: providerResult.model,
      provider: providerResult.provider,
      usage: providerResult.usage,
      costUsd,
      latencyMs,
      safetyWarnings: safety.warnings,
      emergencyDetected: safety.emergencyDetected,
    }
  }

  /**
   * Attempts OpenAI first, then falls back to Anthropic on failure.
   */
  private async callWithFallback(params: {
    systemPrompt: string
    userMessage: string
    temperature: number
    maxTokens: number
  }): Promise<{
    rawContent: string
    model: string
    provider: "openai" | "anthropic"
    usage: LLMTokenUsage
  }> {
    if (this.openai) {
      try {
        return await withTimeoutAndRetries(
          () => this.callOpenAI(params),
          "OpenAI request"
        )
      } catch (openAiError) {
        console.warn("OpenAI failed, attempting Anthropic fallback:", openAiError)
        if (!this.anthropic) throw openAiError
      }
    }

    if (!this.anthropic) {
      throw new Error("Anthropic fallback unavailable — ANTHROPIC_API_KEY not set")
    }

    return withTimeoutAndRetries(
      () => this.callAnthropic(params),
      "Anthropic request"
    )
  }

  /**
   * Calls OpenAI chat completions with JSON object response format.
   */
  private async callOpenAI(params: {
    systemPrompt: string
    userMessage: string
    temperature: number
    maxTokens: number
  }): Promise<{
    rawContent: string
    model: string
    provider: "openai"
    usage: LLMTokenUsage
  }> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized")
    }

    const response = await this.openai.chat.completions.create({
      model: this.primaryModel,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userMessage },
      ],
    })

    const rawContent = response.choices[0]?.message?.content
    if (!rawContent) {
      throw new Error("OpenAI returned an empty response")
    }

    const usage: LLMTokenUsage = {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    }

    return {
      rawContent,
      model: response.model ?? this.primaryModel,
      provider: "openai",
      usage,
    }
  }

  /**
   * Calls Anthropic messages API and expects JSON in the response.
   */
  private async callAnthropic(params: {
    systemPrompt: string
    userMessage: string
    temperature: number
    maxTokens: number
  }): Promise<{
    rawContent: string
    model: string
    provider: "anthropic"
    usage: LLMTokenUsage
  }> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized")
    }

    const model = this.fallbackModel.includes("claude")
      ? this.fallbackModel
      : "claude-3-5-sonnet-20241022"

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: `${params.systemPrompt}\n\nRespond with valid JSON only.`,
      messages: [{ role: "user", content: params.userMessage }],
    })

    const textBlock = response.content.find((block) => block.type === "text")
    const rawContent = textBlock && "text" in textBlock ? textBlock.text : ""
    if (!rawContent) {
      throw new Error("Anthropic returned an empty response")
    }

    const usage: LLMTokenUsage = {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    }

    return {
      rawContent,
      model: response.model,
      provider: "anthropic",
      usage,
    }
  }
}

/** Singleton LLM client instance for application-wide use. */
export const llmClient = new LLMClient()
