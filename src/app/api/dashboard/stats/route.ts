import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"

// ─── Types ────────────────────────────────────────────────────

type CheckinRow = {
  weekStart: Date
  weightKg: unknown
  painScores: unknown
  energyLevel: unknown
  sleepHours: unknown
  mood: unknown
}

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    // Fetch all relevant data in parallel
    const [profile, lifestyle, painAssessments, checkins] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.lifestyle.findUnique({ where: { userId } }),
      prisma.painAssessment.findMany({
        where: { userId, isActive: true },
        select: { severity: true },
      }),
      prisma.weeklyCheckin.findMany({
        where: { userId },
        orderBy: { weekStart: "desc" },
        take: 8, // enough for streak + trend computation
        select: {
          weekStart: true,
          weightKg: true,
          painScores: true,
          energyLevel: true,
          sleepHours: true,
          mood: true,
        },
      }) as Promise<CheckinRow[]>,
    ])

    // ─── Current Values ────────────────────────────────────────

    const weightKg = profile?.weightKg ? Number(profile.weightKg) : null
    const heightCm = profile?.heightCm ? Number(profile.heightCm) : null
    const waistCm = profile?.waistCm ? Number(profile.waistCm) : null

    // BMI = weight(kg) / height(m)^2
    const bmi =
      weightKg !== null && heightCm !== null
        ? Math.round((weightKg / ((heightCm / 100) * (heightCm / 100))) * 10) / 10
        : null

    // Average pain score from active assessments
    const avgPainScore =
      painAssessments.length > 0
        ? Math.round(
            (painAssessments.reduce(
              (sum: number, pa: { severity: number }) => sum + pa.severity,
              0
            ) /
              painAssessments.length) *
              10
          ) / 10
        : null

    // Latest lifestyle sleep hours (most recent checkin takes priority)
    const latestCheckin = checkins[0]
    const avgSleepHours =
      latestCheckin?.sleepHours !== null && latestCheckin?.sleepHours !== undefined
        ? Number(latestCheckin.sleepHours)
        : lifestyle?.avgSleepHours
          ? Number(lifestyle.avgSleepHours)
          : null

    // ─── Health Score (0–100) ──────────────────────────────────

    const healthScore = computeHealthScore({
      bmi,
      avgPainScore,
      avgSleepHours,
      activePainCount: painAssessments.length,
      hasCheckins: checkins.length > 0,
    })

    // ─── Trends (compare most recent checkin with the one before) ──

    const prevCheckin = checkins.length >= 2 ? checkins[1] : null

    const hasWeightData =
      latestCheckin?.weightKg != null &&
      prevCheckin?.weightKg != null
    const weightTrend = hasWeightData
      ? Number(latestCheckin!.weightKg) - Number(prevCheckin!.weightKg)
      : null

    // Compute pain trend from checkin painScores JSON
    const painTrend = computePainTrend(latestCheckin, prevCheckin)

    const healthScoreTrend =
      prevCheckin !== null
        ? // Recompute health score with previous checkin's data to compare
          computeHealthScore({
            bmi,
            avgPainScore: painTrend?.previous ?? avgPainScore,
            avgSleepHours:
              prevCheckin.sleepHours !== null
                ? Number(prevCheckin.sleepHours)
                : avgSleepHours,
            activePainCount: painAssessments.length,
            hasCheckins: true,
          }) - healthScore
        : null

    // ─── Streak ────────────────────────────────────────────────

    const streak = computeCheckinStreak(checkins)

    // ─── Response ──────────────────────────────────────────────

    return NextResponse.json({
      data: {
        current: {
          weightKg,
          bmi,
          waistCm,
          avgPainScore,
          avgSleepHours,
          healthScore,
        },
        trends: {
          weightKg: weightTrend !== null
            ? { change: Math.round(weightTrend * 10) / 10, period: "1week" }
            : null,
          avgPainScore: painTrend
            ? { change: Math.round((painTrend.current - painTrend.previous) * 10) / 10, period: "1week" }
            : null,
          healthScore: healthScoreTrend !== null
            ? { change: Math.round(healthScoreTrend * 10) / 10, period: "1week" }
            : null,
        },
        streak: {
          checkinStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
        },
      },
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function computeHealthScore(params: {
  bmi: number | null
  avgPainScore: number | null
  avgSleepHours: number | null
  activePainCount: number
  hasCheckins: boolean
}): number {
  const { bmi, avgPainScore, avgSleepHours, activePainCount, hasCheckins } = params
  let score = 50 // baseline

  // BMI score (ideal: 18.5–24.9)
  if (bmi !== null) {
    if (bmi >= 18.5 && bmi <= 24.9) score += 20
    else if (bmi >= 25 && bmi <= 29.9) score += 10
    else score += 0
  } else {
    score += 10 // no data — neutral
  }

  // Pain score (lower is better, out of 10)
  if (avgPainScore !== null) {
    score += Math.max(0, 15 - avgPainScore * 1.5)
  } else {
    score += activePainCount > 0 ? 5 : 15 // no pain data = assume good if no active assessments
  }

  // Sleep hours (ideal: 7–9)
  if (avgSleepHours !== null) {
    if (avgSleepHours >= 7 && avgSleepHours <= 9) score += 15
    else if (avgSleepHours >= 6 && avgSleepHours < 7) score += 8
    else if (avgSleepHours > 9 && avgSleepHours <= 10) score += 8
    else score += 2
  } else {
    score += 8
  }

  // Engagement bonus
  if (hasCheckins) score += 5

  return Math.round(Math.min(100, Math.max(0, score)))
}

function computePainTrend(
  latest: CheckinRow | undefined,
  previous: CheckinRow | null
): { current: number; previous: number } | null {
  if (!latest && !previous) return null

  const getAvgPain = (c: CheckinRow | undefined): number => {
    if (!c?.painScores) return -1
    const scores = c.painScores as Record<string, number>
    const vals = Object.values(scores).filter((v) => typeof v === "number")
    return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : -1
  }

  const current = latest ? getAvgPain(latest) : -1
  const prev = previous ? getAvgPain(previous) : -1

  // Need both current and previous to establish a trend
  if (current < 0 || prev < 0) return null
  return { current, previous: prev }
}

function computeCheckinStreak(
  checkins: Array<{ weekStart: Date }>
): { currentStreak: number; longestStreak: number } {
  if (checkins.length === 0) return { currentStreak: 0, longestStreak: 0 }

  // Sort descending by date
  const sorted = [...checkins].sort(
    (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
  )

  // Current streak: consecutive weeks from most recent
  let currentStreak = 0
  if (sorted.length > 0) {
    currentStreak = 1
    for (let i = 1; i < sorted.length; i++) {
      const diffDays =
        (sorted[i - 1].weekStart.getTime() - sorted[i].weekStart.getTime()) /
        (1000 * 60 * 60 * 24)
      if (diffDays <= 10) {
        // allow a few days buffer for 7-day checkins
        currentStreak++
      } else {
        break
      }
    }
  }

  // Longest streak overall
  let longestStreak = currentStreak
  let tempStreak = 1
  for (let i = 1; i < sorted.length; i++) {
    const diffDays =
      (sorted[i - 1].weekStart.getTime() - sorted[i].weekStart.getTime()) /
      (1000 * 60 * 60 * 24)
    if (diffDays <= 10) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 1
    }
  }

  return { currentStreak, longestStreak }
}
