"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"
import type { TimelineEntryResult, TimelineCategory } from "@/lib/ai/engines/timeline-engine"
import { TimelineEntry } from "@/components/timeline/TimelineEntry"
import { AIQueryBox } from "@/components/timeline/AIQueryBox"

const FILTERS: Array<{ label: string; value: string | null }> = [
  { label: "All", value: null },
  { label: "Posture", value: "posture" },
  { label: "Vision", value: "vision" },
  { label: "Labs", value: "labs" },
  { label: "Diet", value: "diet" },
  { label: "Exercise", value: "exercise" },
  { label: "Check-ins", value: "checkin" },
  { label: "Routine", value: "routine" },
  { label: "Reports", value: "report" },
]

interface TimelineViewProps {
  /** Initial entries to render (for SSR). */
  initialEntries?: TimelineEntryResult[]
  /** Total count from initial load. */
  initialTotal?: number
}

/**
 * Full health timeline view with month-grouped entries, filter buttons,
 * date range pickers, pagination, and an integrated AI query box at the top.
 */
export function TimelineView({ initialEntries, initialTotal }: TimelineViewProps) {
  const [entries, setEntries] = useState<TimelineEntryResult[]>(initialEntries ?? [])
  const [total, setTotal] = useState(initialTotal ?? 0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (activeFilter) params.set("type", activeFilter)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)

      const res = await api.get<{
        data: {
          entries: TimelineEntryResult[]
          total: number
          page: number
          pageSize: number
          totalPages: number
        }
      }>(`/timeline?${params.toString()}`)

      setEntries(res.data.entries)
      setTotal(res.data.total)
    } catch {
      // Keep existing entries on error
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, activeFilter, startDate, endDate])

  // Refetch when filters change
  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Group entries by month
  const grouped = groupByMonth(entries)

  // Pagination
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#172033]">Health Timeline</h1>
        <p className="text-sm text-[#4B5870] mt-1">
          {total} event{total !== 1 ? "s" : ""} across your health journey
        </p>
      </motion.div>

      {/* ── AI Query Box ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-[#176B63]/5 to-[#2FE6C4]/5 border border-[#176B63]/10 rounded-2xl p-4"
      >
        <AIQueryBox />
      </motion.div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => {
              setActiveFilter(f.value)
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              activeFilter === f.value
                ? "bg-[#176B63] text-white border-[#176B63]"
                : "bg-white text-[#4B5870] border-[#E2E8F0] hover:border-[#176B63]/20 hover:text-[#176B63]"
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* Date range */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setPage(1)
            }}
            className="h-8 px-2 text-[11px] rounded-lg border border-[#E2E8F0] bg-white text-[#4B5870]
              focus:outline-none focus:border-[#176B63]"
          />
          <span className="text-[10px] text-[#4B5870]/50">–</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setPage(1)
            }}
            className="h-8 px-2 text-[11px] rounded-lg border border-[#E2E8F0] bg-white text-[#4B5870]
              focus:outline-none focus:border-[#176B63]"
          />
        </div>
      </div>

      {/* ── Loading indicator ── */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <span className="w-5 h-5 border-2 border-[#E2E8F0] border-t-[#176B63] rounded-full animate-spin" />
        </div>
      )}

      {/* ── Timeline Entries ── */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-[#4B5870]">No events found for the selected filters.</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([monthYear, monthEntries]) => (
            <div key={monthYear}>
              <h3 className="text-sm font-semibold text-[#172033] mb-3 sticky top-0 bg-[#F8FAFB] py-2 z-10">
                {monthYear}
              </h3>
              <div className="space-y-2">
                {monthEntries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <TimelineEntry entry={entry} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[#4B5870]/60">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E2E8F0] text-[#4B5870]
                hover:border-[#176B63]/20 disabled:opacity-30 transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E2E8F0] text-[#4B5870]
                hover:border-[#176B63]/20 disabled:opacity-30 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper ──────────────────────────────────────────────────────

/**
 * Groups an array of timeline entries by their month and year.
 */
function groupByMonth(
  entries: TimelineEntryResult[]
): Record<string, TimelineEntryResult[]> {
  const groups: Record<string, TimelineEntryResult[]> = {}

  for (const entry of entries) {
    const date = new Date(entry.eventDate)
    const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    if (!groups[key]) groups[key] = []
    groups[key].push(entry)
  }

  return groups
}
