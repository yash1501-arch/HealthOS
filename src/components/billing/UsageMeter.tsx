"use client"

import { motion } from "framer-motion"

interface UsageMeterProps {
  /** Label for this meter (e.g. "AI Calls", "Report Uploads"). */
  label: string
  /** Currently used count. */
  used: number
  /** Total limit. */
  limit: number
  /** Optional date when usage resets. */
  resetsAt?: string
  /** URL to upgrade page. */
  upgradeHref?: string
}

/**
 * Usage meter with a progress bar that changes color based on thresholds:
 * - Green: under 70%
 * - Yellow: 70–90%
 * - Red: over 90%
 */
export function UsageMeter({
  label,
  used,
  limit,
  resetsAt,
  upgradeHref,
}: UsageMeterProps) {
  const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const isNearLimit = percentage >= 70

  const getColor = () => {
    if (percentage >= 90) return "bg-[#B53A45]"
    if (percentage >= 70) return "bg-[#9B651B]"
    return "bg-[#176B63]"
  }

  const getBgColor = () => {
    if (percentage >= 90) return "bg-[#B53A45]/8"
    if (percentage >= 70) return "bg-[#9B651B]/8"
    return "bg-[#176B63]/8"
  }

  const getTextColor = () => {
    if (percentage >= 90) return "text-[#B53A45]"
    if (percentage >= 70) return "text-[#9B651B]"
    return "text-[#176B63]"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${getBgColor()} border-transparent`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#172033]">{label}</span>
        <span className={`text-sm tabular-nums font-semibold ${getTextColor()}`}>
          {used}/{limit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${getColor()}`}
        />
      </div>

      {/* Status + actions */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#4B5870]/60">
            {percentage < 70 ? `${100 - percentage}% remaining` : `${percentage}% used`}
          </span>
          {resetsAt && (
            <span className="text-[10px] text-[#4B5870]/40">
              Resets {new Date(resetsAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {isNearLimit && upgradeHref && (
          <a
            href={upgradeHref}
            className="text-[11px] font-medium text-[#176B63] hover:text-[#10554F] transition-colors"
          >
            Upgrade for more
          </a>
        )}
      </div>
    </motion.div>
  )
}
