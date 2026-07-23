"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"
import { toastError, toastSuccess } from "@/stores/toast"

type ClinicalNote = {
  id: string
  title: string
  description: string
  createdAt: string
  metadata: Record<string, unknown>
}

type ClinicalNoteFormProps = {
  patientId: string
  notes: ClinicalNote[]
  onNoteAdded: () => void
}

const NOTE_CATEGORIES = [
  { value: "observation", label: "Observation", color: "#476A91" },
  { value: "recommendation", label: "Recommendation", color: "#176B63" },
  { value: "follow_up", label: "Follow-up", color: "#9B651B" },
  { value: "other", label: "Other", color: "#4B5870" },
]

export function ClinicalNoteForm({ patientId, notes, onNoteAdded }: ClinicalNoteFormProps) {
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("observation")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    try {
      await api.post(`/practitioner/patients/${patientId}/notes`, { content: content.trim(), category })
      setContent("")
      toastSuccess("Clinical note saved")
      onNoteAdded()
    } catch (err: unknown) {
      const e = err as { message?: string }
      toastError(e.message || "Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  const categoryColors: Record<string, string> = {
    observation: "#476A91",
    recommendation: "#176B63",
    follow_up: "#9B651B",
    other: "#4B5870",
  }

  return (
    <div className="space-y-4">
      {/* New Note Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white
              focus:outline-none focus:border-[#176B63]
              appearance-none cursor-pointer"
          >
            {NOTE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a clinical note..."
          rows={3}
          maxLength={5000}
          className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm
            focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10 resize-none"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="h-8 px-4 bg-[#176B63] text-white rounded-lg text-xs font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </form>

      {/* Previous Notes */}
      {notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#4B5870] uppercase tracking-wider">
            Previous Notes ({notes.length})
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-3 rounded-lg bg-[#F8F9FB] border border-[#E2E8F0]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${(note.metadata?.category as string) ? categoryColors[note.metadata?.category as string] ?? "#4B5870" : "#4B5870"}15`,
                      color: (note.metadata?.category as string) ? categoryColors[note.metadata?.category as string] ?? "#4B5870" : "#4B5870",
                    }}
                  >
                    {note.metadata?.category as string ?? "observation"}
                  </span>
                  <span className="text-[10px] text-[#4B5870]/60">
                    {new Date(note.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-[#4B5870] leading-relaxed whitespace-pre-wrap">
                  {note.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
