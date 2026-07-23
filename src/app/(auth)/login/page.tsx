"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { toastError, toastSuccess } from "@/stores/toast"

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: "", password: "" })
  const redirectTo = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("redirect") || "/dashboard"
    : "/dashboard"
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
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
      toastError("Login failed", error.message || "Check your email and password")
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

        <div>
          <label htmlFor="password" className="label-text">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className={`input-field ${errors.password ? "input-field-error" : ""}`}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {errors.password && <p className="text-xs text-[#B53A45] mt-1">{errors.password}</p>}
        </div>

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
