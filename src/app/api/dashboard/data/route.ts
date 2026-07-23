import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"

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
    schedule: Array<{ time: string; activity: string; category: string; duration: number; details: string }> | null
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

// ─── GET /api/dashboard/data ─────────────────────────────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const today = new Date()
    const todayDayOfWeek = today.getDay() // 0 = Sun

    // Fetch all data in parallel
    const [
      profile,
      lifestyle,
      painAssessments,
      checkins,
      postureChars,
      latestPostureAnalysis,
      weeklyCheckinLatest,
      recommendations,
      routines,
      labResults,
      exercisePlans,
    ] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.lifestyle.findUnique({ where: { userId } }),
      prisma.painAssessment.findMany({ where: { userId, isActive: true }, select: { severity: true } }),
      prisma.weeklyCheckin.findMany({ where: { userId }, orderBy: { weekStart: "desc" }, take: 8 }) as Promise<any[]>,
      prisma.postureCharacteristic.findMany({
        where: { userId, isActive: true },
        select: { characteristic: true, severity: true, description: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.visionAnalysis.findFirst({
        where: { userId, status: "completed" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.weeklyCheckin.findFirst({
        where: { userId, aiSummary: { not: null } },
        orderBy: { weekStart: "desc" },
        select: {
          weekStart: true,
          energyLevel: true,
          sleepHours: true,
          sleepQuality: true,
          mood: true,
          weightKg: true,
          dietAdherence: true,
          exerciseCompletion: true,
          aiSummary: true,
          notes: true,
        },
      }),
      prisma.recommendation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { suggestions: true, redFlags: true },
      }),
      prisma.routine.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { schedule: true, dayOfWeek: true },
      }),
      prisma.labResult.findMany({
        where: { userId },
        orderBy: { testDate: "asc" },
        select: { testName: true, value: true, unit: true, isAbnormal: true, testDate: true, referenceRange: true },
      }),
      prisma.exercisePlan.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { weekStart: true, weekEnd: true, warmUp: true, strength: true, walking: true, yoga: true },
      }),
    ])

    // ─── 1. Compute Stats ──────────────────────────────────────

    const weightKg = profile?.weightKg ? Number(profile.weightKg) : null
    const heightCm = profile?.heightCm ? Number(profile.heightCm) : null
    const bmi = weightKg !== null && heightCm !== null
      ? Math.round((weightKg / ((heightCm / 100) * (heightCm / 100))) * 10) / 10
      : null

    const avgPainScore = painAssessments.length > 0
      ? Math.round((painAssessments.reduce((sum, pa) => sum + pa.severity, 0) / painAssessments.length) * 10) / 10
      : null

    const latestCheckin = checkins[0]
    const avgSleepHours = latestCheckin?.sleepHours !== null && latestCheckin?.sleepHours !== undefined
      ? Number(latestCheckin.sleepHours)
      : lifestyle?.avgSleepHours ? Number(lifestyle.avgSleepHours) : null

    const healthScore = computeHealthScore({ bmi, avgPainScore, avgSleepHours, activePainCount: painAssessments.length, hasCheckins: checkins.length > 0 })

    const prevCheckin = checkins.length >= 2 ? checkins[1] : null
    const weightTrend = latestCheckin?.weightKg != null && prevCheckin?.weightKg != null
      ? Number(latestCheckin.weightKg) - Number(prevCheckin.weightKg)
      : null

    const healthScoreTrend = prevCheckin !== null
      ? computeHealthScore({
          bmi,
          avgPainScore: avgPainScore,
          avgSleepHours: prevCheckin.sleepHours !== null ? Number(prevCheckin.sleepHours) : avgSleepHours,
          activePainCount: painAssessments.length,
          hasCheckins: true,
        }) - healthScore
      : null

    const streak = computeCheckinStreak(checkins)

    // ─── 2. Build Activity Data ─────────────────────────────────

    const activityDays: Array<{ date: string; completed: number; planned: number }> = []
    let totalCompleted = 0
    let totalPlanned = 0

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      // For now, use check-in exercise completion as proxy for activity
      // or mark as 0/0 if no data
      const checkinForDay = checkins.find((c: any) => {
        const cStart = new Date(c.weekStart).toISOString().split("T")[0]
        return cStart <= dateStr
      })
      const completed = checkinForDay?.exerciseCompletion ?? 0
      const planned = checkinForDay?.exerciseCompletion != null ? 100 : 0
      activityDays.push({ date: dateStr, completed: completed, planned })
      if (planned > 0) { totalCompleted += completed; totalPlanned += planned }
    }

    // ─── 3. Build Lab Trends ────────────────────────────────────

    const labMap = new Map<string, { unit: string; values: Array<{ date: string; value: number | null; isAbnormal: boolean | null }>; referenceRange: string | null }>()
    for (const lab of labResults) {
      const testName = lab.testName
      if (!labMap.has(testName)) {
        labMap.set(testName, { unit: lab.unit ?? "", values: [], referenceRange: lab.referenceRange })
      }
      const entry = labMap.get(testName)!
      entry.values.push({
        date: lab.testDate ? lab.testDate.toISOString().split("T")[0] : "",
        value: lab.value ? Number(lab.value) : null,
        isAbnormal: lab.isAbnormal,
      })
    }

    const labTrends = Array.from(labMap.entries()).map(([testName, data]) => ({
      testName,
      unit: data.unit,
      referenceRange: data.referenceRange,
      values: data.values,
    }))

    // ─── 4. Process Recommendations ─────────────────────────────

    const latestRec = recommendations[0]
    const recSuggestions: Array<{
      category: string
      priority: "high" | "medium" | "low"
      icon: string
      title: string
      description: string
      action: string
    }> = latestRec?.suggestions as any ?? []

    // If no AI recommendations, use rule-based
    const fallbackRecs = recSuggestions.length === 0
      ? await generateFallbackRecommendations(userId, { lifestyle, painAssessments })
      : recSuggestions

    // ─── 5. Get Today's Routine ─────────────────────────────────

    const routine = routines[0] as { schedule: any; dayOfWeek: number } | undefined
    const schedule = routine?.schedule as Array<{ time: string; activity: string; category: string; duration: number; details: string }> | null ?? null

    // ─── 6. Build Response ──────────────────────────────────────

    const data: DashboardData = {
      stats: {
        current: { weightKg, bmi, avgPainScore, avgSleepHours, healthScore },
        trends: {
          weightKg: weightTrend !== null ? { change: Math.round(weightTrend * 10) / 10, period: "1week" } : null,
          healthScore: healthScoreTrend !== null ? { change: Math.round(healthScoreTrend * 10) / 10, period: "1week" } : null,
        },
        streak: { checkinStreak: streak.currentStreak, longestStreak: streak.longestStreak },
      },
      posture: {
        characteristics: postureChars.map((p) => ({
          characteristic: p.characteristic,
          severity: p.severity,
          description: p.description,
        })),
        latestAnalysisDate: latestPostureAnalysis?.createdAt?.toISOString() ?? null,
      },
      activity: {
        last7Days: activityDays,
        adherenceRate: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : null,
      },
      labTrends,
      recommendations: fallbackRecs.slice(0, 3),
      routine: { schedule },
      checkin: {
        latest: weeklyCheckinLatest ? {
          weekStart: weeklyCheckinLatest.weekStart.toISOString(),
          energyLevel: weeklyCheckinLatest.energyLevel,
          sleepHours: weeklyCheckinLatest.sleepHours ? Number(weeklyCheckinLatest.sleepHours) : null,
          sleepQuality: weeklyCheckinLatest.sleepQuality,
          mood: weeklyCheckinLatest.mood,
          weightKg: weeklyCheckinLatest.weightKg ? Number(weeklyCheckinLatest.weightKg) : null,
          dietAdherence: weeklyCheckinLatest.dietAdherence,
          exerciseCompletion: weeklyCheckinLatest.exerciseCompletion,
          aiSummary: weeklyCheckinLatest.aiSummary,
          notes: weeklyCheckinLatest.notes,
        } : null,
      },
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Dashboard data error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function computeHealthScore(params: {
  bmi: number | null
  avgPainScore: number | null
  avgSleepHours: number | null
  activePainCount: number
  hasCheckins: boolean
}): number {
  const { bmi, avgPainScore, avgSleepHours, activePainCount, hasCheckins } = params
  let score = 50

  if (bmi !== null) {
    if (bmi >= 18.5 && bmi <= 24.9) score += 20
    else if (bmi >= 25 && bmi <= 29.9) score += 10
  } else {
    score += 10
  }

  if (avgPainScore !== null) {
    score += Math.max(0, 15 - avgPainScore * 1.5)
  } else {
    score += activePainCount > 0 ? 5 : 15
  }

  if (avgSleepHours !== null) {
    if (avgSleepHours >= 7 && avgSleepHours <= 9) score += 15
    else if (avgSleepHours >= 6 && avgSleepHours < 7) score += 8
    else if (avgSleepHours > 9 && avgSleepHours <= 10) score += 8
    else score += 2
  } else {
    score += 8
  }

  if (hasCheckins) score += 5
  return Math.round(Math.min(100, Math.max(0, score)))
}

function computeCheckinStreak(checkins: Array<{ weekStart: Date }>): { currentStreak: number; longestStreak: number } {
  if (checkins.length === 0) return { currentStreak: 0, longestStreak: 0 }
  const sorted = [...checkins].sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())

  let currentStreak = sorted.length > 0 ? 1 : 0
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = (sorted[i - 1].weekStart.getTime() - sorted[i].weekStart.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays <= 10) currentStreak++
    else break
  }

  let longestStreak = currentStreak
  let tempStreak = 1
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = (sorted[i - 1].weekStart.getTime() - sorted[i].weekStart.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays <= 10) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak) }
    else tempStreak = 1
  }

  return { currentStreak, longestStreak }
}

async function generateFallbackRecommendations(
  userId: string,
  context: { lifestyle: any; painAssessments: any[] }
): Promise<Array<{ category: string; priority: "high" | "medium" | "low"; icon: string; title: string; description: string; action: string }>> {
  const { lifestyle, painAssessments } = context
  const recs: Array<{ category: string; priority: "high" | "medium" | "low"; icon: string; title: string; description: string; action: string }> = []

  for (const pain of painAssessments) {
    if (pain.severity >= 7) {
      recs.push({ category: "pain", priority: "high", icon: "🩺", title: `${capitalize(pain.bodyArea)} pain needs attention`, description: `Your ${pain.bodyArea} pain is ${pain.severity}/10.`, action: "Consult a healthcare provider." })
    } else if (pain.severity >= 4) {
      recs.push({ category: "pain", priority: "medium", icon: "🧘", title: `Manage ${capitalize(pain.bodyArea)} discomfort`, description: `Moderate ${pain.bodyArea} pain (${pain.severity}/10).`, action: "Try targeted exercises and ergonomic adjustments." })
    }
  }

  const sleepHours = lifestyle?.avgSleepHours ? Number(lifestyle.avgSleepHours) : null
  if (sleepHours !== null && sleepHours < 6) {
    recs.push({ category: "sleep", priority: "high", icon: "😴", title: "Sleep duration is too low", description: `Averaging ${sleepHours}h of sleep.`, action: "Set a consistent bedtime and reduce screen time before bed." })
  } else if (sleepHours !== null && sleepHours < 7) {
    recs.push({ category: "sleep", priority: "medium", icon: "💤", title: "Try to get more sleep", description: `${sleepHours}h is slightly below ideal.`, action: "Aim for 30 min more sleep." })
  }

  const waterIntake = lifestyle?.waterIntakeL ? Number(lifestyle.waterIntakeL) : null
  if (waterIntake !== null && waterIntake < 1.5) {
    recs.push({ category: "hydration", priority: "medium", icon: "💧", title: "Increase water intake", description: `${waterIntake}L/day.`, action: "Aim for 2-2.5L daily." })
  }

  const stressLevel = lifestyle?.stressLevel ?? null
  if (stressLevel !== null && stressLevel >= 7) {
    recs.push({ category: "stress", priority: "high", icon: "🧠", title: "Stress level is high", description: `Stress: ${stressLevel}/10.`, action: "Try deep breathing, meditation, or short walks." })
  }

  const exerciseFreq = lifestyle?.exerciseFreq ?? null
  if (exerciseFreq === "never" || exerciseFreq === "rarely") {
    recs.push({ category: "exercise", priority: "medium", icon: "🚶", title: "Add more movement", description: `Exercise: ${exerciseFreq}.`, action: "Start with 10-15 min walks daily." })
  }

  recs.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority]) - ({ high: 0, medium: 1, low: 2 }[b.priority]))
  return recs
}

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }
