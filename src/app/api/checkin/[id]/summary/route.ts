import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"

/**
 * GET /api/checkin/[id]/summary — Fetch a check-in with its AI summary.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const checkin = await prisma.weeklyCheckin.findFirst({
      where: { id, userId },
    })

    if (!checkin) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Check-in not found" } },
        { status: 404 }
      )
    }

    let aiSummary = null
    if (checkin.aiSummary) {
      try {
        aiSummary =
          typeof checkin.aiSummary === "string"
            ? JSON.parse(checkin.aiSummary)
            : checkin.aiSummary
      } catch {
        aiSummary = checkin.aiSummary
      }
    }

    return NextResponse.json({
      data: {
        id: checkin.id,
        weekStart: checkin.weekStart.toISOString().slice(0, 10),
        energyLevel: checkin.energyLevel,
        sleepQuality: checkin.sleepQuality,
        mood: checkin.mood,
        exerciseCompletion: checkin.exerciseCompletion,
        dietAdherence: checkin.dietAdherence,
        painScores: checkin.painScores,
        sleepHours: checkin.sleepHours ? Number(checkin.sleepHours) : null,
        weightKg: checkin.weightKg ? Number(checkin.weightKg) : null,
        notes: checkin.notes,
        aiSummary,
        createdAt: checkin.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Checkin summary GET error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
