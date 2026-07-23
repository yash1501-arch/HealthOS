import { prisma } from "@/lib/prisma"
import { llmClient } from "@/lib/ai/llm-client"
import { sanitizeForLLM } from "@/lib/ai/phii-filter"
import { validateAIOutput, MEDICAL_DISCLAIMER } from "@/lib/ai/safety-engine"
import {
  recommendationOutputSchema,
  type HealthScoreBreakdown,
  type RecommendationInput,
  type RecommendationOutput,
} from "@/types/ai-schemas"

const HEALTH_SCORE_WEIGHTS = {
  posture: 0.15,
  nutrition: 0.2,
  activity: 0.2,
  sleep: 0.15,
  stress: 0.1,
  vision: 0.1,
  labs: 0.1,
} as const

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * Converts Prisma values (Decimal, Date, BigInt) into JSON-safe primitives.
 */
function toPlainJson<T>(value: T): JsonValue {
  if (value === null || value === undefined) return null
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return Number(value)
  }
  if (Array.isArray(value)) {
    return value.map((item) => toPlainJson(item))
  }
  if (typeof value === "object") {
    const result: Record<string, JsonValue> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toPlainJson(nested)
    }
    return result
  }
  return value as JsonValue
}

/**
 * Computes the weighted overall health score from category breakdown scores.
 */
function weightedHealthScore(breakdown: HealthScoreBreakdown): number {
  const score =
    breakdown.posture * HEALTH_SCORE_WEIGHTS.posture +
    breakdown.nutrition * HEALTH_SCORE_WEIGHTS.nutrition +
    breakdown.activity * HEALTH_SCORE_WEIGHTS.activity +
    breakdown.sleep * HEALTH_SCORE_WEIGHTS.sleep +
    breakdown.stress * HEALTH_SCORE_WEIGHTS.stress +
    breakdown.vision * HEALTH_SCORE_WEIGHTS.vision +
    breakdown.labs * HEALTH_SCORE_WEIGHTS.labs

  return Math.round(Math.min(100, Math.max(0, score)))
}

/**
 * Maps posture severity labels to numeric scores.
 */
function scorePostureSeverity(severity: string | null | undefined): number {
  switch (severity?.toLowerCase()) {
    case "none":
      return 90
    case "mild":
      return 75
    case "moderate":
      return 55
    case "severe":
      return 35
    default:
      return 65
  }
}

/**
 * Derives a posture category score from posture analysis data.
 */
function scorePosture(data: RecommendationInput): number {
  const posture = data.postureAnalysis as Record<string, unknown> | null | undefined
  if (!posture) return 0

  const characteristics = posture.characteristics
  if (Array.isArray(characteristics) && characteristics.length > 0) {
    const scores = characteristics.map((item) => {
      const record = item as Record<string, unknown>
      return scorePostureSeverity(
        typeof record.severity === "string" ? record.severity : null
      )
    })
    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
  }

  const findings = posture.findings
  if (findings && typeof findings === "object") {
    const findingCount = Object.keys(findings as Record<string, unknown>).length
    if (findingCount === 0) return 85
    return Math.max(30, 85 - findingCount * 8)
  }

  return 65
}

/**
 * Derives a nutrition category score from lifestyle and check-in data.
 */
function scoreNutrition(data: RecommendationInput): number {
  const assessment = data.assessment as Record<string, unknown> | undefined
  const lifestyle = assessment?.lifestyle as Record<string, unknown> | undefined
  const checkins = data.weeklyCheckins ?? []

  let score = 0
  let factors = 0

  const waterIntake = lifestyle?.waterIntakeL
  if (waterIntake != null) {
    const liters = Number(waterIntake)
    if (liters >= 2) score += 90
    else if (liters >= 1.5) score += 75
    else if (liters >= 1) score += 60
    else score += 40
    factors += 1
  }

  const dietAdherenceValues = checkins
    .map((checkin) => (checkin as Record<string, unknown>).dietAdherence)
    .filter((value) => value != null)
    .map(Number)

  if (dietAdherenceValues.length > 0) {
    const avg =
      dietAdherenceValues.reduce((sum, value) => sum + value, 0) / dietAdherenceValues.length
    score += Math.min(100, avg * 10)
    factors += 1
  }

  if (data.dietPlan) {
    score += 80
    factors += 1
  }

  return factors > 0 ? Math.round(score / factors) : 0
}

/**
 * Derives an activity category score from lifestyle and check-in data.
 */
function scoreActivity(data: RecommendationInput): number {
  const assessment = data.assessment as Record<string, unknown> | undefined
  const lifestyle = assessment?.lifestyle as Record<string, unknown> | undefined
  const occupation = assessment?.occupation as Record<string, unknown> | undefined
  const checkins = data.weeklyCheckins ?? []

  let score = 0
  let factors = 0

  const exerciseFreq = lifestyle?.exerciseFreq
  if (typeof exerciseFreq === "string") {
    const freqScores: Record<string, number> = {
      daily: 95,
      "3-4_per_week": 80,
      "1-2_per_week": 65,
      rarely: 45,
      never: 25,
    }
    score += freqScores[exerciseFreq] ?? 55
    factors += 1
  }

  const steps = lifestyle?.walkingSteps
  if (steps != null) {
    const stepCount = Number(steps)
    if (stepCount >= 8000) score += 90
    else if (stepCount >= 5000) score += 70
    else if (stepCount >= 3000) score += 55
    else score += 35
    factors += 1
  }

  const dailyActivity = occupation?.dailyActivity
  if (typeof dailyActivity === "string") {
    const activityScores: Record<string, number> = {
      very_active: 90,
      active: 75,
      moderate: 60,
      sedentary: 40,
      very_sedentary: 25,
    }
    score += activityScores[dailyActivity] ?? 55
    factors += 1
  }

  const exerciseCompletion = checkins
    .map((checkin) => (checkin as Record<string, unknown>).exerciseCompletion)
    .filter((value) => value != null)
    .map(Number)

  if (exerciseCompletion.length > 0) {
    const avg =
      exerciseCompletion.reduce((sum, value) => sum + value, 0) / exerciseCompletion.length
    score += Math.min(100, avg * 10)
    factors += 1
  }

  return factors > 0 ? Math.round(score / factors) : 0
}

/**
 * Derives a sleep category score from lifestyle and check-in data.
 */
function scoreSleep(data: RecommendationInput): number {
  const assessment = data.assessment as Record<string, unknown> | undefined
  const lifestyle = assessment?.lifestyle as Record<string, unknown> | undefined
  const checkins = data.weeklyCheckins ?? []

  let score = 0
  let factors = 0

  const sleepHours = lifestyle?.avgSleepHours
  if (sleepHours != null) {
    const hours = Number(sleepHours)
    if (hours >= 7 && hours <= 9) score += 90
    else if (hours >= 6 && hours < 7) score += 70
    else if (hours > 9 && hours <= 10) score += 75
    else if (hours >= 5) score += 50
    else score += 30
    factors += 1
  }

  const sleepQuality = lifestyle?.sleepQuality
  if (typeof sleepQuality === "string") {
    const qualityScores: Record<string, number> = {
      excellent: 95,
      good: 80,
      fair: 60,
      poor: 35,
    }
    score += qualityScores[sleepQuality] ?? 60
    factors += 1
  }

  const checkinSleep = checkins
    .map((checkin) => (checkin as Record<string, unknown>).sleepHours)
    .filter((value) => value != null)
    .map(Number)

  if (checkinSleep.length > 0) {
    const avg = checkinSleep.reduce((sum, value) => sum + value, 0) / checkinSleep.length
    if (avg >= 7 && avg <= 9) score += 90
    else if (avg >= 6) score += 65
    else score += 40
    factors += 1
  }

  return factors > 0 ? Math.round(score / factors) : 0
}

/**
 * Derives a stress category score from lifestyle data (lower stress = higher score).
 */
function scoreStress(data: RecommendationInput): number {
  const assessment = data.assessment as Record<string, unknown> | undefined
  const lifestyle = assessment?.lifestyle as Record<string, unknown> | undefined

  const stressLevel = lifestyle?.stressLevel
  if (stressLevel == null) return 0

  const level = Number(stressLevel)
  return Math.round(Math.min(100, Math.max(0, (10 - level) * 10)))
}

/**
 * Derives a vision category score from the latest vision analysis.
 */
function scoreVision(data: RecommendationInput): number {
  const vision = data.visionAnalysis as Record<string, unknown> | null | undefined
  if (!vision) return 0

  const confidence = vision.confidenceScore
  if (confidence != null) {
    const normalized = Number(confidence)
    if (normalized <= 1) return Math.round(normalized * 100)
    return Math.round(Math.min(100, normalized))
  }

  const findings = vision.findings
  if (findings && typeof findings === "object") {
    const findingCount = Object.keys(findings as Record<string, unknown>).length
    return Math.max(30, 85 - findingCount * 10)
  }

  return vision.summary ? 70 : 0
}

/**
 * Derives a labs category score from recent lab results.
 */
function scoreLabs(data: RecommendationInput): number {
  const labResults = data.labResults ?? []
  if (labResults.length === 0) return 0

  const abnormalCount = labResults.filter((result) => {
    const record = result as Record<string, unknown>
    return record.isAbnormal === true
  }).length

  const abnormalRatio = abnormalCount / labResults.length
  return Math.round(Math.max(20, 100 - abnormalRatio * 60))
}

/**
 * Checks whether any category has usable scoring data.
 */
function hasScoringData(breakdown: HealthScoreBreakdown): boolean {
  return Object.values(breakdown).some((value) => value > 0)
}

/**
 * Calculates category breakdown and weighted health score from user data without LLM involvement.
 */
export function calculateHealthScore(data: RecommendationInput): {
  healthScore: number
  healthScoreBreakdown: HealthScoreBreakdown
} {
  if (data.healthScoreBreakdown) {
    const healthScore = weightedHealthScore(data.healthScoreBreakdown)
    return { healthScore, healthScoreBreakdown: data.healthScoreBreakdown }
  }

  const healthScoreBreakdown: HealthScoreBreakdown = {
    posture: scorePosture(data),
    nutrition: scoreNutrition(data),
    activity: scoreActivity(data),
    sleep: scoreSleep(data),
    stress: scoreStress(data),
    vision: scoreVision(data),
    labs: scoreLabs(data),
  }

  if (!hasScoringData(healthScoreBreakdown)) {
    return { healthScore: 0, healthScoreBreakdown }
  }

  return {
    healthScore: weightedHealthScore(healthScoreBreakdown),
    healthScoreBreakdown,
  }
}

/**
 * Builds the LLM user prompt from sanitized and calculated health context.
 */
function buildRecommendationPrompt(
  sanitized: ReturnType<typeof sanitizeForLLM>,
  data: RecommendationInput,
  calculated: { healthScore: number; healthScoreBreakdown: HealthScoreBreakdown }
): string {
  return JSON.stringify(
    {
      userContext: sanitized,
      assessment: data.assessment,
      postureAnalysis: data.postureAnalysis,
      visionAnalysis: data.visionAnalysis,
      labResults: data.labResults,
      dietPlan: data.dietPlan,
      exercisePlan: data.exercisePlan,
      weeklyCheckins: data.weeklyCheckins,
      calculatedHealthScore: calculated.healthScore,
      calculatedHealthScoreBreakdown: calculated.healthScoreBreakdown,
      instructions:
        "Generate personalized wellness recommendations based on this anonymized data. " +
        "Use cautious, non-diagnostic language. Include actionable steps and evidence for each recommendation. " +
        "Return JSON matching the required schema.",
    },
    null,
    2
  )
}

/**
 * Persists a recommendation generation event to the health timeline.
 */
async function storeTimelineEntry(
  userId: string,
  recommendation: RecommendationOutput
): Promise<void> {
  await prisma.healthTimelineEntry.create({
    data: {
      userId,
      eventType: "recommendation",
      title: "AI Health Recommendations Generated",
      description: `Overall health score: ${recommendation.healthScore}/100`,
      eventDate: new Date(),
      metadata: toPlainJson(recommendation) as object,
    },
  })
}

/**
 * AI-powered recommendation engine that fuses user health data into actionable guidance.
 */
export class RecommendationEngine {
  /**
   * Queries Prisma for all data sources used in recommendation generation.
   */
  async collectUserData(userId: string): Promise<RecommendationInput> {
    try {
      const [
        profile,
        occupation,
        lifestyle,
        nutritionProfile,
        medicalHistory,
        painAssessments,
        goals,
        latestVisionAnalysis,
        labResults,
        dietPlan,
        exercisePlan,
        weeklyCheckins,
      ] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.occupation.findUnique({ where: { userId } }),
        prisma.lifestyle.findUnique({ where: { userId } }),
        prisma.nutritionProfile.findUnique({ where: { userId } }),
        prisma.medicalHistory.findUnique({ where: { userId } }),
        prisma.painAssessment.findMany({
          where: { userId, isActive: true },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.goal.findMany({
          where: { userId, isActive: true },
          orderBy: { priority: "asc" },
        }),
        prisma.visionAnalysis.findFirst({
          where: { userId, status: "completed" },
          orderBy: { createdAt: "desc" },
          include: {
            postureCharacteristics: {
              where: { isActive: true },
            },
          },
        }),
        prisma.labResult.findMany({
          where: { userId },
          orderBy: [{ testDate: "desc" }, { createdAt: "desc" }],
          take: 3,
        }),
        prisma.dietPlan.findFirst({
          where: { userId, isActive: true },
          orderBy: { weekStart: "desc" },
        }),
        prisma.exercisePlan.findFirst({
          where: { userId, isActive: true },
          orderBy: { weekStart: "desc" },
        }),
        prisma.weeklyCheckin.findMany({
          where: { userId },
          orderBy: { weekStart: "desc" },
          take: 4,
        }),
      ])

      const assessment = toPlainJson({
        profile,
        occupation,
        lifestyle,
        nutritionProfile,
        medicalHistory,
        painAssessments,
        goals,
        collectedAt: new Date().toISOString(),
      }) as Record<string, unknown>

      const postureAnalysis = latestVisionAnalysis
        ? (toPlainJson({
            id: latestVisionAnalysis.id,
            analysisType: latestVisionAnalysis.analysisType,
            angles: latestVisionAnalysis.angles,
            findings: latestVisionAnalysis.findings,
            summary: latestVisionAnalysis.summary,
            confidenceScore: latestVisionAnalysis.confidenceScore,
            characteristics: latestVisionAnalysis.postureCharacteristics,
            createdAt: latestVisionAnalysis.createdAt,
          }) as Record<string, unknown>)
        : null

      const visionAnalysis = latestVisionAnalysis
        ? (toPlainJson({
            id: latestVisionAnalysis.id,
            analysisType: latestVisionAnalysis.analysisType,
            angles: latestVisionAnalysis.angles,
            findings: latestVisionAnalysis.findings,
            summary: latestVisionAnalysis.summary,
            confidenceScore: latestVisionAnalysis.confidenceScore,
            createdAt: latestVisionAnalysis.createdAt,
          }) as Record<string, unknown>)
        : null

      return {
        profile: assessment.profile as Record<string, unknown> | undefined,
        assessment,
        postureAnalysis,
        visionAnalysis,
        labResults: labResults.map((result) => toPlainJson(result) as Record<string, unknown>),
        dietPlan: dietPlan ? (toPlainJson(dietPlan) as Record<string, unknown>) : null,
        exercisePlan: exercisePlan
          ? (toPlainJson(exercisePlan) as Record<string, unknown>)
          : null,
        weeklyCheckins: weeklyCheckins.map(
          (checkin) => toPlainJson(checkin) as Record<string, unknown>
        ),
      }
    } catch (error) {
      console.error("Failed to collect user data for recommendations:", error)
      throw new Error(
        error instanceof Error ? error.message : "Failed to collect user health data"
      )
    }
  }

  /**
   * Generates personalized AI recommendations for a user.
   */
  async generate(userId: string): Promise<RecommendationOutput> {
    try {
      const collectedData = await this.collectUserData(userId)
      const sanitized = sanitizeForLLM({
        profile: collectedData.profile ?? collectedData.assessment?.profile,
        lifestyle: collectedData.assessment?.lifestyle,
        nutritionProfile: collectedData.assessment?.nutritionProfile,
        medicalHistory: collectedData.assessment?.medicalHistory,
        goals: collectedData.assessment?.goals,
        painAssessments: collectedData.assessment?.painAssessments,
      })

      const calculated = calculateHealthScore(collectedData)
      const prompt = buildRecommendationPrompt(sanitized, collectedData, calculated)

      const llmResult = await llmClient.generate({
        userId,
        role: "RECOMMENDATION_ENGINE",
        userMessage: prompt,
        interactionType: "recommendation",
        contentCategory: "medical",
        maxTokens: 4096,
        skipRateLimit: true,
        inputContext: prompt,
      })

      if (llmResult.emergencyDetected) {
        return {
          healthScore: calculated.healthScore,
          healthScoreBreakdown: calculated.healthScoreBreakdown,
          topConcerns: [
            {
              category: "emergency",
              severity: "high",
              description: llmResult.data.message as string,
              evidence: "Emergency symptom language detected in user context",
            },
          ],
          recommendations: [],
          redFlags: ["Seek immediate medical attention"],
          disclaimer:
            "This platform cannot provide emergency care. Seek immediate medical attention.",
        }
      }

      const parsed = recommendationOutputSchema.safeParse(llmResult.data)
      if (!parsed.success) {
        throw new Error(`Invalid LLM recommendation response: ${parsed.error.message}`)
      }

      const safety = validateAIOutput(
        JSON.stringify(parsed.data),
        "RECOMMENDATION_ENGINE",
        prompt
      )

      let recommendation = parsed.data
      if (safety.emergencyDetected) {
        recommendation = {
          ...recommendation,
          redFlags: [...recommendation.redFlags, "Seek immediate medical attention"],
          disclaimer:
            "This platform cannot provide emergency care. Seek immediate medical attention.",
        }
      }

      if (!recommendation.disclaimer.toLowerCase().includes("not medical advice")) {
        recommendation = {
          ...recommendation,
          disclaimer: `${recommendation.disclaimer}\n\n${MEDICAL_DISCLAIMER}`,
        }
      }

      const finalOutput: RecommendationOutput = {
        ...recommendation,
        healthScore: calculated.healthScore,
        healthScoreBreakdown: calculated.healthScoreBreakdown,
      }

      await storeTimelineEntry(userId, finalOutput)

      return finalOutput
    } catch (error) {
      console.error("Recommendation generation failed:", error)
      throw error instanceof Error ? error : new Error("Recommendation generation failed")
    }
  }
}

/** Singleton recommendation engine instance. */
export const recommendationEngine = new RecommendationEngine()
