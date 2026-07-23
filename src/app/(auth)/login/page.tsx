"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { toastError, toastSuccess } from "@/stores/toast"

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const redirectTo = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("redirect") || "/dashboard"
    : "/dashboard"
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
    if (serverError) setServerError("")
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!form.email) newErrors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Invalid email format"
    if (!form.password) newErrors.password = "Password is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError("")

    try {
      const result = await api.post<{ userId: string; onboardingComplete: boolean }>("/auth/login", {
        email: form.email,
        password: form.password,
      })

      toastSuccess("Welcome back!", result.onboardingComplete ? "Loading your health plan..." : "Let's complete your profile")
      setTimeout(() => {
        if (result.onboardingComplete) {
          router.push(redirectTo === "/dashboard" ? "/plan" : redirectTo)
        } else {
          router.push("/assessment")
        }
      }, 500)
    } catch (err: unknown) {
      const error = err as { message?: string }
      const msg = error.message || "Check your email and password"
      setServerError(msg)
      toastError("Login failed", msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#172033]">Welcome back</h1>
        <p className="text-[#4B5870] mt-1 text-sm">Sign in to your HealthOS account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Server error */}
        {serverError && (
          <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-3 text-xs text-[#B53A45]">
            {serverError}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="label-text">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={`input-field ${errors.email ? "input-field-error" : ""}`}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email && <p className="text-xs text-[#B53A45] mt-1">{errors.email}</p>}
        </div>

        {/* Password with show/hide toggle */}
        <div>
          <label htmlFor="password" className="label-text">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={`input-field pr-10 ${errors.password ? "input-field-error" : ""}`}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5870]/50 hover:text-[#4B5870] transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="text-xs text-[#B53A45] mt-1">{errors.password}</p>}
        </div>

        {/* Forgot password */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-[#4B5870] hover:text-[#176B63] transition-colors"
          >
            Forgot password?
          </Link>
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
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-[#4B5870]/60 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[#176B63] font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
