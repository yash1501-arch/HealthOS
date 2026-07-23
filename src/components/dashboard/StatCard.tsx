"use client"

import { motion } from "framer-motion"

export type StatCardProps = {
  icon: React.ReactNode
  label: string
  value: string | number | null
  unit?: string
  trend?: { value: number; isPositive: boolean; period?: string } | null
  variant?: "default" | "positive" | "negative" | "neutral"
  loading?: boolean
}

const variantColors = {
  default: { bg: "bg-white", border: "border-[#E2E8F0]", text: "text-[#4B5870]", value: "text-[#172033]" },
  positive: { bg: "bg-[#F0FDF4]", border: "border-[#176B63]/20", text: "text-[#176B63]", value: "text-[#176B63]" },
  negative: { bg: "bg-[#FEF2F2]", border: "border-[#B53A45]/20", text: "text-[#B53A45]", value: "text-[#B53A45]" },
  neutral: { bg: "bg-[#F0F5FF]", border: "border-[#476A91]/20", text: "text-[#476A91]", value: "text-[#476A91]" },
}

const EASE = [0.16, 1, 0.3, 1] as const

export function StatCard({ icon, label, value, unit, trend, variant = "default", loading = false }: StatCardProps) {
  const colors = variantColors[variant]

  if (loading) {
    return (
      <div className="rounded-2xl p-5 border border-[#E2E8F0] bg-white">
        <div className="animate-pulse space-y-3">
          <div className="w-8 h-8 rounded-lg bg-[#E2E8F0]" />
          <div className="h-3 w-16 bg-[#E2E8F0] rounded" />
          <div className="h-6 w-20 bg-[#E2E8F0] rounded" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 border ${colors.border} ${colors.bg}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
          <span className="text-lg">{icon}</span>
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
              trend.value >= 0 && trend.isPositive
                ? "bg-[#176B63]/10 text-[#176B63]"
                : trend.value < 0
                  ? "bg-[#B53A45]/10 text-[#B53A45]"
                  : "bg-[#E2E8F0] text-[#4B5870]"
            }`}
          >
            <span className="text-xs">
              {trend.value > 0 ? "↑" : trend.value < 0 ? "↓" : "→"}
            </span>
            <span>{Math.abs(trend.value).toFixed(1)}</span>
            {trend.period && <span className="opacity-60">/{trend.period}</span>}
          </span>
        )}
      </div>

      <p className={`text-[11px] font-medium uppercase tracking-wider mb-1 ${colors.text} opacity-70`}>
        {label}
      </p>

      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl md:text-2xl font-bold tabular-nums ${colors.value}`}>
          {value ?? "—"}
        </span>
        {unit && <span className={`text-xs ${colors.text} opacity-50`}>{unit}</span>}
      </div>
    </motion.div>
  )
}
