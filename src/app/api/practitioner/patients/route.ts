import crypto from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"

// ─── GET /api/practitioner/patients ──────────────────────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const practitioner = await prisma.practitioner.findUnique({
      where: { userId },
    })
    if (!practitioner) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "You are not registered as a practitioner" } }, { status: 403 })
    }

    const links = await prisma.patientLink.findMany({
      where: { practitionerId: practitioner.id, status: "ACTIVE" },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true } },
            weeklyCheckins: { orderBy: { weekStart: "desc" }, take: 1, select: { weekStart: true } },
            postureCharacteristics: { where: { isActive: true }, select: { severity: true, characteristic: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const patients = links.map((link) => {
      const patient = link.patient
      const latestCheckin = patient.weeklyCheckins[0]
      const healthScore = computePatientHealthScore(patient.postureCharacteristics)

      return {
        linkId: link.id,
        patientId: patient.id,
        name: patient.profile?.fullName ?? "Unknown Patient",
        email: patient.email,
        sharedData: link.sharedData,
        lastVisit: latestCheckin?.weekStart?.toISOString() ?? null,
        healthScore,
        concerns: patient.postureCharacteristics
          .filter((p) => p.severity !== "none")
          .slice(0, 3)
          .map((p) => ({ characteristic: p.characteristic, severity: p.severity })),
      }
    })

    return NextResponse.json({ data: { patients } })
  } catch (error) {
    console.error("Practitioner patients error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}

// ─── POST /api/practitioner/patients ─────────────────────────────

const inviteSchema = z.object({
  patientEmail: z.string().email("Invalid email address"),
  message: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const practitioner = await prisma.practitioner.findUnique({ where: { userId } })
    if (!practitioner) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "You are not registered as a practitioner" } }, { status: 403 })
    }

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } }, { status: 422 })
    }

    const { patientEmail } = parsed.data

    const patient = await prisma.user.findUnique({
      where: { email: patientEmail },
      include: { profile: { select: { fullName: true } } },
    })
    if (!patient) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "No user found with this email. Ask the patient to sign up first." } }, { status: 404 })
    }

    // Check if already linked
    const existingLink = await prisma.patientLink.findUnique({
      where: { practitionerId_patientId: { practitionerId: practitioner.id, patientId: patient.id } },
    })
    if (existingLink?.status === "ACTIVE") {
      return NextResponse.json({ error: { code: "CONFLICT", message: "This patient is already connected to you" } }, { status: 409 })
    }

    // Create or reactivate link — generate a simple invite code (short uuid)
    const inviteCode = crypto.randomUUID().split("-").slice(0, 2).join("-")
    const link = existingLink
      ? await prisma.patientLink.update({
          where: { id: existingLink.id },
          data: { status: "ACTIVE", sharedData: [] },
        })
      : await prisma.patientLink.create({
          data: { practitionerId: practitioner.id, patientId: patient.id, sharedData: [] },
        })

    const patientName = patient.profile?.fullName ?? "Unknown"

    return NextResponse.json({
      data: {
        linkId: link.id,
        inviteCode,
        patientName,
        patientEmail: patient.email,
        status: "invited",
        message: "Patient invited successfully. They will need to share their data from their settings.",
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Practitioner invite error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}

// ─── Helper ─────────────────────────────────────────────────────

function computePatientHealthScore(postureChars: Array<{ severity: string | null }>): number {
  if (postureChars.length === 0) return 0
  let score = 70
  for (const pc of postureChars) {
    if (pc.severity === "severe") score -= 15
    else if (pc.severity === "moderate") score -= 10
    else if (pc.severity === "mild") score -= 5
  }
  return Math.max(0, Math.min(100, score))
}
