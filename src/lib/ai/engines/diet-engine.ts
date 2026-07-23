import { prisma } from "@/lib/prisma"
import { llmClient } from "@/lib/ai/llm-client"
import { sanitizeForLLM, stripPHI } from "@/lib/ai/phii-filter"
import { validateAIOutput, MEDICAL_DISCLAIMER } from "@/lib/ai/safety-engine"
import { z } from "zod"
import type { WeekPlan, DayPlan, DailyTargets, ShoppingItem, MealSlot } from "@/types/diet"

// ─── Types ───────────────────────────────────────────────────────

export interface MacrosResult {
  dailyCalories: number
  proteinGrams: number
  carbsGrams: number
  fatsGrams: number
}

export interface DietPlanOutput {
  planName: string
  dailyCalorieTarget: number
  macroSplit: { protein: number; carbs: number; fats: number }
  weeklyPlan: WeekDayPlan[]
  groceryList: GroceryItem[]
  foodsToAvoid: string[]
  foodsToInclude: string[]
  labBasedRecommendations: string[]
  tips: string[]
  disclaimer: string
  confidence: number
}

export interface WeekDayPlan {
  day: string
  meals: DietMeal[]
  dailyTotals: { calories: number; protein: number; carbs: number; fats: number }
  hydrationTarget: string
  supplements: Supplement[]
}

export interface DietMeal {
  type: "breakfast" | "snack" | "lunch" | "dinner"
  time: string
  name: string
  description: string
  ingredients: string[]
  calories: number
  protein: number
  carbs: number
  fats: number
  prepTime: number
  recipe: string
}

export interface GroceryItem {
  item: string
  quantity: string
  category: string
}

export interface Supplement {
  name: string
  dosage: string
  timing: string
  reason: string
}

export interface ModificationRequest {
  planId: string
  modification: string
}

// ─── BMR & Macro Calculation ────────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const EXERCISE_FREQ_MAP: Record<string, string> = {
  daily: "active",
  "3-4_per_week": "moderate",
  "1-2_per_week": "light",
  rarely: "sedentary",
  never: "sedentary",
}

/**
 * Calculates daily caloric needs and macro split using the Mifflin-St Jeor equation.
 *
 * @param profile - User profile data including weight, height, age, sex, activity, and goals.
 * @returns Daily calorie and macro targets in grams.
 */
export function calculateMacros(profile: {
  weightKg: number
  heightCm: number
  ageYears: number
  isFemale: boolean
  activityLevel: string
  goal: string
}): MacrosResult {
  const { weightKg, heightCm, ageYears, isFemale, activityLevel, goal } = profile

  // Mifflin-St Jeor BMR
  const bmr = isFemale
    ? 447.6 + 9.25 * weightKg + 3.1 * heightCm - 4.33 * ageYears
    : 88.36 + 13.4 * weightKg + 4.8 * heightCm - 5.68 * ageYears

  const activityKey = EXERCISE_FREQ_MAP[activityLevel] ?? activityLevel
  const multiplier = ACTIVITY_MULTIPLIERS[activityKey] ?? 1.375
  const tdee = Math.round(bmr * multiplier)

  // Goal adjustment
  let calories = tdee
  let proteinPerKg = 1.6

  const goalLower = goal.toLowerCase()
  if (goalLower.includes("lose") || goalLower.includes("weight loss")) {
    calories -= 500
    proteinPerKg = 2.0
  } else if (goalLower.includes("gain") || goalLower.includes("muscle")) {
    calories += 300
    proteinPerKg = 2.2
  } else if (goalLower.includes("build_routine") || goalLower.includes("increase_energy")) {
    proteinPerKg = 1.8
  }

  calories = Math.max(calories, 1400)

  const proteinGrams = Math.round(Math.min(proteinPerKg * weightKg, 280))
  const fatsGrams = Math.round((calories * 0.28) / 9)
  const carbsGrams = Math.round((calories - proteinGrams * 4 - fatsGrams * 9) / 4)

  return {
    dailyCalories: calories,
    proteinGrams,
    carbsGrams: Math.max(carbsGrams, 80),
    fatsGrams: Math.max(fatsGrams, 30),
  }
}

// ─── Helper ──────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * Converts Prisma values (Decimal, Date, BigInt) into JSON-safe primitives.
 */
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
 * Computes age in years from a date of birth.
 */
function computeAgeYears(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1
  }
  return age
}

/**
 * Gets the Monday of the current week at midnight.
 */
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── AI Diet Engine ──────────────────────────────────────────────

/**
 * AI-powered diet plan generation engine.
 *
 * Uses the LLM client to create personalized 7-day meal plans based on
 * user profile, goals, medical history, and lab results.
 */
export class DietEngine {
  /**
   * Collects all relevant user data for diet plan generation from the database.
   */
  async collectUserData(userId: string): Promise<Record<string, JsonValue>> {
    try {
      const [
        profile,
        nutritionProfile,
        medicalHistory,
        lifestyle,
        goals,
        labResults,
      ] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.nutritionProfile.findUnique({ where: { userId } }),
        prisma.medicalHistory.findUnique({ where: { userId } }),
        prisma.lifestyle.findUnique({ where: { userId } }),
        prisma.goal.findMany({ where: { userId, isActive: true } }),
        prisma.labResult.findMany({
          where: { userId },
          orderBy: { testDate: "desc" },
          take: 10,
        }),
      ])

      return {
        profile: profile ? (toPlainJson(profile) as Record<string, JsonValue>) : null,
        nutritionProfile: nutritionProfile
          ? (toPlainJson(nutritionProfile) as Record<string, JsonValue>)
          : null,
        medicalHistory: medicalHistory
          ? (toPlainJson(medicalHistory) as Record<string, JsonValue>)
          : null,
        lifestyle: lifestyle ? (toPlainJson(lifestyle) as Record<string, JsonValue>) : null,
        goals: goals.map((g) => toPlainJson(g)),
        labResults: labResults.map((r) => toPlainJson(r)),
      }
    } catch (error) {
      console.error("Failed to collect user data for diet plan:", error)
      throw new Error(
        error instanceof Error ? error.message : "Failed to collect user data"
      )
    }
  }

  /**
   * Generates a personalized 7-day AI diet plan for the given user.
   *
   * Collects user data, computes macros from profile, sanitizes PHI, sends a
   * structured prompt to the LLM, validates the response, runs safety checks,
   * and persists the plan to the database.
   */
  async generate(userId: string): Promise<DietPlanOutput> {
    try {
      const rawData = await this.collectUserData(userId)
      const profile = (rawData.profile ?? {}) as Record<string, unknown>
      const nutrition = (rawData.nutritionProfile ?? {}) as Record<string, unknown>
      const medical = (rawData.medicalHistory ?? {}) as Record<string, unknown>
      const lifestyle = (rawData.lifestyle ?? {}) as Record<string, unknown>
      const goalsList = (rawData.goals ?? []) as Array<Record<string, unknown>>
      const labResults = (rawData.labResults ?? []) as Array<Record<string, unknown>>

      // Compute macros
      const weightKg = profile.weightKg ? Number(profile.weightKg) : 70
      const heightCm = profile.heightCm ? Number(profile.heightCm) : 170
      const isFemale = profile.biologicalSex === "female"
      const activityLevel = (lifestyle.exerciseFreq as string) ?? "rarely"
      const primaryGoal = (goalsList[0]?.goal as string) ?? "maintenance"

      let ageYears = 30
      if (profile.dateOfBirth) {
        const dob =
          profile.dateOfBirth instanceof Date
            ? profile.dateOfBirth
            : new Date(profile.dateOfBirth as string)
        if (!Number.isNaN(dob.getTime())) {
          ageYears = computeAgeYears(dob)
        }
      }

      const macros = calculateMacros({
        weightKg,
        heightCm,
        ageYears,
        isFemale,
        activityLevel,
        goal: primaryGoal,
      })

      // Sanitize for LLM
      const sanitizedUser = sanitizeForLLM(rawData as Record<string, unknown>)

      // Build prompt
      const prompt = JSON.stringify(
        {
          userProfile: sanitizedUser,
          nutritionPreferences: {
            dietType: nutrition.dietType,
            foodAllergies: nutrition.foodAllergies,
            dietaryRestrictions: nutrition.dietaryRestrictions,
            religiousPreferences: nutrition.religiousPreferences,
            cookingTimeMin: nutrition.cookingTimeMin,
            monthlyBudget: nutrition.monthlyBudget,
            favoriteFoods: nutrition.favoriteFoods,
            foodsToAvoid: nutrition.foodsToAvoid,
          },
          medicalContext: {
            currentConditions: medical.currentConditions,
            currentMedications: medical.currentMedications,
            allergies: medical.allergies,
          },
          calculatedMacros: macros,
          labResults: labResults.map((r) => ({
            testName: r.testName,
            value: r.value,
            unit: r.unit,
            referenceRange: r.referenceRange,
            flag: r.flag,
          })),
          goals: goalsList.map((g) => g.goal),
          instructions:
            "Create a personalized 7-day diet plan based on this user's profile. " +
            "Respect ALL allergies, dietary restrictions, and medical conditions. " +
            "Use lab results to inform food recommendations (e.g., low iron → iron-rich foods). " +
            "Return valid JSON matching the required schema exactly. " +
            "Use cautious, non-diagnostic language. Include a disclaimer.",
        },
        null,
        2
      )

      const llmResult = await llmClient.generate({
        userId,
        role: "DIET_PLANNER",
        userMessage: prompt,
        interactionType: "diet",
        contentCategory: "lifestyle",
        maxTokens: 8192,
        inputContext: stripPHI(JSON.stringify({ medicalContext: { currentConditions: medical.currentConditions, allergies: medical.allergies }, labResults: labResults.slice(0, 3) })),
      })

      if (llmResult.emergencyDetected) {
        throw new Error("Emergency content detected in diet plan generation input")
      }

      // Zod validation
      const zodParsed = dietPlanOutputSchema.safeParse(llmResult.data)
      if (!zodParsed.success) {
        throw new Error(`Invalid diet plan response: ${zodParsed.error.message}`)
      }
      const validatedData = zodParsed.data

      // Safety validation
      const safety = validateAIOutput(
        JSON.stringify(validatedData),
        "DIET_PLANNER",
        prompt
      )

      let planData = validatedData as DietPlanOutput
      if (safety.warnings.length > 0) {
        try {
          planData = JSON.parse(safety.sanitizedOutput) as DietPlanOutput
        } catch {
          planData = validatedData as DietPlanOutput
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
      sunday.setDate(sunday.getDate() + 6)

      await prisma.dietPlan.create({
        data: {
          userId,
          weekStart: monday,
          weekEnd: sunday,
          meals: JSON.parse(JSON.stringify(planData.weeklyPlan)),
          dailyTargets: JSON.parse(
            JSON.stringify({
              calories: macros.dailyCalories,
              protein: macros.proteinGrams,
              carbs: macros.carbsGrams,
              fat: macros.fatsGrams,
            })
          ),
          shoppingList: JSON.parse(JSON.stringify(planData.groceryList)),
        },
      })

      // Timeline entry
      await prisma.healthTimelineEntry.create({
        data: {
          userId,
          eventType: "diet_plan_created",
          title: "AI Diet Plan Generated",
          description: `7-day ${planData.planName} plan — ${macros.dailyCalories} cal/day target`,
          eventDate: new Date(),
          metadata: {
            planName: planData.planName,
            dailyCalories: macros.dailyCalories,
            protein: macros.proteinGrams,
            carbs: macros.carbsGrams,
            fats: macros.fatsGrams,
          },
        },
      })

      return planData
    } catch (error) {
      console.error("Diet plan generation failed:", error)
      throw error instanceof Error ? error : new Error("Diet plan generation failed")
    }
  }

  /**
   * Modifies an existing diet plan based on a user's natural-language request.
   *
   * Fetches the existing plan from the database, sends it along with the
   * modification request to the LLM, and returns an updated plan.
   */
  async modify(
    planId: string,
    modification: string
  ): Promise<DietPlanOutput> {
    try {
      const existingPlan = await prisma.dietPlan.findUnique({
        where: { id: planId },
      })

      if (!existingPlan) {
        throw new Error("Diet plan not found")
      }

      const currentPlan: DietPlanOutput = {
        planName: "Modified Plan",
        dailyCalorieTarget: 0,
        macroSplit: { protein: 0, carbs: 0, fats: 0 },
        weeklyPlan: (existingPlan.meals as unknown as WeekDayPlan[]) ?? [],
        groceryList: (existingPlan.shoppingList as unknown as GroceryItem[]) ?? [],
        foodsToAvoid: [],
        foodsToInclude: [],
        labBasedRecommendations: [],
        tips: [],
        disclaimer: "",
        confidence: 0.5,
      }

      if (existingPlan.dailyTargets) {
        const targets = existingPlan.dailyTargets as Record<string, unknown>
        currentPlan.dailyCalorieTarget = (targets.calories as number) ?? 0
        currentPlan.macroSplit = {
          protein: (targets.protein as number) ?? 0,
          carbs: (targets.carbs as number) ?? 0,
          fats: (targets.fat as number) ?? 0,
        }
      }

      const prompt = JSON.stringify(
        {
          existingPlan: currentPlan,
          modificationRequest: modification,
          instructions:
            "Modify the existing diet plan according to the user's request. " +
            "Return the FULL updated 7-day plan with all meals, groceries, and recommendations. " +
            "Only change what the user requested. Maintain all other meals and structure. " +
            "Return valid JSON matching the DietPlanOutput schema exactly. " +
            "Include a disclaimer.",
        },
        null,
        2
      )

      const llmResult = await llmClient.generate({
        userId: existingPlan.userId,
        role: "DIET_PLANNER",
        userMessage: prompt,
        interactionType: "diet",
        contentCategory: "lifestyle",
        maxTokens: 8192,
      })

      // Zod validation
      const zodParsed = dietPlanOutputSchema.safeParse(llmResult.data)
      if (!zodParsed.success) {
        throw new Error(`Invalid modified diet plan response: ${zodParsed.error.message}`)
      }
      const validated = zodParsed.data

      const safety = validateAIOutput(
        JSON.stringify(validated),
        "DIET_PLANNER",
        prompt
      )

      const updatedPlan: DietPlanOutput = safety.warnings.length > 0
        ? (() => {
            try {
              const parsed = JSON.parse(safety.sanitizedOutput)
              const zodCheck = dietPlanOutputSchema.safeParse(parsed)
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

      // Update the database record
      const monday = getMonday(new Date())
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)

      await prisma.dietPlan.update({
        where: { id: planId },
        data: {
          weekStart: monday,
          weekEnd: sunday,
          meals: JSON.parse(JSON.stringify(updatedPlan.weeklyPlan)),
          shoppingList: JSON.parse(JSON.stringify(updatedPlan.groceryList)),
        },
      })

      return updatedPlan
    } catch (error) {
      console.error("Diet plan modification failed:", error)
      throw error instanceof Error ? error : new Error("Diet plan modification failed")
    }
  }
}

// ─── Zod Schemas ─────────────────────────────────────────────────

const dietMealSchema = z.object({
  type: z.enum(["breakfast", "snack", "lunch", "dinner"]),
  time: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  ingredients: z.array(z.string()),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  prepTime: z.number().min(0),
  recipe: z.string(),
})

const supplementSchema = z.object({
  name: z.string().min(1),
  dosage: z.string(),
  timing: z.string(),
  reason: z.string(),
})

const weekDayPlanSchema = z.object({
  day: z.string().min(1),
  meals: z.array(dietMealSchema),
  dailyTotals: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fats: z.number().min(0),
  }),
  hydrationTarget: z.string(),
  supplements: z.array(supplementSchema),
})

const groceryItemSchema = z.object({
  item: z.string().min(1),
  quantity: z.string(),
  category: z.string(),
})

const dietPlanOutputSchema = z.object({
  planName: z.string().min(1),
  dailyCalorieTarget: z.number().min(0),
  macroSplit: z.object({
    protein: z.number().min(0).max(100),
    carbs: z.number().min(0).max(100),
    fats: z.number().min(0).max(100),
  }),
  weeklyPlan: z.array(weekDayPlanSchema).min(1),
  groceryList: z.array(groceryItemSchema),
  foodsToAvoid: z.array(z.string()),
  foodsToInclude: z.array(z.string()),
  labBasedRecommendations: z.array(z.string()),
  tips: z.array(z.string()),
  disclaimer: z.string(),
  confidence: z.number().min(0).max(1),
})

/** Singleton diet plan engine instance. */
export const dietEngine = new DietEngine()
