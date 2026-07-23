import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { readReportFile } from "@/lib/storage"
import { checkRateLimit } from "@/lib/ai/rate-limiter"
import { extractTextFromBuffer } from "@/lib/ai/ocr-engine"
import { parseLabValues, standardizeLabValues } from "@/lib/ai/ocr-engine"
import { reportAnalyzer } from "@/lib/ai/engines/report-analyzer"
import type { ReportAnalysisOutput } from "@/types/ai-schemas"

// ─── POST /api/reports/[id]/analyze — On-demand AI report analysis ──

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

    // Rate limit: 5 analyses per day
    const rateLimit = await checkRateLimit(userId, "report")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Daily analysis limit reached (${rateLimit.limit}/day). Resets at ${rateLimit.resetAt.toISOString()}.`,
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
          },
        }
      )
    }

    // Fetch report record
    const report = await prisma.medicalReport.findFirst({
      where: { id, userId, deletedAt: null },
    })

    if (!report) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Report not found" } },
        { status: 404 }
      )
    }

    // Update status to processing
    await prisma.medicalReport.update({
      where: { id },
      data: { status: "processing" },
    })

    const startedAt = Date.now()

    try {
      // Read file from storage
      const fileBuffer = await readReportFile(report.fileKey)
      const mimeType = report.mimeType ?? "application/octet-stream"

      // Extract text via OCR
      const extractedText = await extractTextFromBuffer(fileBuffer, mimeType)

      // Parse lab values using heuristics + LLM
      const parsedValues = parseLabValues(extractedText)
      const standardizedValues = standardizeLabValues(parsedValues)

      // Fetch previous lab values for trend analysis
      const previousLabResults = await prisma.labResult.findMany({
        where: {
          userId,
          reportId: { not: id },
          report: { deletedAt: null },
        },
        include: {
          report: { select: { reportDate: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })

      const previousLabValues = previousLabResults.map((row) => ({
        testName: row.testName,
        value: row.value !== null ? Number(row.value) : null,
        testDate: row.testDate?.toISOString() ?? row.report?.reportDate?.toISOString() ?? null,
      }))

      // Run AI analysis (handles persistence internally via persistAnalysisResults)
      const analysis = await reportAnalyzer.analyze(
        userId,
        report.reportType ?? "other",
        extractedText,
        standardizedValues,
        previousLabValues,
        id
      )

      const processingTimeMs = Date.now() - startedAt

      return NextResponse.json(
        {
          data: {
            reportId: id,
            ...analysis,
            processingTimeMs,
          },
        },
        {
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
          },
        }
      )
    } catch (analysisError) {
      // Mark report as failed
      await prisma.medicalReport.update({
        where: { id },
        data: { status: "failed" },
      })

      throw analysisError
    }
  } catch (error) {
    console.error("Report analysis API error:", error)

    const message = error instanceof Error ? error.message : "Analysis failed"

    if (message.includes("rate limit")) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message } },
        { status: 429 }
      )
    }

    if (message.includes("not found") || message.includes("No report")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Report not found" } },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: {
          code: "AI_ERROR",
          message: "Analysis temporarily unavailable. Try again later.",
        },
      },
      { status: 500 }
    )
  }
}
