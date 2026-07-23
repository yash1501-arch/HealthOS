"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

// ─── Types ───────────────────────────────────────────────────────

type DashboardStats = {
  current: Record<string, number>
  trends: Record<string, { change: number; period: string } | null>
  streak: { checkinStreak: number; longestStreak: number }
}

type CheckinPayload = {
  energyLevel: number
  sleepHours: number
  sleepQuality: number
  mood: number
  weightKg: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  waterIntakeL: number
  exerciseCompletion: number
  walkingSteps: number
  dietAdherence: number
  notes: string
  painScores: Record<string, number>
}

type CheckinData = {
  latest: any
  history: any[]
  painAreas: { area: string; severity: number }[]
  canCheckin: boolean
}

type Recommendation = {
  category: string
  priority: "high" | "medium" | "low"
  icon: string
  title: string
  description: string
  action: string
}

// ─── Constants ───────────────────────────────────────────────────

const EASE = [0.16, 1, 0.3, 1] as const

const statCards = [
  { key: "weightKg", label: "Weight", unit: "kg", color: "#176B63", trendKey: "weightKg" },
  { key: "bmi", label: "BMI", unit: "", color: "#476A91", trendKey: null },
  { key: "avgPainScore", label: "Pain", unit: "/10", color: "#B53A45", trendKey: "avgPainScore" },
  { key: "avgSleepHours", label: "Sleep", unit: "h", color: "#476A91", trendKey: null },
  { key: "healthScore", label: "Health Score", unit: "/100", color: "#9B651B", trendKey: "healthScore" },
] as const

const CHECKIN_FIELDS: {
  key: keyof CheckinPayload
  label: string
  min: number
  max: number
  unit: string
  step?: number
}[] = [
  { key: "energyLevel", label: "Energy Level", min: 1, max: 10, unit: "/10" },
  { key: "sleepHours", label: "Sleep Hours", min: 0, max: 24, unit: "h", step: 0.5 },
  { key: "sleepQuality", label: "Sleep Quality", min: 1, max: 10, unit: "/10" },
  { key: "mood", label: "Mood", min: 1, max: 10, unit: "/10" },
  { key: "weightKg", label: "Weight", min: 20, max: 500, unit: "kg", step: 0.1 },
  { key: "bloodPressureSystolic", label: "BP Systolic", min: 60, max: 250, unit: "mmHg", step: 1 },
  { key: "bloodPressureDiastolic", label: "BP Diastolic", min: 30, max: 150, unit: "mmHg", step: 1 },
  { key: "waterIntakeL", label: "Water Intake", min: 0, max: 20, unit: "L", step: 0.1 },
  { key: "exerciseCompletion", label: "Exercise Done", min: 0, max: 100, unit: "%", step: 1 },
  { key: "walkingSteps", label: "Daily Steps", min: 0, max: 100000, unit: "steps", step: 100 },
  { key: "dietAdherence", label: "Diet Adherence", min: 0, max: 100, unit: "%", step: 1 },
]

// ─── Main Dashboard ──────────────────────────────────────────────

export default function DashboardPage() {
  const [showCheckin, setShowCheckin] = useState(false)
  const queryClient = useQueryClient()

  const { data: stats, isPending: statsPending } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/dashboard/stats"),
  })

  const { data: checkinData } = useQuery<CheckinData>({
    queryKey: ["checkin-data"],
    queryFn: () => api.get("/checkin"),
    // Check-in query
  })

  const { data: recommendations } = useQuery<Recommendation[]>({
    queryKey: ["recommendations"],
    queryFn: () => api.get("/recommendations"),
    staleTime: 10 * 60 * 1000, // 10 min cache
  })

  const canCheckin = checkinData?.canCheckin ?? true
  const latestCheckin = checkinData?.latest
  const history = checkinData?.history ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold text-[#172033]">Dashboard</h1>
        <button
          onClick={() => setShowCheckin(true)}
          disabled={!canCheckin}
          className="h-10 px-4 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {canCheckin ? "📋 Weekly Check-in" : "✅ Checked in this week"}
        </button>
      </motion.div>

      {/* Streak */}
      {stats?.streak && stats.streak.checkinStreak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-2 text-sm text-[#4B5870]"
        >
          <span className="text-lg">🔥</span>
          <span>
            <strong className="text-[#172033]">{stats.streak.checkinStreak} week streak</strong>
            {stats.streak.longestStreak > stats.streak.checkinStreak && (
              <> · Best: {stats.streak.longestStreak} weeks</>
            )}
          </span>
        </motion.div>
      )}

      {/* Stat Cards */}
      <ScrollReveal>
      {statsPending ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="h-28 rounded-2xl bg-[#F5F7FA] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card, i) => {
            const value = stats?.current?.[card.key]
            const trend = card.trendKey ? stats?.trends?.[card.trendKey]?.change : null
            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE }}
                className="rounded-2xl p-5 border border-[#E2E8F0] bg-white"
              >
                <p className="text-xs font-medium text-[#4B5870] uppercase tracking-wider mb-1.5">{card.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl md:text-2xl font-bold tabular-nums" style={{ color: card.color }}>
                    {value ?? "—"}
                  </span>
                  {card.unit && <span className="text-sm text-[#4B5870]/60">{card.unit}</span>}
                </div>
                {trend !== undefined && trend !== null && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: trend > 0 && card.key !== "avgPainScore" ? "#176B63" : trend < 0 ? "#B53A45" : "#4B5870" }}>
                    <span>{trend > 0 ? "↑" : trend < 0 ? "↓" : "—"}</span>
                    <span>{Math.abs(trend).toFixed(1)}</span>
                    {stats?.trends?.[card.trendKey!]?.period && (
                      <span className="text-[#4B5870]/40">/{stats.trends[card.trendKey!]!.period}</span>
                    )}
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
      </ScrollReveal>

      {/* Recommendations */}
      <ScrollReveal delay={0.1}>
      {recommendations && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-[#172033]">Recommendations</h2>
          <div className="space-y-2">
            {recommendations.slice(0, 4).map((rec, i) => (
              <motion.div
                key={rec.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className={`bg-white rounded-xl border border-[#E2E8F0] p-4 ${
                  rec.priority === "high" ? "border-l-[3px] border-l-[#B53A45]" : "border-l-[3px] border-l-[#176B63]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{rec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#172033]">{rec.title}</p>
                      {rec.priority === "high" && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#B53A45]/10 text-[#B53A45] rounded-full font-medium">Important</span>
                      )}
                    </div>
                    <p className="text-xs text-[#4B5870] mt-0.5">{rec.action}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      </ScrollReveal>

      {/* Progress Charts */}
      <ScrollReveal delay={0.2}>
      {history.length >= 2 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <h2 className="text-sm font-semibold text-[#172033] mb-4">Progress</h2>
          <ProgressCharts history={history} />
        </div>
      )}
      </ScrollReveal>

      {/* Recent Checkins */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
        >
          <h2 className="text-sm font-semibold text-[#172033] mb-4">Recent Check-ins</h2>
          <div className="space-y-2">
            {history.slice(0, 5).map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-[#E2E8F0]/60 last:border-b-0">
                <span className="text-sm text-[#4B5870]">
                  {new Date(entry.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <span title="Energy">{entry.energyLevel ? `⚡${entry.energyLevel}` : ""}</span>
                  <span title="Mood">{entry.mood ? `😊${entry.mood}` : ""}</span>
                  <span title="Sleep">{entry.sleepHours ? `💤${entry.sleepHours}h` : ""}</span>
                  {entry.weightKg && <span title="Weight">⚖️{Number(entry.weightKg).toFixed(1)}</span>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state when no data */}
      {!statsPending && !latestCheckin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center"
        >
          <div className="w-14 h-14 rounded-xl bg-[#176B63]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#176B63]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#172033] mb-2">Start tracking your health</h3>
          <p className="text-sm text-[#4B5870] mb-6 max-w-sm mx-auto">
            Complete your first weekly check-in to see trends and track your progress over time.
          </p>
          <button
            onClick={() => setShowCheckin(true)}
            className="h-11 px-6 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all"
          >
            Start First Check-in
          </button>
        </motion.div>
      )}

      {/* Check-in Modal */}
      <AnimatePresence>
        {showCheckin && (
          <CheckinModal
            painAreas={checkinData?.painAreas ?? []}
            onClose={() => setShowCheckin(false)}
            onSubmitted={() => {
              setShowCheckin(false)
              queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
              queryClient.invalidateQueries({ queryKey: ["checkin-data"] })
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Progress Charts ────────────────────────────────────────────

function ProgressCharts({ history }: { history: any[] }) {
  const reversed = [...history].reverse()
  const weeks = reversed.slice(-8)

  const metrics = [
    { key: "weightKg", label: "Weight", unit: "kg", color: "#176B63", decimals: 1 },
    { key: "sleepHours", label: "Sleep", unit: "h", color: "#476A91", decimals: 1 },
    { key: "mood", label: "Mood", unit: "/10", color: "#9B651B", decimals: 0 },
    { key: "energyLevel", label: "Energy", unit: "/10", color: "#176B63", decimals: 0 },
    { key: "bloodPressureSystolic", label: "BP Systolic", unit: "", color: "#B53A45", decimals: 0 },
    { key: "bloodPressureDiastolic", label: "BP Diastolic", unit: "", color: "#476A91", decimals: 0 },
  ] as const

  const weekLabels = weeks.map((w: any) => {
    const d = new Date(w.weekStart)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {metrics.map((metric) => {
        const values = weeks.map((w: any) => {
          const v = w[metric.key]
          return v !== null && v !== undefined ? Number(v) : null
        })
        const maxVal = Math.max(...values.filter((v): v is number => v !== null), 1)
        const minVal = Math.min(...values.filter((v): v is number => v !== null), 0)
        const range = maxVal - minVal || 1

        return (
          <div key={metric.key}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#4B5870]">{metric.label}</span>
              <span className="text-xs text-[#4B5870]/60">
                {values.filter((v) => v !== null).length > 0 && (
                  <>
                    <span className="font-semibold" style={{ color: metric.color }}>
                      {values.filter((v): v is number => v !== null).pop()?.toFixed(metric.decimals) ?? "—"}
                    </span>
                    {metric.unit}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-end gap-1 h-24">
              {values.map((val, i) => {
                const height = val !== null ? ((val - minVal) / range) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      className="w-full rounded-t-sm transition-all duration-500"
                      style={{
                        height: `${Math.max(height, 4)}%`,
                        backgroundColor: val !== null ? metric.color : "#E2E8F0",
                        opacity: val !== null ? 0.7 + (height / 100) * 0.3 : 0.3,
                      }}
                      title={val !== null ? `${metric.label}: ${val.toFixed(metric.decimals)}${metric.unit}` : "No data"}
                    />
                    <span className="text-[8px] text-[#4B5870]/40 leading-none">{weekLabels[i]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Check-in Modal ──────────────────────────────────────────────

function CheckinModal({
  painAreas,
  onClose,
  onSubmitted,
}: {
  painAreas: { area: string; severity: number }[]
  onClose: () => void
  onSubmitted: () => void
}) {
  const [form, setForm] = useState<CheckinPayload>({
    energyLevel: 5,
    sleepHours: 7,
    sleepQuality: 5,
    mood: 5,
    weightKg: 0,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    waterIntakeL: 2,
    exerciseCompletion: 50,
    walkingSteps: 5000,
    dietAdherence: 50,
    notes: "",
    painScores: Object.fromEntries(painAreas.map((p) => [p.area, p.severity])),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"checkin" | "pain" | "done">("checkin")

  function update(key: keyof CheckinPayload, value: number | string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updatePain(area: string, value: number) {
    setForm((prev) => ({
      ...prev,
      painScores: { ...prev.painScores, [area]: value },
    }))
  }

  async function handleSubmit() {
    setSaving(true)
    setError("")
    try {
      await api.post("/checkin", {
        energyLevel: form.energyLevel,
        sleepHours: form.sleepHours,
        sleepQuality: form.sleepQuality,
        mood: form.mood,
        weightKg: form.weightKg > 0 ? form.weightKg : undefined,
        bloodPressureSystolic: form.bloodPressureSystolic > 0 ? form.bloodPressureSystolic : undefined,
        bloodPressureDiastolic: form.bloodPressureDiastolic > 0 ? form.bloodPressureDiastolic : undefined,
        waterIntakeL: form.waterIntakeL,
        exerciseCompletion: form.exerciseCompletion,
        walkingSteps: form.walkingSteps,
        dietAdherence: form.dietAdherence,
        notes: form.notes || undefined,
        painScores: Object.keys(form.painScores).length > 0 ? form.painScores : undefined,
      })
      setStep("done")
      setTimeout(onSubmitted, 1500)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || "Failed to save check-in")
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-4 pt-10 overflow-y-auto backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="bg-white rounded-2xl border border-[#E2E8F0] w-full max-w-lg shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-lg font-semibold text-[#172033]">
              {step === "pain" ? "Pain Scores" : step === "done" ? "Done!" : "Weekly Check-in"}
            </h2>
            <p className="text-xs text-[#4B5870] mt-0.5">
              {step === "checkin" && "How was your week?"}
              {step === "pain" && "Update your pain levels"}
              {step === "done" && "Your check-in has been saved"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[#4B5870]/40 hover:text-[#172033]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {step === "done" ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-[#176B63]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-[#172033] font-medium">Check-in complete!</p>
            <p className="text-xs text-[#4B5870] mt-1">Your streak is growing 🔥</p>
          </div>
        ) : (
          <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 text-[#B53A45] text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            {step === "checkin" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {CHECKIN_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="flex items-center justify-between text-xs font-medium text-[#4B5870] mb-1.5">
                        <span>{field.label}</span>
                        <span className="text-[#176B63] font-semibold tabular-nums">
                          {Number(form[field.key] as number).toLocaleString("en-US", {
                            maximumFractionDigits: field.step === 0.1 ? 1 : 0,
                          })}
                          {field.unit !== "/10" && field.unit !== "%" ? ` ${field.unit}` : ""}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={field.min}
                        max={field.max}
                        step={field.step || 1}
                        value={form[field.key] as number}
                        onChange={(e) => update(field.key, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none cursor-pointer accent-[#176B63]"
                      />
                      <div className="flex justify-between text-[10px] text-[#4B5870]/40 mt-0.5">
                        <span>{field.min}</span>
                        <span>{field.max}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4B5870] mb-1.5">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10 resize-none"
                    placeholder="Anything notable this week?"
                    maxLength={1000}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={onClose} className="px-4 h-10 text-sm text-[#4B5870] hover:text-[#172033]">
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep("pain")}
                    className="px-5 h-10 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all"
                  >
                    Next: Pain Scores →
                  </button>
                </div>
              </>
            )}

            {step === "pain" && (
              <>
                {painAreas.length === 0 ? (
                  <p className="text-sm text-[#4B5870] text-center py-4">
                    No pain areas recorded in your assessment.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {painAreas.map((area) => (
                      <div key={area.area}>
                        <label className="flex items-center justify-between text-sm text-[#172033] mb-1.5">
                          <span className="font-medium capitalize">{area.area}</span>
                          <span className="text-[#B53A45] font-semibold tabular-nums">
                            {form.painScores[area.area] ?? area.severity}/10
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={form.painScores[area.area] ?? area.severity}
                          onChange={(e) => updatePain(area.area, parseInt(e.target.value))}
                          className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none cursor-pointer accent-[#B53A45]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep("checkin")}
                    className="px-4 h-10 text-sm text-[#4B5870] hover:text-[#172033]"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-6 h-10 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all"
                  >
                    {saving ? "Saving..." : "Save Check-in ✓"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
