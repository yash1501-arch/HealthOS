import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { onboardingSchema } from "@/lib/onboarding-schema"

/**
 * POST /api/onboarding/complete
 *
 * Receives aggregated onboarding data from the wizard and persists it
 * to the Lifestyle, NutritionProfile, and MedicalHistory models within
 * a single Prisma $transaction.
 *
 * Security:
 * - JWT-authenticated via getAuthUserId()
 * - All data validated against Zod schemas before DB writes
 * - Data is linked to the authenticated userId (no ID injection)
 * - Upsert used to handle re-submission (e.g., re-opening onboarding)
 *
 * Request body: { lifestyle: {...}, nutrition: {...}, medicalHistory: {...} }
 */
export async function POST(request: Request) {
  try {
    // ── Authenticate ──────────────────────────────────────────
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    // ── Parse & validate request body ────────────────────────
    const body: unknown = await request.json()
    const parsed = onboardingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid onboarding data",
            details: parsed.error.flatten(),
          },
        },
        { status: 422 }
      )
    }

    const { lifestyle, nutrition, medicalHistory } = parsed.data

    // ── Persist via transaction ───────────────────────────────
    await prisma.$transaction(async (tx) => {
      // Upsert Lifestyle
      await tx.lifestyle.upsert({
        where: { userId },
        create: {
          userId,
          wakeUpTime: lifestyle.wakeUpTime || null,
          bedTime: lifestyle.bedTime || null,
          avgSleepHours: lifestyle.avgSleepHours,
          sleepQuality: lifestyle.sleepQuality || null,
          waterIntakeL: lifestyle.waterIntakeL,
          sunlightMinutes: lifestyle.sunlightMinutes,
          screenTimeHours: lifestyle.screenTimeHours,
          walkingSteps: lifestyle.walkingSteps,
          exerciseFreq: lifestyle.exerciseFreq || null,
          stressLevel: lifestyle.stressLevel,
          smoking: lifestyle.smoking || null,
          alcohol: lifestyle.alcohol || null,
          caffeineIntake: lifestyle.caffeineIntake,
        },
        update: {
          wakeUpTime: lifestyle.wakeUpTime || null,
          bedTime: lifestyle.bedTime || null,
          avgSleepHours: lifestyle.avgSleepHours,
          sleepQuality: lifestyle.sleepQuality || null,
          waterIntakeL: lifestyle.waterIntakeL,
          sunlightMinutes: lifestyle.sunlightMinutes,
          screenTimeHours: lifestyle.screenTimeHours,
          walkingSteps: lifestyle.walkingSteps,
          exerciseFreq: lifestyle.exerciseFreq || null,
          stressLevel: lifestyle.stressLevel,
          smoking: lifestyle.smoking || null,
          alcohol: lifestyle.alcohol || null,
          caffeineIntake: lifestyle.caffeineIntake,
        },
      })

      // Upsert NutritionProfile
      await tx.nutritionProfile.upsert({
        where: { userId },
        create: {
          userId,
          dietType: nutrition.dietType || null,
          foodAllergies: nutrition.foodAllergies ?? [],
          dietaryRestrictions: nutrition.dietaryRestrictions ?? [],
          religiousPreferences: nutrition.religiousPreferences ?? [],
          cookingTimeMin: nutrition.cookingTimeMin,
          monthlyBudget: nutrition.monthlyBudget,
          favoriteFoods: nutrition.favoriteFoods ?? [],
          foodsToAvoid: nutrition.foodsToAvoid ?? [],
        },
        update: {
          dietType: nutrition.dietType || null,
          foodAllergies: nutrition.foodAllergies ?? [],
          dietaryRestrictions: nutrition.dietaryRestrictions ?? [],
          religiousPreferences: nutrition.religiousPreferences ?? [],
          cookingTimeMin: nutrition.cookingTimeMin,
          monthlyBudget: nutrition.monthlyBudget,
          favoriteFoods: nutrition.favoriteFoods ?? [],
          foodsToAvoid: nutrition.foodsToAvoid ?? [],
        },
      })

      // Upsert MedicalHistory
      await tx.medicalHistory.upsert({
        where: { userId },
        create: {
          userId,
          currentConditions: medicalHistory.currentConditions ?? [],
          pastIllnesses: medicalHistory.pastIllnesses ?? [],
          pastSurgeries: medicalHistory.pastSurgeries ?? [],
          currentMedications: medicalHistory.currentMedications ?? [],
          allergies: medicalHistory.allergies ?? [],
          familyHistory: medicalHistory.familyHistory || undefined,
          pregnancyStatus: medicalHistory.pregnancyStatus || null,
        },
        update: {
          currentConditions: medicalHistory.currentConditions ?? [],
          pastIllnesses: medicalHistory.pastIllnesses ?? [],
          pastSurgeries: medicalHistory.pastSurgeries ?? [],
          currentMedications: medicalHistory.currentMedications ?? [],
          allergies: medicalHistory.allergies ?? [],
          familyHistory: medicalHistory.familyHistory || undefined,
          pregnancyStatus: medicalHistory.pregnancyStatus || null,
        },
      })

      // Mark user onboarding as complete
      await tx.user.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      })
    })

    // ── Success response ──────────────────────────────────────
    return NextResponse.json({
      data: {
        success: true,
        message: "Onboarding completed successfully",
      },
    })
  } catch (error) {
    console.error("[Onboarding] Submission failed:", error)

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to save onboarding data",
        },
      },
      { status: 500 }
    )
  }
}
