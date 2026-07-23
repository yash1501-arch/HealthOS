"use client"

import { useState, useCallback } from "react"
import { api } from "@/lib/api-client"
import { motion, AnimatePresence } from "framer-motion"

interface ConsentModalProps {
  /** Called when the user has accepted all consents. */
  onAccepted: () => void
  /** Called if the user closes without accepting. */
  onClose?: () => void
}

const CONSENT_ITEMS = [
  {
    key: "disclaimer" as const,
    label: "Medical Disclaimer",
    text: "I understand HealthOS is not a medical device and does not provide medical diagnosis, treatment recommendations, or replace professional medical advice from a qualified healthcare provider.",
  },
  {
    key: "data_processing" as const,
    label: "AI Data Processing",
    text: "I consent to my health data being securely processed by AI for personalized recommendations, insights, and health tracking. I understand that data is anonymized before AI processing.",
  },
  {
    key: "privacy" as const,
    label: "Data Privacy & Storage",
    text: "I understand my health data will be encrypted and stored securely in compliance with data protection regulations. I can request the deletion of my data and account at any time.",
  },
]

/**
 * Consent modal shown after first login/registration.
 * All three checkboxes must be checked before proceeding.
 */
export function ConsentModal({ onAccepted, onClose }: ConsentModalProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const allChecked = CONSENT_ITEMS.every((item) => checked[item.key])

  const toggle = useCallback((key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleAccept = useCallback(async () => {
    if (!allChecked || submitting) return

    setSubmitting(true)
    setError("")

    try {
      await api.post("/auth/consent", {
        consents: CONSENT_ITEMS.map((item) => ({
          type: item.key,
          granted: checked[item.key],
        })),
      })
      onAccepted()
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || "Failed to save consent. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }, [allChecked, submitting, checked, onAccepted])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#176B63]/10 flex items-center justify-center text-xl">
                🔐
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#172033]">Consent Required</h2>
                <p className="text-xs text-[#4B5870]">
                  Please review and accept the following to use HealthOS
                </p>
              </div>
            </div>
          </div>

          {/* Consent Items */}
          <div className="px-6 py-4 space-y-3">
            {CONSENT_ITEMS.map((item) => (
              <label
                key={item.key}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  checked[item.key]
                    ? "border-[#176B63]/20 bg-[#176B63]/3"
                    : "border-[#E2E8F0] hover:border-[#176B63]/20 hover:bg-[#176B63]/3"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked[item.key] ?? false}
                  onChange={() => toggle(item.key)}
                  className="mt-0.5 accent-[#176B63] w-4 h-4 shrink-0"
                />
                <div>
                  <span className="text-sm font-medium text-[#172033]">{item.label}</span>
                  <p className="text-xs text-[#4B5870] mt-0.5 leading-relaxed">{item.text}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="px-6 pb-2">
              <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-lg p-3 text-xs text-[#B53A45]">
                {error}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-xs text-[#4B5870] hover:text-[#172033] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={!allChecked || submitting}
              className="px-6 h-10 rounded-xl bg-[#176B63] text-white text-sm font-medium
                hover:bg-[#10554F] disabled:opacity-40 disabled:cursor-not-allowed
                transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                `I Agree (${Object.keys(checked).length}/${CONSENT_ITEMS.length})`
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
