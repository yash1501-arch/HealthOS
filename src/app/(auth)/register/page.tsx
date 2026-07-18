"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api-client"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    consentPrivacy: false,
    consentDisclaimer: false,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      await api.post("/auth/register", {
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        consentPrivacy: form.consentPrivacy,
        consentDisclaimer: form.consentDisclaimer,
      })
      router.push("/assessment")
    } catch (err: unknown) {
      const error = err as { message?: string }
      setError(error.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#F5F7FA]">Create your account</h1>
        <p className="text-[#8B93A1] mt-1 text-sm">Start your personalized health journey</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-[#FF6B6B]/5 border border-[#FF6B6B]/10 text-[#FF6B6B] text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#8B93A1] mb-1.5">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className="w-full h-11 px-3 rounded-lg outline-none transition-all duration-200 text-[#F5F7FA] placeholder:text-[#8B93A1]/30"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(46,230,196,0.3)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(46,230,196,0.06)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
            required
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-[#8B93A1] mb-1.5">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full h-11 px-3 rounded-lg outline-none transition-all duration-200 text-[#F5F7FA] placeholder:text-[#8B93A1]/30"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(46,230,196,0.3)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(46,230,196,0.06)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
            required
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-[#8B93A1] mb-1.5">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full h-11 px-3 rounded-lg outline-none transition-all duration-200 text-[#F5F7FA] placeholder:text-[#8B93A1]/30"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(46,230,196,0.3)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(46,230,196,0.06)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
            placeholder="Min 8 characters"
            minLength={8}
            required
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-[#8B93A1] mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirm"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            className="w-full h-11 px-3 rounded-lg outline-none transition-all duration-200 text-[#F5F7FA] placeholder:text-[#8B93A1]/30"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(46,230,196,0.3)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(46,230,196,0.06)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
            required
          />
        </div>

        <div className="space-y-3 rounded-lg p-4 text-sm" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consentPrivacy}
              onChange={(e) => update("consentPrivacy", e.target.checked)}
              className="mt-0.5 accent-[#2FE6C4]"
              required
            />
            <span className="text-[#8B93A1] text-xs leading-relaxed">
              I understand that my health data will be encrypted and stored securely in accordance with the{" "}
              <Link href="#" className="text-[#2FE6C4] underline">
                Privacy Policy
              </Link>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consentDisclaimer}
              onChange={(e) => update("consentDisclaimer", e.target.checked)}
              className="mt-0.5 accent-[#2FE6C4]"
              required
            />
            <span className="text-[#8B93A1] text-xs leading-relaxed">
              I understand that HealthOS is not a medical device and does not diagnose diseases. I will consult a
              healthcare professional for medical advice.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-lg font-semibold text-sm transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #2FE6C4, #1CAF92)",
            color: "#05060A",
            boxShadow: "0 0 20px rgba(46,230,196,0.15)",
          }}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-[#8B93A1]/60 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[#2FE6C4] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
