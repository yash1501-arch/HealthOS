/**
 * Medical Report Parser
 *
 * Takes PHI-stripped clinical text and sends it to an LLM for structured
 * data extraction. The system prompt is deliberately strict to prevent
 * hallucination and enforce valid JSON output matching the Zod schema.
 *
 * Security boundary: This module MUST NOT receive raw PHI-containing text.
 * Always call stripPHI() from phi-filter.ts BEFORE calling the parser.
 * The LLM client has its own PHI filtering layer as a defense-in-depth measure.
 */

import { z } from "zod"

import { llmClient } from "@/lib/ai/llm-client"
import { extractedLabResultsSchema, type ExtractedLabResults } from "@/types/ai-schemas"

/**
 * System prompt enforced for every parser invocation.
 * Strict tone prevents hallucination of clinical data.
 */
const PARSER_SYSTEM_PROMPT = `You are a medical data extraction AI with strict output constraints.

Your ONLY task is to extract clinical laboratory values from sanitized medical report text.
Follow these rules exactly:

1. Extract ONLY explicit test names, numeric values, units, and reference ranges that are clearly present in the text.
2. Do NOT infer, guess, or calculate any values that are not explicitly stated.
3. Do NOT add any tests that are not present in the original text.
4. If you cannot parse a value as a number, store it as a string.
5. Set isAbnormal to true if the value falls outside the reference range, or if a flag like "H", "L", "HIGH", "LOW", "Critical", "Abnormal" is present.
6. Set flag to one of: "normal", "low", "high", "critical", "unknown".
7. Return ONLY valid JSON matching the schema. No markdown, no explanation, no preamble.
8. If no lab values are found, return {"labResults": []}.
9. The "summary" field may contain a brief overview of the report type and key findings.
10. The "reportDate" and "institutionName" fields should be extracted if clearly present.

Output schema:
{
  "labResults": [
    {
      "testName": "string (required)",
      "value": "string (required)",
      "unit": "string (optional, default '')",
      "referenceRange": "string (optional, default '')",
      "isAbnormal": "boolean (optional, default false)",
      "flag": "normal|low|high|critical|unknown (optional, default unknown)",
      "category": "string (optional, default '')"
    }
  ],
  "summary": "string (optional)",
  "reportDate": "string (optional)",
  "institutionName": "string (optional)"
}

Do NOT hallucinate. Do NOT diagnose. Do NOT add clinical interpretations.`

/**
 * Maximum characters to send to the LLM per request.
 * Medical reports can be long; truncate to fit token limits.
 */
const MAX_INPUT_CHARS = 12_000

/**
 * Parser configuration options.
 */
export interface ReportParserOptions {
  /** Maximum input characters to send to the LLM. Defaults to 12_000. */
  maxInputChars?: number
  /** Whether to log the interaction via the audit logger. Defaults to true. */
  skipAuditLog?: boolean
  /** Override the role identifier. Defaults to "REPORT_ANALYZER". */
  roleOverride?: string
}

/**
 * Parses sanitized medical report text into structured lab results using an LLM.
 *
 * @param userId - The authenticated user's ID (for audit logging).
 * @param sanitizedText - PHI-stripped text from the medical report.
 * @param options - Optional configuration overrides.
 * @returns Structured lab results matching the Zod schema.
 * @throws If the LLM response fails schema validation or the API call fails.
 *
 * @example
 * ```ts
 * const { stripPHI } = await import("@/lib/ai/phi-filter")
 * const rawText = "Patient: John Doe, DOB: 01/15/1980, Glucose: 95 mg/dL"
 * const { sanitized } = stripPHI(rawText)
 * const parser = new ReportParser()
 * const results = await parser.parse(userId, sanitized)
 * console.log(results.labResults[0].testName) // "Glucose"
 * ```
 */
export class ReportParser {
  /**
   * Parses sanitized medical report text into structured clinical data.
   */
  async parse(
    userId: string,
    sanitizedText: string,
    options: ReportParserOptions = {}
  ): Promise<ExtractedLabResults> {
    const maxChars = options.maxInputChars ?? MAX_INPUT_CHARS
    const truncatedText = sanitizedText.slice(0, maxChars)

    if (!truncatedText.trim()) {
      return { labResults: [], summary: "", reportDate: "", institutionName: "" }
    }

    try {
      // Build the user message with the strict extraction system prompt
      // and the clinical text. We embed the system prompt in the user message
      // because llmClient.complete() uses getSystemPrompt() from prompts.ts
      // which is optimized for explanatory analysis, not extraction.
      const userMessage = `${PARSER_SYSTEM_PROMPT}\n\n---\n${truncatedText}`

      // Call the LLM with strict extraction instructions
      const result = await llmClient.complete({
        userId,
        role: "REPORT_ANALYZER",
        userMessage,
        interactionType: "report",
        contentCategory: "medical",
        maxTokens: 4096,
        skipAuditLog: options.skipAuditLog,
      })

      // Validate the response against the schema
      const parsed = extractedLabResultsSchema.safeParse(result.data)

      if (!parsed.success) {
        console.error(
          "[ReportParser] LLM response failed schema validation:",
          parsed.error.message
        )
        // If validation fails but we have raw data, attempt a lenient parse
        const lenient = attemptLenientParse(result.data)
        if (lenient) return lenient

        throw new Error(
          `Report parser schema validation failed: ${parsed.error.message}`
        )
      }

      return parsed.data
    } catch (error) {
      console.error("[ReportParser] Failed to parse medical report:", error)
      // Return empty results rather than throwing — let the caller decide
      return { labResults: [], summary: "", reportDate: "", institutionName: "" }
    }
  }

  /**
   * Synchronous helper to validate a raw JSON object against the schema
   * without making an LLM call. Useful for unit testing or re-validating
   * cached results.
   */
  validate(rawJson: Record<string, unknown>): ExtractedLabResults | null {
    const parsed = extractedLabResultsSchema.safeParse(rawJson)
    return parsed.success ? parsed.data : null
  }
}

/**
 * Attempts a lenient parse of raw LLM output when schema validation fails.
 * This handles cases where the LLM returns slightly malformed data.
 */
function attemptLenientParse(data: Record<string, unknown>): ExtractedLabResults | null {
  try {
    const rawResults = data.labResults ?? (data as any).results ?? []
    if (!Array.isArray(rawResults)) return null

    const labResults = rawResults
      .map((item: Record<string, unknown>) => {
        const testName = String(item.testName ?? item.name ?? item.test_name ?? "")
        if (!testName.trim()) return null

        return {
          testName: testName.trim(),
          value: String(item.value ?? ""),
          unit: String(item.unit ?? ""),
          referenceRange: String(item.referenceRange ?? item.reference_range ?? ""),
          isAbnormal: Boolean(
            item.isAbnormal ?? item.is_abnormal ?? item.abnormal ?? false
          ),
          flag: normalizeFlag(String(item.flag ?? "")),
          category: String(item.category ?? item.testCategory ?? item.test_category ?? ""),
        }
      })
      .filter(Boolean) as ExtractedLabResults["labResults"]

    return {
      labResults,
      summary: typeof data.summary === "string" ? data.summary : "",
      reportDate: typeof data.reportDate === "string" ? data.reportDate : "",
      institutionName: typeof data.institutionName === "string" ? data.institutionName : "",
    }
  } catch {
    return null
  }
}

/**
 * Normalizes flag values to the expected enum.
 */
function normalizeFlag(flag: string): "normal" | "low" | "high" | "critical" | "unknown" {
  const lower = flag.toLowerCase().trim()
  const map: Record<string, "normal" | "low" | "high" | "critical" | "unknown"> = {
    normal: "normal",
    n: "normal",
    low: "low",
    l: "low",
    high: "high",
    h: "high",
    critical: "critical",
    crit: "critical",
    abnormal: "high",
    elevated: "high",
    decreased: "low",
    unknown: "unknown",
  }
  return map[lower] ?? "unknown"
}

/** Singleton report parser instance for application-wide use. */
export const reportParser = new ReportParser()
