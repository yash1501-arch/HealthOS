import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"

const ALLOWED_DATA_TYPES = ["posture", "labs", "diet", "exercise", "checkins", "timeline", "goals", "recommendations"] as const

const shareSchema = z.object({
  practitionerId: z.string().uuid("Invalid practitioner ID"),
  dataTypes: z.array(z.enum(ALLOWED_DATA_TYPES)).min(1, "Select at least one data type to share"),
})

// ─── POST /api/patient/share ─────────────────────────────────────

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const body = await request.json()
    const parsed = shareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } }, { status: 422 })
    }

    const { practitionerId, dataTypes } = parsed.data

    // Verify practitioner exists
    const practitioner = await prisma.practitioner.findUnique({ where: { id: practitionerId } })
    if (!practitioner) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Practitioner not found" } }, { status: 404 })
    }

    // Upsert the patient link
    const link = await prisma.patientLink.upsert({
      where: { practitionerId_patientId: { practitionerId, patientId: userId } },
      update: { status: "ACTIVE", sharedData: dataTypes },
      create: { practitionerId, patientId: userId, status: "ACTIVE", sharedData: dataTypes },
    })

    return NextResponse.json({
      data: {
        linkId: link.id,
        sharedData: link.sharedData,
        practitionerName: practitioner.clinicName ?? "Your Practitioner",
        message: "Your data has been shared successfully. You can update or revoke access anytime.",
      },
    }, { status: 200 })
  } catch (error) {
    console.error("Share data error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}
