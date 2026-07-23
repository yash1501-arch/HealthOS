export type ReportType =
  | "blood_report"
  | "mri"
  | "xray"
  | "ct"
  | "dexa"
  | "other"

export type ReportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "partial"

export type LabFlag = "normal" | "low" | "high" | "critical" | "unknown"

export type ParsedLabResult = {
  testName: string
  testCategory?: string
  value: number | null
  unit?: string
  referenceRange?: string
  flag: LabFlag
  isAbnormal: boolean
}

export type LabValueExplanation = {
  testName: string
  value: string | number
  status: "normal" | "high" | "low" | "unknown"
  explanation: string
  lifestyleFactors: string[]
  dietarySuggestions: string[]
}

export type LabTrend = {
  testName: string
  previousValue: number | null
  currentValue: number | null
  previousDate: string | null
  trend: "improving" | "worsening" | "stable" | "new"
}

export type ReportListItem = {
  id: string
  reportType: ReportType | string | null
  title: string | null
  reportDate: string | null
  institutionName: string | null
  status: ReportStatus | string
  hasAnalysis: boolean
  labResultCount: number
  createdAt: string
}

export type ReportDetail = {
  id: string
  reportType: ReportType | string | null
  title: string | null
  reportDate: string | null
  institutionName: string | null
  status: ReportStatus | string
  fileUrl: string | null
  mimeType: string | null
  fileSizeBytes: number | null
  createdAt: string
  analysis: {
    patientSummary: string | null
    doctorSummary: string | null
    confidenceScore: number | null
    modelVersion: string | null
    labResults: Array<{
      id: string
      testName: string
      testCategory: string | null
      value: number | null
      unit: string | null
      referenceRange: string | null
      flag: string | null
      isAbnormal: boolean | null
    }>
    trends: LabTrend[]
    labValueExplanations?: LabValueExplanation[]
    concerns?: string[]
  } | null
}

export type UploadReportResponse = {
  reportId: string
  status: ReportStatus
  estimatedTime: number
}
