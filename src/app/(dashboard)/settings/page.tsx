"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"
import { toastError, toastSuccess } from "@/stores/toast"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

export default function SettingsPage() {
  const [profile, setProfile] = useState<{
    fullName: string
    email: string
    onboardingComplete: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // Password change state
  const [showChangePw, setShowChangePw] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState("")

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<any>("/assessment")
        setProfile({
          fullName: data?.profile?.fullName || "—",
          email: data?.email || "—",
          onboardingComplete: data?.onboardingComplete ?? false,
        })
      } catch {
        // Not loaded yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError("")

    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters")
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Passwords do not match")
      return
    }

    setPwSaving(true)
    try {
      await api.post("/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      toastSuccess("Password updated!", "Your password has been changed successfully.")
      setShowChangePw(false)
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (err: unknown) {
      const e = err as { message?: string }
      setPwError(e.message || "Failed to change password")
    } finally {
      setPwSaving(false)
    }
  }

  async function handleExportData() {
    try {
      const data = await api.get("/assessment")
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `healthos-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess("Data exported!", "Your health data has been downloaded.")
    } catch {
      toastError("Export failed", "Could not export your data at this time.")
    }
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await api.delete("/auth/account")
      toastSuccess("Account deleted", "Your account and data have been removed.")
      setTimeout(() => { window.location.href = "/" }, 1500)
    } catch {
      toastError("Delete failed", "Could not delete account at this time.")
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#172033]">Settings</h1>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#176B63] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-[#172033]"
      >
        Settings
      </motion.h1>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
      >
        <h2 className="text-lg font-semibold text-[#172033] mb-4">Profile</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#E2E8F0]/60">
            <span className="text-sm text-[#4B5870]">Name</span>
            <span className="text-sm font-medium text-[#172033]">{profile?.fullName}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#E2E8F0]/60">
            <span className="text-sm text-[#4B5870]">Email</span>
            <span className="text-sm font-medium text-[#172033]">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-[#4B5870]">Onboarding</span>
            <span className={`text-sm font-medium ${profile?.onboardingComplete ? "text-[#176B63]" : "text-[#9B651B]"}`}>
              {profile?.onboardingComplete ? "Complete" : "Incomplete"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Account Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
      >
        <h2 className="text-lg font-semibold text-[#172033] mb-4">Account</h2>

        {/* Change Password */}
        {!showChangePw ? (
          <button
            onClick={() => setShowChangePw(true)}
            className="w-full text-left px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm text-[#172033] hover:bg-[#F5F7FA] transition-colors"
          >
            Change password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 p-4 bg-[#F5F7FA] rounded-xl border border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#172033]">Change Password</h3>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              placeholder="Current password"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
              required
            />
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              placeholder="New password (min 8 chars)"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
              minLength={8}
              required
            />
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
              required
            />
            {pwError && <p className="text-xs text-[#B53A45]">{pwError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pwSaving}
                className="px-4 h-9 bg-[#176B63] text-white rounded-lg text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all"
              >
                {pwSaving ? "Saving..." : "Update Password"}
              </button>
              <button
                type="button"
                onClick={() => { setShowChangePw(false); setPwError("") }}
                className="px-4 h-9 text-sm text-[#4B5870] hover:text-[#172033]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-3 space-y-3">
          <button
            onClick={handleExportData}
            className="w-full text-left px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm text-[#172033] hover:bg-[#F5F7FA] transition-colors"
          >
            Export my data
          </button>

          {!confirmDelete ? (
            <button
              onClick={handleDeleteAccount}
              className="w-full text-left px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm text-[#B53A45] hover:bg-[#B53A45]/5 transition-colors"
            >
              Delete account
            </button>
          ) : (
            <div className="p-4 bg-[#B53A45]/5 rounded-xl border border-[#B53A45]/20">
              <p className="text-sm font-medium text-[#B53A45] mb-2">Are you sure?</p>
              <p className="text-xs text-[#4B5870] mb-3">This will permanently delete your account and all health data. This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 h-9 bg-[#B53A45] text-white rounded-lg text-sm font-medium hover:bg-[#8B2D36] disabled:opacity-40 transition-all"
                >
                  {deleting ? "Deleting..." : "Yes, delete my account"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 h-9 text-sm text-[#4B5870] hover:text-[#172033]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Connected Services */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
      >
        <h2 className="text-lg font-semibold text-[#172033] mb-4">Connected Services</h2>
        <div className="space-y-3">
          {/* Google Fit */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg">❤️</div>
              <div>
                <p className="text-sm font-medium text-[#172033]">Google Fit</p>
                <p className="text-xs text-[#4B5870]/60">Sync steps, weight, heart rate</p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  const { api } = await import("@/lib/api-client")
                  const res = await api.get<{ url: string }>("/integrations/google-fit?action=connect")
                  if (res.url) window.open(res.url, "_blank")
                } catch { /* not configured */ }
              }}
              className="h-9 px-4 bg-[#176B63] text-white rounded-lg text-sm font-medium hover:bg-[#10554F] transition-all"
            >
              Connect
            </button>
          </div>

          {/* Apple Health */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-lg">🍎</div>
              <div>
                <p className="text-sm font-medium text-[#172033]">Apple Health</p>
                <p className="text-xs text-[#4B5870]/60">Import from Health app export</p>
              </div>
            </div>
            <label className="h-9 px-4 bg-[#176B63] text-white rounded-lg text-sm font-medium hover:bg-[#10554F] cursor-pointer transition-all flex items-center">
              Import XML
              <input
                type="file"
                accept=".xml"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const formData = new FormData()
                  formData.append("file", file)
                  try {
                    const { api } = await import("@/lib/api-client")
                    const res = await api.post<{ savedCount: number; types: string[] }>("/integrations/apple-health", formData as any, { headers: {} })
                    alert(`Imported ${res.savedCount} records!\n\nTypes: ${res.types.slice(0, 10).join(", ")}`)
                  } catch (err) {
                    alert("Import failed. Make sure you're uploading an Apple Health export.xml file.")
                  }
                  e.target.value = ""
                }}
              />
            </label>
          </div>

          {/* Samsung Health */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0] opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg">⌚</div>
              <div>
                <p className="text-sm font-medium text-[#172033]">Samsung Health</p>
                <p className="text-xs text-[#4B5870]/60">Coming soon with native app</p>
              </div>
            </div>
            <span className="text-xs text-[#4B5870]/40">Soon</span>
          </div>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
      >
        <h2 className="text-lg font-semibold text-[#172033] mb-4">Preferences</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-[#172033]">Theme</p>
            <p className="text-xs text-[#4B5870]/60">Light mode (dark mode coming soon)</p>
          </div>
          <span className="text-sm text-[#4B5870]">Light</span>
        </div>
      </motion.div>

      {/* Data & Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
      >
        <h2 className="text-lg font-semibold text-[#172033] mb-4">Data & Privacy</h2>
        <p className="text-xs text-[#4B5870] leading-relaxed">
          Your health data is encrypted and stored securely. HealthOS does not share your
          personal health information with third parties. You can request data export or
          account deletion at any time.
        </p>
      </motion.div>
    </div>
  )
}
