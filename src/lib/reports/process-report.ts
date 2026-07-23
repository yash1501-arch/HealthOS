import { prisma } from "@/lib/prisma"
import { extractTextFromReport } from "@/lib/reports/extract-text"
import { parseLabResultsFromText } from "@/lib/reports/parse-lab-results"
import { generateReportSummaries } from "@/lib/reports/generate-summaries"
import { computeLabTrends, computeConfidenceScore } from "@/lib/reports/compute-trends"

export async function processMedicalReport(reportId: string): Promise<void> {
  const report = await prisma.medicalReport.findFirst({
    where: { id: reportId, deletedAt: null },
  })

  if (!report) return

  const startedAt = Date.now()

  try {
    await prisma.medicalReport.update({
      where: { id: reportId },
      data: { status: "processing" },
    })

    const rawText = await extractTextFromReport(report.fileKey, report.mimeType)
    const labResults = await parseLabResultsFromText(rawText)
    const usedLlm = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)

    const summaries = await generateReportSummaries(
      rawText,
      labResults,
      report.reportType ?? "other"
    )

    const historicalResults = await prisma.labResult.findMany({
      where: {
        userId: report.userId,
        reportId: { not: reportId },
        report: { deletedAt: null },
      },
      include: {
        report: {
          select: { reportDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as Array<{
      testName: string
      value: unknown
      testDate: Date | null
      report: { reportDate: Date | null }
      createdAt: Date
    }>

    const trends = computeLabTrends(
      labResults.map((r) => ({ testName: r.testName, value: r.value })),
      historicalResults.map((row) => ({
        testName: row.testName,
        value: row.value ? Number(row.value) : null,
        testDate: row.testDate,
        reportDate: row.report.reportDate,
        createdAt: row.createdAt,
      })),
      report.reportDate
    )

    const confidenceScore = computeConfidenceScore(labResults.length, rawText.length, usedLlm)
    const status =
      labResults.length === 0 ? "partial" : confidenceScore < 0.55 ? "partial" : "completed"

    await prisma.$transaction(async (tx: any) => {
      await tx.labResult.deleteMany({ where: { reportId } })
      await tx.reportAnalysis.deleteMany({ where: { reportId } })

      if (labResults.length > 0) {
        await tx.labResult.createMany({
          data: labResults.map((result) => ({
            userId: report.userId,
            reportId,
            testName: result.testName,
            testCategory: result.testCategory,
            value: result.value,
            unit: result.unit,
            referenceRange: result.referenceRange,
            isAbnormal: result.isAbnormal,
            flag: result.flag,
            testDate: report.reportDate,
          })),
        })
      }

      await tx.reportAnalysis.create({
        data: {
          reportId,
          userId: report.userId,
          rawText: rawText.slice(0, 50000),
          parsedData: { labResults, trends },
          patientSummary: summaries.patientSummary,
          doctorSummary: summaries.doctorSummary,
          confidenceScore,
          processingTimeMs: Date.now() - startedAt,
          modelVersion: summaries.modelVersion,
        },
      })

      await tx.medicalReport.update({
        where: { id: reportId },
        data: { status },
      })

      await tx.healthTimelineEntry.create({
        data: {
          userId: report.userId,
          eventType: "report_uploaded",
          referenceId: reportId,
          title: report.title ?? "Medical report uploaded",
          description: summaries.patientSummary.slice(0, 280),
          eventDate: report.reportDate ?? new Date(),
          metadata: {
            reportType: report.reportType,
            status,
            labResultCount: labResults.length,
          },
        },
      })

      await tx.aiAuditLog.create({
        data: {
          userId: report.userId,
          module: "medical_reports",
          action: "process_report",
          prompt: `${report.reportType ?? "report"} (${report.mimeType ?? "unknown"})`,
          response: `${labResults.length} lab values extracted`,
          model: summaries.modelVersion,
          latencyMs: Date.now() - startedAt,
        },
      })
    })
  } catch (error) {
    console.error(`Report processing failed (${reportId}):`, error)

    await prisma.medicalReport.update({
      where: { id: reportId },
      data: { status: "failed" },
    })

    await prisma.reportAnalysis.upsert({
      where: { reportId },
      create: {
        reportId,
        userId: report.userId,
        patientSummary:
          error instanceof Error
            ? error.message
            : "Report processing failed. Please try uploading again.",
        doctorSummary: "Processing failed.",
        processingTimeMs: Date.now() - startedAt,
        modelVersion: "error",
      },
      update: {
        patientSummary:
          error instanceof Error
            ? error.message
            : "Report processing failed. Please try uploading again.",
        doctorSummary: "Processing failed.",
        processingTimeMs: Date.now() - startedAt,
        modelVersion: "error",
      },
    })
  }
}

export function queueMedicalReportProcessing(reportId: string): void {
  void processMedicalReport(reportId)
}
