import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { queueMedicalReportProcessing } from "@/lib/reports/process-report"

// ─── POST /api/reports/[id]/reprocess — Retry failed analysis ──

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const report = await prisma.medicalReport.findFirst({
      where: { id, userId, deletedAt: null },
    })

    if (!report) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Report not found" } },
        { status: 404 }
      )
    }

    // Reset to pending and queue
    await prisma.medicalReport.update({
      where: { id },
      data: { status: "pending" },
    })

    queueMedicalReportProcessing(id)

    return NextResponse.json({ data: { success: true, status: "pending" } })
  } catch (error) {
    console.error("Reprocess error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
