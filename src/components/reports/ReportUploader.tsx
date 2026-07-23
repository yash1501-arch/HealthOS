"use client"

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"
import type { ReportListItem } from "@/types/reports"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const
const ACCEPT_STRING = ".pdf,.jpg,.jpeg,.png,.webp"

const REPORT_TYPE_OPTIONS = [
  { value: "", label: "Auto-detect" },
  { value: "blood_report", label: "Blood Report" },
  { value: "mri", label: "MRI" },
  { value: "xray", label: "X-Ray" },
  { value: "ct", label: "CT Scan" },
  { value: "dexa", label: "DEXA Scan" },
  { value: "other", label: "Other" },
] as const

interface UploadState {
  status: "idle" | "uploading" | "processing" | "success" | "error"
  progress: number
  message: string
}

interface ReportUploaderProps {
  /** Called with the new report after successful upload. */
  onUploaded?: (report: ReportListItem) => void
  /** Called when the user cancels. */
  onCancel?: () => void
}

/**
 * Drag-and-drop medical report uploader with file validation,
 * metadata form, upload progress, and processing status.
 */
export function ReportUploader({ onUploaded, onCancel }: ReportUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [reportType, setReportType] = useState("")
  const [title, setTitle] = useState("")
  const [reportDate, setReportDate] = useState("")
  const [institution, setInstitution] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [upload, setUpload] = useState<UploadState>({
    status: "idle",
    progress: 0,
    message: "",
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((f: File): string | null => {
    if (!(ALLOWED_TYPES as readonly string[]).includes(f.type)) {
      return `Unsupported file type "${f.type || "unknown"}". Upload PDF, JPEG, PNG, or WEBP.`
    }
    if (f.size > MAX_FILE_BYTES) {
      return `File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_FILE_BYTES / 1024 / 1024}MB.`
    }
    return null
  }, [])

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f)
      if (err) {
        setUpload({ status: "error", progress: 0, message: err })
        return
      }
      setFile(f)
      setUpload({ status: "idle", progress: 0, message: "" })
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""))
    },
    [title, validateFile]
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setDragOver(false), [])

  const onFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleSubmit = useCallback(async () => {
    if (!file) return

    setUpload({ status: "uploading", progress: 10, message: "Uploading file..." })

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (reportType) formData.append("reportType", reportType)
      if (title) formData.append("title", title)
      if (reportDate) formData.append("reportDate", reportDate)
      if (institution) formData.append("institutionName", institution)

      setUpload({ status: "uploading", progress: 35, message: "Uploading to storage..." })

      const result = await api.post<{ id: string; status: string; estimatedTime: number }>(
        "/reports",
        formData as unknown as Record<string, unknown>,
        { headers: {} }
      )

      setUpload({
        status: "processing",
        progress: 70,
        message: "File uploaded. AI analysis queued...",
      })

      // Report created — fire callback immediately with optimistic data
      const newReport: ReportListItem = {
        id: result.id,
        reportType: reportType || null,
        title: title || file.name,
        reportDate: reportDate || null,
        institutionName: institution || null,
        status: result.status,
        hasAnalysis: false,
        labResultCount: 0,
        createdAt: new Date().toISOString(),
      }

      onUploaded?.(newReport)

      setUpload({
        status: "success",
        progress: 100,
        message: `Report uploaded successfully! Analysis will complete in ~${Math.round((result.estimatedTime ?? 30000) / 1000)}s.`,
      })
    } catch (err: unknown) {
      const e = err as { message?: string }
      setUpload({
        status: "error",
        progress: 0,
        message: e.message || "Upload failed. Please try again.",
      })
    }
  }, [file, reportType, title, reportDate, institution, onUploaded])

  const reset = useCallback(() => {
    setFile(null)
    setReportType("")
    if (!title.startsWith("Uploaded")) setTitle("")
    setReportDate("")
    setInstitution("")
    setUpload({ status: "idle", progress: 0, message: "" })
  }, [title])

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : "0"
  const isProcessing = upload.status === "uploading" || upload.status === "processing"

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#172033]">Upload Medical Report</h2>
          <p className="text-xs text-[#4B5870] mt-0.5">
            PDF, JPEG, PNG, or WEBP — up to {MAX_FILE_BYTES / 1024 / 1024}MB
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 text-[#4B5870]/50 hover:text-[#172033] transition-colors"
            aria-label="Cancel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Drop Zone ── */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          file
            ? "border-[#176B63]/30 bg-[#176B63]/3"
            : dragOver
              ? "border-[#176B63] bg-[#176B63]/5 scale-[1.01]"
              : "border-[#E2E8F0] hover:border-[#176B63]/30 hover:bg-[#F5F7FA]"
        }`}
      >
        {file ? (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#176B63]/10 flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" fill="none" stroke="#176B63" strokeWidth="1.5" className="w-6 h-6">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="font-medium text-[#172033]">{file.name}</p>
            <p className="text-xs text-[#4B5870]">{fileSizeMB} MB</p>
            {!isProcessing && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  reset()
                }}
                className="text-xs text-[#B53A45] hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#176B63]/5 border border-[#176B63]/10 flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" fill="none" stroke="#176B63" strokeWidth="1.5" className="w-7 h-7">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-[#172033] font-medium">
              Drop your report here or <span className="text-[#176B63]">browse</span>
            </p>
            <p className="text-xs text-[#4B5870]">
              PDF, JPEG, PNG, or WEBP — up to {MAX_FILE_BYTES / 1024 / 1024}MB
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={onFileInputChange}
          className="hidden"
          disabled={isProcessing}
        />
      </div>

      {/* ── Metadata Form ── */}
      <AnimatePresence>
        {file && !isProcessing && upload.status !== "success" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-medium text-[#4B5870] mb-1">
                Report Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="Blood Report - July 2026"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4B5870] mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="input-field appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2364748B%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
              >
                {REPORT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4B5870] mb-1">
                Report Date
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4B5870] mb-1">
                Institution
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="input-field"
                placeholder="Hospital or lab name"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Progress / Status ── */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex justify-between text-xs text-[#4B5870]">
              <span>{upload.message}</span>
              <span>{upload.progress}%</span>
            </div>
            <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#176B63] to-[#2FE6C4] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${upload.progress}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success Message ── */}
      <AnimatePresence>
        {upload.status === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#176B63]/5 border border-[#176B63]/10 rounded-xl p-4 flex items-start gap-3"
          >
            <div className="w-6 h-6 rounded-full bg-[#176B63] flex items-center justify-center shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3.5 h-3.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[#176B63]">Upload successful!</p>
              <p className="text-xs text-[#4B5870] mt-0.5">{upload.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Message ── */}
      <AnimatePresence>
        {upload.status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-4 flex items-start gap-3"
          >
            <div className="w-6 h-6 rounded-full bg-[#B53A45] flex items-center justify-center shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3.5 h-3.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[#B53A45]">Upload failed</p>
              <p className="text-xs text-[#4B5870] mt-0.5">{upload.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ── */}
      {file && (
        <div className="flex justify-end gap-3">
          {upload.status === "success" ? (
            <button
              onClick={reset}
              className="px-5 h-10 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all"
            >
              Upload Another
            </button>
          ) : (
            <>
              <button
                onClick={onCancel}
                disabled={isProcessing}
                className="px-4 h-10 text-sm font-medium text-[#4B5870] hover:text-[#172033] transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="px-5 h-10 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all shadow-sm"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  "Upload & Analyze"
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
