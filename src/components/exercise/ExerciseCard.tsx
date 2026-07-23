"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Exercise } from "@/lib/ai/engines/exercise-engine"

const ease = [0.16, 1, 0.3, 1] as const

const DIFFICULTY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  beginner: { label: "Beginner", color: "text-[#176B63]", bg: "bg-[#176B63]/10" },
  intermediate: { label: "Intermediate", color: "text-[#9B651B]", bg: "bg-[#9B651B]/10" },
  advanced: { label: "Advanced", color: "text-[#B53A45]", bg: "bg-[#B53A45]/10" },
}

interface ExerciseCardProps {
  exercise: Exercise
  index: number
}

/**
 * Expandable exercise card showing name, difficulty, sets/reps, target muscles,
 * form tips, easier/harder modifications, contraindications, and a timer for timed holds.
 */
export function ExerciseCard({ exercise, index }: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [showModifications, setShowModifications] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerStartRef = useRef<number>(0)

  const diff = DIFFICULTY_STYLES[exercise.difficulty] ?? {
    label: exercise.difficulty,
    color: "text-[#4B5870]",
    bg: "bg-[#F5F7FA]",
  }

  const startTimer = useCallback(() => {
    if (timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimerRunning(false)
      return
    }
    timerStartRef.current = Date.now()
    setTimerRunning(true)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      setTimerSeconds(elapsed)
    }, 200)
  }, [timerRunning])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const hasHoldTime = exercise.isTimed && (exercise.holdSeconds ?? 0) > 0
  const holdTarget = hasHoldTime ? exercise.holdSeconds! : 0
  const timerPct = holdTarget > 0 ? Math.min(100, (timerSeconds / holdTarget) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ease }}
      className={`rounded-xl border transition-all duration-200 ${
        completed
          ? "border-[#176B63]/20 bg-[#176B63]/3 opacity-70"
          : "border-[#E2E8F0] bg-white hover:border-[#176B63]/20 hover:shadow-sm"
      }`}
    >
      {/* ── Header Row ── */}
      <div className="flex items-start gap-3 p-4">
        {/* Complete checkbox */}
        <button
          onClick={() => setCompleted(!completed)}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
            completed
              ? "bg-[#176B63] border-[#176B63]"
              : "border-[#E2E8F0] hover:border-[#176B63]/30"
          }`}
          aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
        >
          {completed && (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Info */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left min-w-0"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-medium text-sm transition-colors ${completed ? "text-[#4B5870] line-through" : "text-[#172033]"}`}>
              {exercise.name}
            </p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${diff.bg} ${diff.color}`}>
              {diff.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#4B5870] flex-wrap">
            {exercise.sets > 0 && (
              <span className="font-semibold tabular-nums">{exercise.sets} × {exercise.reps}</span>
            )}
            {exercise.restBetweenSets > 0 && (
              <span>{exercise.restBetweenSets}s rest</span>
            )}
            {hasHoldTime && (
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Hold {exercise.holdSeconds}s
              </span>
            )}

          </div>

          {/* Target muscles */}
          {exercise.targetMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {exercise.targetMuscles.map((muscle) => (
                <span
                  key={muscle}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F7FA] text-[#4B5870] border border-[#E2E8F0]"
                >
                  {muscle}
                </span>
              ))}
            </div>
          )}

          {/* Purpose */}
          {exercise.purpose && !expanded && (
            <p className="text-[11px] text-[#4B5870]/70 mt-1.5 line-clamp-1">{exercise.purpose}</p>
          )}
        </button>

        {/* Expand chevron */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 mt-0.5 shrink-0"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`w-4 h-4 text-[#4B5870]/30 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ── Expanded Content ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[#E2E8F0]">
              {/* Description */}
              {exercise.description && (
                <p className="text-xs text-[#4B5870] leading-relaxed pt-3">{exercise.description}</p>
              )}

              {/* Purpose */}
              {exercise.purpose && (
                <div className="bg-[#176B63]/5 rounded-lg p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#176B63]/60 mb-1">
                    Purpose
                  </p>
                  <p className="text-xs text-[#4B5870]">{exercise.purpose}</p>
                </div>
              )}

              {/* Timer */}
              {hasHoldTime && (
                <div className="bg-[#F5F7FA] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#172033]">Hold Timer</span>
                    <span className="text-xs tabular-nums text-[#4B5870]">
                      {timerSeconds}s / {holdTarget}s
                    </span>
                  </div>
                  <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        timerPct >= 100 ? "bg-[#176B63]" : "bg-[#5B8CFF]"
                      }`}
                      style={{ width: `${timerPct}%` }}
                    />
                  </div>
                  <button
                    onClick={startTimer}
                    className={`w-full h-8 rounded-lg text-xs font-medium transition-all ${
                      timerRunning
                        ? "bg-[#B53A45]/10 text-[#B53A45] hover:bg-[#B53A45]/20"
                        : timerPct >= 100
                          ? "bg-[#176B63]/10 text-[#176B63]"
                          : "bg-[#176B63] text-white hover:bg-[#10554F]"
                    }`}
                  >
                    {timerRunning ? "Stop Timer" : timerPct >= 100 ? "Reset" : `Hold for ${holdTarget}s`}
                  </button>
                </div>
              )}

              {/* Form Tips */}
              {exercise.formTips.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5870]/60 mb-1.5">
                    Form Tips
                  </p>
                  <ul className="space-y-1">
                    {exercise.formTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#4B5870]">
                        <span className="w-1 h-1 rounded-full bg-[#176B63]/30 mt-1.5 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Easier/Harder Modifications */}
              <div>
                <button
                  onClick={() => setShowModifications(!showModifications)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#4B5870] hover:text-[#172033] transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M12 3v3m0 12v3m-4-6h8M5 12h14" />
                  </svg>
                  Modifications
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-3 h-3 transition-transform ${showModifications ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <AnimatePresence>
                  {showModifications && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="bg-[#176B63]/5 rounded-lg p-2.5">
                          <span className="text-[10px] font-semibold text-[#176B63]">Easier</span>
                          <p className="text-xs text-[#4B5870] mt-0.5">
                            {exercise.modifications.easier || "Follow the basic form."}
                          </p>
                        </div>
                        <div className="bg-[#9B651B]/5 rounded-lg p-2.5">
                          <span className="text-[10px] font-semibold text-[#9B651B]">Harder</span>
                          <p className="text-xs text-[#4B5870] mt-0.5">
                            {exercise.modifications.harder || "Focus on controlled tempo."}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Contraindications */}
              {exercise.contraindications.length > 0 && (
                <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#B53A45" strokeWidth="2" className="w-4 h-4 mt-0.5 shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B53A45] mb-1">
                        Contraindications
                      </p>
                      <ul className="space-y-0.5">
                        {exercise.contraindications.map((c, i) => (
                          <li key={i} className="text-xs text-[#B53A45] flex items-start gap-1.5">
                            <span>•</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
