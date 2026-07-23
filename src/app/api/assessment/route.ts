import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"

// ─── Validation Schemas ───────────────────────────────────────

const personalInfoSchema = z.object({
  fullName: z.string().min(1, "Name is required").optional(),
  dateOfBirth: z.string().optional(),
  biologicalSex: z.enum(["male", "female", "other"]).optional(),
  heightCm: z.number().min(50).max(300).optional(),
  weightKg: z.number().min(10).max(500).optional(),
  waistCm: z.number().min(30).max(200).optional(),
  bloodGroup: z.string().optional(),
})

const occupationSchema = z.object({
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  workingHours: z.number().min(0).max(168).optional(),
  shiftSchedule: z.string().optional(),
  workType: z.string().optional(),
  sittingHours: z.number().min(0).max(24).optional(),
  standingHours: z.number().min(0).max(24).optional(),
  drivingHours: z.number().min(0).max(24).optional(),
  dailyActivity: z.string().optional(),
})

const lifestyleSchema = z.object({
  wakeUpTime: z.string().optional(),
  bedTime: z.string().optional(),
  avgSleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.string().optional(),
  waterIntakeL: z.number().min(0).max(20).optional(),
  sunlightMinutes: z.number().min(0).optional(),
  screenTimeHours: z.number().min(0).optional(),
  walkingSteps: z.number().min(0).optional(),
  exerciseFreq: z.string().optional(),
  stressLevel: z.number().min(0).max(10).optional(),
  smoking: z.string().optional(),
  alcohol: z.string().optional(),
  caffeineIntake: z.number().min(0).optional(),
})

const nutritionSchema = z.object({
  dietType: z.string().optional(),
  foodAllergies: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  religiousPreferences: z.array(z.string()).optional(),
  cookingTimeMin: z.number().min(0).optional(),
  monthlyBudget: z.number().min(0).optional(),
  favoriteFoods: z.array(z.string()).optional(),
  foodsToAvoid: z.array(z.string()).optional(),
})

const medicalHistorySchema = z.object({
  currentConditions: z.array(z.string()).optional(),
  pastIllnesses: z.array(z.string()).optional(),
  pastSurgeries: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  medicationDetails: z.any().optional(),
  allergies: z.array(z.string()).optional(),
  familyHistory: z.any().optional(),
  pregnancyStatus: z.string().optional(),
})

const painAssessmentSchema = z.object({
  bodyArea: z.string().min(1, "Body area is required"),
  severity: z.number().min(0).max(10),
  duration: z.string().optional(),
  frequency: z.string().optional(),
  painType: z.string().optional(),
  triggeringActivities: z.array(z.string()).optional(),
  relievingFactors: z.array(z.string()).optional(),
  morningStiffness: z.boolean().optional(),
  mobilityLimitation: z.string().optional(),
})

const goalSchema = z.object({
  goal: z.string().min(1, "Goal is required"),
  priority: z.number().default(0),
  targetDate: z.string().optional(),
})

const assessmentSchema = z.object({
  profile: personalInfoSchema.optional(),
  occupation: occupationSchema.optional(),
  lifestyle: lifestyleSchema.optional(),
  nutrition: nutritionSchema.optional(),
  medicalHistory: medicalHistorySchema.optional(),
  painAssessments: z.array(painAssessmentSchema).optional(),
  goals: z.array(goalSchema).optional(),
})

// ─── Routes ────────────────────────────────────────────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const [user, profile, occupation, lifestyle, nutritionProfile, medicalHistory, painAssessments, goals] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { onboardingComplete: true, email: true } }),
        prisma.profile.findUnique({ where: { userId } }),
        prisma.occupation.findUnique({ where: { userId } }),
        prisma.lifestyle.findUnique({ where: { userId } }),
        prisma.nutritionProfile.findUnique({ where: { userId } }),
        prisma.medicalHistory.findUnique({ where: { userId } }),
        prisma.painAssessment.findMany({ where: { userId, isActive: true } }),
        prisma.goal.findMany({ where: { userId, isActive: true }, orderBy: { priority: "asc" } }),
      ])

    return NextResponse.json({
      data: {
        onboardingComplete: user?.onboardingComplete ?? false,
        email: user?.email ?? null,
        occupation,
        lifestyle,
        nutrition: nutritionProfile,
        medicalHistory,
        painAssessments,
        goals,
      },
    })
  } catch (error) {
    console.error("Assessment GET error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = assessmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } },
        { status: 422 }
      )
    }

    const { profile, occupation, lifestyle, nutrition, medicalHistory, painAssessments, goals } = parsed.data

    // Use a transaction so everything is atomic
    await prisma.$transaction(async (tx: any) => {
      // Profile
      if (profile) {
        await tx.profile.upsert({
          where: { userId },
          create: {
            userId,
            fullName: profile.fullName ?? "",
            dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : new Date(),
            biologicalSex: profile.biologicalSex,
            heightCm: profile.heightCm,
            weightKg: profile.weightKg,
            waistCm: profile.waistCm,
            bloodGroup: profile.bloodGroup,
          },
          update: {
            ...(profile.fullName !== undefined && { fullName: profile.fullName }),
            ...(profile.dateOfBirth !== undefined && { dateOfBirth: new Date(profile.dateOfBirth) }),
            ...(profile.biologicalSex !== undefined && { biologicalSex: profile.biologicalSex }),
            ...(profile.heightCm !== undefined && { heightCm: profile.heightCm }),
            ...(profile.weightKg !== undefined && { weightKg: profile.weightKg }),
            ...(profile.waistCm !== undefined && { waistCm: profile.waistCm }),
            ...(profile.bloodGroup !== undefined && { bloodGroup: profile.bloodGroup }),
          },
        })
      }

      // Occupation — filter out undefined values
      if (occupation) {
        const occCreate = Object.fromEntries(
          Object.entries(occupation).filter(([_, v]) => v !== undefined)
        )
        await tx.occupation.upsert({
          where: { userId },
          create: { userId, ...occCreate },
          update: occCreate,
        })
      }

      // Lifestyle
      if (lifestyle) {
        const lifeCreate = Object.fromEntries(
          Object.entries(lifestyle).filter(([_, v]) => v !== undefined)
        )
        await tx.lifestyle.upsert({
          where: { userId },
          create: { userId, ...lifeCreate },
          update: lifeCreate,
        })
      }

      // Nutrition
      if (nutrition) {
        const nutCreate = Object.fromEntries(
          Object.entries(nutrition).filter(([_, v]) => v !== undefined)
        )
        await tx.nutritionProfile.upsert({
          where: { userId },
          create: { userId, ...nutCreate },
          update: nutCreate,
        })
      }

      // Medical History — handle familyHistory JSON specially
      if (medicalHistory) {
        const medCreate: Record<string, unknown> = Object.fromEntries(
          Object.entries(medicalHistory).filter(([_, v]) => v !== undefined)
        )
        // Convert familyHistory text to JSON if it's a string
        if (typeof medCreate.familyHistory === "string") {
          const text = medCreate.familyHistory as string
          if (text.trim()) {
            // Try to parse as JSON first, otherwise store as structured text
            try {
              medCreate.familyHistory = JSON.parse(text)
            } catch {
              // Store as a simple object with a "notes" key
              medCreate.familyHistory = { notes: text }
            }
          } else {
            medCreate.familyHistory = null
          }
        }
        await tx.medicalHistory.upsert({
          where: { userId },
          create: { userId, ...medCreate },
          update: medCreate,
        })
      }

      // Pain Assessments — deactivate old ones, create new
      if (painAssessments) {
        await tx.painAssessment.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false },
        })

        if (painAssessments.length > 0) {
          await tx.painAssessment.createMany({
            data: painAssessments.map((p) => ({
              userId,
              bodyArea: p.bodyArea,
              severity: p.severity,
              duration: p.duration ?? undefined,
              frequency: p.frequency ?? undefined,
              painType: p.painType ?? undefined,
              triggeringActivities: p.triggeringActivities ?? [],
              relievingFactors: p.relievingFactors ?? [],
              morningStiffness: p.morningStiffness ?? undefined,
              mobilityLimitation: p.mobilityLimitation ?? undefined,
            })),
          })
        }
      }

      // Goals — deactivate old ones, create new
      if (goals) {
        await tx.goal.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false },
        })

        if (goals.length > 0) {
          await tx.goal.createMany({
            data: goals.map((g) => ({
              userId,
              goal: g.goal,
              priority: g.priority,
              targetDate: g.targetDate ? new Date(g.targetDate) : null,
            })),
          })
        }
      }

      // Mark onboarding as complete if profile + at least one goal exists
      const hasProfile = await tx.profile.findUnique({ where: { userId } })
      const activeGoals = await tx.goal.findFirst({ where: { userId, isActive: true } })

      if (hasProfile && activeGoals) {
        await tx.user.update({
          where: { id: userId },
          data: { onboardingComplete: true },
        })
      }

      // Auto-populate medications from medical history
      const currentMeds = (medicalHistory as Record<string, unknown> | undefined)?.currentMedications
      if (Array.isArray(currentMeds) && currentMeds.length > 0) {
        const existingMeds = await tx.healthTimelineEntry.findMany({
          where: { userId, eventType: "medication_def" },
        })
        if (existingMeds.length === 0) {
          for (const medName of currentMeds) {
            await tx.healthTimelineEntry.create({
              data: {
                userId,
                eventType: "medication_def",
                title: `Medication: ${medName}`,
                description: "Added from health assessment",
                eventDate: new Date(),
                metadata: {
                  id: `med-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  name: medName,
                  dosage: "1",
                  unit: "dose",
                  frequency: "daily",
                  timeOfDay: ["08:00"],
                  notes: "Added from assessment",
                  isActive: true,
                  createdAt: new Date().toISOString(),
                },
              },
            })
          }
        }
      }
    })

    return NextResponse.json({ data: { success: true } }, { status: 200 })
  } catch (error) {
    console.error("Assessment POST error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
