"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { api } from "@/lib/api-client"
import type { TimelineQueryResult } from "@/lib/ai/engines/timeline-engine"

const SUGGESTED_QUESTIONS = [
  "How's my posture?",
  "Compare my last 2 blood tests",
  "Am I sleeping better?",
  "What should I focus on this week?",
]

interface AIQueryBoxProps {
  /** Called when results come back from the AI. */
  onResult?: (result: TimelineQueryResult) => void
}

/**
 * Natural language query input for the health timeline.
 *
 * Features suggested question chips, a typing animation during AI processing,
 * answer text rendering, chart rendering using Recharts, and follow-up support.
 */
export function AIQueryBox({ onResult }: AIQueryBoxProps) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<TimelineQueryResult | null>(null)
  const [history, setHistory] = useState<Array<{ query: string; result: TimelineQueryResult }>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest response
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [result])

  const submitQuery = useCallback(
    async (q: string) => {
      const trimmed = q.trim()
      if (!trimmed || loading) return

      setLoading(true)
      setError("")

      try {
        const res = await api.post<{ data: TimelineQueryResult }>("/timeline/query", {
          query: trimmed,
        })
        setResult(res.data)
        setHistory((prev) => [...prev, { query: trimmed, result: res.data }])
        onResult?.(res.data)
      } catch (err: unknown) {
        const e = err as { message?: string }
        setError(e.message || "Query failed. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [loading, onResult]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      submitQuery(query)
    },
    [query, submitQuery]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        submitQuery(query)
      }
    },
    [query, submitQuery]
  )

  return (
    <div className="space-y-4">
      {/* ── Input & Submit ── */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your health journey..."
          className="w-full h-12 pl-4 pr-24 text-sm rounded-xl border border-[#E2E8F0] bg-white
            focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10
            placeholder:text-[#4B5870]/40 transition-all"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 rounded-lg bg-[#176B63] text-white
            text-xs font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all flex items-center gap-1.5"
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Ask
            </>
          )}
        </button>
      </form>

      {/* ── Suggested Questions ── */}
      {history.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q)
                submitQuery(q)
              }}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-[#4B5870]
                hover:border-[#176B63]/20 hover:text-[#176B63] hover:bg-[#176B63]/5
                disabled:opacity-40 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-3 text-xs text-[#B53A45]">
          {error}
        </div>
      )}

      {/* ── Loading Animation ── */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-[#4B5870]">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4B5870]/40 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#4B5870]/40 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#4B5870]/40 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
          Analyzing your health data...
        </div>
      )}

      {/* ── Result Display ── */}
      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Answer */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🤖</span>
              <span className="text-xs font-semibold text-[#172033]">AI Answer</span>
              <span className="text-[10px] text-[#4B5870]/50 ml-auto">
                Confidence: {Math.round(result.confidence * 100)}%
              </span>
            </div>
            <p className="text-sm text-[#4B5870] leading-relaxed">{result.answer}</p>
          </div>

          {/* Charts */}
          {result.charts.length > 0 && (
            <div className="space-y-3">
              {result.charts.map((chart, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                  <h4 className="text-xs font-semibold text-[#172033] mb-3">{chart.title}</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === "line" ? (
                        <LineChart data={chart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#4B5870" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#4B5870" }} />
                          <Tooltip
                            contentStyle={{
                              fontSize: 11,
                              borderRadius: 8,
                              border: "1px solid #E2E8F0",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            }}
                          />
                          <Line type="monotone" dataKey="value" stroke="#176B63" strokeWidth={2} dot={{ fill: "#176B63", r: 3 }} />
                        </LineChart>
                      ) : chart.type === "bar" ? (
                        <BarChart data={chart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#4B5870" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#4B5870" }} />
                          <Tooltip
                            contentStyle={{
                              fontSize: 11,
                              borderRadius: 8,
                              border: "1px solid #E2E8F0",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            }}
                          />
                          <Bar dataKey="value" fill="#176B63" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <AreaChart data={chart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#4B5870" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#4B5870" }} />
                          <Tooltip
                            contentStyle={{
                              fontSize: 11,
                              borderRadius: 8,
                              border: "1px solid #E2E8F0",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            }}
                          />
                          <Area type="monotone" dataKey="value" stroke="#176B63" fill="#176B63" fillOpacity={0.1} strokeWidth={2} />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Relevant Data */}
          {result.relevantData.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
              <h4 className="text-xs font-semibold text-[#172033] mb-2">Relevant Data Points</h4>
              <div className="space-y-2">
                {result.relevantData.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#4B5870]">
                    <span className="font-mono tabular-nums text-[#4B5870]/50 w-20 shrink-0">{item.date}</span>
                    <span className="font-medium text-[#172033] w-16 shrink-0">{item.type}</span>
                    <span>{item.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          {result.disclaimer && (
            <p className="text-[10px] text-[#4B5870]/50 leading-relaxed italic">
              {result.disclaimer}
            </p>
          )}
        </motion.div>
      )}

      {/* ── Follow-up prompt ── */}
      {history.length > 0 && !loading && (
        <p className="text-xs text-[#4B5870]/50 text-center">
          Ask a follow-up question to dive deeper
        </p>
      )}

      <div ref={endRef} />
    </div>
  )
}
