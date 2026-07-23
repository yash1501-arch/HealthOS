/**
 * Weekly workout plan generator.
 * Creates day-wise workout routines based on user goals and fitness level.
 * Sunday is always a rest day.
 */

import { ExerciseType, EXERCISE_CONFIGS } from "./exercise-tracker"

// ─── Types ──────────────────────────────────────────────────────

export type Difficulty = "beginner" | "intermediate" | "advanced"

export type WorkoutFocus = "full_body" | "upper" | "lower" | "core" | "cardio" | "flexibility"

export interface WorkoutExercise {
  type: ExerciseType
  name: string
  targetReps: number
  targetSets: number
  demoDuration: number // seconds to show demo
  restAfter: number // seconds rest after this exercise
}

export interface WorkoutDay {
  day: number // 0=Sun, 1=Mon, ..., 6=Sat
  dayName: string
  isRestDay: boolean
  focus: WorkoutFocus | "rest"
  exercises: WorkoutExercise[]
  tips: string[]
}

export interface WorkoutPlan {
  weekStart: string // ISO date
  days: WorkoutDay[]
  difficulty: Difficulty
  goal: string
}

// ─── Day Names ──────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// ─── Exercise Library Metadata ──────────────────────────────────

interface ExerciseMeta {
  type: ExerciseType
  focus: WorkoutFocus
  beginnerReps: number
  intermediateReps: number
  advancedReps: number
  sets: number
  demoSeconds: number
  restSeconds: number
}

const EXERCISE_META: ExerciseMeta[] = [
  { type: "squat", focus: "lower", beginnerReps: 8, intermediateReps: 12, advancedReps: 15, sets: 3, demoSeconds: 30, restSeconds: 45 },
  { type: "pushup", focus: "upper", beginnerReps: 5, intermediateReps: 10, advancedReps: 15, sets: 3, demoSeconds: 30, restSeconds: 45 },
  { type: "knee_raise", focus: "core", beginnerReps: 8, intermediateReps: 12, advancedReps: 16, sets: 3, demoSeconds: 25, restSeconds: 30 },
  { type: "shoulder_rotation", focus: "upper", beginnerReps: 8, intermediateReps: 10, advancedReps: 12, sets: 2, demoSeconds: 25, restSeconds: 30 },
  { type: "hip_raise", focus: "lower", beginnerReps: 10, intermediateReps: 12, advancedReps: 15, sets: 3, demoSeconds: 25, restSeconds: 30 },
  { type: "standing_balance", focus: "core", beginnerReps: 3, intermediateReps: 5, advancedReps: 8, sets: 2, demoSeconds: 20, restSeconds: 20 },
]

// ─── Workout Templates ──────────────────────────────────────────

type DayTemplate = {
  focus: WorkoutFocus
  exerciseKeys: ExerciseType[]
  tips: string[]
}

const FULL_BODY_TEMPLATES: DayTemplate[] = [
  { focus: "full_body", exerciseKeys: ["squat", "pushup", "hip_raise", "shoulder_rotation"], tips: ["Focus on form over speed", "Breathe steadily throughout", "Rest 45s between exercises"] },
  { focus: "lower", exerciseKeys: ["squat", "hip_raise", "knee_raise", "standing_balance"], tips: ["Keep weight in heels for squats", "Engage glutes at the top of bridges", "Use wall support for balance if needed"] },
  { focus: "upper", exerciseKeys: ["pushup", "shoulder_rotation", "knee_raise", "squat"], tips: ["Keep elbows at 45° for pushups", "Don't rush the rotation", "Breathe out on the effort"] },
  { focus: "core", exerciseKeys: ["standing_balance", "knee_raise", "hip_raise", "shoulder_rotation"], tips: ["Engage core throughout", "Keep movements slow and controlled", "Quality over quantity"] },
  { focus: "cardio", exerciseKeys: ["squat", "knee_raise", "standing_balance", "pushup"], tips: ["Move at a consistent pace", "Take shorter rests for cardio effect", "Stay hydrated"] },
  { focus: "flexibility", exerciseKeys: ["standing_balance", "shoulder_rotation", "knee_raise", "hip_raise"], tips: ["Focus on full range of motion", "Hold each position briefly", "Breathe deeply"] },
]

// ─── Generate Weekly Plan ───────────────────────────────────────

export function generateWorkoutPlan(
  goals: string[],
  difficulty: Difficulty = "beginner",
  painAreas: string[] = []
): WorkoutPlan {
  const today = new Date()
  const monday = getMonday(today)

  const goal = goals.includes("build_strength") ? "strength" :
    goals.includes("lose_weight") ? "weight_loss" :
    goals.includes("improve_flexibility") ? "flexibility" :
    goals.includes("build_routine") ? "routine" :
    "general"

  // Pick templates based on goal
  const dayOrder = getDayOrder(goal)

  const days: WorkoutDay[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    const dayIndex = date.getDay()

    if (dayIndex === 0) {
      // Sunday - rest day
      days.push({
        day: dayIndex,
        dayName: DAY_NAMES[dayIndex],
        isRestDay: true,
        focus: "rest",
        exercises: [],
        tips: ["Take time to recover", "Light stretching recommended", "Hydrate well", "Prepare for tomorrow's workout"],
      })
      continue
    }

    const template = dayOrder[(dayIndex - 1) % dayOrder.length]
    const exercises = template.exerciseKeys
      .filter((key) => {
        // Skip exercises that target pain areas that need rest
        if (painAreas.includes("knee") && key === "squat") return difficulty === "beginner"
        if (painAreas.includes("shoulder") && key === "pushup") return false
        return true
      })
      .map((key) => {
        const meta = EXERCISE_META.find((m) => m.type === key)!
        const reps = difficulty === "beginner" ? meta.beginnerReps :
          difficulty === "intermediate" ? meta.intermediateReps :
          meta.advancedReps
        const config = EXERCISE_CONFIGS[key]
        return {
          type: key,
          name: config.name,
          targetReps: reps,
          targetSets: meta.sets,
          demoDuration: meta.demoSeconds,
          restAfter: meta.restSeconds,
        } as WorkoutExercise
      })

    days.push({
      day: dayIndex,
      dayName: DAY_NAMES[dayIndex],
      isRestDay: false,
      focus: template.focus,
      exercises,
      tips: template.tips,
    })
  }

  return {
    weekStart: monday.toISOString().slice(0, 10),
    days,
    difficulty,
    goal,
  }
}

// ─── Day Order by Goal ──────────────────────────────────────────

function getDayOrder(goal: string): DayTemplate[] {
  // 6 workout days (Mon-Sat), tailored to goal
  switch (goal) {
    case "strength":
      return [FULL_BODY_TEMPLATES[1], FULL_BODY_TEMPLATES[2], FULL_BODY_TEMPLATES[0], FULL_BODY_TEMPLATES[1], FULL_BODY_TEMPLATES[2], FULL_BODY_TEMPLATES[3]]
    case "weight_loss":
      return [FULL_BODY_TEMPLATES[4], FULL_BODY_TEMPLATES[0], FULL_BODY_TEMPLATES[4], FULL_BODY_TEMPLATES[2], FULL_BODY_TEMPLATES[0], FULL_BODY_TEMPLATES[4]]
    case "flexibility":
      return [FULL_BODY_TEMPLATES[5], FULL_BODY_TEMPLATES[3], FULL_BODY_TEMPLATES[5], FULL_BODY_TEMPLATES[1], FULL_BODY_TEMPLATES[5], FULL_BODY_TEMPLATES[3]]
    default:
      return [FULL_BODY_TEMPLATES[0], FULL_BODY_TEMPLATES[1], FULL_BODY_TEMPLATES[2], FULL_BODY_TEMPLATES[3], FULL_BODY_TEMPLATES[0], FULL_BODY_TEMPLATES[1]]
  }
}

// ─── Session Report ─────────────────────────────────────────────

export interface ExerciseResult {
  exerciseType: ExerciseType
  completedReps: number
  targetReps: number
  completedSets: number
  targetSets: number
  avgFormScore: number
  issues: string[]
  duration: number // ms
}

export interface SessionReport {
  date: string
  dayName: string
  focus: WorkoutFocus | "rest"
  results: ExerciseResult[]
  overallScore: number
  totalDuration: number
  recommendations: string[]
}

export function generateSessionReport(
  day: WorkoutDay,
  results: ExerciseResult[],
  previousReports: SessionReport[] = []
): SessionReport {
  const totalReps = results.reduce((s, r) => s + r.completedReps, 0)
  const totalTarget = results.reduce((s, r) => s + r.targetReps, 0)
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.avgFormScore, 0) / results.length)
    : 0

  const recommendations: string[] = []

  // Compare with previous session
  if (previousReports.length > 0) {
    const last = previousReports[0]
    const lastAvg = last.results.length > 0
      ? last.results.reduce((s, r) => s + r.avgFormScore, 0) / last.results.length
      : 0

    if (avgScore > lastAvg + 5) {
      recommendations.push("Great improvement! Consider increasing reps next week.")
    } else if (avgScore < lastAvg - 10) {
      recommendations.push("Form dropped — focus on slower, controlled movements.")
    }
  }

  // Check for struggling exercises
  for (const result of results) {
    if (result.completedReps < result.targetReps * 0.7) {
      recommendations.push(`${result.exerciseType}: Reduce reps or try an easier variation.`)
    }
    if (result.avgFormScore < 50) {
      recommendations.push(`${result.exerciseType}: Focus on form — watch the demo again before next session.`)
    }
  }

  if (results.every((r) => r.completedReps >= r.targetReps)) {
    recommendations.push("All targets met! Increase difficulty next week.")
  }
  if (results.some((r) => r.completedReps < r.targetReps * 0.5)) {
    recommendations.push("Some exercises were too hard — we'll adjust them next session.")
  }

  return {
    date: new Date().toISOString(),
    dayName: day.dayName,
    focus: day.focus,
    results,
    overallScore: avgScore,
    totalDuration: results.reduce((s, r) => s + r.duration, 0),
    recommendations,
  }
}

// ─── Progress Notes for Next Session ────────────────────────────

export function getNextSessionNotes(report: SessionReport): string[] {
  const notes: string[] = []

  for (const result of report.results) {
    if (result.completedReps >= result.targetReps && result.avgFormScore >= 70) {
      notes.push(`${result.exerciseType}: Increase reps by 2 next session`)
    } else if (result.completedReps < result.targetReps * 0.5) {
      notes.push(`${result.exerciseType}: Reduce target by 3 reps`)
    } else if (result.avgFormScore < 50) {
      notes.push(`${result.exerciseType}: Keep same reps, focus on form`)
    }
  }

  return notes
}

// ─── Helper ─────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
