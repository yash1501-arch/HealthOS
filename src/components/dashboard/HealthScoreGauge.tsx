"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"

export type HealthScoreBreakdown = {
  posture: number
  nutrition: number
  activity: number
  sleep: number
  stress: number
  vision: number
  labs: number
}

type HealthScoreGaugeProps = {
  score: number
  breakdown?: HealthScoreBreakdown | null
  trend?: "improving" | "stable" | "declining" | null
  loading?: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

const breakdownLabels: Record<keyof HealthScoreBreakdown, { label: string; color: string }> = {
  posture: { label: "Posture", color: "#476A91" },
  nutrition: { label: "Nutrition", color: "#176B63" },
  activity: { label: "Activity", color: "#9B651B" },
  sleep: { label: "Sleep", color: "#6B4C8A" },
  stress: { label: "Stress", color: "#B53A45" },
  vision: { label: "Vision", color: "#2E7D8A" },
  labs: { label: "Labs", color: "#5A6B8A" },
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#176B63"
  if (score >= 40) return "#9B651B"
  return "#B53A45"
}

function getScoreBg(score: number): string {
  if (score >= 70) return "rgba(23, 107, 99, 0.08)"
  if (score >= 40) return "rgba(155, 101, 27, 0.08)"
  return "rgba(181, 58, 69, 0.08)"
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 70) return "Good"
  if (score >= 50) return "Fair"
  if (score >= 40) return "Needs Work"
  return "Attention"
}

const trendConfig = {
  improving: { icon: "↑", color: "#176B63", label: "Improving" },
  stable: { icon: "→", color: "#9B651B", label: "Stable" },
  declining: { icon: "↓", color: "#B53A45", label: "Declining" },
}

export function HealthScoreGauge({ score, breakdown, trend, loading }: HealthScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    const duration = 1200
    const startVal = 0
    const endVal = score

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(startVal + (endVal - startVal) * eased))
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [score])

  const circumference = 2 * Math.PI * 70
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference
  const scoreColor = getScoreColor(score)
  const trendInfo = trend ? trendConfig[trend] : null

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 bg-[#E2E8F0] rounded mx-auto" />
          <div className="w-48 h-48 rounded-full bg-[#E2E8F0] mx-auto" />
          <div className="h-3 w-32 bg-[#E2E8F0] rounded mx-auto" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(7)].map((_, i) => <div key={i} className="h-2 bg-[#E2E8F0] rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="bg-white rounded-2xl border border-[#E2E8F0] p-6 relative"
      onMouseEnter={() => setShowBreakdown(true)}
      onMouseLeave={() => setShowBreakdown(false)}
    >
      {/* Title */}
      <div className="text-center mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4B5870]">
          Health Score
        </p>
      </div>

      {/* Gauge */}
      <div className="relative w-44 h-44 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#F0F2F5"
            strokeWidth="10"
          />
          {/* Score circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={scoreColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.3s ease, stroke 0.3s ease" }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={animatedScore}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl font-bold tabular-nums"
            style={{ color: scoreColor }}
          >
            {animatedScore}
          </motion.span>
          <span className="text-[10px] font-medium text-[#4B5870] mt-0.5">
            {getScoreLabel(score)}
          </span>
        </div>
      </div>

      {/* Trend indicator */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {trendInfo && (
          <span
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: `${trendInfo.color}10`,
              color: trendInfo.color,
            }}
          >
            <span className="text-sm">{trendInfo.icon}</span>
            {trendInfo.label}
          </span>
        )}
      </div>

      {/* Breakdown bars */}
      {breakdown && (
        <div className="mt-5 space-y-1.5">
          {(Object.keys(breakdownLabels) as Array<keyof HealthScoreBreakdown>).map((key) => {
            const val = breakdown[key]
            const info = breakdownLabels[key]
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-[#4B5870] w-14 text-right shrink-0">
                  {info.label}
                </span>
                <div className="flex-1 h-1.5 bg-[#F0F2F5] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: info.color, opacity: 0.8 }}
                  />
                </div>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: info.color }}>
                  {val}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Hover tooltip */}
      {showBreakdown && breakdown && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 bg-white shadow-lg border border-[#E2E8F0] rounded-xl p-3 z-10 w-48"
        >
          <p className="text-[10px] font-semibold text-[#4B5870] uppercase tracking-wider mb-2">Breakdown</p>
          <div className="space-y-1.5">
            {(Object.keys(breakdownLabels) as Array<keyof HealthScoreBreakdown>).map((key) => {
              const val = breakdown[key]
              const info = breakdownLabels[key]
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-[#4B5870]">{info.label}</span>
                  <span className="font-semibold" style={{ color: info.color }}>{val}/100</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
