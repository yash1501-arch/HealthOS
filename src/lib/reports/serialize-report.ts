import type { ReportDetail, ReportListItem } from "@/types/reports"
import { getReportFileUrl } from "@/lib/storage"

type ReportWithRelations = {
  id: string
  reportType: string | null
  title: string | null
  reportDate: Date | null
  institutionName: string | null
  status: string
  fileKey: string
  mimeType: string | null
  fileSizeBytes: bigint | null
  createdAt: Date
  analysis: {
    patientSummary: string | null
    doctorSummary: string | null
    confidenceScore: unknown
    modelVersion: string | null
    parsedData: unknown
  } | null
  labResults: Array<{
    id: string
    testName: string
    testCategory: string | null
    value: unknown
    unit: string | null
    referenceRange: string | null
    flag: string | null
    isAbnormal: boolean | null
  }>
}

export function serializeReportListItem(report: {
  id: string
  reportType: string | null
  title: string | null
  reportDate: Date | null
  institutionName: string | null
  status: string
  createdAt: Date
  analysis: { id: string } | null
  _count?: { labResults: number }
}): ReportListItem {
  return {
    id: report.id,
    reportType: report.reportType,
    title: report.title,
    reportDate: report.reportDate?.toISOString().slice(0, 10) ?? null,
    institutionName: report.institutionName,
    status: report.status,
    hasAnalysis: Boolean(report.analysis),
    labResultCount: report._count?.labResults ?? 0,
    createdAt: report.createdAt.toISOString(),
  }
}

export function serializeReportDetail(report: ReportWithRelations): ReportDetail {
  const parsedData = (report.analysis?.parsedData ?? {}) as Record<string, unknown>
  const parsedTrends = (Array.isArray(parsedData.trends) ? parsedData.trends : []) as ReportDetail["analysis"] extends null ? never : NonNullable<ReportDetail["analysis"]>["trends"]
  const parsedExplanations = (Array.isArray(parsedData.labValueExplanations) ? parsedData.labValueExplanations : undefined) as ReportDetail["analysis"] extends null ? never : NonNullable<ReportDetail["analysis"]>["labValueExplanations"]
  const parsedConcerns = (Array.isArray(parsedData.concerns) ? parsedData.concerns : undefined) as ReportDetail["analysis"] extends null ? never : NonNullable<ReportDetail["analysis"]>["concerns"]

  return {
    id: report.id,
    reportType: report.reportType,
    title: report.title,
    reportDate: report.reportDate?.toISOString().slice(0, 10) ?? null,
    institutionName: report.institutionName,
    status: report.status,
    fileUrl: getReportFileUrl(report.fileKey),
    mimeType: report.mimeType,
    fileSizeBytes: report.fileSizeBytes ? Number(report.fileSizeBytes) : null,
    createdAt: report.createdAt.toISOString(),
    analysis: report.analysis
      ? {
          patientSummary: report.analysis.patientSummary,
          doctorSummary: report.analysis.doctorSummary,
          confidenceScore:
            report.analysis.confidenceScore !== null && report.analysis.confidenceScore !== undefined
              ? Number(report.analysis.confidenceScore)
              : null,
          modelVersion: report.analysis.modelVersion,
          labResults: report.labResults.map((row) => ({
            id: row.id,
            testName: row.testName,
            testCategory: row.testCategory,
            value: row.value !== null && row.value !== undefined ? Number(row.value) : null,
            unit: row.unit,
            referenceRange: row.referenceRange,
            flag: row.flag,
            isAbnormal: row.isAbnormal,
          })),
          trends: parsedTrends ?? [],
          labValueExplanations: parsedExplanations,
          concerns: parsedConcerns,
        }
      : null,
  }
}
