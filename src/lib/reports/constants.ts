export const MAX_REPORT_FILE_BYTES = 20 * 1024 * 1024

export const ALLOWED_REPORT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const

export const REPORT_TYPES = [
  { value: "blood_report", label: "Blood Report" },
  { value: "mri", label: "MRI" },
  { value: "xray", label: "X-Ray" },
  { value: "ct", label: "CT Scan" },
  { value: "dexa", label: "DEXA Scan" },
  { value: "other", label: "Other" },
] as const

export const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  partial: "Needs review",
}
