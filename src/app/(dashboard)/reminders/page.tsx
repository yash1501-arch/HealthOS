"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"
import { toastSuccess, toastError } from "@/stores/toast"
import { requestNotificationPermission } from "@/components/ui/notifications"

type Reminder = {
  id: string
  title: string
  type: "medication" | "checkin" | "exercise" | "water" | "sleep" | "custom"
  time: string
  daysOfWeek: number[]
  isActive: boolean
  note?: string
  createdAt: string
}

const REMINDER_TYPES = [
  { value: "medication", label: "💊 Medication", color: "#B53A45" },
  { value: "checkin", label: "📋 Weekly Check-in", color: "#476A91" },
  { value: "exercise", label: "🏋️ Exercise", color: "#176B63" },
  { value: "water", label: "💧 Drink Water", color: "#2E7D6F" },
  { value: "sleep", label: "😴 Sleep Reminder", color: "#4B5870" },
  { value: "custom", label: "🔔 Custom", color: "#9B651B" },
] as const

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [notificationGranted, setNotificationGranted] = useState(false)
  const [form, setForm] = useState({
    title: "", type: "custom" as string, time: "09:00",
    daysOfWeek: [1, 2, 3, 4, 5], isActive: true, note: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load(); checkNotification() }, [])

  async function load() {
    try {
      const data = await api.get<Reminder[]>("/reminders")
      setReminders(data)
    } catch { /* no data */ }
    finally { setLoading(false) }
  }

  async function checkNotification() {
    const granted = await requestNotificationPermission()
    setNotificationGranted(granted)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await api.post("/reminders", form)
      toastSuccess("Reminder set!", "You'll be notified at the scheduled time.")
      setShowAdd(false)
      setForm({ title: "", type: "custom", time: "09:00", daysOfWeek: [1, 2, 3, 4, 5], isActive: true, note: "" })
      load()
    } catch { toastError("Failed to create reminder") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/reminders?id=${id}`)
      toastSuccess("Reminder removed")
      load()
    } catch { toastError("Failed to remove") }
  }

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }))
  }

  const now = new Date()
  const currentDay = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">Reminders</h1>
          <p className="text-sm text-[#4B5870] mt-1">Get notified for medications, check-ins, exercise, and more</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="h-10 px-4 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all">
          {showAdd ? "Cancel" : "+ Add Reminder"}
        </button>
      </motion.div>

      {!notificationGranted && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#9B651B]/5 border border-[#9B651B]/10 rounded-xl p-4 text-sm text-[#9B651B]">
          🔔 Notifications not enabled. <button onClick={checkNotification} className="underline font-medium">Enable notifications</button> to get reminders.
        </motion.div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Type</label>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_TYPES.map((t) => (
                    <button key={t.value} type="button" onClick={() => setForm({ ...form, type: t.value })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.type === t.value ? "bg-[#176B63] text-white" : "bg-[#F5F7FA] text-[#4B5870] hover:bg-[#E2E8F0]"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm" placeholder="e.g. Take Vitamin D" required />
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Time</label>
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Days</label>
                <div className="flex gap-1">
                  {DAYS.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={`w-9 h-9 rounded-lg text-[10px] font-medium transition-all ${
                        form.daysOfWeek.includes(i) ? "bg-[#176B63] text-white" : "bg-[#F5F7FA] text-[#4B5870]"
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Note (optional)</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm" placeholder="e.g. Take with food" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="h-10 px-5 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40">
                {saving ? "Saving..." : "Save Reminder"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#F5F7FA] animate-pulse" />)}</div>
      ) : reminders.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
          <div className="w-14 h-14 rounded-xl bg-[#F5F7FA] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔔</span>
          </div>
          <h3 className="text-lg font-semibold text-[#172033] mb-2">No reminders yet</h3>
          <p className="text-sm text-[#4B5870] mb-6">Set reminders for medications, check-ins, water breaks, and more.</p>
          <button onClick={() => setShowAdd(true)} className="h-11 px-6 bg-[#176B63] text-white rounded-xl text-sm font-medium">Create Your First Reminder</button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {reminders.map((r, i) => {
            const typeMeta = REMINDER_TYPES.find((t) => t.value === r.type)
            const isDue = r.daysOfWeek.includes(currentDay)
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-xl border p-4 transition-all ${!r.isActive ? "opacity-50" : isDue ? "border-[#E2E8F0]" : "border-[#E2E8F0]/50"}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${typeMeta?.color}15` }}>
                    {typeMeta?.label.split(" ")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[#172033]">{r.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#F5F7FA] text-[#4B5870] rounded-full font-mono">{r.time}</span>
                      {!r.isActive && <span className="text-[10px] text-[#4B5870]/40">Paused</span>}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {DAYS.map((d, di) => (
                        <span key={di} className={`text-[9px] w-5 h-5 rounded flex items-center justify-center ${
                          r.daysOfWeek.includes(di) ? "bg-[#176B63]/10 text-[#176B63] font-medium" : "text-[#4B5870]/30"
                        }`}>{d[0]}</span>
                      ))}
                    </div>
                    {r.note && <p className="text-xs text-[#4B5870]/60 mt-1">{r.note}</p>}
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 text-[#4B5870]/30 hover:text-[#B53A45] transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Reminder check scheduler */}
      <ReminderScheduler reminders={reminders} />
    </div>
  )
}

// ─── Background Scheduler ───────────────────────────────────────

function ReminderScheduler({ reminders }: { reminders: Reminder[] }) {
  useEffect(() => {
    // Check every 30 seconds
    const interval = setInterval(() => {
      const now = new Date()
      const currentDay = now.getDay()
      const currentMin = now.getHours() * 60 + now.getMinutes()

      for (const r of reminders) {
        if (!r.isActive || !r.daysOfWeek.includes(currentDay)) continue
        const [h, m] = r.time.split(":").map(Number)
        const remMin = h * 60 + m

        if (Math.abs(currentMin - remMin) <= 0.5) {
          const icons: Record<string, string> = { medication: "💊", checkin: "📋", exercise: "🏋️", water: "💧", sleep: "😴", custom: "🔔" }
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`${icons[r.type] || "🔔"} ${r.title}`, {
              body: r.note || `Time for ${r.type}!`,
              icon: "/icons/icon-192.svg",
              tag: r.id,
            })
          }
        }
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [reminders])

  return null
}
