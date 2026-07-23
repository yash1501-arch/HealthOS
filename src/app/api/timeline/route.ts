import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"

// ─── GET /api/timeline — Get user's health timeline ─────────────

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const type = url.searchParams.get("type")
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize")) || 20))

    const where: Record<string, unknown> = { userId }

    // Filter by event type(s) — comma-separated
    if (type) {
      const types = type.split(",").map((t) => t.trim()).filter(Boolean)
      if (types.length > 0) {
        const categoryMap: Record<string, string[]> = {
          posture: ["posture_analysis"],
          vision: ["vision_analysis"],
          labs: ["lab_result", "lab_results"],
          diet: ["diet_plan_created"],
          exercise: ["exercise_plan_created"],
          checkin: ["weekly_checkin", "checkin"],
          routine: ["routine_generated"],
          recommendation: ["recommendation"],
          medication: ["medication"],
          reminder: ["reminder"],
          report: ["medical_report", "report_uploaded"],
        }

        const eventTypes: string[] = []
        for (const t of types) {
          const mapped = categoryMap[t] ?? [t]
          eventTypes.push(...mapped)
        }
        where.eventType = { in: eventTypes }
      }
    }

    // Filter by date range
    if (startDate || endDate) {
      const eventDate: Record<string, Date> = {}
      if (startDate) eventDate.gte = new Date(startDate)
      if (endDate) eventDate.lte = new Date(endDate)
      where.eventDate = eventDate
    }

    const [entries, total] = await Promise.all([
      (prisma.healthTimelineEntry.findMany as (
        args: Record<string, unknown>
      ) => ReturnType<typeof prisma.healthTimelineEntry.findMany>)({
        where,
        orderBy: { eventDate: "desc" } as const,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      (prisma.healthTimelineEntry.count as (
        args: Record<string, unknown>
      ) => ReturnType<typeof prisma.healthTimelineEntry.count>)({
        where,
      }),
    ])

    return NextResponse.json({
      data: {
        entries: entries.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          category: categorizeEventType(e.eventType),
          title: e.title,
          description: e.description,
          eventDate: e.eventDate.toISOString(),
          metadata: e.metadata,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("Timeline GET error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

/** Maps a DB event_type string to a display category. */
function categorizeEventType(eventType: string): string {
  const map: Record<string, string> = {
    posture_analysis: "posture",
    vision_analysis: "vision",
    lab_result: "labs",
    lab_results: "labs",
    diet_plan_created: "diet",
    exercise_plan_created: "exercise",
    weekly_checkin: "checkin",
    checkin: "checkin",
    routine_generated: "routine",
    recommendation: "recommendation",
    medication: "medication",
    reminder: "reminder",
    medical_report: "report",
    report_uploaded: "report",
  }
  return map[eventType] ?? "other"
}
