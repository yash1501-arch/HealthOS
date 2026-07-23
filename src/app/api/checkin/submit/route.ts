import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"
import { checkInEngine } from "@/lib/ai/engines/checkin-engine"
import { checkRateLimit } from "@/lib/ai/rate-limiter"

const submitSchema = z.object({
  energyLevel: z.number().min(1).max(10),
  sleepQuality: z.number().min(1).max(10),
  stressLevel: z.number().min(1).max(10),
  exerciseAdherence: z.number().min(0).max(100),
  dietAdherence: z.number().min(0).max(100),
  mood: z.number().min(1).max(10),
  painLevels: z
    .array(z.object({ location: z.string().min(1), severity: z.number().min(0).max(10) }))
    .optional()
    .default([]),
  challenges: z.string().max(2000).optional().default(""),
  wins: z.string().max(2000).optional().default(""),
  questions: z.string().max(2000).optional().default(""),
  sleepHours: z.number().min(0).max(24).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  waterIntakeL: z.number().min(0).max(20).optional(),
  walkingSteps: z.number().min(0).optional(),
})

/**
 * POST /api/checkin/submit — Submit a weekly check-in and receive an AI-generated summary.
 */
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON body")
    })

    const rateCheck = await checkRateLimit(userId, "checkin")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Check-in limit reached (${rateCheck.limit}/week). Resets at ${rateCheck.resetAt.toISOString()}.`,
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": String(rateCheck.remaining),
            "X-RateLimit-Reset": rateCheck.resetAt.toISOString(),
          },
        }
      )
    }

    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
          },
        },
        { status: 422 }
      )
    }

    const responses = parsed.data
    const weekStart = getMonday(new Date())

    // Persist check-in first (save user data before AI call)
    const checkin = await prisma.weeklyCheckin.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: {
        energyLevel: responses.energyLevel,
        sleepQuality: responses.sleepQuality,
        mood: responses.mood,
        exerciseCompletion: responses.exerciseAdherence,
        dietAdherence: responses.dietAdherence,
        painScores: Object.fromEntries(
          responses.painLevels.map((p) => [p.location, p.severity])
        ),
        notes: `Challenges: ${responses.challenges}\nWins: ${responses.wins}\nQuestions: ${responses.questions}`,
        sleepHours: responses.sleepHours ?? null,
        weightKg: responses.weightKg ?? null,
        waterIntakeL: responses.waterIntakeL ?? null,
        walkingSteps: responses.walkingSteps ?? null,
      },
      create: {
        userId,
        weekStart,
        energyLevel: responses.energyLevel,
        sleepQuality: responses.sleepQuality,
        mood: responses.mood,
        exerciseCompletion: responses.exerciseAdherence,
        dietAdherence: responses.dietAdherence,
        painScores: Object.fromEntries(
          responses.painLevels.map((p) => [p.location, p.severity])
        ),
        notes: `Challenges: ${responses.challenges}\nWins: ${responses.wins}\nQuestions: ${responses.questions}`,
        sleepHours: responses.sleepHours ?? null,
        weightKg: responses.weightKg ?? null,
        waterIntakeL: responses.waterIntakeL ?? null,
        walkingSteps: responses.walkingSteps ?? null,
      },
    })

    // Generate AI summary (after data is safely persisted)
    let aiSummary
    try {
      aiSummary = await checkInEngine.generateSummary(userId, 0, responses)
      // Update with AI summary
      await prisma.weeklyCheckin.update({
        where: { id: checkin.id },
        data: { aiSummary: JSON.stringify(aiSummary) },
      })
    } catch (summaryError) {
      console.error("Check-in AI summary generation failed (data already saved):", summaryError)
      aiSummary = null
    }

    // Timeline entry
    await prisma.healthTimelineEntry.create({
      data: {
        userId,
        eventType: "weekly_checkin",
        title: `Week Check-in`,
        description: `Energy: ${responses.energyLevel}/10 · Mood: ${responses.mood}/10 · Sleep: ${responses.sleepQuality}/10`,
        eventDate: new Date(),
        metadata: { energyLevel: responses.energyLevel, mood: responses.mood, sleepQuality: responses.sleepQuality },
      },
    })

    return NextResponse.json(
      {
        data: {
          id: checkin.id,
          weekStart: checkin.weekStart.toISOString().slice(0, 10),
          summary: aiSummary,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Checkin submit API error:", error)
    const message = error instanceof Error ? error.message : "Check-in failed"
    if (message.includes("Invalid JSON")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
        { status: 422 }
      )
    }
    return NextResponse.json(
      { error: { code: "AI_ERROR", message: "Check-in temporarily unavailable. Try again later." } },
      { status: 500 }
    )
  }
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
