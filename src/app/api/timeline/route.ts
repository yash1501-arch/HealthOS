import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"

// ─── GET /api/timeline — Get user's health timeline ─────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const entries = await prisma.healthTimelineEntry.findMany({
      where: { userId },
      orderBy: { eventDate: "desc" },
      take: 50,
    })

    return NextResponse.json({
      data: entries.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        title: e.title,
        description: e.description,
        eventDate: e.eventDate.toISOString(),
        metadata: e.metadata,
      })),
    })
  } catch (error) {
    console.error("Timeline GET error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
