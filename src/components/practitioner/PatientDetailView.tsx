"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { ClinicalNoteForm } from "@/components/practitioner/ClinicalNoteForm"

type PostureIssue = {
  characteristic: string
  severity: string | null
  description: string | null
}

type TabId = "overview" | "posture" | "labs" | "plans" | "notes" | "timeline"

type PatientDetail = {
  id: string
  name: string
  email: string
  sharedData: string[]
  healthScore: number
  postureChars: PostureIssue[]
  lastLabResults: Array<{ testName: string; value: number | null; unit: string; isAbnormal: boolean | null; date: string }>
  hasDietPlan: boolean
  hasExercisePlan: boolean
  latestCheckin: { weekStart: string; aiSummary: string | null; energyLevel: number | null } | null
  clinicalNotes: Array<{ id: string; title: string; description: string; createdAt: string; metadata: Record<string, unknown> }>
}

type PatientDetailViewProps = {
  patient: PatientDetail
  onNoteAdded: () => void
}

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "posture", label: "Posture", icon: "🧍" },
  { id: "labs", label: "Labs", icon: "🔬" },
  { id: "plans", label: "Plans", icon: "📋" },
  { id: "notes", label: "Notes", icon: "📝" },
  { id: "timeline", label: "Timeline", icon: "📈" },
]

const EASE = [0.16, 1, 0.3, 1] as const

export function PatientDetailView({ patient, onNoteAdded }: PatientDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  const canView = (dataType: string) => {
    // Plans tab should accept either "diet" or "exercise" shared data
    if (dataType === "plans") {
      return patient.sharedData.includes("diet") || patient.sharedData.includes("exercise")
    }
    return patient.sharedData.includes(dataType)
  }

  function getScoreColor(score: number): string {
    if (score >= 70) return "#176B63"
    if (score >= 40) return "#9B651B"
    return "#B53A45"
  }

  function handleGeneratePlan(type: "diet" | "exercise") {
    // Navigate to the respective plan page with patient ID context
    const paths: Record<string, string> = {
      diet: `/diet?patientId=${patient.id}`,
      exercise: `/exercise?patientId=${patient.id}`,
    }
    window.open(paths[type] ?? `/diet?patientId=${patient.id}`, "_blank")
  }

  function handleSharePDF() {
    // Trigger browser print dialog for PDF generation
    // In a full implementation this would generate a styled PDF report
    const printContent = document.getElementById("patient-report-content")
    if (printContent) {
      const originalTitle = document.title
      document.title = `${patient.name} - HealthOS Patient Report`
      window.print()
      document.title = originalTitle
    }
  }

  return (
    <div className="space-y-5" id="patient-report-content">
      {/* Action buttons bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-end gap-2 flex-wrap"
      >
        <button
          onClick={() => handleGeneratePlan("diet")}
          className="h-8 px-3 bg-[#F8F9FB] text-[#4B5870] rounded-lg text-xs font-medium hover:bg-[#E2E8F0] transition-all border border-[#E2E8F0]"
        >
          🥗 Generate Diet Plan
        </button>
        <button
          onClick={() => handleGeneratePlan("exercise")}
          className="h-8 px-3 bg-[#F8F9FB] text-[#4B5870] rounded-lg text-xs font-medium hover:bg-[#E2E8F0] transition-all border border-[#E2E8F0]"
        >
          🏋️ Generate Exercise Plan
        </button>
        <button
          onClick={handleSharePDF}
          className="h-8 px-3 bg-[#176B63] text-white rounded-lg text-xs font-medium hover:bg-[#10554F] transition-all"
        >
          🖨️ Print Report View
        </button>
      </motion.div>

      {/* Patient header */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#176B63] to-[#10554F] flex items-center justify-center text-xl font-bold text-white shrink-0">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[#172033]">{patient.name}</h1>
            <p className="text-xs text-[#4B5870]">{patient.email}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {patient.sharedData.map((dt) => (
                <span key={dt} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#176B63]/5 text-[#176B63]">
                  {dt}
                </span>
              ))}
            </div>
          </div>
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{ backgroundColor: getScoreColor(patient.healthScore) + "15", color: getScoreColor(patient.healthScore) }}
          >
            {patient.healthScore}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const isDisabled = !canView(tab.id) && tab.id !== "overview" && tab.id !== "notes"
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-[#176B63] text-white shadow-sm"
                  : isDisabled
                    ? "text-[#4B5870]/30 cursor-not-allowed"
                    : "text-[#4B5870] hover:bg-[#F8F9FB]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {isDisabled && <span className="text-[9px] opacity-50">🔒</span>}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Latest Check-in */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                <h3 className="text-xs font-semibold text-[#172033] mb-3">Latest Check-in</h3>
                {patient.latestCheckin ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#4B5870]">
                      {new Date(patient.latestCheckin.weekStart).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    </p>
                    <div className="flex gap-3">
                      <div className="text-center p-2 rounded-lg bg-[#F8F9FB] min-w-[60px]">
                        <p className="text-lg font-bold text-[#176B63]">{patient.latestCheckin.energyLevel ?? "—"}</p>
                        <p className="text-[10px] text-[#4B5870]">Energy</p>
                      </div>
                    </div>
                    {patient.latestCheckin.aiSummary && (
                      <p className="text-[11px] text-[#4B5870] leading-relaxed bg-[#F8F9FB] p-2 rounded-lg">
                        {patient.latestCheckin.aiSummary}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#4B5870]/60">No check-in data shared</p>
                )}
              </div>

              {/* Posture Issues */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                <h3 className="text-xs font-semibold text-[#172033] mb-3">Posture Issues</h3>
                {patient.postureChars.length > 0 ? (
                  <div className="space-y-1.5">
                    {patient.postureChars.map((pc, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{
                          backgroundColor: pc.severity === "severe" ? "#B53A45" : pc.severity === "moderate" ? "#F97316" : "#FBBF24",
                        }} />
                        <span className="text-xs text-[#4B5870]">{pc.characteristic}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#4B5870]/60">No posture data shared</p>
                )}
              </div>

              {/* Treatment Plans */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                <h3 className="text-xs font-semibold text-[#172033] mb-3">Treatment Plans</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#4B5870]">Diet Plan</span>
                    <span className={`text-xs font-medium ${patient.hasDietPlan ? "text-[#176B63]" : "text-[#4B5870]/40"}`}>
                      {patient.hasDietPlan ? "✓ Active" : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#4B5870]">Exercise Plan</span>
                    <span className={`text-xs font-medium ${patient.hasExercisePlan ? "text-[#176B63]" : "text-[#4B5870]/40"}`}>
                      {patient.hasExercisePlan ? "✓ Active" : "—"}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleGeneratePlan("diet")}
                      className="flex-1 h-7 text-[10px] font-medium rounded-lg bg-[#176B63]/5 text-[#176B63] hover:bg-[#176B63]/10 transition-all"
                    >
                      + Generate Diet
                    </button>
                    <button
                      onClick={() => handleGeneratePlan("exercise")}
                      className="flex-1 h-7 text-[10px] font-medium rounded-lg bg-[#176B63]/5 text-[#176B63] hover:bg-[#176B63]/10 transition-all"
                    >
                      + Generate Exercise
                    </button>
                  </div>
                </div>
              </div>

              {/* Shared Data */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                <h3 className="text-xs font-semibold text-[#172033] mb-3">Shared Data</h3>
                {patient.sharedData.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {patient.sharedData.map((dt) => (
                      <span key={dt} className="text-xs px-2 py-1 rounded-full bg-[#176B63]/5 text-[#176B63]">
                        {dt}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#4B5870]/60">No data shared yet</p>
                )}
                <button
                  onClick={handleSharePDF}
                  className="mt-3 w-full h-7 text-[10px] font-medium rounded-lg bg-[#F8F9FB] text-[#4B5870] hover:bg-[#E2E8F0] transition-all border border-[#E2E8F0]"
                >
                  📄 Export Report as PDF
                </button>
              </div>
            </div>
          )}

          {activeTab === "posture" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#172033]">Posture Analysis</h3>
                <button
                  onClick={handleSharePDF}
                  className="text-[10px] font-medium text-[#176B63] hover:text-[#10554F] transition-colors"
                >
                  📄 Include in Report
                </button>
              </div>
              {patient.postureChars.length > 0 ? (
                <div className="space-y-2">
                  {patient.postureChars.map((pc, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]/60 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{
                          backgroundColor: pc.severity === "severe" ? "#B53A45" : pc.severity === "moderate" ? "#F97316" : "#FBBF24",
                        }} />
                        <span className="text-sm text-[#172033]">{pc.characteristic}</span>
                      </div>
                      <span className="text-xs font-medium capitalize" style={{
                        color: pc.severity === "severe" ? "#B53A45" : pc.severity === "moderate" ? "#F97316" : "#9B651B",
                      }}>
                        {pc.severity}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => handleGeneratePlan("exercise")}
                    className="w-full mt-3 h-8 rounded-lg bg-[#176B63]/5 text-[#176B63] text-xs font-medium hover:bg-[#176B63]/10 transition-all"
                  >
                    🏋️ Generate Exercise Plan for These Issues
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#4B5870]/60">No posture data available</p>
              )}
            </div>
          )}

          {activeTab === "labs" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
              <h3 className="text-xs font-semibold text-[#172033] mb-3">
                Lab Results
                {canView("labs") && patient.lastLabResults.length > 0 && (
                  <span className="text-[10px] font-normal text-[#4B5870]/60 ml-2">
                    ({patient.lastLabResults.length} results)
                  </span>
                )}
              </h3>
              {canView("labs") ? (
                patient.lastLabResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#E2E8F0]">
                          <th className="text-left py-2 px-2 text-[#4B5870] font-medium">Test</th>
                          <th className="text-right py-2 px-2 text-[#4B5870] font-medium">Value</th>
                          <th className="text-left py-2 px-2 text-[#4B5870] font-medium">Unit</th>
                          <th className="text-center py-2 px-2 text-[#4B5870] font-medium">Status</th>
                          <th className="text-right py-2 px-2 text-[#4B5870] font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patient.lastLabResults.map((lr, i) => (
                          <tr key={i} className="border-b border-[#E2E8F0]/40">
                            <td className="py-2 px-2 text-[#172033]">{lr.testName}</td>
                            <td className="py-2 px-2 text-right tabular-nums text-[#172033]">{lr.value ?? "—"}</td>
                            <td className="py-2 px-2 text-[#4B5870]">{lr.unit}</td>
                            <td className="py-2 px-2 text-center">
                              {lr.isAbnormal === true ? (
                                <span className="text-[#B53A45] font-medium">⚠ High/Low</span>
                              ) : lr.isAbnormal === false ? (
                                <span className="text-[#176B63] font-medium">✓ Normal</span>
                              ) : (
                                <span className="text-[#4B5870]/40">—</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right text-[#4B5870]">
                              {new Date(lr.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-[#4B5870]/60">No lab results available for this patient</p>
                )
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-[#4B5870]">🔒 Lab data not shared</p>
                  <p className="text-xs text-[#4B5870]/60 mt-1">The patient has not shared their lab results</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "plans" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
              <h3 className="text-xs font-semibold text-[#172033] mb-3">Current Plans</h3>
              {canView("plans") ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-xl border ${patient.hasDietPlan ? "bg-[#F0FDF4] border-[#176B63]/20" : "bg-[#F8F9FB] border-[#E2E8F0]"}`}>
                    <div className="text-lg mb-1">🥗</div>
                    <h4 className="text-sm font-medium text-[#172033]">Diet Plan</h4>
                    {patient.hasDietPlan ? (
                      <>
                        <p className="text-[11px] text-[#176B63] mt-1">✓ Active plan</p>
                        <button
                          onClick={() => handleGeneratePlan("diet")}
                          className="mt-2 w-full h-7 rounded-lg bg-[#176B63] text-white text-[10px] font-medium hover:bg-[#10554F] transition-all"
                        >
                          View / Modify
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-[#4B5870]/60 mt-1">No active plan</p>
                        <button
                          onClick={() => handleGeneratePlan("diet")}
                          className="mt-2 w-full h-7 rounded-lg bg-[#E2E8F0] text-[#4B5870] text-[10px] font-medium hover:bg-[#D1D5DB] transition-all"
                        >
                          Generate Plan
                        </button>
                      </>
                    )}
                  </div>
                  <div className={`p-4 rounded-xl border ${patient.hasExercisePlan ? "bg-[#F0FDF4] border-[#176B63]/20" : "bg-[#F8F9FB] border-[#E2E8F0]"}`}>
                    <div className="text-lg mb-1">🏋️</div>
                    <h4 className="text-sm font-medium text-[#172033]">Exercise Plan</h4>
                    {patient.hasExercisePlan ? (
                      <>
                        <p className="text-[11px] text-[#176B63] mt-1">✓ Active plan</p>
                        <button
                          onClick={() => handleGeneratePlan("exercise")}
                          className="mt-2 w-full h-7 rounded-lg bg-[#176B63] text-white text-[10px] font-medium hover:bg-[#10554F] transition-all"
                        >
                          View / Modify
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-[#4B5870]/60 mt-1">No active plan</p>
                        <button
                          onClick={() => handleGeneratePlan("exercise")}
                          className="mt-2 w-full h-7 rounded-lg bg-[#E2E8F0] text-[#4B5870] text-[10px] font-medium hover:bg-[#D1D5DB] transition-all"
                        >
                          Generate Plan
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-[#4B5870]">🔒 Plan data not shared</p>
                  <p className="text-xs text-[#4B5870]/60 mt-1">The patient has not shared their plans</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
              <h3 className="text-xs font-semibold text-[#172033] mb-3">Clinical Notes</h3>
              <ClinicalNoteForm
                patientId={patient.id}
                notes={patient.clinicalNotes}
                onNoteAdded={onNoteAdded}
              />
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 text-center">
              <p className="text-sm text-[#4B5870]">View the patient&apos;s full health timeline</p>
              <Link
                href={`/timeline?patientId=${patient.id}`}
                className="inline-block mt-3 text-xs font-medium text-[#176B63] hover:text-[#10554F]"
              >
                View Patient Timeline →
              </Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
