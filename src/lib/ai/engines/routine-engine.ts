import { prisma } from "@/lib/prisma"
import { llmClient } from "@/lib/ai/llm-client"
import { sanitizeForLLM, stripPHI } from "@/lib/ai/phii-filter"
import { validateAIOutput, MEDICAL_DISCLAIMER } from "@/lib/ai/safety-engine"
import { z } from "zod"

// ─── Types ───────────────────────────────────────────────────────

export interface RoutineOutput {
  dailySchedule: RoutineActivity[]
  postureBreaks: PostureBreak[]
  eyeCareSchedule: EyeCareReminder[]
  hydrationReminders: string[]
  sleepHygieneTips: string[]
  weeklyGoals: string[]
  disclaimer: string
}

export interface RoutineActivity {
  time: string
  activity: string
  category: "sleep" | "exercise" | "meal" | "work" | "break" | "posture" | "eye_care" | "hydration" | "mindfulness" | "personal"
  duration: string
  details: string
  tips: string
}

export interface PostureBreak {
  time: string
  exercise: string
  duration: string
}

export interface EyeCareReminder {
  time: string
  action: string
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

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * AI-powered daily routine generator.
 *
 * Integrates meal times from diet plans, workout times from exercise plans,
 * posture breaks for desk workers, and eye care for high screen time.
 */
export class RoutineEngine {
  async collectUserData(userId: string): Promise<Record<string, JsonValue>> {
    try {
      const [lifestyle, occupation, goals, postureChars, dietPlan, exercisePlan] =
        await Promise.all([
          prisma.lifestyle.findUnique({ where: { userId } }),
          prisma.occupation.findUnique({ where: { userId } }),
          prisma.goal.findMany({ where: { userId, isActive: true } }),
          prisma.postureCharacteristic.findMany({
            where: { userId, isActive: true },
          }),
          prisma.dietPlan.findFirst({
            where: { userId, isActive: true },
            orderBy: { weekStart: "desc" },
          }),
          prisma.exercisePlan.findFirst({
            where: { userId, isActive: true },
            orderBy: { weekStart: "desc" },
          }),
        ])

      return {
        lifestyle: lifestyle ? (toPlainJson(lifestyle) as Record<string, JsonValue>) : null,
        occupation: occupation ? (toPlainJson(occupation) as Record<string, JsonValue>) : null,
        goals: goals.map((g) => toPlainJson(g)),
        postureCharacteristics: postureChars.map((p) => toPlainJson(p)),
        dietPlan: dietPlan ? (toPlainJson(dietPlan) as Record<string, JsonValue>) : null,
        exercisePlan: exercisePlan ? (toPlainJson(exercisePlan) as Record<string, JsonValue>) : null,
      }
    } catch (error) {
      console.error("Failed to collect user data for routine:", error)
      throw new Error(error instanceof Error ? error.message : "Failed to collect user data")
    }
  }

  async generate(userId: string): Promise<RoutineOutput> {
    try {
      const rawData = await this.collectUserData(userId)
      const lifestyle = (rawData.lifestyle ?? {}) as Record<string, unknown>
      const occupation = (rawData.occupation ?? {}) as Record<string, unknown>
      const goalsList = (rawData.goals ?? []) as Array<Record<string, unknown>>
      const postureChars = (rawData.postureCharacteristics ?? []) as Array<Record<string, unknown>>
      const dietPlan = rawData.dietPlan as Record<string, unknown> | null
      const exercisePlan = rawData.exercisePlan as Record<string, unknown> | null

      const wakeUpTime = (lifestyle.wakeUpTime as string) ?? "07:00"
      const bedTime = (lifestyle.bedTime as string) ?? "22:30"
      const workType = (occupation.workType as string) ?? "office"
      const sittingHours = occupation.sittingHours ? Number(occupation.sittingHours) : 0
      const screenTimeHours = lifestyle.screenTimeHours ? Number(lifestyle.screenTimeHours) : 0
      const isDeskWorker = workType === "office" || workType === "remote" || sittingHours > 4
      const needsEyeCare = screenTimeHours > 6 || sittingHours > 6

      const postureIssues = postureChars
        .filter((pc) => pc.severity !== "none")
        .map((pc) => `${pc.characteristic} (${pc.severity})`)

      // Extract meal times from diet plan
      const mealTimes: string[] = []
      if (dietPlan?.meals) {
        const days = dietPlan.meals as Array<Record<string, unknown>>
        if (Array.isArray(days) && days.length > 0) {
          const meals = days[0].meals as Array<Record<string, unknown>> | undefined
          if (Array.isArray(meals)) {
            for (const meal of meals) {
              if (typeof meal.time === "string") mealTimes.push(meal.time)
            }
          }
        }
      }

      // Extract workout times from exercise plan
      let workoutTime = "18:00"
      if (exercisePlan?.strength) {
        const schedule = exercisePlan.strength as Array<Record<string, unknown>>
        if (Array.isArray(schedule) && schedule.length > 0) {
          const firstDay = schedule[0]
          const exercises = firstDay.exercises as Array<Record<string, unknown>> | undefined
          if (Array.isArray(exercises) && exercises.length > 0) {
            workoutTime = "18:30"
          }
        }
      }

      const sanitizedUser = sanitizeForLLM(rawData as Record<string, unknown>)

      const prompt = JSON.stringify(
        {
          userProfile: sanitizedUser,
          wakeUpTime,
          bedTime,
          workType,
          isDeskWorker,
          needsEyeCare,
          sittingHours,
          screenTimeHours,
          postureIssues,
          mealTimesFromDietPlan: mealTimes,
          workoutTimeFromExercisePlan: workoutTime,
          goals: goalsList.map((g) => g.goal),
          instructions:
            "Create a personalized daily routine schedule from wake-up to bedtime. " +
            "The routine MUST integrate meal times from the diet plan and workout times from the exercise plan. " +
            (isDeskWorker
              ? "CRITICAL: The user is a desk worker. Insert posture breaks every 45-60 minutes throughout the work day. Each break should include a specific posture corrective exercise."
              : "") +
            (needsEyeCare
              ? "CRITICAL: High screen time detected. Insert 20-20-20 eye care reminders: every 20 minutes, look at something 20 feet away for 20 seconds."
              : "") +
            " Use the categories: sleep, exercise, meal, work, break, posture, eye_care, hydration, mindfulness, personal. " +
            "Return valid JSON matching the required schema exactly. " +
            "Use cautious, non-diagnostic language. Include a disclaimer.",
        },
        null,
        2
      )

      const llmResult = await llmClient.generate({
        userId,
        role: "ROUTINE_PLANNER",
        userMessage: prompt,
        interactionType: "routine",
        contentCategory: "lifestyle",
        maxTokens: 8192,
        inputContext: stripPHI(
          JSON.stringify({ wakeUpTime, bedTime, isDeskWorker, needsEyeCare, postureIssues })
        ),
      })

      if (llmResult.emergencyDetected) {
        throw new Error("Emergency content detected in routine generation input")
      }

      const zodParsed = routineOutputSchema.safeParse(llmResult.data)
      if (!zodParsed.success) {
        throw new Error(`Invalid routine response: ${zodParsed.error.message}`)
      }
      const validatedData = zodParsed.data

      const safety = validateAIOutput(JSON.stringify(validatedData), "ROUTINE_PLANNER", prompt)

      let planData: RoutineOutput = validatedData as RoutineOutput
      if (safety.warnings.length > 0) {
        try {
          const parsed = JSON.parse(safety.sanitizedOutput)
          const zodCheck = routineOutputSchema.safeParse(parsed)
          if (zodCheck.success) planData = zodCheck.data
        } catch {
          planData = validatedData as RoutineOutput
        }
      }

      if (!planData.disclaimer || !planData.disclaimer.toLowerCase().includes("not medical advice")) {
        planData.disclaimer = `${planData.disclaimer ?? ""}\n\n${MEDICAL_DISCLAIMER}`.trim()
      }

      // Persist as a routine in the database
      await prisma.routine.create({
        data: {
          userId,
          dayOfWeek: new Date().getDay(),
          schedule: JSON.parse(JSON.stringify(planData)),
        },
      })

      // Timeline entry
      await prisma.healthTimelineEntry.create({
        data: {
          userId,
          eventType: "routine_generated",
          title: "Daily Routine Generated",
          description: `AI-optimized schedule — ${planData.dailySchedule.length} activities planned`,
          eventDate: new Date(),
          metadata: {
            activityCount: planData.dailySchedule.length,
            postureBreakCount: planData.postureBreaks.length,
            eyeCareCount: planData.eyeCareSchedule.length,
          },
        },
      })

      return planData
    } catch (error) {
      console.error("Routine generation failed:", error)
      throw error instanceof Error ? error : new Error("Routine generation failed")
    }
  }
}

// ─── Zod Schemas ─────────────────────────────────────────────────

const routineActivitySchema = z.object({
  time: z.string().min(1),
  activity: z.string().min(1),
  category: z.enum(["sleep", "exercise", "meal", "work", "break", "posture", "eye_care", "hydration", "mindfulness", "personal"]),
  duration: z.string(),
  details: z.string(),
  tips: z.string(),
})

const postureBreakSchema = z.object({
  time: z.string().min(1),
  exercise: z.string().min(1),
  duration: z.string(),
})

const eyeCareReminderSchema = z.object({
  time: z.string().min(1),
  action: z.string().min(1),
})

const routineOutputSchema = z.object({
  dailySchedule: z.array(routineActivitySchema).min(1),
  postureBreaks: z.array(postureBreakSchema),
  eyeCareSchedule: z.array(eyeCareReminderSchema),
  hydrationReminders: z.array(z.string()),
  sleepHygieneTips: z.array(z.string()),
  weeklyGoals: z.array(z.string()),
  disclaimer: z.string(),
})

/** Singleton routine engine instance. */
export const routineEngine = new RoutineEngine()
