import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"

const reminderSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["medication", "checkin", "exercise", "water", "sleep", "custom"]),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  daysOfWeek: z.array(z.number().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  isActive: z.boolean().default(true),
  note: z.string().optional(),
})

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    // Load from healthTimeline with eventType "reminder"
    const entries = await prisma.healthTimelineEntry.findMany({
      where: { userId, eventType: "reminder" },
      orderBy: { eventDate: "desc" },
      take: 50,
    })

    const reminders = (entries as any[])
      .filter((e) => e.metadata !== null)
      .map((e) => e.metadata as unknown as Reminder)

    return NextResponse.json({ data: reminders })
  } catch (error) {
    console.error("Reminders error:", error)
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
    const parsed = reminderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid reminder" } },
        { status: 422 }
      )
    }

    const reminder: Reminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    }

    await prisma.healthTimelineEntry.create({
      data: {
        userId,
        eventType: "reminder",
        title: `Reminder: ${reminder.title}`,
        description: `${reminder.type} · ${reminder.time}`,
        eventDate: new Date(),
        metadata: reminder as any,
      },
    })

    return NextResponse.json({ data: reminder }, { status: 201 })
  } catch (error) {
    console.error("Reminder create error:", error)
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
    if (!id) return validationError("Reminder ID required")

    const entries = await prisma.healthTimelineEntry.findMany({
      where: { userId, eventType: "reminder" },
    })

    for (const entry of entries) {
      const data = entry.metadata as Record<string, unknown> | null
      if (data?.id === id) {
        await prisma.healthTimelineEntry.delete({ where: { id: entry.id } })
        return NextResponse.json({ data: { success: true } })
      }
    }

    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Reminder not found" } },
      { status: 404 }
    )
  } catch (error) {
    console.error("Reminder delete error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

type Reminder = {
  id: string
  title: string
  type: string
  time: string
  daysOfWeek: number[]
  isActive: boolean
  note?: string
  createdAt: string
}

function unauth() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
}

function validationError(msg: string) {
  return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: msg } }, { status: 422 })
}
