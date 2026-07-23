import { prisma } from "@/lib/prisma"

const INPUT_OUTPUT_MAX_LENGTH = 200

export interface AIInteractionLogInput {
  userId: string
  interactionType: string
  model: string
  tokensUsed: number
  costUsd: number
  safetyFlags: string[]
  input: string
  output: string
  latencyMs?: number
  provider?: string
}

export interface AIInteractionLogResult {
  id: string
  loggedAt: Date
}

/**
 * Truncates text to a maximum length for audit storage.
 */
function truncateForAudit(text: string, maxLength = INPUT_OUTPUT_MAX_LENGTH): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

/**
 * Writes an AI interaction record to the AiAuditLog table.
 */
export async function logAIInteraction(
  input: AIInteractionLogInput
): Promise<AIInteractionLogResult> {
  try {
    const actionPayload = JSON.stringify({
      costUsd: input.costUsd,
      safetyFlags: input.safetyFlags,
      provider: input.provider ?? null,
    })

    const record = await prisma.aiAuditLog.create({
      data: {
        userId: input.userId,
        module: input.interactionType,
        action: actionPayload,
        prompt: truncateForAudit(input.input),
        response: truncateForAudit(input.output),
        tokensUsed: input.tokensUsed,
        model: input.model,
        latencyMs: input.latencyMs ?? null,
      },
    })

    return {
      id: record.id,
      loggedAt: record.createdAt,
    }
  } catch (error) {
    console.error("Failed to log AI interaction:", error)
    throw new Error(
      error instanceof Error ? error.message : "Failed to write AI audit log"
    )
  }
}
