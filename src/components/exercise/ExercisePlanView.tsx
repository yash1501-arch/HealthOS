"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"
import { ExerciseCard } from "@/components/exercise/ExerciseCard"
import type { ExercisePlanOutput, WeekDayExercise } from "@/lib/ai/engines/exercise-engine"

const ease = [0.16, 1, 0.3, 1] as const
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface ExercisePlanViewProps {
  /** The exercise plan data to display. */
  plan: ExercisePlanOutput
  /** The database ID of the plan (required for modify). */
  planId: string
  /** Called when the plan is modified. */
  onPlanUpdated?: (updatedPlan: ExercisePlanOutput) => void
  /** Called when regeneration is requested. */
  onRegenerate?: () => void
}

/**
 * Full exercise plan viewer showing weekly schedule, posture correction protocol,
 * exercise cards with completion tracking, progression timeline, and modify/regenerate actions.
 */
export function ExercisePlanView({
  plan,
  planId,
  onPlanUpdated,
  onRegenerate,
}: ExercisePlanViewProps) {
  const [activeDay, setActiveDay] = useState(0)
  const [showModifyInput, setShowModifyInput] = useState(false)
  const [modifyText, setModifyText] = useState("")
  const [modifying, setModifying] = useState(false)
  const [modifyError, setModifyError] = useState("")

  const currentDay: WeekDayExercise | undefined = plan.weeklySchedule[activeDay]

  const handleModify = useCallback(async () => {
    if (!modifyText.trim() || !planId) return

    setModifying(true)
    setModifyError("")

    try {
      const updated = await api.post<ExercisePlanOutput>("/exercise/modify", {
        planId,
        modification: modifyText.trim(),
      })
      onPlanUpdated?.(updated)
      setShowModifyInput(false)
      setModifyText("")
    } catch (err: unknown) {
      const e = err as { message?: string }
      setModifyError(e.message || "Modification failed. Please try again.")
    } finally {
      setModifying(false)
    }
  }, [modifyText, planId, onPlanUpdated])

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">
            {plan.planName || "Exercise Plan"}
          </h1>
          <p className="text-sm text-[#4B5870] mt-1">
            {plan.duration.replace("_", " ")} ·{" "}
            {plan.focusAreas.join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModifyInput(!showModifyInput)}
            className="h-10 px-4 bg-[#F5F7FA] text-[#172033] rounded-xl text-sm font-medium hover:bg-[#E2E8F0] transition-all flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Modify
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="h-10 px-4 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all shadow-sm"
            >
              Regenerate
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Posture Correction Protocol (highlighted) ── */}
      {plan.postureCorrectionProtocol.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-[#8B7FFF]/5 to-[#5B8CFF]/5 border border-[#8B7FFF]/15 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#8B7FFF]/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#8B7FFF" strokeWidth="1.5" className="w-4 h-4">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[#172033]">
              Posture Correction Protocol
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plan.postureCorrectionProtocol.map((protocol, i) => (
              <div
                key={i}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-[#8B7FFF]/10 p-3.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#8B7FFF]" />
                  <p className="text-xs font-semibold text-[#172033]">{protocol.issue}</p>
                </div>
                <div className="space-y-1 mb-2">
                  {protocol.dailyExercises.map((ex, j) => (
                    <p key={j} className="text-[11px] text-[#4B5870] flex items-start gap-1.5">
                      <span className="text-[#8B7FFF]">•</span>
                      {ex}
                    </p>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-[#4B5870]/60 pt-1 border-t border-[#8B7FFF]/5">
                  <span>{protocol.frequency}</span>
                  <span>{protocol.expectedImprovementTimeline}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Modify Input ── */}
      <AnimatePresence>
        {showModifyInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="bg-[#F5F7FA] rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-[#172033]">Modify Your Exercise Plan</p>
              <p className="text-xs text-[#4B5870]">
                Tell us what you&apos;d like to change. Example: &quot;Replace push-ups with bench press&quot;
                or &quot;Add more shoulder exercises.&quot;
              </p>
              <textarea
                value={modifyText}
                onChange={(e) => setModifyText(e.target.value)}
                placeholder="I find the squats too difficult, can you make them easier?"
                className="w-full h-24 px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm resize-none focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
                maxLength={1000}
              />
              {modifyError && <p className="text-xs text-[#B53A45]">{modifyError}</p>}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowModifyInput(false)
                    setModifyText("")
                    setModifyError("")
                  }}
                  disabled={modifying}
                  className="px-4 h-9 text-sm font-medium text-[#4B5870] hover:text-[#172033] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModify}
                  disabled={!modifyText.trim() || modifying}
                  className="px-5 h-9 bg-[#176B63] text-white rounded-lg text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all"
                >
                  {modifying ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Modifying...
                    </span>
                  ) : (
                    "Apply Changes"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Day Selector ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {plan.weeklySchedule.map((day, i) => {
          const isRest = day.focus === "Rest"
          const isActive = activeDay === i
          return (
            <button
              key={day.day}
              onClick={() => setActiveDay(i)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                isActive
                  ? isRest
                    ? "bg-[#E2E8F0] text-[#4B5870]"
                    : "bg-[#176B63] text-white shadow-sm"
                  : isRest
                    ? "bg-[#F5F7FA]/50 text-[#4B5870]/50"
                    : "bg-[#F5F7FA] text-[#4B5870] hover:bg-[#E2E8F0]"
              }`}
            >
              <span className="block">{DAY_NAMES[new Date(day.day).getDay()] || day.day}</span>
              <span
                className={`block text-[10px] mt-0.5 ${
                  isActive ? "opacity-70" : "opacity-50"
                }`}
              >
                {isRest ? "Rest" : `${day.estimatedDuration}min`}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Active Day Exercises ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25, ease }}
        >
          {currentDay ? (
            <>
              {/* Day header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#172033]">{currentDay.focus}</h2>
                  <p className="text-xs text-[#4B5870] mt-0.5">
                    {currentDay.exercises.length} exercises · ~{currentDay.estimatedDuration} min
                  </p>
                </div>
              </div>

              {/* Warm-up */}
              {currentDay.warmUp.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5870]/60 mb-2 flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#FFB86B" strokeWidth="1.5" className="w-3.5 h-3.5">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    Warm-Up
                  </p>
                  <div className="bg-[#FFB86B]/5 rounded-xl p-3.5 space-y-1.5">
                    {currentDay.warmUp.map((item, i) => (
                      <p key={i} className="text-xs text-[#4B5870] flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#FFB86B] mt-1.5 shrink-0" />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercises */}
              {currentDay.focus !== "Rest" ? (
                <div className="space-y-2">
                  {currentDay.exercises.map((exercise, i) => (
                    <ExerciseCard key={`${exercise.name}-${i}`} exercise={exercise} index={i} />
                  ))}
                </div>
              ) : (
                <div className="bg-[#F5F7FA] rounded-xl p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#E2E8F0] flex items-center justify-center mx-auto mb-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4B5870" strokeWidth="1.5" className="w-6 h-6">
                      <path d="M3 12h2v2H3zM19 12h2v2h-2zM12 3v2m0 14v2M5.64 5.64l1.42 1.42m10.5 10.5l1.42 1.42M9 12h6" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#172033]">Rest Day</p>
                  <p className="text-xs text-[#4B5870] mt-1">
                    Recovery is essential for muscle repair and performance.
                    Stay active with light walking or stretching.
                  </p>
                </div>
              )}

              {/* Cool-down */}
              {currentDay.coolDown.length > 0 && currentDay.focus !== "Rest" && (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5870]/60 mb-2 flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#5B8CFF" strokeWidth="1.5" className="w-3.5 h-3.5">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="M8 12h8" />
                    </svg>
                    Cool-Down / Stretching
                  </p>
                  <div className="bg-[#5B8CFF]/5 rounded-xl p-3.5 space-y-1.5">
                    {currentDay.coolDown.map((item, i) => (
                      <p key={i} className="text-xs text-[#4B5870] flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#5B8CFF] mt-1.5 shrink-0" />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#4B5870] text-center py-8">
              No exercises scheduled for this day.
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Progression Timeline ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
      >
        <div className="p-4 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold text-[#172033]">Progression Timeline</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0]">
          {([
            ["Week 1", plan.progressionPlan.week1],
            ["Week 2", plan.progressionPlan.week2],
            ["Week 3", plan.progressionPlan.week3],
            ["Week 4", plan.progressionPlan.week4],
          ] as const).map(([label, desc], i) => (
            <div key={label} className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    i === 0
                      ? "bg-[#176B63] text-white"
                      : i === 1
                        ? "bg-[#5B8CFF] text-white"
                        : i === 2
                          ? "bg-[#8B7FFF] text-white"
                          : "bg-[#FF6B6B] text-white"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-xs font-semibold text-[#172033]">{label}</span>
              </div>
              <p className="text-xs text-[#4B5870] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Precautions ── */}
      {plan.precautions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-4"
        >
          <div className="flex items-start gap-2.5 mb-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="#B53A45" strokeWidth="1.5" className="w-5 h-5 mt-0.5 shrink-0">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-sm font-semibold text-[#B53A45]">Precautions</h3>
          </div>
          <ul className="space-y-1.5 ml-7">
            {plan.precautions.map((precaution, i) => (
              <li key={i} className="text-xs text-[#4B5870] list-disc">{precaution}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* ── Disclaimer ── */}
      <div className="border-t border-[#E2E8F0] pt-4">
        <p className="text-xs text-[#4B5870]/60 leading-relaxed">
          {plan.disclaimer ||
            "This exercise plan is generated by AI for informational and wellness purposes only. It is not a substitute for professional medical or physiotherapy advice. Always consult a qualified healthcare provider before starting a new exercise program, especially if you have pre-existing injuries or medical conditions."}
        </p>
      </div>
    </div>
  )
}
