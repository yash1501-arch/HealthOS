"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { toastError, toastSuccess } from "@/stores/toast"

// ─── Password Strength ───────────────────────────────────────────

function getPasswordStrength(password: string): { score: number; label: string; color: string; width: string } {
  let score = 0
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 10
  if (/[a-z]/.test(password)) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/[0-9]/.test(password)) score += 15
  if (/[^a-zA-Z0-9]/.test(password)) score += 20
  // Bonus
  if (password.length >= 16) score += 5

  if (score < 30) return { score, label: "Weak", color: "#B53A45", width: `${Math.max(score, 5)}%` }
  if (score < 60) return { score, label: "Fair", color: "#9B651B", width: `${score}%` }
  if (score < 80) return { score, label: "Good", color: "#476A91", width: `${score}%` }
  return { score: Math.min(score, 100), label: "Strong", color: "#176B63", width: "100%" }
}

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null
  const strength = getPasswordStrength(password)

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: strength.width, backgroundColor: strength.color }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-medium" style={{ color: strength.color }}>{strength.label}</span>
        <div className="flex gap-2 text-[9px] text-[#4B5870]/50">
          <span className={/[a-z]/.test(password) ? "text-[#176B63]" : ""}>a-z</span>
          <span className={/[A-Z]/.test(password) ? "text-[#176B63]" : ""}>A-Z</span>
          <span className={/[0-9]/.test(password) ? "text-[#176B63]" : ""}>0-9</span>
          <span className={/[^a-zA-Z0-9]/.test(password) ? "text-[#176B63]" : ""}>!@#</span>
          <span className={password.length >= 8 ? "text-[#176B63]" : ""}>8+</span>
        </div>
      </div>
    </div>
  )
}

// ─── Validation ──────────────────────────────────────────────────

function validateEmail(email: string): string | null {
  if (!email) return "Email is required"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return "Please enter a valid email address"
  if (email.length > 254) return "Email is too long"
  return null
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required"
  if (password.length < 8) return "Password must be at least 8 characters"
  if (!/[A-Z]/.test(password)) return "Password needs an uppercase letter"
  if (!/[a-z]/.test(password)) return "Password needs a lowercase letter"
  if (!/[0-9]/.test(password)) return "Password needs a number"
  if (!/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`]/.test(password)) return "Password needs a special character"
  return null
}

function validateName(name: string): string | null {
  if (!name.trim()) return "Please enter your name"
  if (name.trim().length < 2) return "Name should be at least 2 characters"
  return null
}

// ─── Page ────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
    if (serverError) setServerError("")
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    const nameErr = validateName(form.fullName)
    if (nameErr) newErrors.fullName = nameErr

    const emailErr = validateEmail(form.email)
    if (emailErr) newErrors.email = emailErr

    const pwErr = validatePassword(form.password)
    if (pwErr) newErrors.password = pwErr

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!form.acceptTerms) newErrors.acceptTerms = "You must accept the Terms of Service"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError("")

    try {
      const result = await api.post<{ userId: string; needsConsent?: boolean }>("/auth/register", {
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        consentPrivacy: true,
        consentDisclaimer: true,
      })

      toastSuccess("Account created!", "Setting up your health profile...")
      // Navigate to assessment — the ConsentModal will be shown by the assessment layout
      setTimeout(() => {
        if (result.needsConsent) {
          router.push("/assessment?consent=1")
        } else {
          router.push("/assessment")
        }
      }, 800)
    } catch (err: unknown) {
      const error = err as { message?: string }
      const msg = error.message || "Registration failed"
      setServerError(msg)
      toastError("Registration failed", msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#172033]">Create your account</h1>
        <p className="text-[#4B5870] mt-1 text-sm">Start your personalized health journey</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Server error */}
        {serverError && (
          <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-3 text-xs text-[#B53A45]">
            {serverError}
          </div>
        )}

        {/* Full Name */}
        <div>
          <label htmlFor="reg-name" className="label-text">Full Name</label>
          <input
            id="reg-name"
            type="text"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className={`input-field ${errors.fullName ? "input-field-error" : ""}`}
            placeholder="Your full name"
            autoComplete="name"
          />
          {errors.fullName && <p className="text-xs text-[#B53A45] mt-1">{errors.fullName}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="label-text">Email</label>
          <input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={`input-field ${errors.email ? "input-field-error" : ""}`}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email && <p className="text-xs text-[#B53A45] mt-1">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="label-text">Password</label>
          <input
            id="reg-password"
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className={`input-field ${errors.password ? "input-field-error" : ""}`}
            placeholder="Min 8 characters, uppercase, lowercase, number, special"
            minLength={8}
            autoComplete="new-password"
          />
          <PasswordStrengthBar password={form.password} />
          {errors.password && <p className="text-xs text-[#B53A45] mt-1">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="reg-confirm" className="label-text">Confirm Password</label>
          <input
            id="reg-confirm"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            className={`input-field ${errors.confirmPassword ? "input-field-error" : ""}`}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
          {errors.confirmPassword && <p className="text-xs text-[#B53A45] mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* Terms of Service Checkbox */}
        <div className="rounded-xl p-4 border border-[#E2E8F0]">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => update("acceptTerms", e.target.checked)}
              className="mt-0.5 accent-[#176B63] w-4 h-4"
            />
            <div>
              <span className="text-xs text-[#4B5870] leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className="text-[#176B63] hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-[#176B63] hover:underline">Privacy Policy</Link>.
                I understand that HealthOS is not a medical device and does not diagnose diseases.
                My data will be encrypted and stored securely.
              </span>
              {errors.acceptTerms && <p className="text-xs text-[#B53A45] mt-0.5">{errors.acceptTerms}</p>}
            </div>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl font-semibold text-sm btn-primary"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-[#4B5870]/60 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[#176B63] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
