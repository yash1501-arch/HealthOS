/**
 * Exercise Tracker Service
 *
 * Uses MediaPipe PoseLandmarker (on-device via WebAssembly) to track
 * exercise form in real-time from a live camera feed.
 *
 * Supports: squats, pushups, knee raises, shoulder rotations, etc.
 * Features: rep counting, form feedback, angle tracking.
 *
 * No video leaves the browser — all inference runs client-side.
 */

import { PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision"
import { preloadPoseLandmarker } from "@/lib/pose-analysis"

// ─── Landmark Indexes ───────────────────────────────────────────

const LM = {
  NOSE: 0, LEFT_EYE: 2, RIGHT_EYE: 5, LEFT_EAR: 7, RIGHT_EAR: 8,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
} as const

// ─── Types ──────────────────────────────────────────────────────

export type ExerciseType = "squat" | "pushup" | "knee_raise" | "shoulder_rotation" | "hip_raise" | "standing_balance"

export interface ExerciseConfig {
  type: ExerciseType
  name: string
  targetReps: number
  targetSets: number
  instructions: string[]
  tips: string[]
}

export interface ExerciseFrame {
  timestamp: number
  landmarks: NormalizedLandmark[] | null
  feedback: ExerciseFeedback
}

export interface ExerciseFeedback {
  repCount: number
  currentPhase: "up" | "down" | "neutral" | "out" | "in"
  formIssues: FormIssue[]
  score: number // 0-100
  isCorrect: boolean
}

export interface FormIssue {
  type: string
  severity: "warning" | "error"
  message: string
  angle?: number
}

export interface ExerciseSession {
  type: ExerciseType
  totalReps: number
  totalSets: number
  completedReps: number
  completedSets: number
  avgScore: number
  duration: number // ms
  frames: ExerciseFrame[]
}

// ─── Exercise Library ───────────────────────────────────────────

export const EXERCISE_CONFIGS: Record<ExerciseType, ExerciseConfig> = {
  squat: {
    type: "squat",
    name: "Bodyweight Squat",
    targetReps: 12,
    targetSets: 3,
    instructions: [
      "Stand with feet shoulder-width apart, toes slightly outward",
      "Keep chest up and core tight",
      "Lower hips back and down like sitting in a chair",
      "Go to 90° knee bend or as far as comfortable",
      "Drive through heels to stand back up",
    ],
    tips: [
      "Keep knees tracking over toes — don't let them cave in",
      "Keep weight in your heels",
      "Look straight ahead, not down",
    ],
  },
  pushup: {
    type: "pushup",
    name: "Push-up",
    targetReps: 10,
    targetSets: 3,
    instructions: [
      "Start in plank position, hands shoulder-width apart",
      "Lower chest toward floor, elbows at 45°",
      "Push back up to starting position",
      "Keep body in a straight line throughout",
    ],
    tips: [
      "Don't flare elbows out to the sides",
      "Keep core braced — don't let hips sag",
      "Lower until chest nearly touches floor",
    ],
  },
  knee_raise: {
    type: "knee_raise",
    name: "Standing Knee Raise",
    targetReps: 10,
    targetSets: 3,
    instructions: [
      "Stand tall, engage core",
      "Lift one knee toward chest",
      "Lower slowly and repeat with other leg",
      "Maintain upright posture throughout",
    ],
    tips: [
      "Don't lean backward as you lift the knee",
      "Keep hips level",
      "Use arms for balance if needed",
    ],
  },
  shoulder_rotation: {
    type: "shoulder_rotation",
    name: "Shoulder External Rotation",
    targetReps: 10,
    targetSets: 2,
    instructions: [
      "Stand with elbows bent at 90°, tucked to sides",
      "Rotate forearms outward keeping elbows pinned",
      "Squeeze shoulder blades at the end",
      "Return to start slowly",
    ],
    tips: ["Keep elbows touching your sides throughout", "Imagine squeezing a pencil between shoulder blades"],
  },
  hip_raise: {
    type: "hip_raise",
    name: "Glute Bridge",
    targetReps: 12,
    targetSets: 3,
    instructions: [
      "Lie on back, knees bent, feet flat on floor",
      "Push through heels to lift hips toward ceiling",
      "Squeeze glutes at the top",
      "Lower hips back down slowly",
    ],
    tips: ["Don't overextend the lower back at the top", "Keep feet hip-width apart"],
  },
  standing_balance: {
    type: "standing_balance",
    name: "Single Leg Balance",
    targetReps: 5,
    targetSets: 2,
    instructions: [
      "Stand on one leg",
      "Keep hands on hips",
      "Hold for 15-30 seconds",
      "Switch legs",
    ],
    tips: ["Focus on a fixed point ahead", "Engage core to stabilize", "Use wall support if needed"],
  },
}

// ─── Angle Math ─────────────────────────────────────────────────

function angleBetween(p1: NormalizedLandmark, p2: NormalizedLandmark, p3: NormalizedLandmark): number {
  const a = Math.atan2(p3.y - p2.y, p3.x - p2.x)
  const b = Math.atan2(p1.y - p2.y, p1.x - p2.x)
  const angle = Math.abs(((a - b) * 180) / Math.PI)
  return angle > 180 ? 360 - angle : angle
}

function verticalAngle(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
  return Math.abs(Math.atan2(p2.x - p1.x, p2.y - p1.y) * (180 / Math.PI))
}

// ─── Exercise Analyzers ─────────────────────────────────────────

interface ExerciseAnalyzer {
  analyze(landmarks: NormalizedLandmark[]): ExerciseFeedback
  reset(): void
}

function createSquatAnalyzer(): ExerciseAnalyzer {
  let repCount = 0
  let wasDown = false
  let formIssues: FormIssue[] = []

  function analyze(landmarks: NormalizedLandmark[]): ExerciseFeedback {
    formIssues = []
    const hip = landmarks[LM.RIGHT_HIP]
    const knee = landmarks[LM.RIGHT_KNEE]
    const ankle = landmarks[LM.RIGHT_ANKLE]
    const shoulder = landmarks[LM.RIGHT_SHOULDER]

    const kneeAngle = angleBetween(hip, knee, ankle)
    const torsoAngle = verticalAngle(hip, shoulder)
    const isDown = kneeAngle < 110

    // Form checks
    if (kneeAngle < 60) {
      formIssues.push({ type: "depth", severity: "warning", message: "Squat depth is too deep", angle: kneeAngle })
    }
    if (torsoAngle > 45) {
      formIssues.push({ type: "lean", severity: "warning", message: "Leaning too far forward", angle: torsoAngle })
    }

    if (isDown && !wasDown) wasDown = true
    if (!isDown && wasDown) {
      repCount++
      wasDown = false
    }

    const score = Math.max(0, 100 - formIssues.length * 25)
    return {
      repCount,
      currentPhase: isDown ? "down" : "up",
      formIssues,
      score,
      isCorrect: formIssues.length === 0,
    }
  }

  function reset() { repCount = 0; wasDown = false }

  return { analyze, reset }
}

function createPushupAnalyzer(): ExerciseAnalyzer {
  let repCount = 0
  let wasDown = false

  function analyze(landmarks: NormalizedLandmark[]): ExerciseFeedback {
    const formIssues: FormIssue[] = []
    const shoulder = landmarks[LM.RIGHT_SHOULDER]
    const elbow = landmarks[LM.RIGHT_ELBOW]
    const wrist = landmarks[LM.RIGHT_WRIST]
    const hip = landmarks[LM.RIGHT_HIP]

    const elbowAngle = angleBetween(shoulder, elbow, wrist)
    const bodyAngle = verticalAngle(hip, shoulder)
    const isDown = elbowAngle < 90

    if (bodyAngle > 30) {
      formIssues.push({ type: "sag", severity: "error", message: "Hips sagging — keep body in a straight line", angle: bodyAngle })
    }
    if (bodyAngle < 5 && hip.y < shoulder.y) {
      formIssues.push({ type: "pike", severity: "warning", message: "Hips too high — keep body straight" })
    }

    if (isDown && !wasDown) wasDown = true
    if (!isDown && wasDown) {
      repCount++
      wasDown = false
    }

    const score = Math.max(0, 100 - formIssues.length * 30)
    return { repCount, currentPhase: isDown ? "down" : "up", formIssues, score, isCorrect: formIssues.length === 0 }
  }

  function reset() { repCount = 0; wasDown = false }
  return { analyze, reset }
}

function createKneeRaiseAnalyzer(): ExerciseAnalyzer {
  let repCount = 0
  let wasUp = false

  function analyze(landmarks: NormalizedLandmark[]): ExerciseFeedback {
    const formIssues: FormIssue[] = []
    const hip = landmarks[LM.LEFT_HIP]
    const knee = landmarks[LM.LEFT_KNEE]
    const shoulder = landmarks[LM.LEFT_SHOULDER]

    const hipAngle = angleBetween(shoulder, hip, knee)
    const isUp = hipAngle < 110
    const torsoAngle = verticalAngle(hip, shoulder)

    if (torsoAngle > 20) {
      formIssues.push({ type: "lean", severity: "warning", message: "Leaning backward", angle: torsoAngle })
    }

    if (isUp && !wasUp) wasUp = true
    if (!isUp && wasUp) { repCount++; wasUp = false }

    const score = Math.max(0, 100 - formIssues.length * 25)
    return { repCount, currentPhase: isUp ? "up" : "neutral", formIssues, score, isCorrect: formIssues.length === 0 }
  }

  function reset() { repCount = 0; wasUp = false }
  return { analyze, reset }
}

function createShoulderRotationAnalyzer(): ExerciseAnalyzer {
  let repCount = 0
  let wasOut = false

  function analyze(landmarks: NormalizedLandmark[]): ExerciseFeedback {
    const formIssues: FormIssue[] = []
    const shoulder = landmarks[LM.RIGHT_SHOULDER]
    const elbow = landmarks[LM.RIGHT_ELBOW]
    const wrist = landmarks[LM.RIGHT_WRIST]

    const elbowAngle = angleBetween(shoulder, elbow, wrist)
    const isOut = elbowAngle > 160 || elbowAngle < 40

    if (isOut && !wasOut) wasOut = true
    if (!isOut && wasOut) { repCount++; wasOut = false }

    const score = 100
    return { repCount, currentPhase: isOut ? "out" : "neutral", formIssues, score, isCorrect: true }
  }

  function reset() { repCount = 0; wasOut = false }
  return { analyze, reset }
}

function createHipRaiseAnalyzer(): ExerciseAnalyzer {
  let repCount = 0
  let wasUp = false

  function analyze(landmarks: NormalizedLandmark[]): ExerciseFeedback {
    const formIssues: FormIssue[] = []
    const shoulder = landmarks[LM.RIGHT_SHOULDER]
    const hip = landmarks[LM.RIGHT_HIP]
    const knee = landmarks[LM.RIGHT_KNEE]

    const hipKneeAngle = angleBetween(shoulder, hip, knee)
    const isUp = hipKneeAngle < 160

    if (isUp && !wasUp) wasUp = true
    if (!isUp && wasUp) { repCount++; wasUp = false }

    const score = 100
    return { repCount, currentPhase: isUp ? "up" : "down", formIssues, score, isCorrect: true }
  }

  function reset() { repCount = 0; wasUp = false }
  return { analyze, reset }
}

function createBalanceAnalyzer(): ExerciseAnalyzer {
  let startTime = Date.now()

  function analyze(landmarks: NormalizedLandmark[]): ExerciseFeedback {
    const formIssues: FormIssue[] = []
    const shoulder = landmarks[LM.RIGHT_SHOULDER]
    const hip = landmarks[LM.RIGHT_HIP]
    const ankle = landmarks[LM.RIGHT_ANKLE]

    const lean = verticalAngle(shoulder, hip)
    const wobble = Math.abs(ankle.x - (shoulder.x + hip.x) / 2) * 100

    if (lean > 15) {
      formIssues.push({ type: "lean", severity: "warning", message: "Leaning — engage core to stabilize", angle: lean })
    }
    if (wobble > 8) {
      formIssues.push({ type: "wobble", severity: "warning", message: "Wobbling — focus on a fixed point ahead" })
    }

    const score = Math.max(0, 100 - formIssues.length * 25)
    return { repCount: Math.floor((Date.now() - startTime) / 1000), currentPhase: "neutral", formIssues, score, isCorrect: formIssues.length === 0 }
  }

  function reset() { startTime = Date.now() }
  return { analyze, reset }
}

// ─── Analyzer Factory ───────────────────────────────────────────

export function createAnalyzer(type: ExerciseType): ExerciseAnalyzer {
  switch (type) {
    case "squat": return createSquatAnalyzer()
    case "pushup": return createPushupAnalyzer()
    case "knee_raise": return createKneeRaiseAnalyzer()
    case "shoulder_rotation": return createShoulderRotationAnalyzer()
    case "hip_raise": return createHipRaiseAnalyzer()
    case "standing_balance": return createBalanceAnalyzer()
  }
}

// ─── Pose Skeleton Drawing ──────────────────────────────────────

const SKELETON_CONNECTIONS: [number, number][] = [
  [LM.NOSE, LM.LEFT_EYE], [LM.NOSE, LM.RIGHT_EYE],
  [LM.LEFT_EYE, LM.LEFT_EAR], [LM.RIGHT_EYE, LM.RIGHT_EAR],
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW], [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST], [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP], [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE], [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE], [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_HEEL], [LM.RIGHT_ANKLE, LM.RIGHT_HEEL],
  [LM.LEFT_HEEL, LM.LEFT_FOOT_INDEX], [LM.RIGHT_HEEL, LM.RIGHT_FOOT_INDEX],
]

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  videoWidth: number,
  videoHeight: number,
  feedback?: ExerciseFeedback
) {
  const scaleX = videoWidth
  const scaleY = videoHeight

  // Draw connections
  ctx.strokeStyle = feedback && !feedback.isCorrect ? "#FF6B6B" : "#2FE6C4"
  ctx.lineWidth = 3
  for (const [i, j] of SKELETON_CONNECTIONS) {
    const p1 = landmarks[i]
    const p2 = landmarks[j]
    if (p1 && p2 && p1.visibility && p1.visibility > 0.5 && p2.visibility && p2.visibility > 0.5) {
      ctx.beginPath()
      ctx.moveTo(p1.x * scaleX, p1.y * scaleY)
      ctx.lineTo(p2.x * scaleX, p2.y * scaleY)
      ctx.stroke()
    }
  }

  // Draw landmark points
  for (const lm of landmarks) {
    if (lm.visibility && lm.visibility > 0.5) {
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      ctx.arc(lm.x * scaleX, lm.y * scaleY, 4, 0, 2 * Math.PI)
      ctx.fill()
      ctx.strokeStyle = "#176B63"
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
}

// ─── Session Manager ────────────────────────────────────────────

export class ExerciseSessionManager {
  private analyzer: ExerciseAnalyzer
  private frames: ExerciseFrame[] = []
  private startTime = 0
  private config: ExerciseConfig

  constructor(type: ExerciseType) {
    this.analyzer = createAnalyzer(type)
    this.config = EXERCISE_CONFIGS[type]
  }

  start() {
    this.startTime = Date.now()
    this.analyzer.reset()
    this.frames = []
  }

  processFrame(landmarks: NormalizedLandmark[] | null): ExerciseFeedback {
    if (!landmarks) {
      return { repCount: 0, currentPhase: "neutral", formIssues: [], score: 0, isCorrect: false }
    }

    const feedback = this.analyzer.analyze(landmarks)
    this.frames.push({ timestamp: Date.now() - this.startTime, landmarks, feedback })
    return feedback
  }

  end(): ExerciseSession {
    const duration = Date.now() - this.startTime
    const scores = this.frames.filter((f) => f.feedback.score > 0).map((f) => f.feedback.score)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    return {
      type: this.config.type,
      totalReps: this.config.targetReps,
      totalSets: this.config.targetSets,
      completedReps: this.frames[this.frames.length - 1]?.feedback.repCount ?? 0,
      completedSets: 1,
      avgScore,
      duration,
      frames: this.frames,
    }
  }

  getConfig() { return this.config }
}
