"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"
import { toastSuccess, toastError } from "@/stores/toast"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

type Goal = {
  id: string
  goal: string
  priority: number
  targetDate: string | null
  createdAt: string
}

const QUICK_GOALS = [
  { id: "reduce_pain", label: "Reduce pain", icon: "💊" },
  { id: "improve_posture", label: "Improve posture", icon: "🧘" },
  { id: "lose_weight", label: "Lose weight", icon: "⚖️" },
  { id: "build_strength", label: "Build strength", icon: "🏋️" },
  { id: "better_sleep", label: "Better sleep", icon: "😴" },
  { id: "reduce_stress", label: "Reduce stress", icon: "🧠" },
  { id: "eat_healthier", label: "Eat healthier", icon: "🥗" },
  { id: "increase_energy", label: "Increase energy", icon: "⚡" },
  { id: "improve_flexibility", label: "Improve flexibility", icon: "🤸" },
  { id: "walk_more", label: "Walk more daily", icon: "🚶" },
  { id: "better_work_ergonomics", label: "Better ergonomics", icon: "💻" },
  { id: "build_routine", label: "Build a daily routine", icon: "📋" },
]

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [custom, setCustom] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.get<Goal[]>("/goals")
      setGoals(data)
    } catch { /* no data */ }
    finally { setLoading(false) }
  }

  async function addGoal(name: string) {
    if (goals.find((g) => g.goal === name)) return
    setSaving(true)
    try {
      await api.post("/goals", { goal: name, priority: goals.length + 1, targetDate: targetDate || undefined })
      toastSuccess("Goal added!")
      setCustom("")
      setTargetDate("")
      load()
    } catch { toastError("Failed to add goal") }
    finally { setSaving(false) }
  }

  async function removeGoal(id: string) {
    try {
      await api.delete(`/goals?id=${id}`)
      toastSuccess("Goal removed")
      load()
    } catch { toastError("Failed to remove goal") }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-[#172033]"
      >
        Health Goals
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="text-sm text-[#4B5870]"
      >
        Set and track your health goals. Quick-add from suggestions or create custom ones.
      </motion.p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#F5F7FA] animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Active Goals */}
          {goals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-2"
            >
              <h2 className="text-sm font-semibold text-[#172033]">Active Goals ({goals.length})</h2>
              {goals.map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 bg-white rounded-xl border border-[#E2E8F0] p-4"
                >
                  <div className="w-7 h-7 rounded-full bg-[#176B63]/10 text-[#176B63] text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#172033]">{g.goal}</p>
                    {g.targetDate && (
                      <p className="text-xs text-[#4B5870]/60">Target: {g.targetDate}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#4B5870]/40">P{g.priority}</span>
                  <button
                    onClick={() => removeGoal(g.id)}
                    className="p-1.5 text-[#4B5870]/30 hover:text-[#B53A45] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Quick-add suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-sm font-semibold text-[#172033] mb-3">Quick Add</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {QUICK_GOALS.map((qg) => {
                const isActive = goals.some((g) => g.goal === qg.id)
                return (
                  <button
                    key={qg.id}
                    onClick={() => !isActive && addGoal(qg.id)}
                    disabled={isActive || saving}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#176B63]/10 text-[#176B63] border border-[#176B63]/20"
                        : "bg-white border border-[#E2E8F0] text-[#4B5870] hover:border-[#176B63]/30 hover:text-[#172033]"
                    }`}
                  >
                    <span>{qg.icon}</span>
                    <span className="truncate">{qg.label}</span>
                    {isActive && <span className="ml-auto text-xs">✓</span>}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Custom goal */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
          >
            <h2 className="text-sm font-semibold text-[#172033] mb-3">Custom Goal</h2>
            <div className="flex gap-2 mb-2">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && custom.trim() && addGoal(custom.trim())}
                placeholder="e.g. Run a 5K by October"
                className="flex-1 h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
              />
              <button
                onClick={() => custom.trim() && addGoal(custom.trim())}
                disabled={!custom.trim() || saving}
                className="px-5 h-10 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all"
              >
                {saving ? "Adding..." : "Add Goal"}
              </button>
            </div>
            <div>
              <label className="text-xs text-[#4B5870] mr-2">Target date (optional):</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="h-8 px-2 rounded border border-[#E2E8F0] text-xs"
              />
            </div>
          </motion.div>

          {/* Empty state */}
          {goals.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4"
            >
              <p className="text-sm text-[#4B5870]">Select goals above or create a custom one to get started.</p>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
