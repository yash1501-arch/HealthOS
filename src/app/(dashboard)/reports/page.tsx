"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"
import type { ReportListItem, ReportDetail, ReportType } from "@/types/reports"
import { STATUS_LABELS, ALLOWED_REPORT_MIME_TYPES, MAX_REPORT_FILE_BYTES, REPORT_TYPES } from "@/lib/reports/constants"
import { toastSuccess, toastError } from "@/stores/toast"

// ─── Easing ──────────────────────────────────────────────────────

const ease = [0.16, 1, 0.3, 1] as const

// ─── Main Page ───────────────────────────────────────────────────

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const loadReports = useCallback(async () => {
    try {
      const data = await api.get<ReportListItem[]>("/reports")
      setReports(data)
    } catch {
      // Not authenticated or no data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  // Poll for processing reports every 5s
  useEffect(() => {
    const hasProcessing = reports.some((r) => r.status === "pending" || r.status === "processing")
    if (!hasProcessing) return

    const interval = setInterval(() => {
      loadReports()
      // Also refresh the detail view if a processing report is open
      if (selectedReport && (selectedReport.status === "pending" || selectedReport.status === "processing")) {
        api.get<ReportDetail>(`/reports/${selectedReport.id}`).then((detail) => {
          setSelectedReport(detail)
        }).catch(() => {})
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [reports, loadReports, selectedReport])

  async function handleReprocess(id: string) {
    try {
      await api.post(`/reports/${id}/reprocess`)
      toastSuccess("Reprocessing started", "Report is being analyzed again.")
      loadReports()
      setSelectedReport(null)
    } catch (err) {
      toastError("Reprocess failed", "Could not reprocess this report.")
    }
  }

  async function handleReportClick(id: string) {
    try {
      const detail = await api.get<ReportDetail>(`/reports/${id}`)
      setSelectedReport(detail)
    } catch (err) {
      console.error("Failed to load report detail", err)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report and its analysis?")) return
    try {
      await api.delete(`/reports/${id}`)
      setReports((prev) => prev.filter((r) => r.id !== id))
      if (selectedReport?.id === id) setSelectedReport(null)
    } catch (err) {
      console.error("Failed to delete report", err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">Medical Reports</h1>
          <p className="text-sm text-[#4B5870] mt-1">
            Upload and analyze your medical reports with AI
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="h-10 px-4 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all shadow-sm"
        >
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {showUpload ? "Cancel" : "Upload Report"}
          </span>
        </button>
      </motion.div>

      {/* Upload Panel */}
      <AnimatePresence>
        {showUpload && (
          <UploadPanel
            onUpload={(report) => {
              setReports((prev) => [report, ...prev])
              setShowUpload(false)
            }}
            onClose={() => setShowUpload(false)}
          />
        )}
      </AnimatePresence>

      {/* Report Detail */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailPanel
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onDelete={handleDelete}
            onReprocess={handleReprocess}
          />
        )}
      </AnimatePresence>

      {/* Reports List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-[#F5F7FA] animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState onUpload={() => setShowUpload(true)} />
        ) : (
          <div className="space-y-2">
            {reports.map((report, i) => (
              <ReportRow
                key={report.id}
                report={report}
                index={i}
                onClick={() => handleReportClick(report.id)}
                onDelete={() => handleDelete(report.id)}
                isSelected={selectedReport?.id === report.id}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Upload Panel ────────────────────────────────────────────────

function UploadPanel({
  onUpload,
  onClose,
}: {
  onUpload: (report: ReportListItem) => void
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [reportType, setReportType] = useState("")
  const [title, setTitle] = useState("")
  const [reportDate, setReportDate] = useState("")
  const [institution, setInstitution] = useState("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function validateFile(f: File): string | null {
    if (!ALLOWED_REPORT_MIME_TYPES.includes(f.type as any)) {
      return "Unsupported file type. Upload PDF, JPEG, or PNG."
    }
    if (f.size > MAX_REPORT_FILE_BYTES) {
      return `File too large (max ${MAX_REPORT_FILE_BYTES / 1024 / 1024}MB)`
    }
    return null
  }

  function handleFile(f: File) {
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setError("")
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""))
  }

  async function handleSubmit() {
    if (!file) return

    setUploading(true)
    setError("")
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (reportType) formData.append("reportType", reportType)
      if (title) formData.append("title", title)
      if (reportDate) formData.append("reportDate", reportDate)
      if (institution) formData.append("institutionName", institution)

      setProgress(40)
      const result = await api.post<{ id: string; status: string }>("/reports", formData as any, {
        headers: {}, // Let fetch set Content-Type for FormData
      })
      setProgress(80)

      // Add optimistic entry
      onUpload({
        id: result.id,
        reportType: reportType || null,
        title: title || file.name,
        reportDate: reportDate || null,
        institutionName: institution || null,
        status: "pending",
        hasAnalysis: false,
        labResultCount: 0,
        createdAt: new Date().toISOString(),
      })

      setProgress(100)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : 0

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease }}
      className="overflow-hidden"
    >
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
        <h2 className="text-lg font-semibold text-[#172033]">Upload Medical Report</h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => inputRef.current?.click()}
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
                <svg viewBox="0 0 24 24" fill="none" stroke="#176B63" strokeWidth="2" className="w-6 h-6">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="font-medium text-[#172033]">{file.name}</p>
              <p className="text-xs text-[#4B5870]">{fileSizeMB} MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="text-xs text-[#B53A45] hover:underline"
              >
                Remove
              </button>
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
                PDF, JPEG, or PNG — up to {MAX_REPORT_FILE_BYTES / 1024 / 1024}MB
              </p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            className="hidden"
          />
        </div>

        {/* Metadata fields */}
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-medium text-[#4B5870] mb-1">Report Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
                placeholder="Blood Report - July 2026"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4B5870] mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm bg-white focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
              >
                <option value="">Auto-detect</option>
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4B5870] mb-1">Report Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4B5870] mb-1">Institution</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
                placeholder="Hospital or lab name"
              />
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 text-[#B53A45] text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#4B5870]">
              <span>Uploading & processing...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#176B63] rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 h-10 text-sm font-medium text-[#4B5870] hover:text-[#172033] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="px-5 h-10 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all"
          >
            {uploading ? "Uploading..." : "Upload & Analyze"}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Report Row ──────────────────────────────────────────────────

function ReportRow({
  report,
  index,
  onClick,
  onDelete,
  isSelected,
}: {
  report: ReportListItem
  index: number
  onClick: () => void
  onDelete: () => void
  isSelected: boolean
}) {
  const statusColor: Record<string, string> = {
    pending: "bg-[#9B651B]/10 text-[#9B651B] border-[#9B651B]/20",
    processing: "bg-[#476A91]/10 text-[#476A91] border-[#476A91]/20",
    completed: "bg-[#176B63]/10 text-[#176B63] border-[#176B63]/20",
    failed: "bg-[#B53A45]/10 text-[#B53A45] border-[#B53A45]/20",
    partial: "bg-[#9B651B]/10 text-[#9B651B] border-[#9B651B]/20",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease }}
      className={`rounded-xl border transition-all duration-200 ${
        isSelected
          ? "border-[#176B63]/30 bg-[#176B63]/3 shadow-sm"
          : "border-[#E2E8F0] bg-white hover:border-[#176B63]/20 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          report.status === "completed" ? "bg-[#176B63]/10" :
          report.status === "failed" ? "bg-[#B53A45]/10" :
          "bg-[#F5F7FA]"
        }`}>
          <svg viewBox="0 0 24 24" fill="none" stroke={report.status === "failed" ? "#B53A45" : "#176B63"} strokeWidth="1.5" className="w-5 h-5">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        {/* Info */}
        <button onClick={onClick} className="flex-1 text-left min-w-0">
          <p className="font-medium text-[#172033] truncate">{report.title || "Untitled Report"}</p>
          <p className="text-xs text-[#4B5870] mt-0.5">
            {report.reportDate || "Unknown date"}
            {report.institutionName && ` · ${report.institutionName}`}
            {report.labResultCount > 0 && ` · ${report.labResultCount} results`}
          </p>
        </button>

        {/* Status badge */}
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${statusColor[report.status] || "bg-gray-100 text-gray-500"}`}>
          {STATUS_LABELS[report.status] || report.status}
        </span>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-2 text-[#4B5870]/40 hover:text-[#B53A45] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>

        {/* Arrow */}
        <svg className={`w-4 h-4 text-[#4B5870]/30 transition-transform ${isSelected ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </motion.div>
  )
}

// ─── Report Detail Panel ─────────────────────────────────────────

function ReportDetailPanel({
  report,
  onClose,
  onDelete,
  onReprocess,
}: {
  report: ReportDetail
  onClose: () => void
  onDelete: (id: string) => void
  onReprocess?: (id: string) => void
}) {
  const analysis = report.analysis
  const abnormalCount = analysis?.labResults.filter((r) => r.isAbnormal).length ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease }}
      className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
        <div>
          <h2 className="font-semibold text-[#172033]">{report.title}</h2>
          <p className="text-xs text-[#4B5870] mt-0.5">
            {report.reportDate && `${report.reportDate}`}
            {report.institutionName && ` · ${report.institutionName}`}
            {report.fileSizeBytes && ` · ${(report.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.fileUrl && (
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 bg-[#F5F7FA] text-[#4B5870] rounded-lg text-xs font-medium hover:bg-[#E2E8F0] transition-colors flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View
            </a>
          )}
          <button
            onClick={() => onDelete(report.id)}
            className="h-9 px-3 bg-[#B53A45]/5 text-[#B53A45] rounded-lg text-xs font-medium hover:bg-[#B53A45]/10 transition-colors"
          >
            Delete
          </button>
          <button onClick={onClose} className="p-2 text-[#4B5870]/40 hover:text-[#172033] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F5F7FA] flex items-center gap-3 text-sm">
        <span className="text-[#4B5870]">Status:</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
          report.status === "completed" ? "bg-[#176B63]/10 text-[#176B63] border-[#176B63]/20" :
          report.status === "failed" ? "bg-[#B53A45]/10 text-[#B53A45] border-[#B53A45]/20" :
          report.status === "processing" ? "bg-[#476A91]/10 text-[#476A91] border-[#476A91]/20" :
          "bg-[#9B651B]/10 text-[#9B651B] border-[#9B651B]/20"
        }`}>
          {STATUS_LABELS[report.status] || report.status}
        </span>
        {analysis?.modelVersion && (
          <span className="text-xs text-[#4B5870]/60 ml-auto">AI: {analysis.modelVersion}</span>
        )}
      </div>

      {/* Analysis Content */}
      {analysis ? (
        <div className="p-5 space-y-6">
          {/* Patient Summary */}
          {analysis.patientSummary && (
            <div>
              <h3 className="text-sm font-semibold text-[#172033] mb-2">Summary</h3>
              <p className="text-sm text-[#4B5870] leading-relaxed">{analysis.patientSummary}</p>
            </div>
          )}

          {/* Abnormal results alert */}
          {abnormalCount > 0 && (
            <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-4">
              <p className="text-sm font-medium text-[#B53A45]">
                ⚠ {abnormalCount} result{abnormalCount > 1 ? "s" : ""} outside normal range
              </p>
              <p className="text-xs text-[#4B5870] mt-1">
                These values may warrant discussion with your healthcare provider.
              </p>
            </div>
          )}

          {/* Lab Results */}
          {analysis.labResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#172033] mb-3">
                Lab Results ({analysis.labResults.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-2 pr-4 text-[#4B5870] font-medium text-xs">Test</th>
                      <th className="text-right py-2 px-4 text-[#4B5870] font-medium text-xs">Value</th>
                      <th className="text-right py-2 px-4 text-[#4B5870] font-medium text-xs">Unit</th>
                      <th className="text-right py-2 px-4 text-[#4B5870] font-medium text-xs">Range</th>
                      <th className="text-right py-2 pl-4 text-[#4B5870] font-medium text-xs">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.labResults.map((result) => (
                      <tr key={result.id} className="border-b border-[#E2E8F0]/60 hover:bg-[#F5F7FA]/50 transition-colors">
                        <td className="py-2.5 pr-4 text-[#172033]">{result.testName}</td>
                        <td className={`py-2.5 px-4 text-right font-medium tabular-nums ${
                          result.isAbnormal ? "text-[#B53A45]" : "text-[#172033]"
                        }`}>
                          {result.value ?? "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right text-[#4B5870]">{result.unit || "—"}</td>
                        <td className="py-2.5 px-4 text-right text-[#4B5870]">{result.referenceRange || "—"}</td>
                        <td className="py-2.5 pl-4 text-right">
                          {result.isAbnormal && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#B53A45]/10 text-[#B53A45] border border-[#B53A45]/20">
                              {result.flag || "Abnormal"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trends */}
          {analysis.trends.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#172033] mb-3">Trends</h3>
              <div className="space-y-2">
                {analysis.trends.map((trend, i) => {
                  const trendColor =
                    trend.trend === "improving" ? "text-[#176B63]" :
                    trend.trend === "worsening" ? "text-[#B53A45]" :
                    "text-[#4B5870]"
                  const trendIcon =
                    trend.trend === "improving" ? "↓" :
                    trend.trend === "worsening" ? "↑" :
                    "→"
                  return (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-[#F5F7FA] rounded-lg">
                      <span className="text-sm text-[#172033]">{trend.testName}</span>
                      <div className="flex items-center gap-3 text-sm">
                        {trend.previousValue !== null && (
                          <span className="text-[#4B5870]/60">{trend.previousValue}</span>
                        )}
                        <span className={`font-medium ${trendColor}`}>
                          {trendIcon} {trend.currentValue}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Doctor's Summary */}
          {analysis.doctorSummary && (
            <div className="bg-[#F5F7FA] rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[#4B5870] uppercase tracking-wider mb-2">Clinical Note</h3>
              <p className="text-sm text-[#4B5870] leading-relaxed">{analysis.doctorSummary}</p>
            </div>
          )}

          {/* Confidence */}
          {analysis.confidenceScore && (
            <div className="text-xs text-[#4B5870]/60 flex items-center gap-2">
              <span>AI Confidence: {Math.round(analysis.confidenceScore * 100)}%</span>
              <span>·</span>
              <span>Always consult a doctor for medical decisions</span>
            </div>
          )}
        </div>
      ) : report.status === "processing" || report.status === "pending" ? (
        <div className="p-10 text-center">
          <div className="w-8 h-8 border-2 border-[#176B63] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#4B5870]">Analyzing your report...</p>
          <p className="text-xs text-[#4B5870]/60 mt-1">This usually takes 30–60 seconds</p>
        </div>
      ) : report.status === "failed" ? (
        <div className="p-10 text-center">
          <p className="text-sm text-[#B53A45] font-medium">Analysis failed</p>
          <p className="text-xs text-[#4B5870] mt-1">The report could not be processed.</p>
          {onReprocess && (
            <button
              onClick={() => onReprocess(report.id)}
              className="mt-4 h-9 px-4 bg-[#176B63] text-white rounded-lg text-sm font-medium hover:bg-[#10554F] transition-all"
            >
              Try Again
            </button>
          )}
        </div>
      ) : (
        <div className="p-10 text-center">
          <p className="text-sm text-[#4B5870]">No analysis available</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[#F5F7FA]">
        <svg viewBox="0 0 24 24" fill="none" stroke="#176B63" strokeWidth="1.5" className="w-8 h-8">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#172033] mb-2">No reports yet</h3>
      <p className="text-sm text-[#4B5870] mb-6 max-w-sm mx-auto">
        Upload your blood reports, MRIs, or other medical documents for AI-powered analysis.
      </p>
      <button
        onClick={onUpload}
        className="h-11 px-6 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all shadow-sm"
      >
        Upload Your First Report
      </button>
    </motion.div>
  )
}
