/**
 * Pose Analysis Service
 *
 * Uses MediaPipe PoseLandmarker (on-device via WebAssembly) to detect
 * 33 body landmarks from photos and compute posture characteristics.
 *
 * No images leave the browser — inference runs entirely client-side.
 */

import { PoseLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision"

// ─── MediaPipe Landmark Indexes ───────────────────────────────

const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

// ─── Types ────────────────────────────────────────────────────

export type Severity = "none" | "mild" | "moderate" | "severe"

export interface PostureFinding {
  characteristic: string
  severity: Severity
  icon: string
  description: string
  explanation: string
  confidence: number
  angleDegrees?: number
}

export interface PoseAnalysisResult {
  findings: PostureFinding[]
  confidenceScore: number
  processingTimeMs: number
  summary: string
  landmarksDetected: boolean
}

// ─── Characteristic Metadata ──────────────────────────────────

const CHARACTERISTIC_META: Record<
  string,
  { icon: string; explanations: Record<Severity, string> }
> = {
  "Forward Head": {
    icon: "🧠",
    explanations: {
      none: "Your head is well-aligned above your shoulders — ideal posture.",
      mild: "Slight forward head posture detected. Be mindful of screen height and take breaks.",
      moderate:
        "Moderate forward head posture. Common in desk workers — can cause neck strain and tension headaches. Ergonomic adjustments and chin tucks are recommended.",
      severe:
        "Significant forward head posture. This puts considerable strain on your cervical spine. Consider consulting a physiotherapist and prioritizing posture correction exercises.",
    },
  },
  "Rounded Shoulders": {
    icon: "💪",
    explanations: {
      none: "Your shoulders are in a neutral, balanced position.",
      mild: "Mild rounding of the shoulders detected. Chest-opening stretches and upper back strengthening can help.",
      moderate:
        "Moderate shoulder rounding. Often accompanies forward head posture. Focus on rowing exercises, face pulls, and doorway chest stretches.",
      severe:
        "Severe shoulder protraction. This can lead to upper cross syndrome. Professional guidance and consistent strengthening of the posterior chain is advised.",
    },
  },
  "Pelvic Tilt": {
    icon: "🦴",
    explanations: {
      none: "Your pelvis is in a neutral position — ideal for spinal alignment and weight distribution.",
      mild: "Slight pelvic tilt detected. Core strengthening and hip flexor stretches can help maintain alignment.",
      moderate:
        "Moderate pelvic tilt. This may contribute to lower back discomfort. Focus on core stability, glute activation, and hamstring flexibility.",
      severe:
        "Significant pelvic tilt detected. This can affect your entire spinal alignment. Consider a professional assessment with a physiotherapist.",
    },
  },
  "Knee Valgus": {
    icon: "🦵",
    explanations: {
      none: "Your knees are well-aligned with your ankles — stable and balanced.",
      mild: "Mild inward knee tendency detected. Strengthening your glute medius and hip external rotators can help.",
      moderate:
        "Moderate knee valgus. This can put stress on the ACL and MCL. Prioritize hip and glute strengthening exercises.",
      severe:
        "Significant knee valgus detected. This increases risk of knee injuries. Consider consulting a sports medicine professional.",
    },
  },
  "Flat Feet": {
    icon: "🦶",
    explanations: {
      none: "Your foot arches appear normal and well-supported.",
      mild: "Slight arch reduction detected. Supportive footwear and arch-strengthening exercises may be beneficial.",
      moderate:
        "Moderate arch collapse detected. This can affect your gait and cause strain up the kinetic chain. Consider orthotic insoles.",
      severe:
        "Significant flat feet detected. This can lead to shin splints, knee pain, and hip issues. Professional gait analysis is recommended.",
    },
  },
  "Weight Distribution": {
    icon: "⚖️",
    explanations: {
      none: "Your weight is evenly distributed between both legs.",
      mild: "Slight weight imbalance detected. Being mindful of standing evenly can help.",
      moderate:
        "Moderate weight imbalance — you tend to favor one leg. This can lead to hip and lower back imbalances over time.",
      severe:
        "Significant weight imbalance detected. This may indicate underlying muscle imbalances or joint issues. Consider a professional assessment.",
    },
  },
}

// ─── Angle Helpers ────────────────────────────────────────────

/** Angle in radians between two vectors (B→A and B→C) */
function angleBetween3Points(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y)
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y)
  if (magAB === 0 || magCB === 0) return 0
  return Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB))))
}

/** Angle from vertical (degrees) of the line through two points — 0 = perfectly vertical */
function angleFromVertical(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  // Angle from vertical: atan2(horizontal offset, vertical offset)
  return Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI)
}

/** Horizontal offset ratio between two points relative to their vertical distance */
function horizontalOffsetRatio(
  top: { x: number; y: number },
  bottom: { x: number; y: number }
): number {
  const dx = Math.abs(bottom.x - top.x)
  const dy = Math.abs(bottom.y - top.y)
  if (dy < 0.001) return 0
  return dx / dy
}

// ─── Severity Classification ──────────────────────────────────

function classifyForwardHead(angleDeg: number): Severity {
  if (angleDeg < 10) return "none"
  if (angleDeg < 20) return "mild"
  if (angleDeg < 35) return "moderate"
  return "severe"
}

function classifyRoundedShoulders(ratio: number): Severity {
  if (ratio < 0.08) return "none"
  if (ratio < 0.15) return "mild"
  if (ratio < 0.25) return "moderate"
  return "severe"
}

function classifyPelvicTilt(angleDeg: number): Severity {
  if (angleDeg < 8) return "none"
  if (angleDeg < 15) return "mild"
  if (angleDeg < 25) return "moderate"
  return "severe"
}

function classifyKneeValgus(ratio: number): Severity {
  if (ratio < 0.04) return "none"
  if (ratio < 0.10) return "mild"
  if (ratio < 0.18) return "moderate"
  return "severe"
}

function classifyFlatFeet(angleDeg: number): Severity {
  if (angleDeg < 5) return "none"
  if (angleDeg < 12) return "mild"
  if (angleDeg < 20) return "moderate"
  return "severe"
}

function classifyWeightImbalance(ratio: number): Severity {
  if (ratio < 0.02) return "none"
  if (ratio < 0.05) return "mild"
  if (ratio < 0.10) return "moderate"
  return "severe"
}

// ─── Analysis Functions ───────────────────────────────────────

function analyzeForwardHead(
  landmarks: NormalizedLandmark[],
  angle: "front" | "side" | "back"
): PostureFinding | null {
  // Side view: ear → shoulder → hip angle from vertical
  if (angle !== "side") return null
  const ear = landmarks[LM.RIGHT_EAR] ?? landmarks[LM.LEFT_EAR]
  const shoulder = landmarks[LM.RIGHT_SHOULDER] ?? landmarks[LM.LEFT_SHOULDER]
  const hip = landmarks[LM.RIGHT_HIP] ?? landmarks[LM.LEFT_HIP]
  if (!ear || !shoulder || !hip) return null

  const angleDeg = angleFromVertical(ear, shoulder)
  const severity = classifyForwardHead(angleDeg)
  const conf = Math.max(0.5, 1 - angleDeg / 50)

  return {
    characteristic: "Forward Head",
    severity,
    icon: CHARACTERISTIC_META["Forward Head"].icon,
    description:
      severity === "none"
        ? "Head is well-aligned above shoulders"
        : `Head protrudes forward ~${Math.round(angleDeg)}° relative to shoulders`,
    explanation: CHARACTERISTIC_META["Forward Head"].explanations[severity],
    confidence: Math.round(conf * 100) / 100,
    angleDegrees: Math.round(angleDeg),
  }
}

function analyzeRoundedShoulders(
  landmarks: NormalizedLandmark[],
  angle: "front" | "side" | "back"
): PostureFinding | null {
  // Front view: shoulder horizontal offset relative to hip center
  if (angle !== "front") return null
  const lS = landmarks[LM.LEFT_SHOULDER]
  const rS = landmarks[LM.RIGHT_SHOULDER]
  const lH = landmarks[LM.LEFT_HIP]
  const rH = landmarks[LM.RIGHT_HIP]
  if (!lS || !rS || !lH || !rH) return null

  const shoulderMidX = (lS.x + rS.x) / 2
  const hipMidX = (lH.x + rH.x) / 2
  const shoulderMidY = (lS.y + rS.y) / 2
  const hipMidY = (lH.y + rH.y) / 2

  const ratio = horizontalOffsetRatio(
    { x: shoulderMidX, y: shoulderMidY },
    { x: hipMidX, y: hipMidY }
  )
  const severity = classifyRoundedShoulders(ratio)
  const conf = Math.max(0.5, 1 - ratio / 0.3)

  return {
    characteristic: "Rounded Shoulders",
    severity,
    icon: CHARACTERISTIC_META["Rounded Shoulders"].icon,
    description:
      severity === "none"
        ? "Shoulders are in neutral position"
        : `Shoulders shifted forward relative to hips (ratio: ${ratio.toFixed(2)})`,
    explanation: CHARACTERISTIC_META["Rounded Shoulders"].explanations[severity],
    confidence: Math.round(conf * 100) / 100,
  }
}

function analyzePelvicTilt(
  landmarks: NormalizedLandmark[],
  angle: "front" | "side" | "back"
): PostureFinding | null {
  // Side view: angle of hip-spine line from vertical
  if (angle !== "side") return null
  const shoulder = landmarks[LM.RIGHT_SHOULDER] ?? landmarks[LM.LEFT_SHOULDER]
  const hip = landmarks[LM.RIGHT_HIP] ?? landmarks[LM.LEFT_HIP]
  if (!shoulder || !hip) return null

  // Hip-to-shoulder line deviation from perfect vertical
  const tiltAngle = angleFromVertical(hip, shoulder)
  const severity = classifyPelvicTilt(tiltAngle)
  const conf = Math.max(0.5, 1 - tiltAngle / 30)

  return {
    characteristic: "Pelvic Tilt",
    severity,
    icon: CHARACTERISTIC_META["Pelvic Tilt"].icon,
    description:
      severity === "none"
        ? "Pelvis is in neutral position"
        : `Pelvic tilt deviation: ~${Math.round(tiltAngle)}°`,
    explanation: CHARACTERISTIC_META["Pelvic Tilt"].explanations[severity],
    confidence: Math.round(conf * 100) / 100,
    angleDegrees: Math.round(tiltAngle),
  }
}

function analyzeKneeValgus(
  landmarks: NormalizedLandmark[],
  angle: "front" | "side" | "back"
): PostureFinding | null {
  // Front view: knee horizontal offset relative to ankle
  if (angle !== "front") return null
  const lK = landmarks[LM.LEFT_KNEE]
  const rK = landmarks[LM.RIGHT_KNEE]
  const lA = landmarks[LM.LEFT_ANKLE]
  const rA = landmarks[LM.RIGHT_ANKLE]
  const lH = landmarks[LM.LEFT_HIP]
  const rH = landmarks[LM.RIGHT_HIP]
  if (!lK || !rK || !lA || !rA || !lH || !rH) return null

  // Check left knee valgus
  const leftRatio = horizontalOffsetRatio(
    { x: lH.x, y: lH.y },
    { x: lK.x, y: lK.y }
  )
  const rightRatio = horizontalOffsetRatio(
    { x: rH.x, y: rH.y },
    { x: rK.x, y: rK.y }
  )

  // Use the worse side
  const ratio = Math.max(leftRatio, rightRatio)
  const severity = classifyKneeValgus(ratio)
  const conf = Math.max(0.5, 1 - ratio / 0.25)

  return {
    characteristic: "Knee Valgus",
    severity,
    icon: CHARACTERISTIC_META["Knee Valgus"].icon,
    description:
      severity === "none"
        ? "Knees are well-aligned with ankles"
        : `Inward knee deviation detected (ratio: ${ratio.toFixed(2)})`,
    explanation: CHARACTERISTIC_META["Knee Valgus"].explanations[severity],
    confidence: Math.round(conf * 100) / 100,
  }
}

function analyzeFlatFeet(
  landmarks: NormalizedLandmark[],
  angle: "front" | "side" | "back"
): PostureFinding | null {
  // Back view: angle between ankle, heel, and foot index
  if (angle !== "back") return null
  const lA = landmarks[LM.LEFT_ANKLE]
  const rA = landmarks[LM.RIGHT_ANKLE]
  const lHeel = landmarks[LM.LEFT_HEEL]
  const rHeel = landmarks[LM.RIGHT_HEEL]
  const lFoot = landmarks[LM.LEFT_FOOT_INDEX]
  const rFoot = landmarks[LM.RIGHT_FOOT_INDEX]
  if (!lA || !rA || !lHeel || !rHeel || !lFoot || !rFoot) return null

  // Measure ankle eversion: angle of ankle-heel-foot line
  // For left foot: ankle → heel → foot_index
  const leftAngle = angleBetween3Points(lFoot, lHeel, lA)
  const rightAngle = angleBetween3Points(rFoot, rHeel, rA)
  const avgAngle = ((leftAngle + rightAngle) / 2) * (180 / Math.PI)
  // Normal is ~180° (straight line). Deviation = |180 - avgAngle|
  const deviation = Math.abs(180 - avgAngle)

  const severity = classifyFlatFeet(deviation)
  const conf = Math.max(0.5, 1 - deviation / 30)

  return {
    characteristic: "Flat Feet",
    severity,
    icon: CHARACTERISTIC_META["Flat Feet"].icon,
    description:
      severity === "none"
        ? "Foot arches appear normal"
        : `Reduced arch support detected (deviation: ~${Math.round(deviation)}°)`,
    explanation: CHARACTERISTIC_META["Flat Feet"].explanations[severity],
    confidence: Math.round(conf * 100) / 100,
    angleDegrees: Math.round(deviation),
  }
}

function analyzeWeightDistribution(
  landmarks: NormalizedLandmark[],
  angle: "front" | "side" | "back"
): PostureFinding | null {
  // Front/back view: compare left vs right hip Y position
  if (angle !== "front" && angle !== "back") return null
  const lH = landmarks[LM.LEFT_HIP]
  const rH = landmarks[LM.RIGHT_HIP]
  const lS = landmarks[LM.LEFT_SHOULDER]
  const rS = landmarks[LM.RIGHT_SHOULDER]
  if (!lH || !rH || !lS || !rS) return null

  // Shoulder tilt
  const shoulderTilt = Math.abs(lS.y - rS.y)
  const hipTilt = Math.abs(lH.y - rH.y)
  const avgTilt = (shoulderTilt + hipTilt) / 2

  const severity = classifyWeightImbalance(avgTilt)
  const conf = Math.max(0.5, 1 - avgTilt / 0.15)

  const sideFavored =
    lH.y < rH.y ? "left" : rH.y < lH.y ? "right" : "neither"

  return {
    characteristic: "Weight Distribution",
    severity,
    icon: CHARACTERISTIC_META["Weight Distribution"].icon,
    description:
      severity === "none"
        ? "Weight is evenly distributed"
        : sideFavored !== "neither"
          ? `Slightly more weight on ${sideFavored} leg`
          : "Uneven weight distribution detected",
    explanation: CHARACTERISTIC_META["Weight Distribution"].explanations[severity],
    confidence: Math.round(conf * 100) / 100,
  }
}

// ─── Main Analysis Pipeline ───────────────────────────────────

interface AngleResults {
  angle: "front" | "side" | "back"
  landmarks: NormalizedLandmark[]
}

export async function analyzePose(
  imageElements: { angle: "front" | "side" | "back"; element: HTMLImageElement }[]
): Promise<PoseAnalysisResult> {
  const startTime = performance.now()

  // 1. Initialize PoseLandmarker (lazy singleton)
  const poseLandmarker = await getPoseLandmarker()

  // 2. Run detection on each image
  const angleResults: AngleResults[] = []
  for (const { angle, element } of imageElements) {
    const result = poseLandmarker.detect(element)
    if (result.landmarks && result.landmarks.length > 0) {
      angleResults.push({ angle, landmarks: result.landmarks[0] })
    }
  }

  if (angleResults.length === 0) {
    const endTime = performance.now()
    return {
      findings: [],
      confidenceScore: 0,
      processingTimeMs: Math.round(endTime - startTime),
      summary: "Could not detect a body in the uploaded photos. Ensure your full body is visible.",
      landmarksDetected: false,
    }
  }

  // 3. Run all posture analyses across all available angles
  const analyses = angleResults.flatMap(({ angle, landmarks }) => [
    analyzeForwardHead(landmarks, angle),
    analyzeRoundedShoulders(landmarks, angle),
    analyzePelvicTilt(landmarks, angle),
    analyzeKneeValgus(landmarks, angle),
    analyzeFlatFeet(landmarks, angle),
    analyzeWeightDistribution(landmarks, angle),
  ])

  // 4. Merge results from different angles — take the worst severity
  const merged = new Map<string, PostureFinding>()
  for (const finding of analyses) {
    if (!finding) continue
    const existing = merged.get(finding.characteristic)
    if (!existing) {
      merged.set(finding.characteristic, finding)
    } else {
      const severityRank: Severity[] = ["none", "mild", "moderate", "severe"]
      if (severityRank.indexOf(finding.severity) > severityRank.indexOf(existing.severity)) {
        merged.set(finding.characteristic, finding)
      }
    }
  }

  const findings = Array.from(merged.values())

  // 5. Compute aggregate confidence
  const confidences = findings
    .filter((f) => f.characteristic !== "Weight Distribution")
    .map((f) => f.confidence)
  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0

  // 6. Generate summary
  const issues = findings.filter((f) => f.severity !== "none")
  const summary =
    issues.length === 0
      ? "Your posture appears well-balanced with no significant issues detected. Keep up the good habits!"
      : `Your posture shows signs of ${issues
          .slice(0, 3)
          .map((f) => f.characteristic.toLowerCase())
          .join(", ")}. ` +
        (issues.length > 3
          ? `${issues.length - 3} other ${issues.length - 3 === 1 ? "area" : "areas"} also need attention. `
          : "") +
        "These observations are based on AI analysis — consult a physiotherapist for a professional assessment."

  const endTime = performance.now()

  return {
    findings,
    confidenceScore: Math.round(avgConfidence * 100) / 100,
    processingTimeMs: Math.round(endTime - startTime),
    summary,
    landmarksDetected: true,
  }
}

// ─── Singleton Model Loader ───────────────────────────────────

let landmarkerInstance: PoseLandmarker | null = null
let loadPromise: Promise<PoseLandmarker> | null = null

async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarkerInstance) return landmarkerInstance
  if (loadPromise) return loadPromise

  loadPromise = loadPoseLandmarker()
  landmarkerInstance = await loadPromise
  return landmarkerInstance
}

async function loadPoseLandmarker(): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  )

  const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
  })

  return poseLandmarker
}

/**
 * Preload the PoseLandmarker model so it's ready when the user starts analysis.
 * Call this early in the component lifecycle.
 */
export function preloadPoseLandmarker(): Promise<PoseLandmarker> {
  return getPoseLandmarker()
}

/**
 * Convert a File to an HTMLImageElement that can be passed to analyzePose.
 */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Clean up object URLs created by fileToImage to avoid memory leaks.
 */
export function revokeImageUrl(img: HTMLImageElement): void {
  if (img.src.startsWith("blob:")) {
    URL.revokeObjectURL(img.src)
  }
}

// ─── Video Analysis Types ──────────────────────────────────────

export interface FrameResult {
  timestamp: number
  landmarks: NormalizedLandmark[] | null
}

export interface GaitMetrics {
  strideLengthScore: number
  cadenceScore: number
  armSwingSymmetry: number
  hipStabilityScore: number
  overallScore: number
  findings: string[]
  severity: Severity
}

export interface SquatMetrics {
  depthScore: number
  kneeTrackingScore: number
  torsoLeanScore: number
  heelContactScore: number
  overallScore: number
  findings: string[]
  severity: Severity
  maxKneeValgusAngle?: number
  maxDepthAngle?: number
}

export interface BendingMetrics {
  romScore: number
  hipHingeScore: number
  symmetryScore: number
  overallScore: number
  findings: string[]
  severity: Severity
  maxForwardAngle?: number
}

export interface MovementAnalysisResult {
  walking: GaitMetrics | null
  squatting: SquatMetrics | null
  bending: BendingMetrics | null
}

export interface VideoAnalysisResult {
  movementAnalysis: MovementAnalysisResult
  processingTimeMs: number
  totalFramesAnalyzed: number
}

// ─── Video Frame Extraction ────────────────────────────────────

/**
 * Extract frames from a video file at regular intervals.
 * Returns an array of frame data with timestamps.
 */
export async function extractFramesFromVideo(
  file: File,
  movementType: "walking" | "squatting" | "bending",
  onProgress?: (frame: number, total: number) => void
): Promise<FrameResult[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.muted = true
    video.playsInline = true
    video.crossOrigin = "anonymous"

    const url = URL.createObjectURL(file)
    video.src = url

    // Determine frame sampling based on movement type
    const frameConfigs: Record<string, { totalFrames: number; minDuration: number }> = {
      walking: { totalFrames: 15, minDuration: 3000 },  // 15 frames across walking
      squatting: { totalFrames: 12, minDuration: 3000 }, // 12 frames across squat cycle
      bending: { totalFrames: 10, minDuration: 2000 },   // 10 frames across bend
    }

    const config = frameConfigs[movementType]

    video.onloadedmetadata = async () => {
      const duration = video.duration * 1000 // ms
      if (duration < 2000) {
        URL.revokeObjectURL(url)
        reject(new Error("Video must be at least 2 seconds long"))
        return
      }

      const actualFrames = config.totalFrames
      const interval = duration / (actualFrames + 1)

      const results: FrameResult[] = []
      const canvas = document.createElement("canvas")

      for (let i = 0; i < actualFrames; i++) {
        const seekTime = (i + 1) * interval / 1000

        await seekVideo(video, seekTime)

        // Draw frame to canvas
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext("2d")
        if (!ctx) continue
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const timestamp = Math.round(seekTime * 1000)
        results.push({ timestamp, landmarks: null }) // landmarks will be filled later

        onProgress?.(i + 1, actualFrames)
      }

      URL.revokeObjectURL(url)
      video.remove()
      resolve(results)
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load video file"))
    }

    video.load()
  })
}

/** Seek to a specific time in the video and wait */
function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener("seeked", handler)
      resolve()
    }
    video.addEventListener("seeked", handler)
    video.currentTime = time
    // Fallback if seek doesn't fire
    setTimeout(resolve, 300)
  })
}

/**
 * Draw a video frame to an HTMLCanvasElement for MediaPipe processing.
 */
export function frameToCanvas(frame: FrameResult): HTMLCanvasElement | null {
  // This is a helper — actual drawing happens in extractFramesFromVideo
  return null
}

// ─── Gait Analysis (Walking) ───────────────────────────────────

/**
 * Analyze walking gait from a sequence of pose landmarks.
 */
export function analyzeGait(frameResults: FrameResult[]): GaitMetrics {
  // Filter frames with valid landmarks
  const validFrames = frameResults.filter((f) => f.landmarks !== null && f.landmarks.length >= 33)

  if (validFrames.length < 3) {
    return {
      strideLengthScore: 0.5,
      cadenceScore: 0.5,
      armSwingSymmetry: 0.5,
      hipStabilityScore: 0.5,
      overallScore: 0.5,
      findings: ["Unable to detect full body in most frames. Results may be less accurate."],
      severity: "moderate",
    }
  }

  const landmarks = validFrames.map((f) => f.landmarks!)

  // ── Stride Analysis ──
  // Track the horizontal distance between ankles across frames
  const ankleDistances = landmarks.map((lm) => {
    const lA = lm[LM.LEFT_ANKLE]
    const rA = lm[LM.RIGHT_ANKLE]
    if (!lA || !rA) return null
    return Math.abs(lA.x - rA.x)
  }).filter((d): d is number => d !== null)

  const avgAnkleDistance = ankleDistances.length > 0
    ? ankleDistances.reduce((a, b) => a + b, 0) / ankleDistances.length
    : 0

  // Stride variability — consistent distances indicate smoother gait
  const strideVariability = ankleDistances.length > 1
    ? Math.sqrt(ankleDistances.map((d) => Math.pow(d - avgAnkleDistance, 2)).reduce((a, b) => a + b, 0) / ankleDistances.length)
    : 0.1

  const strideLengthScore = Math.max(0, Math.min(1, 1 - strideVariability / 0.15))

  // ── Arm Swing Symmetry ──
  // Compare left vs right wrist positions relative to shoulders
  const armSwings = landmarks.map((lm) => {
    const lW = lm[LM.LEFT_WRIST]
    const rW = lm[LM.RIGHT_WRIST]
    const lS = lm[LM.LEFT_SHOULDER]
    const rS = lm[LM.RIGHT_SHOULDER]
    if (!lW || !rW || !lS || !rS) return null
    // Distance of wrist from shoulder as a measure of arm swing
    const leftSwing = Math.sqrt(Math.pow(lW.x - lS.x, 2) + Math.pow(lW.y - lS.y, 2))
    const rightSwing = Math.sqrt(Math.pow(rW.x - rS.x, 2) + Math.pow(rW.y - rS.y, 2))
    return { leftSwing, rightSwing }
  }).filter((s): s is { leftSwing: number; rightSwing: number } => s !== null)

  const avgArmSymmetry = armSwings.length > 0
    ? armSwings.map((s) => Math.min(s.leftSwing, s.rightSwing) / Math.max(s.leftSwing, s.rightSwing))
        .reduce((a, b) => a + b, 0) / armSwings.length
    : 0.5

  const armSwingSymmetry = Math.max(0, Math.min(1, avgArmSymmetry))

  // ── Hip Stability ──
  // Measure vertical hip movement — less bobbing = more stable
  const hipPositions = landmarks.map((lm) => {
    const lH = lm[LM.LEFT_HIP]
    const rH = lm[LM.RIGHT_HIP]
    if (!lH || !rH) return null
    return (lH.y + rH.y) / 2 // average hip Y
  }).filter((y): y is number => y !== null)

  const hipVariability = hipPositions.length > 1
    ? Math.sqrt(hipPositions.map((y) => Math.pow(y - hipPositions.reduce((a, b) => a + b, 0) / hipPositions.length, 2)).reduce((a, b) => a + b, 0) / hipPositions.length)
    : 0.05

  const hipStabilityScore = Math.max(0, Math.min(1, 1 - hipVariability / 0.08))

  // ── Cadence Score ──
  // Count how many times ankles cross (stride changes) per unit time
  const crossCount = ankleDistances.length > 1
    ? ankleDistances.reduce((count, curr, i) => {
        if (i === 0) return count
        // A crossing happens when stride distance decreases significantly
        return curr < ankleDistances[i - 1] * 0.7 ? count + 1 : count
      }, 0)
    : 1

  const cadenceScore = Math.max(0, Math.min(1, Math.min(crossCount / 4, 1)))

  // ── Overall ──
  const overallScore = (strideLengthScore + cadenceScore + armSwingSymmetry + hipStabilityScore) / 4

  // ── Findings ──
  const findings: string[] = []
  if (strideLengthScore < 0.5) findings.push("Stride length variability detected — gait may be unsteady")
  if (armSwingSymmetry < 0.6) findings.push("Arm swing asymmetry detected — one arm swings less than the other")
  if (hipStabilityScore < 0.5) findings.push("Excessive hip movement detected — suggests core instability during gait")
  if (overallScore >= 0.7) findings.push("Gait pattern appears balanced and stable")
  if (findings.length === 0) findings.push("Basic gait pattern detected — no major issues observed")

  // ── Severity ──
  let severity: Severity = "none"
  if (overallScore < 0.35) severity = "severe"
  else if (overallScore < 0.5) severity = "moderate"
  else if (overallScore < 0.7) severity = "mild"

  return {
    strideLengthScore: Math.round(strideLengthScore * 100) / 100,
    cadenceScore: Math.round(cadenceScore * 100) / 100,
    armSwingSymmetry: Math.round(armSwingSymmetry * 100) / 100,
    hipStabilityScore: Math.round(hipStabilityScore * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    findings,
    severity,
  }
}

// ─── Squat Analysis ────────────────────────────────────────────

/**
 * Analyze squat form from a sequence of pose landmarks.
 */
export function analyzeSquat(frameResults: FrameResult[]): SquatMetrics {
  const validFrames = frameResults.filter((f) => f.landmarks !== null && f.landmarks.length >= 33)

  if (validFrames.length < 3) {
    return {
      depthScore: 0.5,
      kneeTrackingScore: 0.5,
      torsoLeanScore: 0.5,
      heelContactScore: 0.5,
      overallScore: 0.5,
      findings: ["Unable to detect full body in most frames. Results may be less accurate."],
      severity: "moderate",
    }
  }

  const landmarks = validFrames.map((f) => f.landmarks!)

  // ── Depth Analysis ──
  // Measure how low the hips go relative to knees (parallel squat = good)
  const hipKneeRatios = landmarks.map((lm) => {
    const lH = lm[LM.LEFT_HIP]
    const lK = lm[LM.LEFT_KNEE]
    const lA = lm[LM.LEFT_ANKLE]
    if (!lH || !lK || !lA) return null
    // Ratio of hip height to knee height
    const hipHeight = lH.y
    const kneeHeight = lK.y
    const ankleHeight = lA.y
    // Normalized depth: 0 = standing, 1 = hip below knee (deep)
    const depth = Math.max(0, Math.min(1, (hipHeight - kneeHeight) / (ankleHeight - kneeHeight + 0.001)))
    return depth
  }).filter((d): d is number => d !== null)

  const maxDepth = hipKneeRatios.length > 0 ? Math.max(...hipKneeRatios) : 0

  // Ideal depth is around 0.7-0.9 (hip crease below knee)
  const depthScore = maxDepth >= 0.6 && maxDepth <= 1.0
    ? Math.min(1, maxDepth / 0.8)
    : Math.max(0, 1 - Math.abs(0.7 - maxDepth))

  // ── Knee Tracking (Valgus check) ──
  // Measure knee inward deviation from hip-ankle line
  const kneeDeviation = landmarks.map((lm) => {
    const lH = lm[LM.LEFT_HIP]
    const rH = lm[LM.RIGHT_HIP]
    const lK = lm[LM.LEFT_KNEE]
    const rK = lm[LM.RIGHT_KNEE]
    const lA = lm[LM.LEFT_ANKLE]
    const rA = lm[LM.RIGHT_ANKLE]
    if (!lH || !rH || !lK || !rK || !lA || !rA) return null
    // Left knee: how far is knee from line between hip and ankle
    const leftKneeOffset = Math.abs(lK.x - (lH.x + lA.x) / 2)
    const rightKneeOffset = Math.abs(rK.x - (rH.x + rA.x) / 2)
    return (leftKneeOffset + rightKneeOffset) / 2
  }).filter((d): d is number => d !== null)

  const avgKneeDeviation = kneeDeviation.length > 0
    ? kneeDeviation.reduce((a, b) => a + b, 0) / kneeDeviation.length
    : 0

  const kneeTrackingScore = Math.max(0, Math.min(1, 1 - avgKneeDeviation / 0.15))
  const maxKneeValgusAngle = avgKneeDeviation * 100 // rough angle estimate

  // ── Torso Lean ──
  // Measure angle of torso relative to vertical
  const torsoAngles = landmarks.map((lm) => {
    const nose = lm[LM.NOSE]
    const lS = lm[LM.LEFT_SHOULDER]
    const rS = lm[LM.RIGHT_SHOULDER]
    const lH = lm[LM.LEFT_HIP]
    const rH = lm[LM.RIGHT_HIP]
    if (!nose || !lS || !rS || !lH || !rH) return null
    const shoulderMid = { x: (lS.x + rS.x) / 2, y: (lS.y + rS.y) / 2 }
    const hipMid = { x: (lH.x + rH.x) / 2, y: (lH.y + rH.y) / 2 }
    // Angle from vertical of the spine
    return angleFromVertical(shoulderMid, hipMid)
  }).filter((a): a is number => a !== null)

  const avgTorsoAngle = torsoAngles.length > 0
    ? torsoAngles.reduce((a, b) => a + b, 0) / torsoAngles.length
    : 0

  // Ideal torso lean during squat: ~30-45° from vertical
  const torsoLeanScore = avgTorsoAngle >= 20 && avgTorsoAngle <= 50
    ? 1 - Math.abs(35 - avgTorsoAngle) / 35
    : Math.max(0, 0.3)

  // ── Heel Contact ──
  // Measure if heels are on ground by checking ankle angle relative to foot
  const heelPosition = landmarks.map((lm) => {
    const lHeel = lm[LM.LEFT_HEEL]
    const rHeel = lm[LM.RIGHT_HEEL]
    const lA = lm[LM.LEFT_ANKLE]
    const rA = lm[LM.RIGHT_ANKLE]
    const lFoot = lm[LM.LEFT_FOOT_INDEX]
    const rFoot = lm[LM.RIGHT_FOOT_INDEX]
    if (!lHeel || !rHeel || !lA || !rA || !lFoot || !rFoot) return null
    const leftHeelDown = lHeel.y > lA.y
    const rightHeelDown = rHeel.y > rA.y
    return (leftHeelDown && rightHeelDown) ? 1 : 0.5
  }).filter((d): d is 1 | 0.5 => d !== null)

  const heelContactScore = heelPosition.length > 0
    ? heelPosition.reduce((a, b) => a + b, 0) / heelPosition.length
    : 0.5

  // ── Overall ──
  const overallScore = (depthScore + kneeTrackingScore + torsoLeanScore + heelContactScore) / 4

  // ── Findings ──
  const findings: string[] = []
  if (maxDepth < 0.5) findings.push("Squat depth is limited — try to descend until hips are at or below knee level")
  if (kneeTrackingScore < 0.6) findings.push("Knees tracking inward (valgus) — strengthen glute medius and focus on knees tracking over toes")
  if (torsoLeanScore < 0.5) findings.push("Excessive forward lean — keep chest up and engage core throughout the movement")
  if (heelContactScore < 0.7) findings.push("Heels may be lifting — ensure weight stays mid-foot. Try squat shoes or place heels on small plates")
  if (overallScore >= 0.7) findings.push("Squat form looks good — good depth with stable knee tracking")
  if (findings.length === 0) findings.push("Basic squat pattern detected")

  let severity: Severity = "none"
  if (overallScore < 0.35) severity = "severe"
  else if (overallScore < 0.5) severity = "moderate"
  else if (overallScore < 0.7) severity = "mild"

  return {
    depthScore: Math.round(depthScore * 100) / 100,
    kneeTrackingScore: Math.round(kneeTrackingScore * 100) / 100,
    torsoLeanScore: Math.round(torsoLeanScore * 100) / 100,
    heelContactScore: Math.round(heelContactScore * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    findings,
    severity,
    maxKneeValgusAngle: Math.round(maxKneeValgusAngle),
    maxDepthAngle: Math.round(maxDepth * 90), // convert to rough angle
  }
}

// ─── Bending Analysis ──────────────────────────────────────────

/**
 * Analyze bending (forward fold) range of motion and form.
 */
export function analyzeBending(frameResults: FrameResult[]): BendingMetrics {
  const validFrames = frameResults.filter((f) => f.landmarks !== null && f.landmarks.length >= 33)

  if (validFrames.length < 3) {
    return {
      romScore: 0.5,
      hipHingeScore: 0.5,
      symmetryScore: 0.5,
      overallScore: 0.5,
      findings: ["Unable to detect full body in most frames. Results may be less accurate."],
      severity: "moderate",
    }
  }

  const landmarks = validFrames.map((f) => f.landmarks!)

  // ── Range of Motion ──
  // Measure maximum forward bend angle
  const bendAngles = landmarks.map((lm) => {
    const lS = lm[LM.LEFT_SHOULDER]
    const rS = lm[LM.RIGHT_SHOULDER]
    const lH = lm[LM.LEFT_HIP]
    const rH = lm[LM.RIGHT_HIP]
    const lK = lm[LM.LEFT_KNEE]
    const rK = lm[LM.RIGHT_KNEE]
    if (!lS || !rS || !lH || !rH || !lK || !rK) return null

    const shoulderMid = { x: (lS.x + rS.x) / 2, y: (lS.y + rS.y) / 2 }
    const hipMid = { x: (lH.x + rH.x) / 2, y: (lH.y + rH.y) / 2 }
    const kneeMid = { x: (lK.x + rK.x) / 2, y: (lK.y + rK.y) / 2 }

    // Angle at hip: shoulder-hip-knee
    const angle = angleBetween3Points(shoulderMid, hipMid, kneeMid) * (180 / Math.PI)
    return angle
  }).filter((a): a is number => a !== null)

  const maxBendAngle = bendAngles.length > 0
    ? Math.min(...bendAngles) // smallest angle = deepest bend
    : 90

  // ROM score: 0° (can touch toes) = 1.0, 90° (barely bend) = 0.0
  const romScore = Math.max(0, Math.min(1, 1 - maxBendAngle / 100))

  // ── Hip Hinge Quality ──
  // Check if spine stays relatively straight during bend (vs rounding)
  // Measure the angle between shoulder, mid-back, and hip
  const spinalCurvatures = landmarks.map((lm) => {
    const nose = lm[LM.NOSE]
    const lS = lm[LM.LEFT_SHOULDER]
    const rS = lm[LM.RIGHT_SHOULDER]
    const lH = lm[LM.LEFT_HIP]
    const rH = lm[LM.RIGHT_HIP]
    if (!nose || !lS || !rS || !lH || !rH) return null

    const shoulderMid = { x: (lS.x + rS.x) / 2, y: (lS.y + rS.y) / 2 }
    const hipMid = { x: (lH.x + rH.x) / 2, y: (lH.y + rH.y) / 2 }

    // Nose-to-shoulder vs shoulder-to-hip angle indicates spinal flexion
    const spineAngle = angleBetween3Points(nose, shoulderMid, hipMid) * (180 / Math.PI)
    return Math.abs(180 - spineAngle) // deviation from straight line
  }).filter((a): a is number => a !== null)

  const avgSpinalDeviation = spinalCurvatures.length > 0
    ? spinalCurvatures.reduce((a, b) => a + b, 0) / spinalCurvatures.length
    : 20

  // Less spinal deviation = better hip hinge
  const hipHingeScore = Math.max(0, Math.min(1, 1 - avgSpinalDeviation / 45))

  // ── Symmetry ──
  // Compare left vs right side during bend
  const symmetryAngles = landmarks.map((lm) => {
    const lS = lm[LM.LEFT_SHOULDER]
    const rS = lm[LM.RIGHT_SHOULDER]
    const lH = lm[LM.LEFT_HIP]
    const rH = lm[LM.RIGHT_HIP]
    if (!lS || !rS || !lH || !rH) return null
    // Difference in shoulder height during bend
    const shoulderDiff = Math.abs(lS.y - rS.y)
    return shoulderDiff
  }).filter((d): d is number => d !== null)

  const avgSymmetry = symmetryAngles.length > 0
    ? symmetryAngles.reduce((a, b) => a + b, 0) / symmetryAngles.length
    : 0.05

  const symmetryScore = Math.max(0, Math.min(1, 1 - avgSymmetry / 0.1))

  // ── Overall ──
  const overallScore = (romScore + hipHingeScore + symmetryScore) / 3

  // ── Findings ──
  const findings: string[] = []
  if (romScore < 0.4) findings.push("Limited forward bend range of motion — consider daily hamstring stretching")
  if (hipHingeScore < 0.5) findings.push("Excessive spinal rounding — focus on hip hinge pattern: push hips back before bending forward")
  if (symmetryScore < 0.6) findings.push("Asymmetry detected — one side bends more easily, may indicate hip or back tightness")
  if (overallScore >= 0.7) findings.push("Good bending mechanics — maintaining neutral spine with adequate range of motion")
  if (findings.length === 0) findings.push("Basic bending pattern detected")

  let severity: Severity = "none"
  if (overallScore < 0.35) severity = "severe"
  else if (overallScore < 0.5) severity = "moderate"
  else if (overallScore < 0.7) severity = "mild"

  return {
    romScore: Math.round(romScore * 100) / 100,
    hipHingeScore: Math.round(hipHingeScore * 100) / 100,
    symmetryScore: Math.round(symmetryScore * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    findings,
    severity,
    maxForwardAngle: Math.round(maxBendAngle),
  }
}

// ─── Video Analysis Pipeline ──────────────────────────────────

interface VideoFrameInput {
  timestamp: number
  canvas: HTMLCanvasElement
}

/**
 * Run full video analysis on uploaded movement videos.
 * Extracts frames, runs pose detection, and computes movement metrics.
 */
export async function analyzeMovementVideos(
  videoFiles: {
    movementType: "walking" | "squatting" | "bending"
    file: File
  }[],
  onProgress?: (movementType: string, progress: number, status: string) => void
): Promise<MovementAnalysisResult> {
  const result: MovementAnalysisResult = {
    walking: null,
    squatting: null,
    bending: null,
  }

  if (videoFiles.length === 0) return result

  const poseLandmarker = await getPoseLandmarker()

  for (const { movementType, file } of videoFiles) {
    onProgress?.(movementType, 0, `Extracting frames from ${movementType} video...`)

    try {
      // Extract frames from video
      const frames = await extractFramesFromVideo(file, movementType, (frame, total) => {
        const pct = Math.round((frame / total) * 40) // 40% progress for extraction
        onProgress?.(movementType, pct, `Extracting frame ${frame}/${total}...`)
      })

      // Process each frame through MediaPipe
      onProgress?.(movementType, 45, "Running pose detection on frames...")

      const canvas = document.createElement("canvas")
      const video = document.createElement("video")
      video.muted = true
      video.playsInline = true
      const url = URL.createObjectURL(file)
      video.src = url
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve()
        video.load()
      })

      const processedResults: FrameResult[] = []

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]
        const seekTime = frame.timestamp / 1000
        await seekVideo(video, seekTime)

        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          processedResults.push({ ...frame, landmarks: null })
          continue
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        try {
          const detection = poseLandmarker.detect(canvas)
          if (detection.landmarks && detection.landmarks.length > 0) {
            processedResults.push({ ...frame, landmarks: detection.landmarks[0] })
          } else {
            processedResults.push({ ...frame, landmarks: null })
          }
        } catch {
          processedResults.push({ ...frame, landmarks: null })
        }

        const pct = 45 + Math.round(((i + 1) / frames.length) * 35) // up to 80%
        onProgress?.(movementType, pct, `Analyzing frame ${i + 1}/${frames.length}...`)
      }

      URL.revokeObjectURL(url)
      video.remove()

      // Run movement-specific analysis
      onProgress?.(movementType, 85, `Analyzing ${movementType} pattern...`)

      switch (movementType) {
        case "walking":
          result.walking = analyzeGait(processedResults)
          break
        case "squatting":
          result.squatting = analyzeSquat(processedResults)
          break
        case "bending":
          result.bending = analyzeBending(processedResults)
          break
      }

      onProgress?.(movementType, 100, `${movementType} analysis complete!`)
    } catch (err) {
      console.error(`Failed to analyze ${movementType} video:`, err)
      // Set fallback result with error message
      const fallback: any = {
        overallScore: 0,
        findings: [`Could not analyze ${movementType} video. ${err instanceof Error ? err.message : "Please try again with a clearer video."}`],
        severity: "moderate",
      }
      // Add type-specific fallback fields
      if (movementType === "walking") {
        result.walking = { ...fallback, strideLengthScore: 0, cadenceScore: 0, armSwingSymmetry: 0, hipStabilityScore: 0 }
      } else if (movementType === "squatting") {
        result.squatting = { ...fallback, depthScore: 0, kneeTrackingScore: 0, torsoLeanScore: 0, heelContactScore: 0 }
      } else {
        result.bending = { ...fallback, romScore: 0, hipHingeScore: 0, symmetryScore: 0 }
      }
    }
  }

  return result
}

export const POSE_MODEL_VERSION = "mediapipe-pose-landmarker-lite-v1"
