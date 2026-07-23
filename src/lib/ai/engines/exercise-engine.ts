import { prisma } from "@/lib/prisma"
import { llmClient } from "@/lib/ai/llm-client"
import { sanitizeForLLM, stripPHI } from "@/lib/ai/phii-filter"
import { validateAIOutput, MEDICAL_DISCLAIMER } from "@/lib/ai/safety-engine"
import { z } from "zod"

// ─── Types ───────────────────────────────────────────────────────

export interface ExercisePlanOutput {
  planName: string
  duration: "4_weeks"
  focusAreas: string[]
  weeklySchedule: WeekDayExercise[]
  postureCorrectionProtocol: PostureProtocol[]
  progressionPlan: { week1: string; week2: string; week3: string; week4: string }
  precautions: string[]
  disclaimer: string
  confidence: number
}

export interface WeekDayExercise {
  day: string
  focus: string
  exercises: Exercise[]
  warmUp: string[]
  coolDown: string[]
  estimatedDuration: number
}

export interface Exercise {
  name: string
  description: string
  sets: number
  reps: string
  restBetweenSets: number
  difficulty: "beginner" | "intermediate" | "advanced"
  targetMuscles: string[]
  purpose: string
  formTips: string[]
  modifications: { easier: string; harder: string }
  contraindications: string[]
  isTimed?: boolean
  holdSeconds?: number
}

export interface PostureProtocol {
  issue: string
  dailyExercises: string[]
  frequency: string
  expectedImprovementTimeline: string
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/** Maps posture issues to required exercise inclusions in the LLM prompt. */
const POSTURE_EXERCISE_MAP: Record<string, string> = {
  "Forward Head": "chin tucks, neck stretches, deep neck flexor exercises, suboccipital release, upper trap stretches",
  "Rounded Shoulders": "rows, chest stretches, wall angels, band pull-aparts, face pulls, doorway stretches",
  "Pelvic Tilt": "core exercises (planks, dead bugs), hip flexor stretches (kneeling hip flexor), glute bridges, pelvic tilts, hamstring stretches",
  "Knee Valgus": "clamshells, glute strengthening (hip thrusts, step-ups), lateral band walks, monster walks, single-leg balance",
  "Flat Feet": "toe curls, calf raises, foot strengthening (towel scrunches), ankle mobility, arch lifts, short foot exercises",
}

// ─── Helper ──────────────────────────────────────────────────────

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
 * AI-powered exercise plan generation engine.
 *
 * Uses posture analysis data from MediaPipe PoseLandmarker to create
 * personalized 4-week corrective exercise plans.
 */
export class ExerciseEngine {
  /**
   * Collects user profile, posture analysis, and vision analysis data from the database.
   */
  async collectUserData(userId: string): Promise<Record<string, JsonValue>> {
    try {
      const [
        profile,
        lifestyle,
        occupation,
        medicalHistory,
        goals,
        painAssessments,
        visionAnalysis,
        postureCharacteristics,
      ] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.lifestyle.findUnique({ where: { userId } }),
        prisma.occupation.findUnique({ where: { userId } }),
        prisma.medicalHistory.findUnique({ where: { userId } }),
        prisma.goal.findMany({ where: { userId, isActive: true } }),
        prisma.painAssessment.findMany({
          where: { userId, isActive: true },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.visionAnalysis.findFirst({
          where: { userId, status: "completed" },
          orderBy: { createdAt: "desc" },
        }),
        prisma.postureCharacteristic.findMany({
          where: { userId, isActive: true },
          orderBy: { createdAt: "desc" },
        }),
      ])

      return {
        profile: profile ? (toPlainJson(profile) as Record<string, JsonValue>) : null,
        lifestyle: lifestyle ? (toPlainJson(lifestyle) as Record<string, JsonValue>) : null,
        occupation: occupation ? (toPlainJson(occupation) as Record<string, JsonValue>) : null,
        medicalHistory: medicalHistory
          ? (toPlainJson(medicalHistory) as Record<string, JsonValue>)
          : null,
        goals: goals.map((g) => toPlainJson(g)),
        painAssessments: painAssessments.map((p) => toPlainJson(p)),
        visionAnalysis: visionAnalysis
          ? (toPlainJson(visionAnalysis) as Record<string, JsonValue>)
          : null,
        postureCharacteristics: postureCharacteristics.map((p) => toPlainJson(p)),
      }
    } catch (error) {
      console.error("Failed to collect user data for exercise plan:", error)
      throw new Error(
        error instanceof Error ? error.message : "Failed to collect user data"
      )
    }
  }

  /**
   * Generates a personalized 4-week exercise plan based on posture analysis results.
   */
  async generate(userId: string): Promise<ExercisePlanOutput> {
    try {
      const rawData = await this.collectUserData(userId)
      const profile = (rawData.profile ?? {}) as Record<string, unknown>
      const lifestyle = (rawData.lifestyle ?? {}) as Record<string, unknown>
      const occupation = (rawData.occupation ?? {}) as Record<string, unknown>
      const medicalHistory = (rawData.medicalHistory ?? {}) as Record<string, unknown>
      const painAssessments = (rawData.painAssessments ?? []) as Array<Record<string, unknown>>
      const goalsList = (rawData.goals ?? []) as Array<Record<string, unknown>>
      const visionAnalysis = rawData.visionAnalysis as Record<string, unknown> | null
      const postureChars = (rawData.postureCharacteristics ??
        []) as Array<Record<string, unknown>>

      // Detect posture issues and map to required exercises
      const postureIssues: string[] = []
      const requiredExercises: string[] = []
      let hasEyeStrain = false

      for (const pc of postureChars) {
        const characteristic = pc.characteristic as string
        const severity = (pc.severity as string) ?? "none"

        if (severity !== "none" && POSTURE_EXERCISE_MAP[characteristic]) {
          postureIssues.push(`${characteristic} (${severity})`)
          requiredExercises.push(POSTURE_EXERCISE_MAP[characteristic])
        }
      }

      // Check vision analysis for eye strain indicators
      if (visionAnalysis) {
        const findings = visionAnalysis.findings as Record<string, unknown> | null
        if (findings) {
          const findingsStr = JSON.stringify(findings).toLowerCase()
          if (
            findingsStr.includes("strain") ||
            findingsStr.includes("fatigue") ||
            findingsStr.includes("dry") ||
            findingsStr.includes("blur")
          ) {
            hasEyeStrain = true
          }
        }
      }

      // Also check occupation and lifestyle for screen time indicators
      const screenTimeHours = lifestyle.screenTimeHours
        ? Number(lifestyle.screenTimeHours)
        : 0
      const sittingHours = occupation.sittingHours ? Number(occupation.sittingHours) : 0
      if (screenTimeHours > 4 || sittingHours > 4) {
        hasEyeStrain = true
      }

      if (hasEyeStrain) {
        requiredExercises.push("20-20-20 rule reminders (every 20 min, look 20 ft away for 20 sec), palming, eye rolls, focus shifting, blink exercises")
      }

      // Sanitize for LLM
      const sanitizedUser = sanitizeForLLM(rawData as Record<string, unknown>)

      const prompt = JSON.stringify(
        {
          userProfile: sanitizedUser,
          postureFindings: postureChars.map((pc) => ({
            characteristic: pc.characteristic,
            severity: pc.severity,
            description: pc.description,
          })),
          postureIssuesDetected: postureIssues,
          painAreas: painAssessments.map((pa) => ({
            area: pa.bodyArea,
            severity: pa.severity,
            frequency: pa.frequency,
          })),
          medicalContext: {
            conditions: medicalHistory.currentConditions,
            medications: medicalHistory.currentMedications,
            injuries: medicalHistory.pastSurgeries,
          },
          visionScreenTime: { hasEyeStrain, screenTimeHours, sittingHours },
          goals: goalsList.map((g) => g.goal),
          occupation: {
            jobTitle: occupation.jobTitle,
            workType: occupation.workType,
            sittingHours: occupation.sittingHours,
            dailyActivity: occupation.dailyActivity,
          },
          exerciseContext: {
            exerciseFreq: lifestyle.exerciseFreq,
            walkingSteps: lifestyle.walkingSteps,
            stressLevel: lifestyle.stressLevel,
          },
          requiredInclusions: requiredExercises,
          criticalInstructions:
            "You MUST include exercises for each detected posture issue:\n" +
            postureIssues
              .map((issue) => {
                const name = issue.split(" (")[0]
                return `- If "${name}" is detected, MUST include: ${POSTURE_EXERCISE_MAP[name] || "appropriate corrective exercises"}`
              })
              .join("\n") +
            (hasEyeStrain
              ? "\n- Eye strain indicators detected: MUST include 20-20-20 rule reminders and eye exercises."
              : ""),
          instructions:
            "Create a personalized 4-week corrective exercise plan based on the user's posture analysis. " +
            "The plan must address ALL detected posture issues with specific corrective exercises. " +
            "Include modifications for different fitness levels. " +
            "Do NOT recommend any medical treatments or diagnose conditions. " +
            "Use cautious, non-diagnostic language. Include a disclaimer. " +
            "Return valid JSON matching the required schema exactly.",
        },
        null,
        2
      )

      const llmResult = await llmClient.generate({
        userId,
        role: "EXERCISE_PLANNER",
        userMessage: prompt,
        interactionType: "exercise",
        contentCategory: "lifestyle",
        maxTokens: 8192,
        inputContext: stripPHI(
          JSON.stringify({
            postureIssues,
            painAreas: painAssessments.map((pa) => ({
              area: pa.bodyArea,
              severity: pa.severity,
            })),
            hasEyeStrain,
          })
        ),
      })

      if (llmResult.emergencyDetected) {
        throw new Error("Emergency content detected in exercise plan generation input")
      }

      // Zod validation
      const zodParsed = exercisePlanOutputSchema.safeParse(llmResult.data)
      if (!zodParsed.success) {
        throw new Error(`Invalid exercise plan response: ${zodParsed.error.message}`)
      }
      const validatedData = zodParsed.data

      // Safety validation
      const safety = validateAIOutput(
        JSON.stringify(validatedData),
        "EXERCISE_PLANNER",
        prompt
      )

      let planData = validatedData as ExercisePlanOutput
      if (safety.warnings.length > 0) {
        try {
          const parsed = JSON.parse(safety.sanitizedOutput)
          const zodCheck = exercisePlanOutputSchema.safeParse(parsed)
          if (zodCheck.success) planData = zodCheck.data
        } catch {
          planData = validatedData as ExercisePlanOutput
        }
      }

      // Ensure disclaimer
      if (
        !planData.disclaimer ||
        !planData.disclaimer.toLowerCase().includes("not medical advice")
      ) {
        planData.disclaimer = `${planData.disclaimer ?? ""}\n\n${MEDICAL_DISCLAIMER}`.trim()
      }

      // Persist to database
      const monday = getMonday(new Date())
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 27) // 4 weeks

      await prisma.exercisePlan.create({
        data: {
          userId,
          phase: planData.planName,
          weekStart: monday,
          weekEnd: sunday,
          warmUp: JSON.parse(JSON.stringify(planData.weeklySchedule.map((d) => d.warmUp))),
          stretching: JSON.parse(
            JSON.stringify(planData.weeklySchedule.map((d) => d.coolDown))
          ),
          strength: JSON.parse(JSON.stringify(planData.weeklySchedule)),
          progression: JSON.parse(JSON.stringify(planData.progressionPlan)),
        },
      })

      // Timeline entry
      await prisma.healthTimelineEntry.create({
        data: {
          userId,
          eventType: "exercise_plan_created",
          title: "AI Exercise Plan Generated",
          description: `4-week ${planData.planName} plan — Focus: ${planData.focusAreas.join(", ")}`,
          eventDate: new Date(),
          metadata: {
            planName: planData.planName,
            focusAreas: planData.focusAreas,
            duration: planData.duration,
            exerciseDays: planData.weeklySchedule.filter((d) => d.focus !== "Rest").length,
          },
        },
      })

      return planData
    } catch (error) {
      console.error("Exercise plan generation failed:", error)
      throw error instanceof Error ? error : new Error("Exercise plan generation failed")
    }
  }

  /**
   * Modifies an existing exercise plan based on a user's request.
   */
  async modify(planId: string, modification: string): Promise<ExercisePlanOutput> {
    try {
      const existingPlan = await prisma.exercisePlan.findUnique({
        where: { id: planId },
      })

      if (!existingPlan) {
        throw new Error("Exercise plan not found")
      }

      const currentSchedule = (existingPlan.strength as unknown as WeekDayExercise[]) ?? []
      const currentWarmUp = (existingPlan.warmUp as unknown as string[][]) ?? []
      const currentCoolDown = (existingPlan.stretching as unknown as string[][]) ?? []
      const currentProgression = (existingPlan.progression as unknown as {
        week1: string
        week2: string
        week3: string
        week4: string
      }) ?? { week1: "", week2: "", week3: "", week4: "" }

      const currentPlan: ExercisePlanOutput = {
        planName: existingPlan.phase ?? "Modified Exercise Plan",
        duration: "4_weeks",
        focusAreas: [],
        weeklySchedule: currentSchedule.map((day, i) => ({
          ...day,
          warmUp: currentWarmUp[i] ?? [],
          coolDown: currentCoolDown[i] ?? [],
        })),
        postureCorrectionProtocol: [],
        progressionPlan: currentProgression,
        precautions: [],
        disclaimer: "",
        confidence: 0.5,
      }

      const prompt = JSON.stringify(
        {
          existingPlan: currentPlan,
          modificationRequest: modification,
          instructions:
            "Modify the existing exercise plan according to the user's request. " +
            "Return the FULL updated 4-week plan with all exercises, warm-ups, cool-downs, and progression. " +
            "Only change what the user requested. Maintain all other exercises and structure. " +
            "Return valid JSON matching the ExercisePlanOutput schema exactly. " +
            "Include a disclaimer.",
        },
        null,
        2
      )

      const llmResult = await llmClient.generate({
        userId: existingPlan.userId,
        role: "EXERCISE_PLANNER",
        userMessage: prompt,
        interactionType: "exercise",
        contentCategory: "lifestyle",
        maxTokens: 8192,
      })

      const zodParsed = exercisePlanOutputSchema.safeParse(llmResult.data)
      if (!zodParsed.success) {
        throw new Error(`Invalid modified exercise plan response: ${zodParsed.error.message}`)
      }
      const validated = zodParsed.data

      const safety = validateAIOutput(JSON.stringify(validated), "EXERCISE_PLANNER", prompt)

      const updatedPlan: ExercisePlanOutput =
        safety.warnings.length > 0
          ? (() => {
              try {
                const parsed = JSON.parse(safety.sanitizedOutput)
                const zodCheck = exercisePlanOutputSchema.safeParse(parsed)
                return zodCheck.success ? zodCheck.data : validated
              } catch {
                return validated
              }
            })()
          : validated

      if (
        !updatedPlan.disclaimer ||
        !updatedPlan.disclaimer.toLowerCase().includes("not medical advice")
      ) {
        updatedPlan.disclaimer = `${updatedPlan.disclaimer ?? ""}\n\n${MEDICAL_DISCLAIMER}`.trim()
      }

      await prisma.exercisePlan.update({
        where: { id: planId },
        data: {
          phase: updatedPlan.planName,
          strength: JSON.parse(JSON.stringify(updatedPlan.weeklySchedule)),
          warmUp: JSON.parse(JSON.stringify(updatedPlan.weeklySchedule.map((d) => d.warmUp))),
          stretching: JSON.parse(JSON.stringify(updatedPlan.weeklySchedule.map((d) => d.coolDown))),
          progression: JSON.parse(JSON.stringify(updatedPlan.progressionPlan)),
        },
      })

      return updatedPlan
    } catch (error) {
      console.error("Exercise plan modification failed:", error)
      throw error instanceof Error ? error : new Error("Exercise plan modification failed")
    }
  }
}

// ─── Zod Schemas ─────────────────────────────────────────────────

const exerciseSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  sets: z.number().int().min(0),
  reps: z.string(),
  restBetweenSets: z.number().min(0),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  targetMuscles: z.array(z.string()),
  purpose: z.string(),
  formTips: z.array(z.string()),
  modifications: z.object({
    easier: z.string(),
    harder: z.string(),
  }),
  contraindications: z.array(z.string()),
  isTimed: z.boolean().optional(),
  holdSeconds: z.number().min(0).optional(),
})

const weekDayExerciseSchema = z.object({
  day: z.string().min(1),
  focus: z.string(),
  exercises: z.array(exerciseSchema),
  warmUp: z.array(z.string()),
  coolDown: z.array(z.string()),
  estimatedDuration: z.number().min(0),
})

const postureProtocolSchema = z.object({
  issue: z.string().min(1),
  dailyExercises: z.array(z.string()),
  frequency: z.string(),
  expectedImprovementTimeline: z.string(),
})

const progressionPlanSchema = z.object({
  week1: z.string(),
  week2: z.string(),
  week3: z.string(),
  week4: z.string(),
})

const exercisePlanOutputSchema = z.object({
  planName: z.string().min(1),
  duration: z.literal("4_weeks"),
  focusAreas: z.array(z.string()),
  weeklySchedule: z.array(weekDayExerciseSchema).min(1),
  postureCorrectionProtocol: z.array(postureProtocolSchema),
  progressionPlan: progressionPlanSchema,
  precautions: z.array(z.string()),
  disclaimer: z.string(),
  confidence: z.number().min(0).max(1),
})

// ─── Helpers ─────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Singleton exercise plan engine instance. */
export const exerciseEngine = new ExerciseEngine()
