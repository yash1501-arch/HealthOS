"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"
import type { CheckInSummaryOutput } from "@/lib/ai/engines/checkin-engine"

const BODY_PARTS = [
  "Neck", "Shoulders", "Upper Back", "Lower Back", "Hips",
  "Knees", "Ankles", "Feet", "Elbows", "Wrists",
] as const

const MOOD_OPTIONS = [
  { emoji: "😢", label: "Tough", value: 2 },
  { emoji: "😐", label: "Okay", value: 4 },
  { emoji: "🙂", label: "Good", value: 6 },
  { emoji: "😊", label: "Great", value: 8 },
  { emoji: "🌟", label: "Amazing", value: 10 },
] as const

interface CheckInFormProps {
  /** Called when check-in is successfully submitted with AI summary. */
  onSubmitted?: (summary: CheckInSummaryOutput) => void
  /** Currently active pain areas from existing assessments. */
  existingPainAreas?: string[]
}

/**
 * Weekly check-in form with slider inputs, mood emoji selector,
 * clickable body parts for pain tracking, and text areas for wins/challenges.
 */
export function CheckInForm({ onSubmitted, existingPainAreas }: CheckInFormProps) {
  const [energy, setEnergy] = useState(7)
  const [sleepQuality, setSleepQuality] = useState(7)
  const [stress, setStress] = useState(4)
  const [exerciseAdherence, setExerciseAdherence] = useState(50)
  const [dietAdherence, setDietAdherence] = useState(50)
  const [mood, setMood] = useState(6)
  const [painLevels, setPainLevels] = useState<Array<{ location: string; severity: number }>>(
    existingPainAreas?.map((a) => ({ location: a, severity: 3 })) ?? []
  )
  const [challenges, setChallenges] = useState("")
  const [wins, setWins] = useState("")
  const [questions, setQuestions] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const togglePain = useCallback((location: string) => {
    setPainLevels((prev) => {
      const existing = prev.find((p) => p.location === location)
      if (existing) {
        return prev.filter((p) => p.location !== location)
      }
      return [...prev, { location, severity: 3 }]
    })
  }, [])

  const updatePainSeverity = useCallback((location: string, severity: number) => {
    setPainLevels((prev) =>
      prev.map((p) => (p.location === location ? { ...p, severity } : p))
    )
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setError("")

    try {
      const result = await api.post<{ id: string; weekStart: string; summary: CheckInSummaryOutput }>(
        "/checkin/submit",
        {
          energyLevel: energy,
          sleepQuality,
          stressLevel: stress,
          exerciseAdherence,
          dietAdherence,
          mood,
          painLevels,
          challenges,
          wins,
          questions,
        }
      )
      onSubmitted?.(result.summary)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || "Check-in failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }, [energy, sleepQuality, stress, exerciseAdherence, dietAdherence, mood, painLevels, challenges, wins, questions, onSubmitted])

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#172033]">Weekly Check-In</h1>
        <p className="text-sm text-[#4B5870] mt-1">How was your week? Your answers help personalize your plans.</p>
      </motion.div>

      {/* Energy */}
      <SliderField label="Energy Level" value={energy} onChange={setEnergy} min={1} max={10}
        emojis={["🫠", "😴", "😐", "🙂", "⚡"]} />

      {/* Sleep */}
      <SliderField label="Sleep Quality" value={sleepQuality} onChange={setSleepQuality} min={1} max={10}
        emojis={["😫", "😴", "😐", "😊", "💤"]} />

      {/* Stress */}
      <SliderField label="Stress Level" value={stress} onChange={setStress} min={1} max={10}
        emojis={["😌", "🙂", "😐", "😰", "🔥"]} invert />

      {/* Exercise Adherence */}
      <SliderField label="Exercise Adherence" value={exerciseAdherence} onChange={setExerciseAdherence} min={0} max={100}
        suffix="%" emojis={["😤", "😐", "🙂", "💪", "🏆"]} />

      {/* Diet Adherence */}
      <SliderField label="Diet Adherence" value={dietAdherence} onChange={setDietAdherence} min={0} max={100}
        suffix="%" emojis={["🍕", "😐", "🥗", "🥦", "🌟"]} />

      {/* Mood */}
      <div>
        <p className="text-sm font-medium text-[#172033] mb-2">Mood</p>
        <div className="flex gap-2">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMood(opt.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all ${
                mood === opt.value
                  ? "border-[#176B63] bg-[#176B63]/5 text-[#176B63]"
                  : "border-[#E2E8F0] text-[#4B5870] hover:border-[#176B63]/20"
              }`}
            >
              <span className="text-xl">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pain Tracking */}
      <div>
        <p className="text-sm font-medium text-[#172033] mb-2">Pain Areas</p>
        <p className="text-xs text-[#4B5870] mb-2">Tap any areas that are bothering you, then adjust severity.</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {BODY_PARTS.map((part) => {
            const active = painLevels.find((p) => p.location === part)
            return (
              <button
                key={part}
                onClick={() => togglePain(part)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? "bg-[#B53A45]/10 text-[#B53A45] border-[#B53A45]/20"
                    : "bg-white text-[#4B5870] border-[#E2E8F0] hover:border-[#B53A45]/20"
                }`}
              >
                {part}
              </button>
            )
          })}
        </div>
        {painLevels.length > 0 && (
          <div className="space-y-2">
            {painLevels.map((p) => (
              <div key={p.location} className="flex items-center gap-3 text-xs">
                <span className="font-medium text-[#172033] w-20">{p.location}</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={p.severity}
                  onChange={(e) => updatePainSeverity(p.location, Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none bg-[#E2E8F0] accent-[#B53A45] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#B53A45] [&::-webkit-slider-thumb]:shadow-sm"
                />
                <span className="tabular-nums text-[#B53A45] w-8 text-right">{p.severity}/10</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Text Areas */}
      <TextAreaField label="Wins This Week 🎉" value={wins} onChange={setWins} placeholder="What went well? What are you proud of?" />
      <TextAreaField label="Challenges 😤" value={challenges} onChange={setChallenges} placeholder="What was difficult this week?" />
      <TextAreaField label="Questions for AI 🤔" value={questions} onChange={setQuestions} placeholder="Ask anything about your health, diet, exercise, or routine..." />

      {/* Error */}
      {error && (
        <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-3 text-xs text-[#B53A45]">{error}</div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-12 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all shadow-sm"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing your week...
          </span>
        ) : (
          "Submit Check-In"
        )}
      </button>
    </div>
  )
}

// ─── Sub-components ──

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  emojis,
  invert,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  emojis?: readonly string[]
  invert?: boolean
  suffix?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  const displayVal = invert ? max + 1 - value : value
  const emojiIndex = Math.min(
    Math.floor((displayVal - min) / ((max - min) / emojis!.length)),
    (emojis?.length ?? 1) - 1
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-sm font-medium text-[#172033]">{label}</p>
        <span className="text-sm tabular-nums text-[#4B5870]">
          {emojis && <span className="mr-1">{emojis[emojiIndex]}</span>}
          {value}{suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-[#E2E8F0] accent-[#176B63] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#176B63] [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
        style={{
          background: `linear-gradient(to right, #176B63 0%, #176B63 ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`,
        }}
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <p className="text-sm font-medium text-[#172033] mb-1.5">{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm resize-none focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
      />
    </div>
  )
}
