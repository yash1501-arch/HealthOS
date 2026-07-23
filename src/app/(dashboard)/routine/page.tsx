"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"

type LifestyleData = {
  wakeUpTime: string
  bedTime: string
  workType: string
  exerciseFreq: string
  stressLevel: number
}

type RoutineSlot = {
  time: string
  label: string
  icon: string
  duration: string
  tip: string
}

function buildRoutine(lifestyle: LifestyleData | null, goals: string[]): RoutineSlot[] {
  const wakeUp = lifestyle?.wakeUpTime || "07:00"
  const bedTime = lifestyle?.bedTime || "22:30"
  const workType = lifestyle?.workType || "office"
  const isActive = goals.includes("increase_energy") || goals.includes("walk_more")
  const isFlexible = goals.includes("improve_flexibility")

  const routine: RoutineSlot[] = []

  // Wake up
  routine.push({ time: wakeUp, label: "Wake Up", icon: "🌅", duration: "—", tip: "No snooze! Get up when your alarm rings." })

  // Morning routine
  const wakeHour = parseInt(wakeUp.split(":")[0])
  routine.push({
    time: `${wakeHour.toString().padStart(2, "0")}:15`,
    label: "Hydrate & Stretch",
    icon: "💧",
    duration: "10 min",
    tip: "Drink a glass of water, do 5 min of gentle stretching.",
  })
  routine.push({
    time: `${(wakeHour + 1).toString().padStart(2, "0")}:00`,
    label: "Breakfast",
    icon: "🥣",
    duration: "20 min",
    tip: "Include protein and fiber for sustained energy.",
  })

  // Work block
  const workStart = workType === "remote" ? "09:00" : "09:30"
  routine.push({
    time: workStart,
    label: "Work / Focus Block",
    icon: workType === "remote" ? "💻" : "🏢",
    duration: "~4 hours",
    tip: "Use Pomodoro: 25 min focus, 5 min break.",
  })

  // Midday
  routine.push({
    time: "12:30",
    label: "Lunch Break",
    icon: "🥗",
    duration: "45 min",
    tip: "Step away from your desk. A short walk after eating aids digestion.",
  })

  // Afternoon
  if (isActive || isFlexible) {
    routine.push({
      time: "15:00",
      label: "Active Break",
      icon: isFlexible ? "🧘" : "🚶",
      duration: "15 min",
      tip: isFlexible ? "Stretch tight areas — neck, shoulders, hips." : "Walk around the block or climb stairs.",
    })
  }

  // End work
  const workEnd = workType === "remote" ? "17:00" : "18:00"
  routine.push({
    time: workEnd,
    label: "Wind Down Work",
    icon: "✅",
    duration: "—",
    tip: "Shut down devices. Transition from work mode.",
  })

  // Exercise
  if (lifestyle?.exerciseFreq && lifestyle.exerciseFreq !== "never") {
    routine.push({
      time: "18:30",
      label: "Exercise / Movement",
      icon: "🏋️",
      duration: "30-45 min",
      tip: "Exercise earlier in the evening for better sleep quality.",
    })
  }

  // Dinner
  routine.push({
    time: "19:30",
    label: "Dinner",
    icon: "🍽️",
    duration: "30 min",
    tip: "Eat at least 2-3 hours before bed for better sleep.",
  })

  // Evening
  routine.push({
    time: "21:00",
    label: "Evening Wind-Down",
    icon: "📖",
    duration: "60 min",
    tip: "No screens — read, journal, or meditate.",
  })

  // Bedtime
  routine.push({
    time: bedTime,
    label: "Sleep",
    icon: "😴",
    duration: "7-9 hours",
    tip: "Keep bedroom cool, dark, and quiet.",
  })

  return routine
}

export default function RoutinePage() {
  const [lifestyle, setLifestyle] = useState<LifestyleData | null>(null)
  const [goals, setGoals] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<any>("/assessment")
        if (data?.lifestyle) {
          setLifestyle({
            wakeUpTime: data.lifestyle.wakeUpTime || "07:00",
            bedTime: data.lifestyle.bedTime || "22:30",
            workType: data.lifestyle.workType || "office",
            exerciseFreq: data.lifestyle.exerciseFreq || "rarely",
            stressLevel: data.lifestyle.stressLevel || 5,
          })
        }
        setGoals((data?.goals || []).map((g: any) => g.goal))
      } catch {
        // Not available
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const routine = buildRoutine(lifestyle, goals)

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-[#172033]"
      >
        Daily Routine
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="text-sm text-[#4B5870]"
      >
        {lifestyle
          ? "Personalized schedule based on your lifestyle"
          : "Complete your assessment to get a personalized daily routine"}
      </motion.p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[#F5F7FA] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {routine.map((slot, i) => (
            <motion.div
              key={slot.time + slot.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#E2E8F0] hover:border-[#176B63]/20 transition-colors"
            >
              {/* Time */}
              <div className="w-16 text-right shrink-0">
                <span className="text-xs font-mono text-[#4B5870] tabular-nums">{slot.time}</span>
              </div>

              {/* Timeline dot */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${i % 2 === 0 ? "bg-[#176B63]" : "bg-[#476A91]"}`} />
                {i < routine.length - 1 && <div className="w-px h-full min-h-[2rem] bg-[#E2E8F0]" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <span className="text-lg">{slot.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#172033]">{slot.label}</p>
                  <p className="text-xs text-[#4B5870] mt-0.5">{slot.tip}</p>
                </div>
                <span className="text-xs text-[#4B5870]/60 shrink-0">{slot.duration}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
