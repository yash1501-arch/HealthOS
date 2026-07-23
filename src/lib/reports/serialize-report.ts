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
  const parsedData = (report.analysis?.parsedData ?? {}) as {
    trends?: ReportDetail["analysis"] extends null ? never : NonNullable<ReportDetail["analysis"]>["trends"]
  }

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
          trends: parsedData.trends ?? [],
        }
      : null,
  }
}
