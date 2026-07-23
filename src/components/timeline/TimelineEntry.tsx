"use client"

import { useState } from "react"
import type { TimelineEntryResult, TimelineCategory } from "@/lib/ai/engines/timeline-engine"

// ─── Category Config ─────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  TimelineCategory,
  { icon: string; color: string; bg: string; border: string }
> = {
  posture: { icon: "🧍", color: "text-[#9B651B]", bg: "bg-[#9B651B]/8", border: "border-[#9B651B]/20" },
  vision: { icon: "👁️", color: "text-[#5B8CFF]", bg: "bg-[#5B8CFF]/8", border: "border-[#5B8CFF]/20" },
  labs: { icon: "🔬", color: "text-[#476A91]", bg: "bg-[#476A91]/8", border: "border-[#476A91]/20" },
  diet: { icon: "🥗", color: "text-[#176B63]", bg: "bg-[#176B63]/8", border: "border-[#176B63]/20" },
  exercise: { icon: "💪", color: "text-[#176B63]", bg: "bg-[#176B63]/8", border: "border-[#176B63]/20" },
  checkin: { icon: "📋", color: "text-[#8B7FFF]", bg: "bg-[#8B7FFF]/8", border: "border-[#8B7FFF]/20" },
  routine: { icon: "📅", color: "text-[#4B5870]", bg: "bg-[#4B5870]/8", border: "border-[#4B5870]/20" },
  recommendation: { icon: "💡", color: "text-[#2FE6C4]", bg: "bg-[#2FE6C4]/8", border: "border-[#2FE6C4]/20" },
  medication: { icon: "💊", color: "text-[#B53A45]", bg: "bg-[#B53A45]/8", border: "border-[#B53A45]/20" },
  reminder: { icon: "⏰", color: "text-[#9B651B]", bg: "bg-[#9B651B]/8", border: "border-[#9B651B]/20" },
  report: { icon: "📄", color: "text-[#4B5870]", bg: "bg-[#4B5870]/8", border: "border-[#4B5870]/20" },
  other: { icon: "📌", color: "text-[#4B5870]", bg: "bg-[#F5F7FA]", border: "border-[#E2E8F0]" },
}

interface TimelineEntryProps {
  entry: TimelineEntryResult
  /** Optional link to view a full report */
  reportLink?: string
}

/**
 * Individual timeline entry with type-specific icon, color, date,
 * expandable details, and an optional "View Full Report" link.
 */
export function TimelineEntry({ entry, reportLink }: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(false)
  const config = CATEGORY_CONFIG[entry.category] ?? CATEGORY_CONFIG.other

  const date = new Date(entry.eventDate)
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const hasDetails = entry.description || entry.metadata

  return (
    <div
      className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-sm ${config.border} ${config.bg}`}
      onClick={() => expanded || !hasDetails ? undefined : setExpanded(true)}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${config.bg} ${config.border} border`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Title */}
          <h4 className="text-sm font-medium text-[#172033] truncate">{entry.title}</h4>
          {/* Category badge */}
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>
            {entry.category}
          </span>
        </div>

        {/* Date & time */}
        <p className="text-xs text-[#4B5870]/60 font-mono tabular-nums mt-0.5">
          {dateStr} · {timeStr}
        </p>

        {/* Summary description */}
        {entry.description && (
          <p className="text-xs text-[#4B5870] mt-1.5 line-clamp-2">{entry.description}</p>
        )}

        {/* Expandable metadata */}
        {hasDetails && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="mt-1.5 text-[10px] text-[#4B5870]/50 hover:text-[#176B63] font-medium transition-colors"
            >
              {expanded ? "▲ Show less" : "▼ Show details"}
            </button>

            {expanded && entry.metadata && (
              <div className="mt-2 p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
                <pre className="text-[10px] text-[#4B5870]/70 whitespace-pre-wrap font-mono leading-relaxed">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}

        {/* View Full Report link */}
        {reportLink && (
          <a
            href={reportLink}
            className="mt-2 inline-flex items-center gap-1 text-xs text-[#176B63] hover:text-[#10554F] font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View Full Report
          </a>
        )}
      </div>
    </div>
  )
}
