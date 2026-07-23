"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"

type TimelineEntry = {
  id: string
  eventType: string
  title: string
  description: string | null
  eventDate: string
  metadata: Record<string, unknown> | null
}

const EVENT_META: Record<string, { icon: string; color: string; label: string }> = {
  report_uploaded: { icon: "📄", color: "border-l-[#176B63]", label: "Report" },
  weekly_checkin: { icon: "📋", color: "border-l-[#476A91]", label: "Check-in" },
  assessment_completed: { icon: "✅", color: "border-l-[#9B651B]", label: "Assessment" },
  goal_achieved: { icon: "🎯", color: "border-l-[#176B63]", label: "Goal" },
  vision_analysis: { icon: "🔍", color: "border-l-[#B53A45]", label: "Vision" },
}

function getEventMeta(type: string) {
  return EVENT_META[type] || { icon: "📌", color: "border-l-[#4B5870]", label: type }
}

export default function TimelinePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<TimelineEntry[]>("/timeline")
        setEntries(data)
      } catch {
        // Not available
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function groupByMonth(entries: TimelineEntry[]): Map<string, TimelineEntry[]> {
    const groups = new Map<string, TimelineEntry[]>()
    for (const entry of entries) {
      const date = new Date(entry.eventDate)
      const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(entry)
    }
    return groups
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-[#172033]"
      >
        Health Timeline
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="text-sm text-[#4B5870]"
      >
        A chronological view of your health journey
      </motion.p>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[#F5F7FA] animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center"
        >
          <div className="w-14 h-14 rounded-xl bg-[#F5F7FA] flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#176B63" strokeWidth="1.5" className="w-7 h-7">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#172033] mb-2">No timeline entries yet</h3>
          <p className="text-sm text-[#4B5870]">
            Your activities — assessments, check-ins, reports — will appear here.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {Array.from(groupByMonth(entries).entries()).map(([month, monthEntries], gi) => (
            <motion.div
              key={month}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.08 }}
            >
              <h2 className="text-sm font-semibold text-[#4B5870] mb-4">{month}</h2>
              <div className="space-y-2">
                {monthEntries.map((entry, i) => {
                  const meta = getEventMeta(entry.eventType)
                  const date = new Date(entry.eventDate)
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`bg-white rounded-xl border border-[#E2E8F0] border-l-[3px] ${meta.color} p-4 hover:shadow-sm transition-shadow`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">{meta.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[#F5F7FA] text-[#4B5870]">{meta.label}</span>
                            <span className="text-xs text-[#4B5870]/50">
                              {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#172033] mt-1">{entry.title}</p>
                          {entry.description && (
                            <p className="text-xs text-[#4B5870] mt-0.5 line-clamp-2">{entry.description}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
