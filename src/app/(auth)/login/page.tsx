"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api-client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await api.post<{ userId: string; onboardingComplete: boolean }>("/auth/login", {
        email,
        password,
      })
      if (result.onboardingComplete) {
        router.push("/dashboard")
      } else {
        router.push("/assessment")
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      setError(error.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#F5F7FA]">Welcome back</h1>
        <p className="text-[#8B93A1] mt-1 text-sm">Sign in to your HealthOS account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-[#FF6B6B]/5 border border-[#FF6B6B]/10 text-[#FF6B6B] text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#8B93A1] mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#8B93A1] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            placeholder="••••••••"
            required
          />
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
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-[#8B93A1]/60 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[#2FE6C4] font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
