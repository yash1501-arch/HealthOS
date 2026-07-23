"use client"

import { useState, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { HealthScoreGauge } from "@/components/dashboard/HealthScoreGauge"
import { StatCard } from "@/components/dashboard/StatCard"
import { ActivityChart } from "@/components/dashboard/ActivityChart"
import { LabTrendChart } from "@/components/dashboard/LabTrendChart"
import { RecommendationCard } from "@/components/dashboard/RecommendationCard"
import { PostureSummary } from "@/components/dashboard/PostureSummary"
import { TodayRoutine } from "@/components/dashboard/TodayRoutine"

// ─── Types ───────────────────────────────────────────────────────

type DashboardData = {
  stats: {
    current: Record<string, number | null>
    trends: Record<string, { change: number; period: string } | null>
    streak: { checkinStreak: number; longestStreak: number }
  }
  posture: {
    characteristics: Array<{ characteristic: string; severity: string | null; description: string | null }>
    latestAnalysisDate: string | null
  }
  activity: {
    last7Days: Array<{ date: string; completed: number; planned: number }>
    adherenceRate: number | null
  }
  labTrends: Array<{
    testName: string
    unit: string
    values: Array<{ date: string; value: number | null; isAbnormal: boolean | null }>
    referenceRange: string | null
  }>
  recommendations: Array<{
    category: string
    priority: "high" | "medium" | "low"
    icon: string
    title: string
    description: string
    action: string
  }>
  routine: {
    schedule: Array<{ time: string; activity: string; category: string; duration: number; details: string; tips?: string }> | null
  }
  checkin: {
    latest: {
      weekStart: string
      energyLevel: number | null
      sleepHours: number | null
      sleepQuality: number | null
      mood: number | null
      weightKg: number | null
      dietAdherence: number | null
      exerciseCompletion: number | null
      aiSummary: string | null
      notes: string | null
    } | null
  }
}

type CheckinPayload = {
  energyLevel: number
  sleepHours: number
  sleepQuality: number
  mood: number
  weightKg: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  waterIntakeL: number
  exerciseCompletion: number
  walkingSteps: number
  dietAdherence: number
  notes: string
  painScores: Record<string, number>
}

type CheckinData = {
  latest: any
  history: any[]
  painAreas: { area: string; severity: number }[]
  canCheckin: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

// ─── Check-in Form Constants ──────────────────────────────────────

const CHECKIN_FIELDS: {
  key: keyof CheckinPayload
  label: string
  min: number
  max: number
  unit: string
  step?: number
}[] = [
  { key: "energyLevel", label: "Energy Level", min: 1, max: 10, unit: "/10" },
  { key: "sleepHours", label: "Sleep Hours", min: 0, max: 24, unit: "h", step: 0.5 },
  { key: "sleepQuality", label: "Sleep Quality", min: 1, max: 10, unit: "/10" },
  { key: "mood", label: "Mood", min: 1, max: 10, unit: "/10" },
  { key: "weightKg", label: "Weight", min: 20, max: 500, unit: "kg", step: 0.1 },
  { key: "bloodPressureSystolic", label: "BP Systolic", min: 60, max: 250, unit: "mmHg", step: 1 },
  { key: "bloodPressureDiastolic", label: "BP Diastolic", min: 30, max: 150, unit: "mmHg", step: 1 },
  { key: "waterIntakeL", label: "Water Intake", min: 0, max: 20, unit: "L", step: 0.1 },
  { key: "exerciseCompletion", label: "Exercise Done", min: 0, max: 100, unit: "%", step: 1 },
  { key: "walkingSteps", label: "Daily Steps", min: 0, max: 100000, unit: "steps", step: 100 },
  { key: "dietAdherence", label: "Diet Adherence", min: 0, max: 100, unit: "%", step: 1 },
]

// ─── Main Dashboard ──────────────────────────────────────────────

export default function DashboardPage() {
  const [showCheckin, setShowCheckin] = useState(false)
  const queryClient = useQueryClient()

  // ─── Fetch dashboard data ─────────────────────────────────────

  const { data: dashData, isPending: dashPending } = useQuery<DashboardData>({
    queryKey: ["dashboard-data"],
    queryFn: () => api.get("/dashboard/data"),
    staleTime: 2 * 60 * 1000, // 2 min cache
  })

  const { data: checkinData } = useQuery<CheckinData>({
    queryKey: ["checkin-data"],
    queryFn: () => api.get("/checkin"),
    staleTime: 5 * 60 * 1000,
  })

  const canCheckin = checkinData?.canCheckin ?? true
  const latestCheckin = checkinData?.latest
  const painAreas = checkinData?.painAreas ?? []

  // ─── Derived values ───────────────────────────────────────────

  const healthScore = dashData?.stats?.current?.healthScore ?? 0
  const streak = dashData?.stats?.streak
  const hasAnyData = !!(
    dashData?.stats?.current?.weightKg ||
    dashData?.posture?.characteristics?.length ||
    dashData?.labTrends?.length ||
    dashData?.recommendations?.length ||
    latestCheckin
  )

  // Check if user has enough data for the full dashboard
  const isNewUser = !dashPending && !hasAnyData && !latestCheckin

  // ─── Computed trend for health score ──────────────────────────

  const healthScoreTrend = useMemo<"improving" | "stable" | "declining" | null>(() => {
    const trend = dashData?.stats?.trends?.healthScore
    if (!trend) return null
    if (trend.change > 3) return "improving"
    if (trend.change < -3) return "declining"
    return "stable"
  }, [dashData?.stats?.trends?.healthScore])

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">Dashboard</h1>                      <p className="text-sm text-[#4B5870]">Welcome back! Here is your health overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="h-10 px-4 border border-[#E2E8F0] text-[#4B5870] rounded-xl text-sm font-medium hover:bg-[#F8F9FB] hover:text-[#172033] transition-all"
          >
            📄 Upload Medical Report
          </Link>
          <button
            onClick={() => setShowCheckin(true)}
            disabled={!canCheckin}
            className="h-10 px-4 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {canCheckin ? "📋 Weekly Check-in" : "✅ Checked in"}
          </button>
        </div>
      </motion.div>

      {/* ── Streak Bar ──────────────────────────────────────── */}
      {streak && streak.checkinStreak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-2 text-sm text-[#4B5870]"
        >
          <span className="text-lg">🔥</span>
          <span>
            <strong className="text-[#172033]">{streak.checkinStreak} week streak</strong>
            {streak.longestStreak > streak.checkinStreak && (
              <> · Best: {streak.longestStreak} weeks</>
            )}
          </span>
        </motion.div>
      )}

      {/* ── Main Dashboard Grid ─────────────────────────────── */}
      {isNewUser ? (
        <NewUserOnboarding onStartCheckin={() => setShowCheckin(true)} />
      ) : (
        <div className="space-y-6">
          {/* ── Row 1: Health Score Gauge + Stat Cards (2x2) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <HealthScoreGauge
                score={healthScore}
                breakdown={dashData?.stats?.current?.healthScore != null ? {
                  posture: dashData?.posture?.characteristics?.length
                    ? Math.max(50 - dashData.posture.characteristics.reduce((s, c) => {
                        if (c.severity?.includes("severe")) return s + 15
                        if (c.severity?.includes("moderate")) return s + 10
                        if (c.severity?.includes("mild")) return s + 5
                        return s
                      }, 0), 20)
                    : dashData?.posture?.characteristics ? 70 : 0,
                  nutrition: 60,
                  activity: dashData?.activity?.adherenceRate ?? 50,
                  sleep: dashData?.stats?.current?.avgSleepHours
                    ? Math.min(100, Math.round((Number(dashData.stats.current.avgSleepHours) / 8) * 100))
                    : 0,
                  stress: dashData?.stats?.current?.healthScore
                    ? Math.max(0, 100 - (dashData.stats.current.healthScore > 50 ? 0 : 30))
                    : 0,
                  vision: 60,
                  labs: dashData?.labTrends?.length
                    ? Math.min(100, 50 + dashData.labTrends.length * 5)
                    : 0,
                } as const : null}
                trend={healthScoreTrend}
                loading={dashPending}
              />
            </div>

            <div className="lg:col-span-2 grid grid-cols-2 gap-3">
              <StatCard
                icon="⚖️"
                label="Weight"
                value={dashData?.stats?.current?.weightKg ?? null}
                unit="kg"
                trend={dashData?.stats?.trends?.weightKg ? {
                  value: Math.abs(dashData.stats.trends.weightKg.change),
                  isPositive: (dashData.stats.trends.weightKg.change || 0) < 0,
                  period: dashData.stats.trends.weightKg.period,
                } : null}
                variant="default"
                loading={dashPending}
              />
              <StatCard
                icon="📐"
                label="BMI"
                value={dashData?.stats?.current?.bmi ?? null}
                unit=""
                variant={
                  dashData?.stats?.current?.bmi != null
                    ? (dashData.stats.current.bmi >= 18.5 && dashData.stats.current.bmi <= 24.9
                      ? "positive"
                      : "negative")
                    : "default"
                }
                loading={dashPending}
              />
              <StatCard
                icon="🔥"
                label="Streak"
                value={streak?.checkinStreak ?? 0}
                unit={streak?.checkinStreak === 1 ? "week" : "weeks"}
                variant={streak?.checkinStreak ? "positive" : "default"}
                loading={dashPending}
              />
              <StatCard
                icon="📅"
                label="Last Check-in"
                value={latestCheckin != null && latestCheckin.weekStart
                  ? new Date(latestCheckin.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : null}
                unit=""
                trend={null}
                variant={latestCheckin ? "neutral" : "default"}
                loading={dashPending}
              />
            </div>
          </div>

          {/* ── Row 2: Posture + Activity ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PostureSummary
              characteristics={dashData?.posture?.characteristics ?? null}
              latestAnalysisDate={dashData?.posture?.latestAnalysisDate ?? null}
              loading={dashPending}
            />
            <ActivityChart
              data={dashData?.activity?.last7Days}
              loading={dashPending}
            />
          </div>

          {/* ── Row 3: Lab Trends ────────────────────────────── */}
          <LabTrendChart
            labTrends={dashData?.labTrends}
            loading={dashPending}
          />

          {/* ── Row 4: Recommendations ───────────────────────── */}
          {dashData?.recommendations && dashData.recommendations.length > 0 && (
            <ScrollReveal delay={0.1}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#172033]">Top Recommendations</h2>
                    <p className="text-xs text-[#4B5870]">Personalized based on your health data</p>
                  </div>
                  <Link
                    href="/goals"
                    className="text-xs font-medium text-[#176B63] hover:text-[#10554F] transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dashData.recommendations.slice(0, 3).map((rec, i) => (
                    <RecommendationCard key={`${rec.category}-${i}`} recommendation={rec} index={i} />
                  ))}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Link
                    href="/ai/recommendation"
                    className="h-9 px-4 bg-[#176B63] text-white rounded-lg text-xs font-medium hover:bg-[#10554F] transition-all inline-flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    Generate New Recommendations
                  </Link>
                  <Link
                    href="/reports"
                    className="h-9 px-4 border border-[#E2E8F0] text-[#4B5870] rounded-lg text-xs font-medium hover:bg-[#F8F9FB] hover:text-[#172033] transition-all inline-flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                    </svg>
                    Upload Medical Report
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ── Row 5: Today's Routine + Check-in Summary ────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TodayRoutine
              schedule={dashData?.routine?.schedule}
              loading={dashPending}
            />

            {/* Latest Check-in Summary */}
            {dashData?.checkin?.latest ? (
              <ScrollReveal delay={0.2}>
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#172033]">Latest Check-in</h3>
                      <p className="text-xs text-[#4B5870]">
                        {new Date(dashData.checkin.latest.weekStart).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="text-2xl">📋</span>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-2 rounded-lg bg-[#F8F9FB]">
                      <p className="text-lg font-bold text-[#176B63] tabular-nums">
                        {dashData.checkin.latest.energyLevel ?? "—"}
                      </p>
                      <p className="text-[10px] text-[#4B5870]">Energy</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-[#F8F9FB]">
                      <p className="text-lg font-bold text-[#6B4C8A] tabular-nums">
                        {dashData.checkin.latest.sleepHours ?? "—"}h
                      </p>
                      <p className="text-[10px] text-[#4B5870]">Sleep</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-[#F8F9FB]">
                      <p className="text-lg font-bold text-[#9B651B] tabular-nums">
                        {dashData.checkin.latest.mood ?? "—"}
                      </p>
                      <p className="text-[10px] text-[#4B5870]">Mood</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-[#F8F9FB]">
                      <p className="text-lg font-bold text-[#B53A45] tabular-nums">
                        {dashData.checkin.latest.dietAdherence ?? "—"}%
                      </p>
                      <p className="text-[10px] text-[#4B5870]">Diet</p>
                    </div>
                  </div>

                  {/* AI Summary */}
                  {dashData.checkin.latest.aiSummary && (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-[#176B63]/5 to-transparent border border-[#176B63]/10">
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">🤖</span>
                        <div>
                          <p className="text-[11px] font-medium text-[#172033] mb-0.5">AI Summary</p>
                          <p className="text-[11px] text-[#4B5870] leading-relaxed">
                            {dashData.checkin.latest.aiSummary}
                          </p>
                          <p className="text-[9px] text-[#4B5870]/40 mt-1">
                            This is an AI-generated summary and not medical advice
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {dashData.checkin.latest.notes && (
                    <div className="mt-3 p-2.5 rounded-lg bg-[#F8F9FB]">
                      <p className="text-[10px] font-medium text-[#4B5870] mb-0.5">Notes</p>
                      <p className="text-[11px] text-[#4B5870]">{dashData.checkin.latest.notes}</p>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ) : (
              <ScrollReveal delay={0.2}>
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 h-full">
                  <div className="flex flex-col items-center justify-center h-full py-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-[#176B63]/5 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-[#176B63]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                    </div>
                    <p className="text-sm text-[#4B5870]">No check-ins yet</p>
                    <p className="text-xs text-[#4B5870]/60 mt-1">
                      Complete your first check-in to track weekly progress
                    </p>
                    <button
                      onClick={() => setShowCheckin(true)}
                      className="mt-4 h-9 px-4 bg-[#176B63] text-white rounded-lg text-xs font-medium hover:bg-[#10554F] transition-all"
                    >
                      Start Check-in
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>
      )}

      {/* ── Check-in Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showCheckin && (
          <CheckinModal
            painAreas={painAreas}
            onClose={() => setShowCheckin(false)}
            onSubmitted={() => {
              setShowCheckin(false)
              queryClient.invalidateQueries({ queryKey: ["dashboard-data"] })
              queryClient.invalidateQueries({ queryKey: ["checkin-data"] })
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── New User Onboarding ─────────────────────────────────────────

function NewUserOnboarding({ onStartCheckin }: { onStartCheckin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center max-w-lg mx-auto"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#176B63] to-[#10554F] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#176B63]/20">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-[#172033] mb-2">Welcome to HealthOS</h2>
      <p className="text-sm text-[#4B5870] mb-6 max-w-sm mx-auto">
        Start tracking your health journey. Complete your first check-in to see personalized insights, recommendations, and progress tracking.
      </p>
      <div className="space-y-3">
        <button
          onClick={onStartCheckin}
          className="w-full h-11 px-6 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all shadow-sm"
        >
          📋 Start First Check-in
        </button>
        <Link
          href="/assessment"
          className="block w-full h-11 px-6 border border-[#E2E8F0] text-[#4B5870] rounded-xl text-sm font-medium hover:bg-[#F8F9FB] hover:text-[#172033] transition-all leading-[44px]"
        >
          👤 Complete Health Assessment
        </Link>
        <Link
          href="/vision"
          className="block w-full h-11 px-6 border border-[#E2E8F0] text-[#4B5870] rounded-xl text-sm font-medium hover:bg-[#F8F9FB] hover:text-[#172033] transition-all leading-[44px]"
        >
          📸 Scan Your Posture
        </Link>
      </div>
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-[#E2E8F0] text-[10px] text-[#4B5870]/60">
        <span>⚡ Personalized plans</span>
        <span>📊 Track progress</span>
        <span>🤖 AI insights</span>
      </div>
    </motion.div>
  )
}

// ─── Progress Charts (from original dashboard) ────────────────────

function ProgressCharts({ history }: { history: any[] }) {
  const reversed = [...history].reverse()
  const weeks = reversed.slice(-8)

  const metrics = [
    { key: "weightKg", label: "Weight", unit: "kg", color: "#176B63", decimals: 1 },
    { key: "sleepHours", label: "Sleep", unit: "h", color: "#476A91", decimals: 1 },
    { key: "mood", label: "Mood", unit: "/10", color: "#9B651B", decimals: 0 },
    { key: "energyLevel", label: "Energy", unit: "/10", color: "#176B63", decimals: 0 },
    { key: "bloodPressureSystolic", label: "BP Systolic", unit: "", color: "#B53A45", decimals: 0 },
    { key: "bloodPressureDiastolic", label: "BP Diastolic", unit: "", color: "#476A91", decimals: 0 },
  ] as const

  const weekLabels = weeks.map((w: any) => {
    const d = new Date(w.weekStart)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {metrics.map((metric) => {
        const values = weeks.map((w: any) => {
          const v = w[metric.key]
          return v !== null && v !== undefined ? Number(v) : null
        })
        const maxVal = Math.max(...values.filter((v): v is number => v !== null), 1)
        const minVal = Math.min(...values.filter((v): v is number => v !== null), 0)
        const range = maxVal - minVal || 1

        return (
          <div key={metric.key}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#4B5870]">{metric.label}</span>
              <span className="text-xs text-[#4B5870]/60">
                {values.filter((v) => v !== null).length > 0 && (
                  <>
                    <span className="font-semibold" style={{ color: metric.color }}>
                      {values.filter((v): v is number => v !== null).pop()?.toFixed(metric.decimals) ?? "—"}
                    </span>
                    {metric.unit}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-end gap-1 h-24">
              {values.map((val, i) => {
                const height = val !== null ? ((val - minVal) / range) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      className="w-full rounded-t-sm transition-all duration-500"
                      style={{
                        height: `${Math.max(height, 4)}%`,
                        backgroundColor: val !== null ? metric.color : "#E2E8F0",
                        opacity: val !== null ? 0.7 + (height / 100) * 0.3 : 0.3,
                      }}
                      title={val !== null ? `${metric.label}: ${val.toFixed(metric.decimals)}${metric.unit}` : "No data"}
                    />
                    <span className="text-[8px] text-[#4B5870]/40 leading-none">{weekLabels[i]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Check-in Modal (from original dashboard) ─────────────────────

function CheckinModal({
  painAreas,
  onClose,
  onSubmitted,
}: {
  painAreas: { area: string; severity: number }[]
  onClose: () => void
  onSubmitted: () => void
}) {
  const [form, setForm] = useState<CheckinPayload>({
    energyLevel: 5,
    sleepHours: 7,
    sleepQuality: 5,
    mood: 5,
    weightKg: 0,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    waterIntakeL: 2,
    exerciseCompletion: 50,
    walkingSteps: 5000,
    dietAdherence: 50,
    notes: "",
    painScores: Object.fromEntries(painAreas.map((p) => [p.area, p.severity])),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"checkin" | "pain" | "done">("checkin")

  function update(key: keyof CheckinPayload, value: number | string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updatePain(area: string, value: number) {
    setForm((prev) => ({
      ...prev,
      painScores: { ...prev.painScores, [area]: value },
    }))
  }

  async function handleSubmit() {
    setSaving(true)
    setError("")
    try {
      await api.post("/checkin", {
        energyLevel: form.energyLevel,
        sleepHours: form.sleepHours,
        sleepQuality: form.sleepQuality,
        mood: form.mood,
        weightKg: form.weightKg > 0 ? form.weightKg : undefined,
        bloodPressureSystolic: form.bloodPressureSystolic > 0 ? form.bloodPressureSystolic : undefined,
        bloodPressureDiastolic: form.bloodPressureDiastolic > 0 ? form.bloodPressureDiastolic : undefined,
        waterIntakeL: form.waterIntakeL,
        exerciseCompletion: form.exerciseCompletion,
        walkingSteps: form.walkingSteps,
        dietAdherence: form.dietAdherence,
        notes: form.notes || undefined,
        painScores: Object.keys(form.painScores).length > 0 ? form.painScores : undefined,
      })
      setStep("done")
      setTimeout(onSubmitted, 1500)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || "Failed to save check-in")
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-4 pt-10 overflow-y-auto backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="bg-white rounded-2xl border border-[#E2E8F0] w-full max-w-lg shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-lg font-semibold text-[#172033]">
              {step === "pain" ? "Pain Scores" : step === "done" ? "Done!" : "Weekly Check-in"}
            </h2>
            <p className="text-xs text-[#4B5870] mt-0.5">
              {step === "checkin" && "How was your week?"}
              {step === "pain" && "Update your pain levels"}
              {step === "done" && "Your check-in has been saved"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[#4B5870]/40 hover:text-[#172033]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {step === "done" ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-[#176B63]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-[#172033] font-medium">Check-in complete!</p>
            <p className="text-xs text-[#4B5870] mt-1">Your streak is growing 🔥</p>
          </div>
        ) : (
          <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="bg-[#B53A45]/5 border border-[#B53A45]/10 text-[#B53A45] text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            {step === "checkin" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {CHECKIN_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="flex items-center justify-between text-xs font-medium text-[#4B5870] mb-1.5">
                        <span>{field.label}</span>
                        <span className="text-[#176B63] font-semibold tabular-nums">
                          {Number(form[field.key] as number).toLocaleString("en-US", {
                            maximumFractionDigits: field.step === 0.1 ? 1 : 0,
                          })}
                          {field.unit !== "/10" && field.unit !== "%" ? ` ${field.unit}` : ""}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={field.min}
                        max={field.max}
                        step={field.step || 1}
                        value={form[field.key] as number}
                        onChange={(e) => update(field.key, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none cursor-pointer accent-[#176B63]"
                      />
                      <div className="flex justify-between text-[10px] text-[#4B5870]/40 mt-0.5">
                        <span>{field.min}</span>
                        <span>{field.max}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4B5870] mb-1.5">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10 resize-none"
                    placeholder="Anything notable this week?"
                    maxLength={1000}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={onClose} className="px-4 h-10 text-sm text-[#4B5870] hover:text-[#172033]">
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep("pain")}
                    className="px-5 h-10 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all"
                  >
                    Next: Pain Scores →
                  </button>
                </div>
              </>
            )}

            {step === "pain" && (
              <>
                {painAreas.length === 0 ? (
                  <p className="text-sm text-[#4B5870] text-center py-4">
                    No pain areas recorded in your assessment.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {painAreas.map((area) => (
                      <div key={area.area}>
                        <label className="flex items-center justify-between text-sm text-[#172033] mb-1.5">
                          <span className="font-medium capitalize">{area.area}</span>
                          <span className="text-[#B53A45] font-semibold tabular-nums">
                            {form.painScores[area.area] ?? area.severity}/10
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={form.painScores[area.area] ?? area.severity}
                          onChange={(e) => updatePain(area.area, parseInt(e.target.value))}
                          className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none cursor-pointer accent-[#B53A45]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep("checkin")}
                    className="px-4 h-10 text-sm text-[#4B5870] hover:text-[#172033]"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-6 h-10 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all"
                  >
                    {saving ? "Saving..." : "Save Check-in ✓"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
