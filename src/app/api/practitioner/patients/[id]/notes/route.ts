import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"

// ─── GET /api/practitioner/patients/[id]/notes ───────────────────

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const practitioner = await prisma.practitioner.findUnique({ where: { userId } })
    if (!practitioner) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a practitioner" } }, { status: 403 })
    }

    const { id: patientId } = await params

    // Verify the link exists and is active
    const link = await prisma.patientLink.findUnique({
      where: { practitionerId_patientId: { practitionerId: practitioner.id, patientId } },
    })
    if (!link || link.status !== "ACTIVE") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Patient not found or link is inactive" } }, { status: 404 })
    }

    // Fetch clinical notes from the health timeline (stored as event type "clinical_note")
    const notes = await prisma.healthTimelineEntry.findMany({
      where: {
        userId: patientId,
        eventType: "clinical_note",
        metadata: { path: ["practitionerId"], equals: practitioner.id },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, createdAt: true, metadata: true },
    })

    return NextResponse.json({ data: { notes } })
  } catch (error) {
    console.error("Fetch notes error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}

// ─── POST /api/practitioner/patients/[id]/notes ──────────────────

const noteSchema = z.object({
  content: z.string().min(1, "Note content is required").max(5000),
  category: z.enum(["observation", "recommendation", "follow_up", "other"]).default("observation"),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const practitioner = await prisma.practitioner.findUnique({
      where: { userId },
      include: { user: { select: { profile: { select: { fullName: true } } } } },
    })
    if (!practitioner) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a practitioner" } }, { status: 403 })
    }

    const { id: patientId } = await params

    // Verify the link exists and is active
    const link = await prisma.patientLink.findUnique({
      where: { practitionerId_patientId: { practitionerId: practitioner.id, patientId } },
    })
    if (!link || link.status !== "ACTIVE") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Patient not found or link is inactive" } }, { status: 404 })
    }

    const body = await request.json()
    const parsed = noteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } }, { status: 422 })
    }

    const practitionerName = practitioner.user.profile?.fullName ?? "Clinician"

    const note = await prisma.healthTimelineEntry.create({
      data: {
        userId: patientId,
        eventType: "clinical_note",
        title: `Clinical note from ${practitionerName}`,
        description: parsed.data.content,
        eventDate: new Date(),
        metadata: {
          practitionerId: practitioner.id,
          practitionerName,
          category: parsed.data.category,
        },
      },
    })

    return NextResponse.json({ data: { id: note.id, createdAt: note.createdAt, content: parsed.data.content } }, { status: 201 })
  } catch (error) {
    console.error("Add note error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}
