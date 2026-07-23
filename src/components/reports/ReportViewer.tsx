"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { ReportDetail } from "@/types/reports"

const ease = [0.16, 1, 0.3, 1] as const

interface ReportViewerProps {
  /** Full report detail with analysis. */
  report: ReportDetail
  /** Called when the user wants to reprocess a failed report. */
  onReprocess?: (id: string) => void
  /** Called when the user wants to delete the report. */
  onDelete?: (id: string) => void
}

/**
 * Displays a medical report with lab results, AI analysis, trends, and actions.
 */
export function ReportViewer({ report, onReprocess, onDelete }: ReportViewerProps) {
  const analysis = report.analysis
  const abnormalCount = analysis?.labResults.filter((r) => r.isAbnormal).length ?? 0
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["summary", "results"]))
  const [downloading, setDownloading] = useState(false)

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /** Groups lab results by category for better readability. */
  const groupedResults = useMemo(() => {
    if (!analysis?.labResults) return {}
    const groups: Record<string, typeof analysis.labResults> = {}
    for (const result of analysis.labResults) {
      const category = result.testCategory || "Other"
      if (!groups[category]) groups[category] = []
      groups[category].push(result)
    }
    return groups
  }, [analysis?.labResults])

  const handleDownloadDoctorSummary = async () => {
    if (!analysis?.doctorSummary) return
    setDownloading(true)
    try {
      const content = [
        `=== Clinical Report Summary ===`,
        `Report: ${report.title || "Untitled"}`,
        `Date: ${report.reportDate || "Unknown"}`,
        `Institution: ${report.institutionName || "N/A"}`,
        ``,
        `Doctor Summary:`,
        analysis.doctorSummary,
        ``,
        `--- Lab Results ---`,
        ...(analysis.labResults?.map(
          (r) =>
            `${r.testName}: ${r.value ?? "—"} ${r.unit ?? ""} (${r.referenceRange || "no range"}) ${r.isAbnormal ? "⚠" : "✓"}`
        ) ?? []),
        ``,
        `--- Trends ---`,
        ...(analysis.trends?.map(
          (t) =>
            `${t.testName}: ${t.previousValue ?? "—"} → ${t.currentValue ?? "—"} (${t.trend})`
        ) ?? []),
        ``,
        `AI Confidence: ${analysis.confidenceScore != null ? Math.round(analysis.confidenceScore * 100) + "%" : "N/A"}`,
        `Model: ${analysis.modelVersion || "N/A"}`,
        ``,
        `Disclaimer: This summary is AI-generated and for informational purposes only.`,
        `Always consult a qualified healthcare provider for medical decisions.`,
      ].join("\n")

      const blob = new Blob([content], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement("a")
      a.href = url
      a.download = `doctor-summary-${report.id.slice(0, 8)}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  // ── Loading state ──
  if (report.status === "pending" || report.status === "processing") {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
        <div className="w-10 h-10 border-2 border-[#176B63] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-[#172033]">Analyzing your report...</p>
        <p className="text-xs text-[#4B5870] mt-1">This usually takes 30–60 seconds</p>
        <div className="mt-6 w-full max-w-xs mx-auto h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#176B63] to-[#2FE6C4] rounded-full"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    )
  }

  // ── Failed state ──
  if (report.status === "failed") {
    return (
      <div className="bg-white rounded-2xl border border-[#B53A45]/20 p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[#B53A45]/10 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#B53A45" strokeWidth="1.5" className="w-7 h-7">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#B53A45]">Analysis Failed</p>
        <p className="text-xs text-[#4B5870] mt-1 max-w-sm mx-auto">
          The report could not be processed. This may be due to an unclear scan or unsupported format.
        </p>
        {onReprocess && (
          <button
            onClick={() => onReprocess(report.id)}
            className="mt-5 h-10 px-5 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all shadow-sm"
          >
            Try Again
          </button>
        )}
      </div>
    )
  }

  // ── No analysis state ──
  if (!analysis) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
        <p className="text-sm text-[#4B5870]">No analysis available for this report.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
        <div className="min-w-0">
          <h2 className="font-semibold text-[#172033] truncate">{report.title || "Untitled Report"}</h2>
          <p className="text-xs text-[#4B5870] mt-0.5">
            {report.reportDate && `${report.reportDate}`}
            {report.institutionName && ` · ${report.institutionName}`}
            {report.fileSizeBytes != null && ` · ${(report.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
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
              View File
            </a>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(report.id)}
              className="h-9 px-3 bg-[#B53A45]/5 text-[#B53A45] rounded-lg text-xs font-medium hover:bg-[#B53A45]/10 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F5F7FA]/50 flex items-center gap-3 text-sm flex-wrap">
        <span className="text-[#4B5870]">Status:</span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
            report.status === "completed"
              ? "bg-[#176B63]/10 text-[#176B63] border-[#176B63]/20"
              : report.status === "partial"
                ? "bg-[#9B651B]/10 text-[#9B651B] border-[#9B651B]/20"
                : "bg-[#E2E8F0] text-[#4B5870] border-[#E2E8F0]"
          }`}
        >
          {report.status === "completed" ? "Completed" : report.status === "partial" ? "Needs Review" : report.status}
        </span>

        {abnormalCount > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#B53A45]/10 text-[#B53A45] border border-[#B53A45]/20">
            {abnormalCount} flagged
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-[#4B5870]/60">
            {analysis.labResults.length} values
          </span>
          {analysis.confidenceScore != null && (
            <span className="text-xs text-[#4B5870]/60">
              · {(analysis.confidenceScore * 100).toFixed(0)}% confidence
            </span>
          )}
          {analysis.modelVersion && (
            <span className="text-xs text-[#4B5870]/40">· {analysis.modelVersion}</span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-5 space-y-6">
        {/* 1. Summary */}
        <SummarySection
          title="Summary"
          content={analysis.patientSummary}
          expanded={expandedSections.has("summary")}
          onToggle={() => toggleSection("summary")}
        />

        {/* 2. Abnormal Alert */}
        {abnormalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#B53A45]/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#B53A45" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#B53A45]">
                  {abnormalCount} result{abnormalCount > 1 ? "s" : ""} outside normal range
                </p>
                <p className="text-xs text-[#4B5870] mt-1">
                  These values may warrant discussion with your healthcare provider.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. Lab Results Table */}
        <CollapsibleSection
          title={`Lab Results (${analysis.labResults.length})`}
          sectionKey="results"
          expanded={expandedSections.has("results")}
          onToggle={() => toggleSection("results")}
        >
          {Object.entries(groupedResults).map(([category, results]) => (
            <div key={category} className="mb-5 last:mb-0">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5870]/60 mb-2 px-1">
                {category}
              </h4>
              <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-[#E2E8F0]">
                      <th className="text-left py-2.5 px-3 text-[#4B5870] font-medium text-xs">Test</th>
                      <th className="text-right py-2.5 px-3 text-[#4B5870] font-medium text-xs">Value</th>
                      <th className="text-right py-2.5 px-3 text-[#4B5870] font-medium text-xs">Unit</th>
                      <th className="text-right py-2.5 px-3 text-[#4B5870] font-medium text-xs">Range</th>
                      <th className="text-right py-2.5 px-3 text-[#4B5870] font-medium text-xs">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => {
                      const isAbnormal = result.isAbnormal === true
                      const flag = result.flag?.toLowerCase()
                      const isCritical = flag === "critical"
                      const isLow = flag === "low"
                      const isHigh = flag === "high"

                      return (
                        <tr
                          key={result.id}
                          className={`border-b border-[#E2E8F0]/60 transition-colors ${
                            isCritical
                              ? "bg-[#B53A45]/3 hover:bg-[#B53A45]/8"
                              : isAbnormal
                                ? "bg-[#9B651B]/3 hover:bg-[#9B651B]/8"
                                : "hover:bg-[#F5F7FA]/50"
                          }`}
                        >
                          <td className="py-2.5 px-3 text-[#172033] font-medium">{result.testName}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-semibold tabular-nums ${
                              isCritical
                                ? "text-[#B53A45]"
                                : isAbnormal
                                  ? "text-[#9B651B]"
                                  : "text-[#172033]"
                            }`}
                          >
                            {result.value ?? "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#4B5870]">{result.unit || "—"}</td>
                          <td className="py-2.5 px-3 text-right text-[#4B5870]">{result.referenceRange || "—"}</td>
                          <td className="py-2.5 px-3 text-right">
                            {isAbnormal ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                  isCritical
                                    ? "bg-[#B53A45]/10 text-[#B53A45] border-[#B53A45]/20"
                                    : "bg-[#9B651B]/10 text-[#9B651B] border-[#9B651B]/20"
                                }`}
                              >
                                {isCritical && (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                    <polyline points="17 6 23 6 23 12" />
                                  </svg>
                                )}
                                {isCritical ? "Critical" : isLow ? "Low" : "High"}
                              </span>
                            ) : (
                              <span className="text-[#176B63]/60 text-[10px]">Normal</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CollapsibleSection>

        {/* 4. AI Explanations */}
        {analysis.labValueExplanations && analysis.labValueExplanations.length > 0 && (
          <CollapsibleSection
            title="AI Explanations"
            sectionKey="explanations"
            expanded={expandedSections.has("explanations")}
            onToggle={() => toggleSection("explanations")}
          >
            <div className="space-y-3">
              {(analysis.labValueExplanations as Array<{ testName: string; status: string; explanation: string; lifestyleFactors?: string[]; dietarySuggestions?: string[] }>).map((exp: { testName: string; status: string; explanation: string; lifestyleFactors?: string[]; dietarySuggestions?: string[] }, idx: number) => (
                <div key={idx} className="bg-[#F5F7FA] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#172033]">{exp.testName}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        exp.status === "high" || exp.status === "low"
                          ? "bg-[#B53A45]/10 text-[#B53A45] border-[#B53A45]/20"
                          : "bg-[#176B63]/10 text-[#176B63] border-[#176B63]/20"
                      }`}
                    >
                      {exp.status === "high"
                        ? "Elevated"
                        : exp.status === "low"
                          ? "Low"
                          : exp.status === "unknown"
                            ? "Unknown"
                            : "Normal"}
                    </span>
                  </div>
                  <p className="text-sm text-[#4B5870] leading-relaxed">{exp.explanation}</p>
                  {exp.lifestyleFactors && exp.lifestyleFactors.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[#4B5870] mb-1">Lifestyle factors:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {exp.lifestyleFactors.map((factor: string, j: number) => (
                          <span
                            key={j}
                            className="px-2 py-0.5 bg-white rounded-lg text-xs text-[#4B5870] border border-[#E2E8F0]"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {exp.dietarySuggestions && exp.dietarySuggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[#4B5870] mb-1">Dietary suggestions:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {exp.dietarySuggestions.map((suggestion: string, j: number) => (
                          <span
                            key={j}
                            className="px-2 py-0.5 bg-[#176B63]/5 rounded-lg text-xs text-[#176B63] border border-[#176B63]/10"
                          >
                            {suggestion}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* 5. Trends */}
        {analysis.trends && analysis.trends.length > 0 && (
          <CollapsibleSection
            title={`Trends (${analysis.trends.length})`}
            sectionKey="trends"
            expanded={expandedSections.has("trends")}
            onToggle={() => toggleSection("trends")}
          >
            <div className="space-y-2">
              {analysis.trends.map((trend, i) => {
                const isUp = trend.trend === "worsening"
                const isDown = trend.trend === "improving"
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 px-4 bg-[#F5F7FA] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isUp
                            ? "bg-[#B53A45]/10 text-[#B53A45]"
                            : isDown
                              ? "bg-[#176B63]/10 text-[#176B63]"
                              : "bg-[#E2E8F0] text-[#4B5870]"
                        }`}
                      >
                        {isUp ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                            <polyline points="17 18 23 18 23 12" />
                          </svg>
                        ) : isDown ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#172033]">{trend.testName}</p>
                        {trend.previousDate && (
                          <p className="text-[10px] text-[#4B5870]/60">{trend.previousDate}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {trend.previousValue !== null && (
                        <span className="text-[#4B5870]/50">{trend.previousValue}</span>
                      )}
                      <span
                        className={`font-semibold tabular-nums ${
                          isUp ? "text-[#B53A45]" : isDown ? "text-[#176B63]" : "text-[#4B5870]"
                        }`}
                      >
                        {trend.currentValue ?? "—"}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          isUp
                            ? "bg-[#B53A45]/10 text-[#B53A45]"
                            : isDown
                              ? "bg-[#176B63]/10 text-[#176B63]"
                              : "bg-[#E2E8F0] text-[#4B5870]"
                        }`}
                      >
                        {trend.trend}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* 6. Concerns */}
        {analysis.concerns && analysis.concerns.length > 0 && (
          <CollapsibleSection
            title="Things to Discuss with Your Doctor"
            sectionKey="concerns"
            expanded={expandedSections.has("concerns")}
            onToggle={() => toggleSection("concerns")}
          >
            <ul className="space-y-2">
              {(analysis.concerns as string[]).map((concern: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-[#4B5870]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B63] mt-2 shrink-0" />
                  {concern}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* 7. Doctor Summary */}
        {analysis.doctorSummary && (
          <div className="bg-[#F5F7FA] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[#4B5870] uppercase tracking-wider">
                Clinical Note
              </h3>
              <button
                onClick={handleDownloadDoctorSummary}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-white border border-[#E2E8F0] text-xs text-[#4B5870] hover:border-[#176B63]/30 hover:text-[#176B63] transition-colors disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {downloading ? "Downloading..." : "Download Summary"}
              </button>
            </div>
            <p className="text-sm text-[#4B5870] leading-relaxed">{analysis.doctorSummary}</p>
          </div>
        )}

        {/* 8. Disclaimer */}
        <div className="border-t border-[#E2E8F0] pt-4">
          <div className="flex items-start gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4B5870" strokeWidth="1.5" className="w-4 h-4 mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-xs text-[#4B5870]/60 leading-relaxed">
              This analysis is AI-generated and is for informational and educational purposes only.
              It is not a substitute for professional medical advice, diagnosis, or treatment.
              Always consult a qualified healthcare provider with any questions regarding your health.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Collapsible Section ──

function CollapsibleSection({
  title,
  sectionKey,
  expanded,
  onToggle,
  children,
}: {
  title: string
  sectionKey: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full group"
        aria-expanded={expanded}
      >
        <h3 className="text-sm font-semibold text-[#172033] group-hover:text-[#176B63] transition-colors">
          {title}
        </h3>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-[#4B5870]/40 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Summary Section ──

function SummarySection({
  title,
  content,
  expanded,
  onToggle,
}: {
  title: string
  content: string | null | undefined
  expanded: boolean
  onToggle: () => void
}) {
  if (!content) return null

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full group"
        aria-expanded={expanded}
      >
        <h3 className="text-sm font-semibold text-[#172033] group-hover:text-[#176B63] transition-colors">
          {title}
        </h3>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-[#4B5870]/40 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="overflow-hidden"
          >
            <p className="text-sm text-[#4B5870] leading-relaxed pt-3">{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
