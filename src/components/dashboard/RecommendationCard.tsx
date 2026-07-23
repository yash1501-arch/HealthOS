"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

type RecommendationItem = {
  category: string
  priority: "high" | "medium" | "low"
  icon: string
  title: string
  description: string
  action: string
}

type RecommendationCardProps = {
  recommendation: RecommendationItem
  index?: number
  onMarkDone?: () => void
}

const priorityConfig = {
  high: { color: "#B53A45", bg: "#FEF2F2", label: "Important", dotColor: "#B53A45", confidence: 85 },
  medium: { color: "#9B651B", bg: "#FFFBEB", label: "Beneficial", dotColor: "#9B651B", confidence: 70 },
  low: { color: "#4B5870", bg: "#F8F9FB", label: "Suggestion", dotColor: "#4B5870", confidence: 55 },
}

const categoryIcons: Record<string, string> = {
  pain: "🩺",
  sleep: "😴",
  hydration: "💧",
  stress: "🧠",
  exercise: "🏃",
  screen: "👁️",
  ergonomics: "🪑",
  lifestyle: "🌿",
  nutrition: "🥗",
  goals: "🎯",
}

const EASE = [0.16, 1, 0.3, 1] as const

export function RecommendationCard({ recommendation, index = 0, onMarkDone }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [done, setDone] = useState(false)
  const config = priorityConfig[recommendation.priority]
  const icon = categoryIcons[recommendation.category] || recommendation.icon || "💡"

  if (done) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: EASE }}
      className={`rounded-xl border bg-white overflow-hidden transition-all duration-200 hover:shadow-sm ${
        recommendation.priority === "high"
          ? "border-l-[3px] border-l-[#B53A45] border-[#E2E8F0]"
          : "border-l-[3px] border-l-[#176B63] border-[#E2E8F0]"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
            style={{ backgroundColor: config.bg }}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-[#172033] leading-tight">
                {recommendation.title}
              </p>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
                style={{ backgroundColor: config.bg, color: config.color }}
              >
                {config.label}
              </span>
            </div>
            <p className="text-[11px] text-[#4B5870] leading-relaxed">
              {recommendation.description}
            </p>

            {/* Confidence bar */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-[#F0F2F5] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${config.confidence}%`, backgroundColor: config.color }}
                />
              </div>
              <span className="text-[10px] font-semibold tabular-nums" style={{ color: config.color }}>
                {config.confidence}%
              </span>
            </div>

            {/* Action + buttons */}
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[11px] font-medium text-[#176B63] hover:text-[#10554F] transition-colors"
              >
                {expanded ? "Show less" : "View details"}
              </button>
              <button
                className="text-[11px] text-[#4B5870] hover:text-[#172033] transition-colors"
              >
                🤖 Ask AI
              </button>
              <button
                onClick={() => { setDone(true); onMarkDone?.() }}
                className="text-[11px] text-[#4B5870] hover:text-[#172033] transition-colors ml-auto"
              >
                ✓ Mark done
              </button>
            </div>
          </div>
        </div>

        {/* Expanded action details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-[#E2E8F0]">
                <div className="flex gap-3 p-3 rounded-lg bg-[#F8F9FB]">
                  <span className="text-sm shrink-0 mt-0.5">💡</span>
                  <div>
                    <p className="text-xs font-medium text-[#172033] mb-0.5">Suggested Action</p>
                    <p className="text-[11px] text-[#4B5870] leading-relaxed">{recommendation.action}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
