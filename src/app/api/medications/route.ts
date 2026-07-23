import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"

// ─── Types ───────────────────────────────────────────────────────

type Medication = {
  id: string
  name: string
  dosage: string
  unit: string
  frequency: string
  timeOfDay: string[]
  notes: string
  isActive: boolean
  createdAt: string
}

// ─── GET /api/medications — List medications + today's logs ─────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    // Load medication logs from ProgressMetric
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [logs, assessmentMeds] = await Promise.all([
      prisma.progressMetric.findMany({
        where: {
          userId,
          metricType: "medication_log",
          metricDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.medicalHistory.findUnique({
        where: { userId },
        select: { currentMedications: true },
      }),
    ])

    // Load saved medications from healthTimelineEntry metadata
    const definitions = await prisma.healthTimelineEntry.findMany({
      where: {
        userId,
        eventType: "medication_def",
      },
      orderBy: { eventDate: "desc" },
      take: 50,
    })

    const medications: Medication[] = definitions
      .filter((d: any) => d.metadata !== null)
      .map((d: any) => d.metadata as unknown as Medication)
      .filter((m: Medication) => m.isActive !== false)

    // Also include meds from assessment if no custom meds exist
    if (medications.length === 0 && assessmentMeds?.currentMedications?.length) {
      for (const name of assessmentMeds.currentMedications) {
        medications.push({
          id: `assessment-${name}`,
          name,
          dosage: "1",
          unit: "dose",
          frequency: "daily",
          timeOfDay: ["08:00"],
          notes: "Added from assessment",
          isActive: true,
          createdAt: new Date().toISOString(),
        })
      }
    }

    const loggedMeds = new Set(
      logs.map((l: any) => l.source).filter(Boolean)
    )

    return NextResponse.json({
      data: {
        medications,
        todayLogs: Array.from(loggedMeds),
      },
    })
  } catch (error) {
    console.error("Medications error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── POST /api/medications — Add or log medication ──────────────

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const body = await request.json()
    const action = body.action || "save"

    if (action === "save") {
      // Save a medication definition
      const { name, dosage, unit, frequency, timeOfDay, notes } = body
      if (!name) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Medication name is required" } },
          { status: 422 }
        )
      }

      const med: Medication = {
        id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        dosage: dosage || "1",
        unit: unit || "dose",
        frequency: frequency || "daily",
        timeOfDay: timeOfDay || ["08:00"],
        notes: notes || "",
        isActive: true,
        createdAt: new Date().toISOString(),
      }

      await prisma.healthTimelineEntry.create({
        data: {
          userId,
          eventType: "medication_def",
          title: `Medication: ${name}`,
          description: `${dosage} ${unit} ${frequency}`,
          eventDate: new Date(),
          metadata: med as any,
        },
      })

      return NextResponse.json({ data: med }, { status: 201 })
    }

    if (action === "log") {
      // Log a medication as taken
      const { medicationName } = body
      if (!medicationName) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Medication name required" } },
          { status: 422 }
        )
      }

      await prisma.progressMetric.create({
        data: {
          userId,
          metricDate: new Date(),
          metricType: "medication_log",
          value: 1,
          source: medicationName,
        },
      })

      return NextResponse.json({ data: { success: true } })
    }

    if (action === "delete") {
      // Soft-delete by creating a new definition with isActive: false
      const { medId } = body
      if (!medId) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Medication ID required" } },
          { status: 422 }
        )
      }

      // Delete the entry
      await prisma.healthTimelineEntry.deleteMany({
        where: {
          userId,
          eventType: "medication_def",
          metadata: { path: ["id"], equals: medId } as any,
        },
      })

      return NextResponse.json({ data: { success: true } })
    }

    return NextResponse.json(
      { error: { code: "INVALID_ACTION", message: "Unknown action" } },
      { status: 400 }
    )
  } catch (error) {
    console.error("Medications POST error:", error)
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
