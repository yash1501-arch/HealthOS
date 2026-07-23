import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { saveReportFile } from "@/lib/storage"
import { queueMedicalReportProcessing } from "@/lib/reports/process-report"
import { serializeReportListItem } from "@/lib/reports/serialize-report"
import { MAX_REPORT_FILE_BYTES, ALLOWED_REPORT_MIME_TYPES } from "@/lib/reports/constants"

// ─── GET /api/reports — List user's reports ──────────────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const reports = await prisma.medicalReport.findMany({
      where: { userId, deletedAt: null },
      include: {
        analysis: { select: { id: true } },
        _count: { select: { labResults: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      data: reports.map((r) => serializeReportListItem(r as any)),
    })
  } catch (error) {
    console.error("Reports list error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── POST /api/reports — Upload a new medical report ────────────

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const reportType = (formData.get("reportType") as string) || undefined
    const title = (formData.get("title") as string) || undefined
    const reportDate = (formData.get("reportDate") as string) || undefined
    const institutionName = (formData.get("institutionName") as string) || undefined

    if (!file) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No file provided" } },
        { status: 422 }
      )
    }

    // Validate file size
    if (file.size > MAX_REPORT_FILE_BYTES) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `File too large (max ${MAX_REPORT_FILE_BYTES / 1024 / 1024}MB)` } },
        { status: 422 }
      )
    }

    // Validate file type
    if (!ALLOWED_REPORT_MIME_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Unsupported file type. Upload PDF, JPEG, or PNG." } },
        { status: 422 }
      )
    }

    // Save file to storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { fileKey, fileSizeBytes } = await saveReportFile(userId, buffer, file.type, file.name)

    // Create database record
    const report = await prisma.medicalReport.create({
      data: {
        userId,
        reportType,
        title: title || file.name,
        fileKey,
        fileSizeBytes,
        mimeType: file.type,
        reportDate: reportDate ? new Date(reportDate) : undefined,
        institutionName,
        status: "pending",
      },
    })

    // Queue processing in background
    queueMedicalReportProcessing(report.id)

    return NextResponse.json(
      {
        data: {
          id: report.id,
          status: "pending",
          estimatedTime: 30_000, // ~30 seconds estimate
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Report upload error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Upload failed" } },
      { status: 500 }
    )
  }
}
