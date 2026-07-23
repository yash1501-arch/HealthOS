import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"

const goalSchema = z.object({
  goal: z.string().min(1),
  priority: z.number().min(0).max(99).default(0),
  targetDate: z.string().optional(),
})

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const goals = await prisma.goal.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: "asc" },
    })

    return NextResponse.json({
      data: goals.map((g: any) => ({
        id: g.id,
        goal: g.goal,
        priority: g.priority,
        targetDate: g.targetDate?.toISOString().slice(0, 10) ?? null,
        createdAt: g.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Goals error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const body = await request.json()
    const parsed = goalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid goal" } },
        { status: 422 }
      )
    }

    const goal = await prisma.goal.create({
      data: {
        userId,
        goal: parsed.data.goal,
        priority: parsed.data.priority,
        targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      },
    })

    // Timeline entry
    await prisma.healthTimelineEntry.create({
      data: {
        userId,
        eventType: "goal_achieved",
        referenceId: goal.id,
        title: `New goal: ${parsed.data.goal}`,
        eventDate: new Date(),
      },
    })

    return NextResponse.json({ data: { id: goal.id, goal: goal.goal, priority: goal.priority } }, { status: 201 })
  } catch (error) {
    console.error("Goal create error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Goal ID required" } },
        { status: 422 }
      )
    }

    await prisma.goal.updateMany({
      where: { id, userId },
      data: { isActive: false },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Goal delete error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

function unauth() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
    { status: 401 }
  )
}
