/**
 * Exercise Safety & Precision System
 *
 * Maps specific pain areas, conditions, and user profiles to:
 * - Safe exercises (recommended)
 * - Risky exercises (avoid or modify)
 * - Modifications for each exercise based on condition
 * - Alternative exercises for each risk case
 */

export type Condition =
  | "knee_pain" | "lower_back_pain" | "neck_pain" | "shoulder_pain"
  | "hip_pain" | "foot_pain" | "wrist_pain" | "elbow_pain"
  | "arthritis" | "osteoporosis" | "high_blood_pressure"
  | "diabetes" | "obesity" | "pregnancy" | "post_surgery"
  | "elderly" | "sedentary"

export type ExerciseId = string

interface ExerciseSafety {
  risk: "safe" | "caution" | "avoid"
  reason: string
  modification?: string
  alternative?: string
}

// ─── Condition → Exercise Safety Map ───────────────────────────

const SAFETY_MAP: Partial<Record<Condition, Partial<Record<ExerciseId, ExerciseSafety>>>> = {
  knee_pain: {
    squat: { risk: "caution", reason: "Can strain knees if done with poor form", modification: "Reduce depth to 45°, keep weight on heels", alternative: "Wall sit or seated leg raise" },
    pushup: { risk: "safe", reason: "No direct knee involvement" },
    knee_raise: { risk: "avoid", reason: "Directly targets the knee joint", alternative: "Standing hip flexion with bent knee (shorter range)" },
    hip_raise: { risk: "safe", reason: "Strengthens glutes which supports knees" },
    standing_balance: { risk: "caution", reason: "Balance may be affected by knee instability", modification: "Keep a wall nearby for support" },
    shoulder_rotation: { risk: "safe", reason: "No knee involvement" },
  },
  lower_back_pain: {
    squat: { risk: "caution", reason: "Can strain lower back if core not engaged", modification: "Use chair for support, reduce depth", alternative: "Seated core exercises" },
    pushup: { risk: "caution", reason: "Requires core stability", modification: "Do knee pushups to reduce back load" },
    knee_raise: { risk: "safe", reason: "Low back impact when standing" },
    hip_raise: { risk: "caution", reason: "Can overextend back if done wrong", modification: "Keep ribs down, lift only hips, not lower back" },
    standing_balance: { risk: "safe", reason: "Gentle on the back" },
    shoulder_rotation: { risk: "safe", reason: "Upper body only" },
  },
  neck_pain: {
    squat: { risk: "safe", reason: "No direct neck involvement" },
    pushup: { risk: "safe", reason: "Keep neck neutral, look at floor" },
    shoulder_rotation: { risk: "safe", reason: "Can actually help relieve neck tension" },
    hip_raise: { risk: "safe", reason: "No neck involvement" },
    standing_balance: { risk: "caution", reason: "Balance may be affected by neck issues", modification: "Use wall support" },
    knee_raise: { risk: "safe", reason: "Minimal neck involvement" },
  },
  shoulder_pain: {
    pushup: { risk: "avoid", reason: "Directly stresses shoulder joints", alternative: "Wall pushups or chest press with bands" },
    shoulder_rotation: { risk: "caution", reason: "Can aggravate rotator cuff issues", modification: "Reduce range of motion, use no weight", alternative: "Scapular retractions only" },
    squat: { risk: "safe", reason: "No shoulder involvement needed" },
    hip_raise: { risk: "safe", reason: "No shoulder involvement" },
    knee_raise: { risk: "safe", reason: "Minimal shoulder use" },
    standing_balance: { risk: "safe", reason: "Can keep arms at sides" },
  },
  hip_pain: {
    squat: { risk: "caution", reason: "Hip flexion can aggravate arthritis", modification: "Shallow squats only, 30° bend", alternative: "Standing hip abduction" },
    hip_raise: { risk: "caution", reason: "Hip extension can be painful", modification: "Smaller range, use pillow between knees" },
    knee_raise: { risk: "caution", reason: "Hip flexor engagement", modification: "Slow, controlled, small range" },
    standing_balance: { risk: "caution", reason: "Hip instability affects balance", modification: "Hold onto wall" },
    pushup: { risk: "safe", reason: "No hip involvement" },
    shoulder_rotation: { risk: "safe", reason: "No hip involvement" },
  },
  elderly: {
    squat: { risk: "caution", reason: "Joint strain risk", modification: "Use chair for support, half squats only", alternative: "Chair sit-to-stand exercises" },
    pushup: { risk: "caution", reason: "Upper body strength may be limited", modification: "Wall pushups, incline on table" },
    hip_raise: { risk: "safe", reason: "Good for glute strength, use soft surface" },
    knee_raise: { risk: "safe", reason: "Gentle, keep slow and controlled" },
    standing_balance: { risk: "caution", reason: "Fall risk", modification: "Always have wall/chair support nearby" },
    shoulder_rotation: { risk: "safe", reason: "Light band recommended, no weight" },
  },
  sedentary: {
    squat: { risk: "caution", reason: "Limited mobility and strength", modification: "Use chair support, partial range", alternative: "Seated marching" },
    pushup: { risk: "caution", reason: "Limited upper body strength", modification: "Wall pushups, start with 3-5 reps" },
    hip_raise: { risk: "safe", reason: "Good starting exercise" },
    knee_raise: { risk: "safe", reason: "Gentle movement" },
    standing_balance: { risk: "caution", reason: "Poor balance initially", modification: "Hold wall, 10 seconds to start" },
    shoulder_rotation: { risk: "safe", reason: "Very gentle, no weight" },
  },
  obesity: {
    squat: { risk: "caution", reason: "Excess weight on knee joints", modification: "Use chair, shallow range", alternative: "Seated leg exercises" },
    pushup: { risk: "safe", reason: "Can do incline/wall version" },
    hip_raise: { risk: "safe", reason: "Good for glute engagement" },
    knee_raise: { risk: "safe", reason: "Gentle movement, keep slow" },
    standing_balance: { risk: "caution", reason: "Balance may be affected", modification: "Use wall for support" },
    shoulder_rotation: { risk: "safe", reason: "No weight considerations" },
  },
}

// ─── Body Area → Conditions Map ─────────────────────────────────

export const BODY_AREA_TO_CONDITIONS: Record<string, Condition[]> = {
  neck: ["neck_pain"],
  back: ["lower_back_pain"],
  knee: ["knee_pain"],
  shoulder: ["shoulder_pain"],
  hip: ["hip_pain"],
  foot: ["foot_pain"],
  wrist: ["wrist_pain"],
  elbow: ["elbow_pain"],
}

// ─── Exercise Type → ExerciseId Map ─────────────────────────────

export const EXERCISE_TO_ID: Record<string, string> = {
  squat: "squat",
  pushup: "pushup",
  knee_raise: "knee_raise",
  hip_raise: "hip_raise",
  standing_balance: "standing_balance",
  shoulder_rotation: "shoulder_rotation",
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Get safety info for an exercise given a set of conditions/pain areas.
 */
export function getExerciseSafety(
  exerciseType: string,
  conditions: Condition[]
): { risk: "safe" | "caution" | "avoid"; reason: string; modification?: string; alternative?: string } {
  // Elderly and sedentary are always factors
  const allConditions = [...conditions]
  if (!allConditions.includes("sedentary")) {
    // Check if sedentary — based on exercise frequency from assessment
  }

  let highestRisk: { risk: "safe" | "caution" | "avoid"; reason: string; modification?: string; alternative?: string } = {
    risk: "safe", reason: "Generally suitable for this condition",
  }

  for (const condition of allConditions) {
    const conditionMap = SAFETY_MAP[condition]
    if (!conditionMap) continue

    const safety = conditionMap[exerciseType]
    if (!safety) continue

    // Higher risk takes priority
    const riskOrder = { safe: 0, caution: 1, avoid: 2 }
    if (riskOrder[safety.risk] > riskOrder[highestRisk.risk]) {
      highestRisk = safety
    }
  }

  return highestRisk
}

/**
 * Get recommended exercises for a set of pain areas, filtering out risky ones.
 */
export function getRecommendedExercises(
  painAreaIds: string[],
  additionalConditions: Condition[] = []
): { type: string; name: string; safety: ReturnType<typeof getExerciseSafety> }[] {
  const conditions: Condition[] = [...additionalConditions]

  // Map pain areas to conditions
  for (const areaId of painAreaIds) {
    const mapped = BODY_AREA_TO_CONDITIONS[areaId]
    if (mapped) conditions.push(...mapped)
  }

  const allExercises = [
    { type: "squat", name: "Bodyweight Squat" },
    { type: "pushup", name: "Push-up" },
    { type: "knee_raise", name: "Knee Raise" },
    { type: "hip_raise", name: "Glute Bridge" },
    { type: "standing_balance", name: "Single Leg Balance" },
    { type: "shoulder_rotation", name: "Shoulder Rotation" },
  ]

  return allExercises.map((ex) => ({
    ...ex,
    safety: getExerciseSafety(ex.type, conditions),
  }))
}

/**
 * Get modification instructions for a specific exercise and condition.
 */
export function getExerciseModification(exerciseType: string, condition: Condition): string | null {
  const safety = SAFETY_MAP[condition]?.[exerciseType]
  return safety?.modification || null
}
