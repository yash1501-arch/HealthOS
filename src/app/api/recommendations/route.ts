import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"

type Recommendation = {
  category: string
  priority: "high" | "medium" | "low"
  icon: string
  title: string
  description: string
  action: string
}

// ─── GET /api/recommendations ────────────────────────────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const [profile, lifestyle, nutrition, medicalHistory, painAssessments, goals] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.lifestyle.findUnique({ where: { userId } }),
      prisma.nutritionProfile.findUnique({ where: { userId } }),
      prisma.medicalHistory.findUnique({ where: { userId } }),
      prisma.painAssessment.findMany({ where: { userId, isActive: true } }),
      prisma.goal.findMany({ where: { userId, isActive: true }, orderBy: { priority: "asc" } }),
    ])

    const recs: Recommendation[] = []

    // Pain-based recommendations
    for (const pain of painAssessments) {
      if (pain.severity >= 7) {
        recs.push({
          category: "pain",
          priority: "high",
          icon: "🩺",
          title: `${capitalize(pain.bodyArea)} pain needs attention`,
          description: `Your ${pain.bodyArea} pain severity is ${pain.severity}/10.`,
          action: "Consult a healthcare provider — consider seeing a physiotherapist or orthopedist.",
        })
      } else if (pain.severity >= 4) {
        recs.push({
          category: "pain",
          priority: "medium",
          icon: "🧘",
          title: `Manage ${capitalize(pain.bodyArea)} discomfort`,
          description: `Moderate ${pain.bodyArea} pain (${pain.severity}/10) detected.`,
          action: `Try targeted ${pain.bodyArea} exercises and ergonomic adjustments. Check the Exercise page for routines.`,
        })
      }
    }

    // Sleep recommendations
    const sleepHours = lifestyle?.avgSleepHours ? Number(lifestyle.avgSleepHours) : null
    if (sleepHours !== null) {
      if (sleepHours < 6) {
        recs.push({
          category: "sleep",
          priority: "high",
          icon: "😴",
          title: "Sleep duration is too low",
          description: `You're averaging ${sleepHours}h of sleep — below the recommended 7-9h.`,
          action: "Set a consistent bedtime, reduce screen time 1h before bed, and avoid caffeine after 4 PM.",
        })
      } else if (sleepHours < 7) {
        recs.push({
          category: "sleep",
          priority: "medium",
          icon: "💤",
          title: "Try to get more sleep",
          description: `${sleepHours}h is slightly below the ideal range.`,
          action: "Aim for 30 min more sleep by winding down 30 min earlier.",
        })
      }
    }

    // Water intake recommendation
    const waterIntake = lifestyle?.waterIntakeL ? Number(lifestyle.waterIntakeL) : null
    if (waterIntake !== null && waterIntake < 1.5) {
      recs.push({
        category: "hydration",
        priority: "medium",
        icon: "💧",
        title: "Increase water intake",
        description: `You're drinking ${waterIntake}L/day. Aim for 2-2.5L.`,
        action: "Keep a water bottle at your desk and set hourly reminders.",
      })
    }

    // Stress recommendation
    const stressLevel = lifestyle?.stressLevel ?? null
    if (stressLevel !== null && stressLevel >= 7) {
      recs.push({
        category: "stress",
        priority: "high",
        icon: "🧠",
        title: "Stress level is high",
        description: `Self-reported stress: ${stressLevel}/10.`,
        action: "Try deep breathing (4-7-8 technique), daily 10 min meditation, or a short walk during breaks.",
      })
    }

    // Exercise frequency
    const exerciseFreq = lifestyle?.exerciseFreq ?? null
    if (exerciseFreq === "never" || exerciseFreq === "rarely") {
      recs.push({
        category: "exercise",
        priority: "medium",
        icon: "🚶",
        title: "Add more movement to your day",
        description: `Exercise frequency: ${exerciseFreq}.`,
        action: "Start with 10-15 min walks daily. Any movement is better than none!",
      })
    }

    // Screen time
    const screenTime = lifestyle?.screenTimeHours ? Number(lifestyle.screenTimeHours) : null
    if (screenTime !== null && screenTime > 8) {
      recs.push({
        category: "screen",
        priority: "medium",
        icon: "👁️",
        title: "Reduce screen time",
        description: `${screenTime}h/day of screen time is high.`,
        action: "Follow the 20-20-20 rule: every 20 min, look at something 20 feet away for 20 seconds.",
      })
    }

    // Sitting time
    const lifestyleAny = lifestyle as Record<string, unknown> | null
    const sittingHours = lifestyleAny?.sittingHours ?? null
    if (sittingHours !== null) {
      const sitVal = Number(sittingHours)
      if (sitVal > 6) {
        recs.push({
          category: "ergonomics",
          priority: "medium",
          icon: "🪑",
          title: "Reduce prolonged sitting",
          description: `You sit for ${sitVal}h/day.`,
          action: "Stand up and stretch for 2 min every hour. Consider a standing desk.",
        })
      }
    }

    // Goal-based
    if (goals.length === 0) {
      recs.push({
        category: "goals",
        priority: "medium",
        icon: "🎯",
        title: "Set health goals",
        description: "You haven't set any health goals yet.",
        action: "Complete the assessment to set personalized health goals.",
      })
    }

    // Smoking
    if (lifestyle?.smoking === "regularly") {
      recs.push({
        category: "lifestyle",
        priority: "high",
        icon: "🚭",
        title: "Consider quitting smoking",
        description: "Smoking significantly impacts long-term health.",
        action: "Talk to your doctor about cessation programs and nicotine replacement options.",
      })
    }

    // Sort by priority
    recs.sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 }
      return rank[a.priority] - rank[b.priority]
    })

    return NextResponse.json({ data: recs })
  } catch (error) {
    console.error("Recommendations error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

function unauth() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
    { status: 401 }
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
