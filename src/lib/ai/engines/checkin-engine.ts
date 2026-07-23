import { prisma } from "@/lib/prisma"
import { llmClient } from "@/lib/ai/llm-client"
import { sanitizeForLLM, stripPHI } from "@/lib/ai/phii-filter"
import { validateAIOutput, MEDICAL_DISCLAIMER } from "@/lib/ai/safety-engine"
import { z } from "zod"

// ─── Types ───────────────────────────────────────────────────────

export interface CheckInResponses {
  energyLevel: number
  sleepQuality: number
  stressLevel: number
  exerciseAdherence: number
  dietAdherence: number
  painLevels: Array<{ location: string; severity: number }>
  mood: number
  challenges: string
  wins: string
  questions: string
}

export interface CheckInSummaryOutput {
  weeklySummary: string
  progressAssessment: {
    overall: "improving" | "stable" | "needs_attention"
    areas: Array<{ category: string; status: string; note: string }>
  }
  adherenceAnalysis: {
    exercise: { adherence: number; comment: string }
    diet: { adherence: number; comment: string }
    sleep: { score: number; comment: string }
    stress: { score: number; comment: string }
  }
  adjustments: Array<{ category: string; current: string; suggested: string; reason: string }>
  nextWeekFocus: string[]
  encouragement: string
  concerns: string[]
  disclaimer: string
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

function toPlainJson(value: unknown): JsonValue {
  if (value === null || value === undefined) return null
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object" && typeof (value as Record<string, unknown>).toNumber === "function") {
    return Number((value as { toNumber: () => number }).toNumber())
  }
  if (Array.isArray(value)) {
    return value.map((item) => toPlainJson(item))
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, JsonValue> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toPlainJson(nested)
    }
    return result
  }
  return value as JsonValue
}

/**
 * AI-powered weekly check-in summary engine.
 *
 * Analyzes user-submitted responses, compares against previous weeks,
 * and generates personalized insights, adjustments, and encouragement.
 */
export class CheckInEngine {
  /**
   * Generates an AI summary for a weekly check-in.
   *
   * @param userId - The authenticated user.
   * @param weekNumber - The week number being checked in (used internally).
   * @param responses - User's weekly check-in responses.
   * @returns Structured AI analysis with progress, adherence, and next steps.
   */
  async generateSummary(
    userId: string,
    _weekNumber: number,
    responses: CheckInResponses
  ): Promise<CheckInSummaryOutput> {
    try {
      const [previousCheckins, dietPlan, exercisePlan, profile] = await Promise.all([
        prisma.weeklyCheckin.findMany({
          where: { userId },
          orderBy: { weekStart: "desc" },
          take: 4,
          skip: 1, // skip current week (not yet saved)
        }),
        prisma.dietPlan.findFirst({
          where: { userId, isActive: true },
          orderBy: { weekStart: "desc" },
        }),
        prisma.exercisePlan.findFirst({
          where: { userId, isActive: true },
          orderBy: { weekStart: "desc" },
        }),
        prisma.profile.findUnique({ where: { userId } }),
      ])

      const previousData = previousCheckins.map((c) => ({
        weekStart: c.weekStart.toISOString().slice(0, 10),
        energyLevel: c.energyLevel,
        sleepQuality: c.sleepQuality,
        mood: c.mood,
        sleepHours: c.sleepHours ? Number(c.sleepHours) : null,
        weightKg: c.weightKg ? Number(c.weightKg) : null,
        exerciseCompletion: c.exerciseCompletion,
        dietAdherence: c.dietAdherence,
        stressLevel: c.mood != null ? 10 - c.mood : null, // approximate inverse of mood
        painScores: c.painScores as Record<string, number> | null,
        notes: c.notes,
      }))

      const prompt = JSON.stringify(
        {
          currentWeek: {
            energy: responses.energyLevel,
            sleep: responses.sleepQuality,
            stress: responses.stressLevel,
            exerciseAdherence: responses.exerciseAdherence,
            dietAdherence: responses.dietAdherence,
            pain: responses.painLevels,
            mood: responses.mood,
            challenges: responses.challenges,
            wins: responses.wins,
            questions: responses.questions,
          },
          previousWeeks: previousData,
          hasDietPlan: Boolean(dietPlan),
          hasExercisePlan: Boolean(exercisePlan),
          profile: profile ? { ageRange: undefined, biologicalSex: profile.biologicalSex } : null,
          instructions:
            "You are a compassionate health coach analyzing a user's weekly check-in. " +
            "Compare this week to previous weeks where data is available. " +
            "Provide specific, actionable suggestions tied to the user's own goals and challenges. " +
            "Celebrate their wins and reference them specifically in the encouragement message. " +
            "Do NOT diagnose or recommend medications. " +
            "Use cautious, non-diagnostic language. Include a disclaimer. " +
            "Return valid JSON matching the required schema exactly.",
        },
        null,
        2
      )

      const llmResult = await llmClient.generate({
        userId,
        role: "CHECKIN_ANALYST",
        userMessage: prompt,
        interactionType: "checkin",
        contentCategory: "medical",
        maxTokens: 4096,
        inputContext: stripPHI(
          JSON.stringify({
            challenges: responses.challenges,
            wins: responses.wins,
            pain: responses.painLevels,
          })
        ),
      })

      if (llmResult.emergencyDetected) {
        return {
          weeklySummary: "Your responses indicate some concerns that may require professional attention.",
          progressAssessment: {
            overall: "needs_attention",
            areas: [
              {
                category: "safety",
                status: "alert",
                note: "Emergency language detected — please seek immediate help if you're in distress.",
              },
            ],
          },
          adherenceAnalysis: {
            exercise: { adherence: responses.exerciseAdherence, comment: "Speak with your doctor about safe activity levels." },
            diet: { adherence: responses.dietAdherence, comment: "Focus on nourishing foods as you're able." },
            sleep: { score: responses.sleepQuality, comment: "Prioritize rest." },
            stress: { score: responses.stressLevel, comment: "Reach out to a mental health professional if needed." },
          },
          adjustments: [],
          nextWeekFocus: ["Prioritize your well-being", "Reach out to supportive people"],
          encouragement: "You've taken an important step by checking in. Please reach out to a healthcare professional.",
          concerns: ["Your responses triggered safety guidelines — please consult a professional"],
          disclaimer: "This platform cannot provide emergency care. Seek immediate medical attention.",
        }
      }

      const zodParsed = checkInSummarySchema.safeParse(llmResult.data)
      if (!zodParsed.success) {
        throw new Error(`Invalid check-in summary response: ${zodParsed.error.message}`)
      }
      const validated = zodParsed.data

      const safety = validateAIOutput(JSON.stringify(validated), "CHECKIN_ANALYST", prompt)

      const output: CheckInSummaryOutput =
        safety.warnings.length > 0
          ? (() => {
              try {
                const parsed = JSON.parse(safety.sanitizedOutput)
                const zodCheck = checkInSummarySchema.safeParse(parsed)
                return zodCheck.success ? zodCheck.data : validated
              } catch {
                return validated
              }
            })()
          : validated

      if (!output.disclaimer || !output.disclaimer.toLowerCase().includes("not medical advice")) {
        output.disclaimer = `${output.disclaimer ?? ""}\n\n${MEDICAL_DISCLAIMER}`.trim()
      }

      return output
    } catch (error) {
      console.error("Check-in summary generation failed:", error)
      throw error instanceof Error ? error : new Error("Check-in summary generation failed")
    }
  }
}

// ─── Zod Schemas ─────────────────────────────────────────────────

const adherenceItemSchema = z.object({
  adherence: z.number().min(0).max(100),
  comment: z.string(),
})

const scoreItemSchema = z.object({
  score: z.number().min(0).max(10),
  comment: z.string(),
})

const adjustmentSchema = z.object({
  category: z.string().min(1),
  current: z.string(),
  suggested: z.string(),
  reason: z.string(),
})

const areaSchema = z.object({
  category: z.string().min(1),
  status: z.string(),
  note: z.string(),
})

const checkInSummarySchema = z.object({
  weeklySummary: z.string().min(1),
  progressAssessment: z.object({
    overall: z.enum(["improving", "stable", "needs_attention"]),
    areas: z.array(areaSchema),
  }),
  adherenceAnalysis: z.object({
    exercise: adherenceItemSchema,
    diet: adherenceItemSchema,
    sleep: scoreItemSchema,
    stress: scoreItemSchema,
  }),
  adjustments: z.array(adjustmentSchema),
  nextWeekFocus: z.array(z.string()),
  encouragement: z.string().min(1),
  concerns: z.array(z.string()),
  disclaimer: z.string(),
})

/** Singleton check-in engine instance. */
export const checkInEngine = new CheckInEngine()
