"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import Link from "next/link"

type ScheduleItem = {
  time: string
  activity: string
  category: string
  duration: number
  details?: string
  tips?: string
}

type TodayRoutineProps = {
  schedule: ScheduleItem[] | null | undefined
  loading?: boolean
}

const categoryConfig: Record<string, { color: string; bg: string; icon: string }> = {
  sleep: { color: "#6B4C8A", bg: "#F5F0FF", icon: "😴" },
  exercise: { color: "#176B63", bg: "#F0FDF4", icon: "🏋️" },
  meal: { color: "#9B651B", bg: "#FFFBEB", icon: "🍽️" },
  work: { color: "#476A91", bg: "#F0F5FF", icon: "💼" },
  break: { color: "#4B5870", bg: "#F8F9FB", icon: "☕" },
  posture: { color: "#F97316", bg: "#FFF7ED", icon: "🧘" },
  eye_care: { color: "#2E7D8A", bg: "#F0FDFA", icon: "👁️" },
  hydration: { color: "#0EA5E9", bg: "#F0F9FF", icon: "💧" },
  mindfulness: { color: "#8B5CF6", bg: "#F5F3FF", icon: "🧠" },
  personal: { color: "#4B5870", bg: "#F8F9FB", icon: "🛁" },
}

function getCategoryConfig(category: string) {
  return categoryConfig[category] ?? { color: "#4B5870", bg: "#F8F9FB", icon: "📌" }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + (m || 0)
}

function isCurrentTimeSlot(time: string, duration: number): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const start = timeToMinutes(time)
  const end = start + duration
  return currentMinutes >= start && currentMinutes <= end
}

function isPast(time: string, duration: number): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return currentMinutes > timeToMinutes(time) + duration
}

export function TodayRoutine({ schedule, loading }: TodayRoutineProps) {
  const sortedSchedule = useMemo(() => {
    if (!schedule) return []
    return [...schedule].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
  }, [schedule])

  const upcomingItems = useMemo(() => {
    if (sortedSchedule.length <= 5) return sortedSchedule
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const nextIndex = sortedSchedule.findIndex((s) => timeToMinutes(s.time) >= nowMinutes)
    if (nextIndex === -1) return sortedSchedule.slice(-5)
    const start = Math.max(0, nextIndex - 1)
    return sortedSchedule.slice(start, start + 5)
  }, [sortedSchedule])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 bg-[#E2E8F0] rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-12 h-12 bg-[#E2E8F0] rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-[#E2E8F0] rounded" />
                <div className="h-3 w-32 bg-[#E2E8F0] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!schedule || schedule.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#172033]">Today&apos;s Routine</h3>
            <p className="text-xs text-[#4B5870]">Your daily schedule at a glance</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#9B651B]/5 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-[#9B651B]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-[#4B5870]">No routine set for today</p>
          <p className="text-xs text-[#4B5870]/60 mt-1">Complete your assessment to get a personalized daily routine</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#172033]">Today&apos;s Routine</h3>
          <p className="text-xs text-[#4B5870]">Next 5 activities</p>
        </div>
        <Link
          href="/routine"
          className="text-[11px] font-medium text-[#176B63] hover:text-[#10554F] transition-colors"
        >
          View full →
        </Link>
      </div>

      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-[27px] top-2 bottom-2 w-px bg-[#E2E8F0]" />

        <div className="space-y-0">
          {upcomingItems.map((item, i) => {
            const config = getCategoryConfig(item.category)
            const past = isPast(item.time, item.duration)
            const current = isCurrentTimeSlot(item.time, item.duration)
            const hours = Math.floor(item.duration / 60)
            const mins = item.duration % 60
            const durationStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`

            return (
              <motion.div
                key={`${item.time}-${item.activity}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-start gap-3 py-2.5 transition-opacity ${
                  past ? "opacity-40" : ""
                } ${current ? "opacity-100" : ""}`}
              >
                {/* Time */}
                <div className="w-12 shrink-0 text-right pt-0.5">
                  <span className={`text-[11px] font-medium tabular-nums ${
                    current ? "text-[#176B63]" : "text-[#4B5870]"
                  }`}>
                    {item.time}
                  </span>
                </div>

                {/* Timeline dot */}
                <div className="relative flex items-center justify-center shrink-0">
                  {current ? (
                    <span className="w-3 h-3 rounded-full bg-[#176B63] ring-4 ring-[#176B63]/20 animate-pulse" />
                  ) : past ? (
                    <span className="w-2 h-2 rounded-full bg-[#4B5870]/30" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#E2E8F0]" />
                  )}
                </div>

                {/* Card */}
                <div
                  className={`flex-1 min-w-0 rounded-lg border p-3 transition-all ${
                    current
                      ? "border-[#176B63]/30 bg-[#176B63]/[0.03] shadow-sm"
                      : "border-[#E2E8F0] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${
                        past ? "text-[#4B5870]" : "text-[#172033]"
                      }`}>
                        {item.activity}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#4B5870]/60">{durationStr}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: config.bg, color: config.color }}>
                          {item.category.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    {current && (
                      <span className="text-[9px] font-semibold text-[#176B63] uppercase tracking-wider shrink-0">
                        Now
                      </span>
                    )}
                    {past && (
                      <span className="text-[9px] text-[#4B5870]/40 shrink-0">✓</span>
                    )}
                  </div>
                  {item.details && current && (
                    <p className="text-[10px] text-[#4B5870] mt-1.5 leading-tight">
                      {item.details}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
