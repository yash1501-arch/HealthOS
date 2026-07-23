"use client"

import { motion } from "framer-motion"
import type { CheckInSummaryOutput } from "@/lib/ai/engines/checkin-engine"

const ease = [0.16, 1, 0.3, 1] as const

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  improving: { bg: "bg-[#176B63]/10", text: "text-[#176B63]", dot: "bg-[#176B63]" },
  stable: { bg: "bg-[#5B8CFF]/10", text: "text-[#5B8CFF]", dot: "bg-[#5B8CFF]" },
  needs_attention: { bg: "bg-[#9B651B]/10", text: "text-[#9B651B]", dot: "bg-[#9B651B]" },
  alert: { bg: "bg-[#B53A45]/10", text: "text-[#B53A45]", dot: "bg-[#B53A45]" },
}

interface CheckInSummaryProps {
  /** The AI summary data to display. */
  summary: CheckInSummaryOutput
}

/**
 * Displays the AI-generated check-in summary with progress assessment,
 * adherence analysis, suggested adjustments, next week focus, and encouragement.
 */
export function CheckInSummary({ summary }: CheckInSummaryProps) {
  const overallStyle = STATUS_COLORS[summary.progressAssessment.overall] ?? STATUS_COLORS.stable

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Header / Overall Status ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border ${overallStyle.bg} p-5`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-4 h-4 rounded-full ${overallStyle.dot}`} />
          <span className={`text-sm font-semibold ${overallStyle.text} capitalize`}>
            {summary.progressAssessment.overall.replace("_", " ")}
          </span>
        </div>
        <p className="text-sm text-[#4B5870] leading-relaxed">{summary.weeklySummary}</p>
      </motion.div>

      {/* ── Progress Areas ── */}
      {summary.progressAssessment.areas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
        >
          <div className="p-4 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#172033]">Progress Areas</h3>
          </div>
          <div className="divide-y divide-[#E2E8F0]/60">
            {summary.progressAssessment.areas.map((area, i) => {
              const style = STATUS_COLORS[area.status] ?? STATUS_COLORS.stable
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#172033]">{area.category}</p>
                    <p className="text-[11px] text-[#4B5870]">{area.note}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                    {area.status.replace("_", " ")}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── Adherence Analysis ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <AdherenceCard label="Exercise" value={summary.adherenceAnalysis.exercise.adherence} comment={summary.adherenceAnalysis.exercise.comment} color="bg-[#176B63]" />
        <AdherenceCard label="Diet" value={summary.adherenceAnalysis.diet.adherence} comment={summary.adherenceAnalysis.diet.comment} color="bg-[#9B651B]" />
        <AdherenceCard label="Sleep" value={summary.adherenceAnalysis.sleep.score * 10} comment={summary.adherenceAnalysis.sleep.comment} color="bg-[#5B8CFF]" />
        <AdherenceCard label="Stress" value={(10 - summary.adherenceAnalysis.stress.score) * 10} comment={summary.adherenceAnalysis.stress.comment} color="bg-[#8B7FFF]" invert />
      </motion.div>

      {/* ── Adjustments ── */}
      {summary.adjustments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          <h3 className="text-sm font-semibold text-[#172033]">Suggested Adjustments</h3>
          {summary.adjustments.map((adj, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#176B63]/10 text-[#176B63]">
                  {adj.category}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#4B5870] mb-1.5">
                <span className="line-through text-[#4B5870]/50">{adj.current}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-[#176B63]">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="font-medium text-[#172033]">{adj.suggested}</span>
              </div>
              <p className="text-[11px] text-[#4B5870]/70">{adj.reason}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Next Week Focus ── */}
      {summary.nextWeekFocus.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-[#E2E8F0] p-4"
        >
          <h3 className="text-sm font-semibold text-[#172033] mb-3">🎯 Next Week Focus</h3>
          <div className="space-y-2">
            {summary.nextWeekFocus.map((focus, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group">
                <div className="w-4 h-4 rounded border-2 border-[#E2E8F0] group-hover:border-[#176B63]/30 transition-colors shrink-0" />
                <span className="text-sm text-[#4B5870]">{focus}</span>
              </label>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Encouragement ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-gradient-to-br from-[#176B63]/5 to-[#2FE6C4]/5 border border-[#176B63]/15 rounded-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">🌟</span>
          <div>
            <p className="text-sm font-semibold text-[#172033] mb-1">You&apos;re Doing Great!</p>
            <p className="text-sm text-[#4B5870] leading-relaxed">{summary.encouragement}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Concerns ── */}
      {summary.concerns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-4"
        >
          <div className="flex items-start gap-2.5 mb-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="#B53A45" strokeWidth="1.5" className="w-5 h-5 mt-0.5 shrink-0">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-sm font-semibold text-[#B53A45]">Things to Discuss with Your Doctor</h3>
          </div>
          <ul className="space-y-1 ml-7">
            {summary.concerns.map((concern, i) => (
              <li key={i} className="text-xs text-[#4B5870] list-disc">{concern}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* ── Disclaimer ── */}
      <div className="border-t border-[#E2E8F0] pt-4">
        <p className="text-xs text-[#4B5870]/60 leading-relaxed">
          {summary.disclaimer ||
            "This summary is AI-generated for informational purposes only and is not a substitute for professional medical advice."}
        </p>
      </div>
    </div>
  )
}

// ── Adherence Card ──

function AdherenceCard({
  label,
  value,
  comment,
  color,
  invert,
}: {
  label: string
  value: number
  comment: string
  color: string
  invert?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const pct = invert ? 100 - clamped : clamped
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#4B5870]">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-[#172033]">
          {invert ? `${100 - pct}%` : `${pct}%`}
        </span>
      </div>
      <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-[#4B5870]/70 leading-relaxed">{comment}</p>
    </div>
  )
}
