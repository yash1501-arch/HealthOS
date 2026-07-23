"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { generateWorkoutPlan, type WorkoutPlan, type WorkoutDay } from "@/lib/workout-plans"
import { LANGUAGES, t, type Language } from "@/lib/i18n/exercise"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

const DAY_ICONS: Record<number, string> = {
  0: "😴", 1: "🔥", 2: "💪", 3: "🏃", 4: "🎯", 5: "⚡", 6: "🧘",
}

export default function ExercisePage() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Language>("en")
  const [selectedDay, setSelectedDay] = useState<number>(-1)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<any>("/assessment")
        const goals = (data?.goals || []).map((g: any) => g.goal)
        const painAreas = (data?.painAssessments || []).map((p: any) => p.bodyArea)
        const difficulty = goals.includes("build_strength") ? "intermediate" : "beginner"
        setPlan(generateWorkoutPlan(goals, difficulty as any, painAreas))
      } catch {
        setPlan(generateWorkoutPlan([], "beginner"))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const today = new Date().getDay()
  const todayPlan = plan?.days.find((d) => d.day === today)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">Workout</h1>
          <p className="text-sm text-[#4B5870] mt-1">AI-powered weekly workout plans</p>
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Language)}
          className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm bg-white"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.nativeName}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-[#F5F7FA] animate-pulse" />)}</div>
      ) : plan ? (
        <>
          {/* Today's Workout */}
          <ScrollReveal>
          {todayPlan && !todayPlan.isRestDay ? (
            <div className="bg-gradient-to-br from-[#176B63] to-[#10554F] rounded-2xl p-6 text-white">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">{t("exercise.start", lang)}</p>
              <h2 className="text-xl font-bold mt-1">{todayPlan.dayName} · {todayPlan.focus.replace("_", " ")}</h2>
              <p className="text-sm opacity-80 mt-1">{todayPlan.exercises.length} exercises</p>
              <Link
                href={`/exercise/workout/${today}`}
                className="inline-flex items-center gap-2 mt-4 h-11 px-6 bg-white text-[#176B63] rounded-xl font-semibold text-sm hover:bg-white/90 transition-all"
              >
                ▶ {t("exercise.start", lang)}
              </Link>
            </div>
          ) : todayPlan?.isRestDay ? (
            <div className="bg-[#F5F7FA] rounded-2xl p-6 text-center border border-[#E2E8F0]">
              <span className="text-4xl">😴</span>
              <h2 className="text-lg font-semibold text-[#172033] mt-2">{t("exercise.rest_day", lang)}</h2>
              <p className="text-sm text-[#4B5870] mt-1">{t("exercise.rest_day_desc", lang)}</p>
              <Link href="/exercise/routine" className="inline-block mt-3 text-sm text-[#176B63] font-medium hover:underline">
                View stretching routine →
              </Link>
            </div>
          ) : null}
          </ScrollReveal>

          {/* Weekly Schedule */}
          <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
            {plan.days.map((day) => {
              const isToday = day.day === today
              const isSelected = day.day === selectedDay
              return (
                <Link
                  key={day.day}
                  href={day.isRestDay ? "#" : `/exercise/workout/${day.day}`}
                  onClick={() => setSelectedDay(day.day)}
                  className={`rounded-xl p-3 text-center transition-all ${
                    isToday
                      ? "bg-[#176B63] text-white shadow-md"
                      : isSelected
                        ? "bg-[#176B63]/10 text-[#176B63] border border-[#176B63]/20"
                        : day.isRestDay
                          ? "bg-[#F5F7FA] text-[#4B5870]/40"
                          : "bg-white text-[#4B5870] border border-[#E2E8F0] hover:border-[#176B63]/30"
                  }`}
                >
                  <div className="text-lg">{DAY_ICONS[day.day]}</div>
                  <div className="text-[10px] font-semibold mt-1">{day.dayName.slice(0, 3)}</div>
                  {!day.isRestDay && (
                    <div className="text-[9px] mt-0.5 opacity-70">{day.focus.replace("_", " ")}</div>
                  )}
                  {day.isRestDay && <div className="text-[9px] mt-0.5">Rest</div>}
                </Link>
              )
            })}
          </div>
          </ScrollReveal>

          {/* Session Reports */}
          <SessionReports lang={lang} />
        </>
      ) : null}
    </div>
  )
}

// ─── Session Reports ────────────────────────────────────────────

function SessionReports({ lang }: { lang: Language }) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/exercise/report").then((data: any) => setReports(data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return null

  return reports.length > 0 ? (
    <ScrollReveal delay={0.2}>
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
      <h2 className="text-sm font-semibold text-[#172033] mb-4">{t("report.sessions_done", lang)}</h2>
      <div className="space-y-2">
        {reports.slice(0, 5).map((r: any) => {
          const meta = r.metadata || {}
          return (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-[#E2E8F0]/60 last:border-b-0">
              <div>
                <p className="text-sm text-[#172033]">{meta.dayName || "Session"}</p>
                <p className="text-xs text-[#4B5870]/60">{meta.focus || "full_body"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#176B63]">{meta.overallScore || 0}%</p>
                <p className="text-xs text-[#4B5870]/60">{Math.round((meta.totalDuration || 0) / 60)} min</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </ScrollReveal>
  ) : null
}
