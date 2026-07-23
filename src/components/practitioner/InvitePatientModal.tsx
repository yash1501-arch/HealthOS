"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"
import { toastError, toastSuccess } from "@/stores/toast"

type InvitePatientModalProps = {
  onClose: () => void
  onInvited: () => void
}

const EASE = [0.16, 1, 0.3, 1] as const

export function InvitePatientModal({ onClose, onInvited }: InvitePatientModalProps) {
  const [step, setStep] = useState<"form" | "link" | "success">("form")
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  // Generated invite data
  const [inviteLink, setInviteLink] = useState("")
  const [invitedEmail, setInvitedEmail] = useState("")
  const [expiresAt] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d
  })
  const [copied, setCopied] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSending(true)
    setError("")
    try {
      const result = await api.post<{
        linkId: string
        inviteCode: string
        patientEmail: string
        status: string
      }>("/practitioner/patients", { patientEmail: email.trim() })

      // Generate the shareable invite link
      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
      const generatedLink = `${baseUrl}/patient/connect?code=${result.inviteCode}&practitioner=${result.linkId}`

      setInviteLink(generatedLink)
      setInvitedEmail(email.trim())
      setStep("link")
      toastSuccess("Invite link generated!")
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string }
      setError(e.message || "Failed to generate invite link")
      if (e.code === "NOT_FOUND") {
        setError("No user found with this email. Ask the patient to sign up first.")
      } else if (e.code === "CONFLICT") {
        setError("This patient is already connected to you.")
      }
    } finally {
      setSending(false)
    }
  }, [email])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toastSuccess("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea")
      textarea.value = inviteLink
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [inviteLink])

  const handleDone = useCallback(() => {
    onInvited()
    onClose()
  }, [onInvited, onClose])

  const expiresInDays = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="bg-white rounded-2xl border border-[#E2E8F0] w-full max-w-md shadow-xl overflow-hidden"
      >
        <div className="p-6">
          {/* Step 1: Email form */}
          {step === "form" && (
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-[#172033]">Invite Patient</h2>
                  <p className="text-xs text-[#4B5870] mt-0.5">
                    Enter your patient&apos;s email to generate an invite link
                  </p>
                </div>
                <button onClick={onClose} className="p-2 text-[#4B5870]/40 hover:text-[#172033]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#172033] mb-1.5">
                    Patient Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
                  />
                </div>

                {error && (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B53A45] text-sm rounded-lg p-3">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 h-9 text-sm text-[#4B5870] hover:text-[#172033] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !email.trim()}
                    className="px-5 h-9 bg-[#176B63] text-white rounded-lg text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all"
                  >
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating...
                      </span>
                    ) : (
                      "Generate Invite Link"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step 2: Share invite link */}
          {step === "link" && (
            <>
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-[#176B63]/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-[#176B63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#172033]">Invite Link Generated</h3>
                <p className="text-xs text-[#4B5870] mt-1">
                  Share this link with <strong>{invitedEmail}</strong>
                </p>
                {expiresInDays > 0 && (
                  <p className="text-[11px] text-[#9B651B] mt-1">
                    ⏰ Expires in {expiresInDays} day{expiresInDays !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {/* Link display + copy */}
                <div className="flex gap-2">
                  <div className="flex-1 p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E2E8F0] text-xs text-[#172033] font-mono truncate">
                    {inviteLink}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`p-2.5 rounded-lg border transition-all ${
                      copied
                        ? "bg-[#176B63] border-[#176B63] text-white"
                        : "bg-white border-[#E2E8F0] text-[#4B5870] hover:border-[#176B63]/30 hover:text-[#176B63]"
                    }`}
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-[#F8F9FB] border border-[#E2E8F0] space-y-2">
                <p className="text-xs font-medium text-[#172033]">📋 How it works</p>
                <ol className="text-[11px] text-[#4B5870] space-y-1">
                  <li>1. Copy this invite link and send it to your patient</li>
                  <li>2. The link expires in <strong>{expiresInDays} days</strong></li>
                  <li>3. When the patient clicks the link, they&apos;ll be asked to accept the connection</li>
                  <li>4. After accepting, the patient controls what data to share from their settings</li>
                  <li>5. You can see only the data types they approve</li>
                </ol>
              </div>

              <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-[#E2E8F0]">
                <button
                  onClick={handleDone}
                  className="px-5 h-9 bg-[#176B63] text-white rounded-lg text-sm font-medium hover:bg-[#10554F] transition-all"
                >
                  Done
                </button>
              </div>
            </>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#176B63]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[#176B63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#172033]">Invitation Sent!</h3>
              <p className="text-sm text-[#4B5870] mt-1">
                An invitation email has been sent to <strong>{invitedEmail}</strong>.
              </p>
              <p className="text-xs text-[#4B5870]/60 mt-2">
                The patient will need to accept the invite and share their data before you can view their health information.
              </p>
              <button
                onClick={handleDone}
                className="mt-6 px-5 h-9 bg-[#176B63] text-white rounded-lg text-sm font-medium hover:bg-[#10554F] transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
