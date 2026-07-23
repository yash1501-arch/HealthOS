"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export type PostureIssue = {
  characteristic: string
  severity: string | null
  description: string | null
}

type PostureSummaryProps = {
  characteristics: PostureIssue[] | null | undefined
  latestAnalysisDate: string | null
  loading?: boolean
}

const severityColors = {
  mild: { fill: "#FBBF24", bg: "#FFFBEB", text: "#9B651B", label: "Mild" },
  moderate: { fill: "#F97316", bg: "#FFF7ED", text: "#9A3412", label: "Moderate" },
  severe: { fill: "#B53A45", bg: "#FEF2F2", text: "#991B1B", label: "Severe" },
  normal: { fill: "#176B63", bg: "#F0FDF4", text: "#176B63", label: "Normal" },
} as const

// Body zone positions in a simplified body outline (SVG coordinates)
// Using a simple front-view stick figure approach
const bodyZones: Array<{
  id: string
  label: string
  path: string
  relatedCharacteristics: string[]
}> = [
  {
    id: "head",
    label: "Forward Head",
    path: "M65,30 C65,18 75,18 75,30 L75,40 L65,40 Z",
    relatedCharacteristics: ["forward_head", "forward head posture", "head forward", "neck forward"],
  },
  {
    id: "shoulders",
    label: "Rounded Shoulders",
    path: "M50,50 C50,45 60,42 70,45 L75,55 L65,58 Z",
    relatedCharacteristics: ["rounded_shoulders", "rounded shoulders", "shoulder forward"],
  },
  {
    id: "upper_back",
    label: "Upper Back",
    path: "M58,55 C58,60 62,65 70,65 L72,72 L62,72 Z",
    relatedCharacteristics: ["kyphosis", "upper back curve", "hunched"],
  },
  {
    id: "pelvis",
    label: "Pelvic Tilt",
    path: "M55,88 C55,82 65,80 72,82 L74,90 L60,90 Z",
    relatedCharacteristics: ["pelvic_tilt", "pelvic tilt", "anterior tilt", "posterior tilt"],
  },
  {
    id: "knees",
    label: "Knee Valgus",
    path: "M58,100 C55,105 55,112 58,118 L62,118 L62,100 Z",
    relatedCharacteristics: ["knee_valgus", "knee valgus", "knock knees"],
  },
  {
    id: "feet",
    label: "Flat Feet",
    path: "M50,122 C48,126 50,130 56,132 L62,130 L60,122 Z",
    relatedCharacteristics: ["flat_feet", "flat feet", "pronation", "overpronation"],
  },
]

function getSeverityForZone(zone: typeof bodyZones[0], characteristics: PostureIssue[]): { severity: string | null; matched: PostureIssue | null } {
  for (const issue of characteristics) {
    const searchTerm = issue.characteristic.toLowerCase()
    if (zone.relatedCharacteristics.some((rc) => searchTerm.includes(rc) || rc.includes(searchTerm))) {
      return { severity: issue.severity, matched: issue }
    }
  }
  return { severity: null, matched: null }
}

function getSeverityConfig(severity: string | null): typeof severityColors[keyof typeof severityColors] {
  if (!severity) return severityColors.normal
  const lower = severity.toLowerCase()
  if (lower.includes("mild")) return severityColors.mild
  if (lower.includes("moderate")) return severityColors.moderate
  if (lower.includes("severe")) return severityColors.severe
  return severityColors.normal
}

export function PostureSummary({ characteristics, latestAnalysisDate, loading }: PostureSummaryProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-28 bg-[#E2E8F0] rounded" />
          <div className="flex gap-8">
            <div className="w-24 h-36 bg-[#E2E8F0] rounded" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-full bg-[#E2E8F0] rounded" />
              <div className="h-3 w-3/4 bg-[#E2E8F0] rounded" />
              <div className="h-3 w-1/2 bg-[#E2E8F0] rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const issues = characteristics ?? []
  const hasNoData = issues.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
      className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#172033]">Posture Analysis</h3>
          {latestAnalysisDate && !hasNoData && (
            <p className="text-[10px] text-[#4B5870]/60">
              Last analysis: {new Date(latestAnalysisDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
        {!hasNoData && (
          <Link
            href="/vision"
            className="text-[11px] font-medium text-[#176B63] hover:text-[#10554F] transition-colors"
          >
            View full →
          </Link>
        )}
      </div>

      {hasNoData ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#476A91]/5 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-[#476A91]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </div>
          <p className="text-sm text-[#4B5870]">No posture analysis yet</p>
          <p className="text-xs text-[#4B5870]/60 mt-1">Complete a vision scan to analyze your posture</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Body diagram */}
          <div className="shrink-0">
            <svg width="90" height="145" viewBox="40 15 50 125" className="stroke-[#D1D5DB] stroke-[1.5] fill-none">
              {/* Head */}
              <ellipse cx="70" cy="28" rx="10" ry="12" fill="none" />
              {/* Neck */}
              <line x1="70" y1="40" x2="70" y2="48" />
              {/* Torso */}
              <path d="M58,48 C58,48 50,70 52,90 L88,90 C90,70 82,48 82,48" />
              {/* Left arm */}
              <path d="M58,55 C45,65 40,80 42,90" />
              {/* Right arm */}
              <path d="M82,55 C95,65 100,80 98,90" />
              {/* Left leg */}
              <path d="M60,90 C58,105 55,115 52,130" />
              {/* Right leg */}
              <path d="M80,90 C82,105 85,115 88,130" />

              {/* Colored zone indicators */}
              {bodyZones.map((zone) => {
                const { severity } = getSeverityForZone(zone, issues)
                const config = getSeverityConfig(severity)
                if (!severity) return null
                return (
                  <path
                    key={zone.id}
                    d={zone.path}
                    fill={config.fill}
                    fillOpacity={0.25}
                    stroke={config.fill}
                    strokeWidth={1.5}
                    className="transition-all duration-300"
                  />
                )
              })}
            </svg>
          </div>

          {/* Issues list */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {bodyZones.map((zone) => {
              const { severity, matched } = getSeverityForZone(zone, issues)
              if (!matched) return null
              const config = getSeverityConfig(severity)
              return (
                <div key={zone.id} className="flex items-center gap-2 py-1">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: config.fill }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#172033] leading-tight truncate">
                      {zone.label}
                    </p>
                    {matched.description && (
                      <p className="text-[10px] text-[#4B5870] leading-tight truncate">
                        {matched.description}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: config.bg, color: config.text }}
                  >
                    {config.label}
                  </span>
                </div>
              )
            })}

            {issues.filter((i) => !bodyZones.some((z) => {
              const searchTerm = i.characteristic.toLowerCase()
              return z.relatedCharacteristics.some((rc) => searchTerm.includes(rc) || rc.includes(searchTerm))
            })).length > 0 && (
              <div className="pt-2 border-t border-[#E2E8F0] mt-2">
                {issues
                  .filter((i) => !bodyZones.some((z) => {
                    const searchTerm = i.characteristic.toLowerCase()
                    return z.relatedCharacteristics.some((rc) => searchTerm.includes(rc) || rc.includes(searchTerm))
                  }))
                  .slice(0, 2)
                  .map((issue, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: getSeverityConfig(issue.severity).fill }}
                      />
                      <span className="text-xs text-[#4B5870] truncate">{issue.characteristic}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
