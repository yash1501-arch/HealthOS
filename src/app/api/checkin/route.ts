import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"

// ─── Schema ──────────────────────────────────────────────────────

const checkinSchema = z.object({
  painScores: z.record(z.string(), z.number().min(0).max(10)).optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.number().min(1).max(10).optional(),
  mood: z.number().min(1).max(10).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  bloodPressureSystolic: z.number().min(60).max(250).optional(),
  bloodPressureDiastolic: z.number().min(30).max(150).optional(),
  waterIntakeL: z.number().min(0).max(20).optional(),
  exerciseCompletion: z.number().min(0).max(100).optional(),
  walkingSteps: z.number().min(0).optional(),
  dietAdherence: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
})

// ─── GET /api/checkin — Get latest checkin & history ────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const [latest, history, painAreas] = await Promise.all([
      prisma.weeklyCheckin.findFirst({
        where: { userId },
        orderBy: { weekStart: "desc" },
      }),
      prisma.weeklyCheckin.findMany({
        where: { userId },
        orderBy: { weekStart: "desc" },
        take: 8,
      }),
      prisma.painAssessment.findMany({
        where: { userId, isActive: true },
        select: { bodyArea: true, severity: true },
      }),
    ])

    return NextResponse.json({
      data: {
        latest,
        history,
        painAreas: painAreas.map((p: any) => ({ area: p.bodyArea, severity: p.severity })),
        canCheckin: canCheckThisWeek(latest?.weekStart ?? null),
      },
    })
  } catch (error) {
    console.error("Checkin GET error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── POST /api/checkin — Submit a weekly checkin ────────────────

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
    const parsed = checkinSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } },
        { status: 422 }
      )
    }

    const weekStart = getMonday(new Date())

    // Check if already checked in this week
    const existing = await prisma.weeklyCheckin.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    })

    if (existing) {
      // Update existing
      const updateData: Record<string, unknown> = {
        ...parsed.data,
        aiSummary: undefined,
      }
      if (parsed.data.painScores === undefined) {
        delete updateData.painScores
      } else {
        updateData.painScores = parsed.data.painScores
      }
      const updated = await prisma.weeklyCheckin.update({
        where: { id: existing.id },
        data: updateData as any,
      })
      return NextResponse.json({ data: updated })
    }

    // Create new
    const checkin = await prisma.weeklyCheckin.create({
      data: {
        userId,
        weekStart,
        ...parsed.data,
      },
    })

    // Update progress metrics
    if (parsed.data.weightKg) {
      await prisma.progressMetric.create({
        data: {
          userId,
          metricDate: new Date(),
          metricType: "weight",
          value: parsed.data.weightKg,
          source: "weekly_checkin",
        },
      })
    }

    // Create timeline entry
    await prisma.healthTimelineEntry.create({
      data: {
        userId,
        eventType: "weekly_checkin",
        title: `Week ${formatWeek(weekStart)} check-in`,
        description: `Energy: ${parsed.data.energyLevel ?? "—"}/10 · Mood: ${parsed.data.mood ?? "—"}/10 · Sleep: ${parsed.data.sleepHours ?? "—"}h`,
        eventDate: new Date(),
        metadata: parsed.data,
      },
    })

    return NextResponse.json({ data: checkin }, { status: 201 })
  } catch (error) {
    console.error("Checkin POST error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeek(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" })
  const day = date.getDate()
  return `${month} ${day}`
}

function canCheckThisWeek(lastWeekStart: Date | null): boolean {
  if (!lastWeekStart) return true
  const thisMonday = getMonday(new Date())
  return lastWeekStart < thisMonday
}
