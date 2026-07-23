"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { generateWorkoutPlan } from "@/lib/workout-plans"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

type HealthPlan = {
  profile: any
  goals: any[]
  painAreas: any[]
  diet: any
  medications: any[]
  workout: any
  recommendations: any[]
}

const EASE = [0.16, 1, 0.3, 1] as const

export default function HealthPlanPage() {
  const [plan, setPlan] = useState<HealthPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const [assessment, diet, meds, recs] = await Promise.all([
          api.get<any>("/assessment").catch(() => ({})),
          api.get<any>("/diet/plan").catch(() => null),
          api.get<{ medications: any[] }>("/medications").catch(() => ({ medications: [] })),
          api.get<any[]>("/recommendations").catch(() => []),
        ])

        const profile = assessment?.profile || {}
        const goals = assessment?.goals || []
        const painAreas = (assessment?.painAssessments || []).map((p: any) => p.bodyArea)
        const medications = meds?.medications || []

        const workout = generateWorkoutPlan(
          goals.map((g: any) => g.goal),
          "beginner",
          painAreas
        )

        setPlan({ profile, goals, painAreas, diet, medications, workout, recommendations: recs || [] })

        // Stagger the reveal
        const interval = setInterval(() => {
          setStep((s) => { if (s < 4) return s + 1; clearInterval(interval); return s })
        }, 400)
      } catch { /* no data */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-4 pt-8">
      {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-[#F5F7FA] animate-pulse" />)}
    </div>
  )

  if (!plan) return (
    <div className="max-w-3xl mx-auto text-center pt-16">
      <h1 className="text-2xl font-bold text-[#172033]">Complete your assessment first</h1>
      <p className="text-sm text-[#4B5870] mt-2">We need your health data to create a personalized plan.</p>
      <Link href="/assessment" className="inline-block mt-6 h-11 px-6 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all">
        Take Assessment →
      </Link>
    </div>
  )

  const today = new Date().getDay()
  const todayWorkout = plan.workout?.days?.find((d: any) => d.day === today)
  const todayDiet = plan.diet?.days?.[today > 0 ? today - 1 : 0]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
        <h1 className="text-3xl font-bold text-[#172033]">Your Health Plan</h1>
        <p className="text-sm text-[#4B5870] mt-1">
          Personalized for {plan.profile?.fullName || "you"} · Based on your assessment
        </p>
      </motion.div>

      {/* Step 0: Summary Card */}
      {step >= 0 && (
        <ScrollReveal>
        <motion.div className="bg-gradient-to-br from-[#176B63] to-[#10554F] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎯</span>
            <span className="text-xs font-medium uppercase tracking-wider opacity-80">Your Goals</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {plan.goals.length > 0 ? plan.goals.map((g: any, i: number) => (
              <span key={i} className="px-3 py-1 bg-white/20 rounded-full text-sm">{g.goal}</span>
            )) : <span className="text-sm opacity-80">No goals set yet</span>}
          </div>
          {plan.painAreas.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm opacity-80">
              <span>⚠️</span>
              <span>Focus areas: {plan.painAreas.join(", ")}</span>
            </div>
          )}
        </motion.div>
        </ScrollReveal>
      )}

      {/* Step 1: Today's Action */}
      {step >= 1 && (
        <ScrollReveal delay={0.1}>
        <motion.div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <h2 className="text-lg font-semibold text-[#172033] mb-4">📍 Today's Plan</h2>

          {/* Diet */}
          {todayDiet && (
            <div className="flex items-start gap-4 p-3 bg-[#F5F7FA] rounded-xl mb-2">
              <span className="text-2xl">🥗</span>
              <div>
                <p className="text-sm font-medium text-[#172033]">Today's Meals</p>
                <p className="text-xs text-[#4B5870] mt-0.5">
                  {Object.values(todayDiet.meals || {}).map((m: any) => m.name).join(", ")}
                </p>
                <Link href="/diet" className="text-xs text-[#176B63] font-medium mt-1 inline-block hover:underline">
                  View full meal plan →
                </Link>
              </div>
            </div>
          )}

          {/* Exercise */}
          {todayWorkout && !todayWorkout.isRestDay && (
            <div className="flex items-start gap-4 p-3 bg-[#F5F7FA] rounded-xl mb-2">
              <span className="text-2xl">🏋️</span>
              <div>
                <p className="text-sm font-medium text-[#172033]">{todayWorkout.dayName}: {todayWorkout.focus}</p>
                <p className="text-xs text-[#4B5870] mt-0.5">{todayWorkout.exercises.length} exercises</p>
                <Link href={`/exercise/workout/${today}`} className="text-xs text-[#176B63] font-medium mt-1 inline-block hover:underline">
                  Start workout →
                </Link>
              </div>
            </div>
          )}
          {todayWorkout?.isRestDay && (
            <div className="flex items-start gap-4 p-3 bg-[#F5F7FA] rounded-xl mb-2">
              <span className="text-2xl">😴</span>
              <div>
                <p className="text-sm font-medium text-[#172033]">Rest Day</p>
                <p className="text-xs text-[#4B5870] mt-0.5">Your body needs recovery. Light stretching recommended.</p>
              </div>
            </div>
          )}

          {/* Medications */}
          {plan.medications.length > 0 && (
            <div className="flex items-start gap-4 p-3 bg-[#F5F7FA] rounded-xl">
              <span className="text-2xl">💊</span>
              <div>
                <p className="text-sm font-medium text-[#172033]">Today's Medications ({plan.medications.length})</p>
                <p className="text-xs text-[#4B5870] mt-0.5">{plan.medications.map((m: any) => m.name).join(", ")}</p>
                <Link href="/medications" className="text-xs text-[#176B63] font-medium mt-1 inline-block hover:underline">
                  Log medications →
                </Link>
              </div>
            </div>
          )}
        </motion.div>
        </ScrollReveal>
      )}

      {/* Step 2: Diet */}
      {step >= 2 && plan.diet && (
        <ScrollReveal delay={0.2}>
        <Link href="/diet" className="block bg-white rounded-2xl border border-[#E2E8F0] p-6 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#172033]">🥗 Meal Plan</h2>
            <span className="text-xs text-[#4B5870]">{plan.diet.days?.length || 0} days</span>
          </div>
          <div className="space-y-2">
            {plan.diet.days?.slice(0, 3).map((day: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-[#E2E8F0]/60 last:border-b-0">
                <span className="text-[#4B5870]">{day.dayName}</span>
                <span className="text-[#172033] font-medium">{day.meals?.breakfast?.name} → {day.meals?.lunch?.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#176B63] font-medium mt-3">View full meal plan →</p>
        </Link>
        </ScrollReveal>
      )}

      {/* Step 3: Workout */}
      {step >= 3 && (
        <ScrollReveal delay={0.3}>
        <Link href="/exercise" className="block bg-white rounded-2xl border border-[#E2E8F0] p-6 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#172033]">💪 Weekly Workout</h2>
            <span className="text-xs text-[#4B5870]">{plan.workout?.difficulty || "beginner"}</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {plan.workout?.days?.map((day: any, i: number) => (
              <div key={i} className={`text-center p-2 rounded-lg text-[10px] ${day.isRestDay ? "bg-[#F5F7FA] text-[#4B5870]/40" : day.day === today ? "bg-[#176B63] text-white" : "bg-[#176B63]/5 text-[#4B5870]"}`}>
                <div>{day.dayName.slice(0, 3)}</div>
                {!day.isRestDay && <div className="font-semibold mt-0.5">{day.focus?.slice(0, 3)}</div>}
                {day.isRestDay && <div className="mt-0.5">Rest</div>}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#176B63] font-medium mt-3">View workout plan →</p>
        </Link>
        </ScrollReveal>
      )}

      {/* Step 4: Recommendations */}
      {step >= 4 && plan.recommendations.length > 0 && (
        <ScrollReveal delay={0.4}>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <h2 className="text-lg font-semibold text-[#172033] mb-3">💡 Recommendations</h2>
          <div className="space-y-2">
            {plan.recommendations.slice(0, 4).map((rec: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${rec.priority === "high" ? "bg-[#B53A45]/5 border border-[#B53A45]/10" : "bg-[#F5F7FA]"}`}>
                <span className="text-lg">{rec.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[#172033]">{rec.title}</p>
                  <p className="text-xs text-[#4B5870] mt-0.5">{rec.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </ScrollReveal>
      )}

      {/* Bottom CTA */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center pb-8">
        <p className="text-xs text-[#4B5870]/60 mb-4">Your plan is generated from your assessment. Update your assessment anytime to recalculate.</p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 h-11 px-6 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all">
          Go to Dashboard →
        </Link>
      </motion.div>
    </div>
  )
}
