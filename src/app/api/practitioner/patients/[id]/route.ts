import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"

// ─── GET /api/practitioner/patients/[id] ─────────────────────────
// Returns full patient detail data for the practitioner view.

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

    // Verify the active link exists
    const link = await prisma.patientLink.findUnique({
      where: { practitionerId_patientId: { practitionerId: practitioner.id, patientId } },
    })
    if (!link || link.status !== "ACTIVE") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Patient not found or link is inactive" } }, { status: 404 })
    }

    // Fetch patient details
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true, dateOfBirth: true, biologicalSex: true } },
        postureCharacteristics: {
          where: { isActive: true },
          select: { characteristic: true, severity: true, description: true },
          orderBy: { createdAt: "desc" },
        },
        labResults: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { testName: true, value: true, unit: true, isAbnormal: true, testDate: true, createdAt: true },
        },
        dietPlans: {
          where: { isActive: true },
          take: 1,
          select: { id: true, weekStart: true, weekEnd: true },
          orderBy: { createdAt: "desc" },
        },
        exercisePlans: {
          where: { isActive: true },
          take: 1,
          select: { id: true, weekStart: true, weekEnd: true },
          orderBy: { createdAt: "desc" },
        },
        weeklyCheckins: {
          take: 1,
          orderBy: { weekStart: "desc" },
          select: { weekStart: true, aiSummary: true, energyLevel: true, sleepQuality: true, mood: true, painScores: true },
        },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Patient not found" } }, { status: 404 })
    }

    // Fetch clinical notes
    const notes = await prisma.healthTimelineEntry.findMany({
      where: {
        userId: patientId,
        eventType: "clinical_note",
        metadata: { path: ["practitionerId"], equals: practitioner.id },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, description: true, createdAt: true, metadata: true },
    })

    const latestCheckin = patient.weeklyCheckins[0]
    const hasDietPlan = patient.dietPlans.length > 0
    const hasExercisePlan = patient.exercisePlans.length > 0
    const labResults = patient.labResults.map((lr) => ({
      testName: lr.testName,
      value: lr.value ? Number(lr.value) : null,
      unit: lr.unit ?? "",
      isAbnormal: lr.isAbnormal,
      date: lr.testDate?.toISOString() ?? lr.createdAt.toISOString(),
    }))

    const postureChars = patient.postureCharacteristics.map((pc) => ({
      characteristic: pc.characteristic,
      severity: pc.severity,
      description: pc.description,
    }))

    // Compute health score from posture
    const healthScore = computeHealthScore(postureChars)

    return NextResponse.json({
      data: {
        id: patient.id,
        name: patient.profile?.fullName ?? "Unknown Patient",
        email: patient.email,
        healthScore,
        sharedData: link.sharedData,
        postureChars,
        lastLabResults: labResults,
        hasDietPlan,
        hasExercisePlan,
        latestCheckin: latestCheckin
          ? {
              weekStart: latestCheckin.weekStart.toISOString(),
              aiSummary: latestCheckin.aiSummary,
              energyLevel: latestCheckin.energyLevel,
            }
          : null,
        clinicalNotes: notes.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.description ?? "",
          createdAt: n.createdAt.toISOString(),
          metadata: (n.metadata as Record<string, unknown>) ?? {},
        })),
      },
    })
  } catch (error) {
    console.error("Patient detail error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}

function computeHealthScore(postureChars: Array<{ severity: string | null }>): number {
  if (postureChars.length === 0) return 0
  let score = 70
  for (const pc of postureChars) {
    if (pc.severity === "severe") score -= 15
    else if (pc.severity === "moderate") score -= 10
    else if (pc.severity === "mild") score -= 5
  }
  return Math.max(0, Math.min(100, score))
}
