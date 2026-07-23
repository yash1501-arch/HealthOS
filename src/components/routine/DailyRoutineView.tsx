"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import type { RoutineOutput, RoutineActivity, PostureBreak, EyeCareReminder } from "@/lib/ai/engines/routine-engine"

const ease = [0.16, 1, 0.3, 1] as const

const CATEGORY_STYLES: Record<string, { label: string; color: string; dot: string; bg: string; icon: string }> = {
  sleep: { label: "Sleep", color: "text-[#4B5870]", dot: "bg-[#4B5870]", bg: "bg-[#F5F7FA]", icon: "😴" },
  exercise: { label: "Exercise", color: "text-[#176B63]", dot: "bg-[#176B63]", bg: "bg-[#176B63]/5", icon: "🏋️" },
  meal: { label: "Meal", color: "text-[#9B651B]", dot: "bg-[#9B651B]", bg: "bg-[#9B651B]/5", icon: "🍽️" },
  work: { label: "Work", color: "text-[#476A91]", dot: "bg-[#476A91]", bg: "bg-[#476A91]/5", icon: "💼" },
  break: { label: "Break", color: "text-[#4B5870]", dot: "bg-[#4B5870]/50", bg: "bg-[#F5F7FA]", icon: "☕" },
  posture: { label: "Posture", color: "text-[#9B651B]", dot: "bg-[#9B651B]", bg: "bg-[#9B651B]/8", icon: "🧍" },
  eye_care: { label: "Eye Care", color: "text-[#5B8CFF]", dot: "bg-[#5B8CFF]", bg: "bg-[#5B8CFF]/8", icon: "👁️" },
  hydration: { label: "Hydrate", color: "text-[#5B8CFF]", dot: "bg-[#5B8CFF]", bg: "bg-[#5B8CFF]/5", icon: "💧" },
  mindfulness: { label: "Mindfulness", color: "text-[#8B7FFF]", dot: "bg-[#8B7FFF]", bg: "bg-[#8B7FFF]/8", icon: "🧘" },
  personal: { label: "Personal", color: "text-[#FF6B6B]", dot: "bg-[#FF6B6B]", bg: "bg-[#FF6B6B]/5", icon: "🎯" },
}

interface DailyRoutineViewProps {
  routine: RoutineOutput
}

/**
 * Vertical timeline view of a daily routine with color-coded activities,
 * current time indicator, completion checkboxes, and snooze buttons.
 */
export function DailyRoutineView({ routine }: DailyRoutineViewProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set())

  const toggleComplete = useCallback((time: string) => {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(time)) next.delete(time)
      else next.add(time)
      return next
    })
  }, [])

  const handleSnooze = useCallback((time: string) => {
    setSnoozed((prev) => {
      const next = new Set(prev)
      next.add(time)
      return next
    })
    setTimeout(() => {
      setSnoozed((prev) => {
        const next = new Set(prev)
        next.delete(time)
        return next
      })
    }, 15 * 60 * 1000) // 15 minutes
  }, [])

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  /** Checks if a time string like "07:30" has passed. */
  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + (m ?? 0)
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-[#172033]">Daily Routine</h1>
        <p className="text-sm text-[#4B5870] mt-1">
          {routine.dailySchedule.length} activities planned for today
        </p>
      </motion.div>

      {/* ── Special Sections ── */}
      {routine.postureBreaks.length > 0 && (
        <SpecialSection
          title="Posture Breaks"
          icon="🧍"
          color="border-[#9B651B]/30 bg-[#9B651B]/5"
          items={routine.postureBreaks.map((b) => ({ time: b.time, label: b.exercise, detail: b.duration }))}
        />
      )}

      {routine.eyeCareSchedule.length > 0 && (
        <SpecialSection
          title="Eye Care (20-20-20 Rule)"
          icon="👁️"
          color="border-[#5B8CFF]/30 bg-[#5B8CFF]/5"
          items={routine.eyeCareSchedule.map((e) => ({ time: e.time, label: e.action, detail: "" }))}
        />
      )}

      {/* ── Timeline ── */}
      <div className="relative">
        {/* Current time indicator */}
        <CurrentTimeIndicator />

        <div className="space-y-1">
          {routine.dailySchedule.map((activity, i) => {
            const style = CATEGORY_STYLES[activity.category] ?? CATEGORY_STYLES.break
            const actMinutes = timeToMinutes(activity.time)
            const isPast = actMinutes < currentMinutes
            const isCompleted = completed.has(activity.time)
            const isSnoozed = snoozed.has(activity.time)
            const isNow = Math.abs(actMinutes - currentMinutes) <= 30

            return (
              <motion.div
                key={`${activity.time}-${activity.category}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, ease }}
                className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                  isCompleted
                    ? "border-[#176B63]/20 bg-[#176B63]/3 opacity-60"
                    : isNow
                      ? "border-[#176B63] bg-[#176B63]/5 shadow-sm"
                      : "border-[#E2E8F0] bg-white hover:border-[#176B63]/20"
                }`}
              >
                {/* Complete checkbox */}
                <button
                  onClick={() => toggleComplete(activity.time)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                    isCompleted
                      ? "bg-[#176B63] border-[#176B63]"
                      : "border-[#E2E8F0] hover:border-[#176B63]/30"
                  }`}
                  aria-label={isCompleted ? "Undo complete" : "Mark complete"}
                >
                  {isCompleted && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* Timeline dot + line */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-3 h-3 rounded-full ${style.dot} ${isNow ? "ring-2 ring-[#176B63]/30" : ""}`} />
                  {i < routine.dailySchedule.length - 1 && (
                    <div className="w-px h-full min-h-[2rem] bg-[#E2E8F0]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono text-[#4B5870] tabular-nums font-medium">
                      {activity.time}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.color}`}>
                      {style.label}
                    </span>
                    {activity.duration && (
                      <span className="text-[10px] text-[#4B5870]/60">{activity.duration}</span>
                    )}
                  </div>

                  <p className={`text-sm font-medium mt-1 ${isCompleted ? "line-through text-[#4B5870]/50" : "text-[#172033]"}`}>
                    {style.icon} {activity.activity}
                  </p>

                  {activity.details && (
                    <p className="text-xs text-[#4B5870] mt-0.5">{activity.details}</p>
                  )}
                  {activity.tips && (
                    <p className="text-[11px] text-[#4B5870]/70 mt-1 italic">{activity.tips}</p>
                  )}

                  {/* Snooze button */}
                  {!isCompleted && !isSnoozed && (
                    <button
                      onClick={() => handleSnooze(activity.time)}
                      className="mt-1.5 text-[10px] text-[#4B5870]/50 hover:text-[#176B63] transition-colors flex items-center gap-1"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Snooze 15 min
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Sidebar Panels ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Hydration */}
        {routine.hydrationReminders.length > 0 && (
          <Panel title="💧 Hydration Reminders">
            <ul className="space-y-1">
              {routine.hydrationReminders.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#4B5870]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF] mt-1.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {/* Sleep Hygiene */}
        {routine.sleepHygieneTips.length > 0 && (
          <Panel title="🌙 Sleep Hygiene Tips">
            <ul className="space-y-1">
              {routine.sleepHygieneTips.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#4B5870]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4B5870] mt-1.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {/* Weekly Goals */}
      {routine.weeklyGoals.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <h3 className="text-sm font-semibold text-[#172033] mb-2">🎯 Weekly Goals</h3>
          <div className="flex flex-wrap gap-2">
            {routine.weeklyGoals.map((g, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-[#176B63]/5 text-xs text-[#176B63] border border-[#176B63]/10">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="border-t border-[#E2E8F0] pt-4">
        <p className="text-xs text-[#4B5870]/60 leading-relaxed">
          {routine.disclaimer || "This routine is AI-generated for wellness purposes and is not a substitute for professional medical advice."}
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ──

function CurrentTimeIndicator() {
  const now = new Date()
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  return (
    <div className="flex items-center gap-2 mb-3 text-xs text-[#176B63] font-medium">
      <span className="w-2 h-2 rounded-full bg-[#176B63] animate-pulse" />
      Now: {timeStr}
    </div>
  )
}

function SpecialSection({
  title,
  icon,
  color,
  items,
}: {
  title: string
  icon: string
  color: string
  items: Array<{ time: string; label: string; detail: string }>
}) {
  return (
    <div className={`rounded-xl border ${color} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-semibold text-[#172033]">{title}</h2>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-[#4B5870]">
            <span className="font-mono tabular-nums text-[#4B5870]/60 w-10 shrink-0">{item.time}</span>
            <span>{item.label}</span>
            {item.detail && <span className="text-[#4B5870]/50">({item.detail})</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
      <h3 className="text-sm font-semibold text-[#172033] mb-2">{title}</h3>
      {children}
    </div>
  )
}
