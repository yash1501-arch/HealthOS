import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"

// ─── POST /api/exercise/report — Save exercise session report ──

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const body = await request.json()

    // Save as timeline entry + recommendations
    const { dayName, focus, overallScore, totalDuration, results, recommendations } = body

    // Save report
    await prisma.healthTimelineEntry.create({
      data: {
        userId,
        eventType: "vision_analysis",
        title: `Workout: ${dayName || "Session"} (${focus || "full_body"})`,
        description: `Score: ${overallScore}% · ${results?.length || 0} exercises · ${Math.round((totalDuration || 0) / 60)} min`,
        eventDate: new Date(),
        metadata: {
          type: "exercise_session",
          dayName,
          focus,
          overallScore,
          totalDuration,
          results,
          recommendations: recommendations || [],
          timestamp: Date.now(),
        },
      },
    })

    // Save recommendations as goal notes
    if (recommendations?.length > 0) {
      for (const rec of recommendations.slice(0, 3)) {
        await prisma.recommendation.create({
          data: {
            userId,
            version: 1,
            summary: rec,
            suggestions: { source: "exercise_session" },
          },
        })
      }
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Exercise report error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save report" } },
      { status: 500 }
    )
  }
}

// ─── GET /api/exercise/report — Get recent reports ──────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const reports = await prisma.healthTimelineEntry.findMany({
      where: {
        userId,
        eventType: "vision_analysis",
        metadata: { path: ["type"], equals: "exercise_session" } as any,
      },
      orderBy: { eventDate: "desc" },
      take: 10,
    })

    const parsed = reports.map((r) => ({
      id: r.id,
      date: r.eventDate.toISOString(),
      title: r.title,
      description: r.description,
      metadata: r.metadata,
    }))

    return NextResponse.json({ data: parsed })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

function unauth() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
    { status: 401 }
  )
}
