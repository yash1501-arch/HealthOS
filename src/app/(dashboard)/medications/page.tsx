"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"
import { toastSuccess, toastError } from "@/stores/toast"

type Medication = {
  id: string
  name: string
  dosage: string
  unit: string
  frequency: string
  timeOfDay: string[]
  notes: string
  isActive: boolean
  createdAt: string
}

const TIMES = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "12:00",
  "14:00", "16:00", "18:00", "20:00", "21:00", "22:00",
]

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [todayLogs, setTodayLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: "", dosage: "1", unit: "dose", frequency: "daily",
    timeOfDay: ["08:00"], notes: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.get<{ medications: Medication[]; todayLogs: string[] }>("/medications")
      setMedications(data.medications)
      setTodayLogs(data.todayLogs)
    } catch { /* no data */ }
    finally { setLoading(false) }
  }

  async function toggleLog(name: string) {
    try {
      await api.post("/medications", { action: "log", medicationName: name })
      setTodayLogs((prev) => [...prev, name])
      toastSuccess("Logged!", `${name} marked as taken`)
    } catch { toastError("Failed to log") }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await api.post("/medications", { ...form, action: "save" })
      toastSuccess("Medication added!")
      setShowAdd(false)
      setForm({ name: "", dosage: "1", unit: "dose", frequency: "daily", timeOfDay: ["08:00"], notes: "" })
      load()
    } catch { toastError("Failed to add medication") }
    finally { setSaving(false) }
  }

  async function handleDelete(medId: string) {
    try {
      await api.post("/medications", { action: "delete", medId })
      toastSuccess("Medication removed")
      load()
    } catch { toastError("Failed to remove") }
  }

  function toggleTime(t: string) {
    setForm((prev) => ({
      ...prev,
      timeOfDay: prev.timeOfDay.includes(t)
        ? prev.timeOfDay.filter((x) => x !== t)
        : [...prev.timeOfDay, t].sort(),
    }))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">Medications</h1>
          <p className="text-sm text-[#4B5870] mt-1">Track your daily medications and supplements</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="h-10 px-4 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all"
        >
          {showAdd ? "Cancel" : "+ Add Medication"}
        </button>
      </motion.div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Medication Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                  placeholder="e.g. Vitamin D, Metformin"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Dosage</label>
                <input
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                  placeholder="e.g. 1000"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Unit</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm bg-white"
                >
                  <option value="dose">dose</option>
                  <option value="mg">mg</option>
                  <option value="mcg">mcg</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="tablet">tablet</option>
                  <option value="capsule">capsule</option>
                  <option value="drop">drop</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm bg-white"
                >
                  <option value="daily">Daily</option>
                  <option value="twice_daily">Twice daily</option>
                  <option value="thrice_daily">Three times daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="as_needed">As needed</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Times</label>
                <div className="flex flex-wrap gap-1.5">
                  {TIMES.map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => toggleTime(t)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                        form.timeOfDay.includes(t)
                          ? "bg-[#176B63] text-white"
                          : "bg-[#F5F7FA] text-[#4B5870] hover:bg-[#E2E8F0]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B5870] mb-1 block">Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                  placeholder="e.g. Take with food"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-5 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save Medication"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Medication list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-[#F5F7FA] animate-pulse" />)}
        </div>
      ) : medications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center"
        >
          <div className="w-14 h-14 rounded-xl bg-[#F5F7FA] flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#176B63" strokeWidth="1.5" className="w-7 h-7">
              <path d="M10.5 4.5v12M7.5 16.5h6M8.25 8.25h-1.5M11.25 8.25h-1.5M14.25 8.25h-1.5" />
              <path d="M4.5 4.5h15v15h-15z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#172033] mb-2">No medications tracked</h3>
          <p className="text-sm text-[#4B5870] mb-6">Add your medications and supplements to track daily adherence.</p>
          <button onClick={() => setShowAdd(true)} className="h-11 px-6 bg-[#176B63] text-white rounded-xl text-sm font-medium">
            Add Your First Medication
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {medications.map((med, i) => {
            const isTaken = todayLogs.includes(med.name)
            return (
              <motion.div
                key={med.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  isTaken ? "border-[#176B63]/30 bg-[#176B63]/3" : "border-[#E2E8F0]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => !isTaken && toggleLog(med.name)}
                    disabled={isTaken}
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      isTaken
                        ? "bg-[#176B63] border-[#176B63] text-white"
                        : "border-[#E2E8F0] hover:border-[#176B63] hover:bg-[#176B63]/5"
                    }`}
                  >
                    {isTaken ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="text-[#4B5870]/30 text-xs">✓</span>
                    )}
                  </button>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${isTaken ? "text-[#176B63]" : "text-[#172033]"}`}>
                        {med.name}
                      </h3>
                      <span className="text-xs text-[#4B5870]/60">{med.dosage} {med.unit}</span>
                      {isTaken && <span className="text-[10px] px-1.5 py-0.5 bg-[#176B63]/10 text-[#176B63] rounded-full">Taken ✓</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#4B5870]/60">
                        {med.frequency.replace("_", " ")} · {med.timeOfDay.join(", ")}
                      </span>
                    </div>
                    {med.notes && <p className="text-xs text-[#4B5870]/40 mt-0.5">{med.notes}</p>}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(med.id)}
                    className="p-1.5 text-[#4B5870]/30 hover:text-[#B53A45] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Daily summary */}
      {medications.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-[#4B5870]/60"
        >
          {todayLogs.length} of {medications.length} medications taken today
          {todayLogs.length === medications.length && " 🎉"}
        </motion.div>
      )}
    </div>
  )
}
