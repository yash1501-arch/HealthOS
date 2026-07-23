import { describe, it, expect } from "vitest"
import { analyzeGait, analyzeSquat, analyzeBending } from "@/lib/pose-analysis"
import type { FrameResult } from "@/lib/pose-analysis"

// ─── Mock Landmark Helpers ───────────────────────────────────────

function createMockLandmark(x: number, y: number) {
  return { x, y, z: 0, visibility: 1 }
}

function createMockFrame(
  overrides: Partial<{
    nose: { x: number; y: number }
    leftShoulder: { x: number; y: number }
    rightShoulder: { x: number; y: number }
    leftHip: { x: number; y: number }
    rightHip: { x: number; y: number }
    leftKnee: { x: number; y: number }
    rightKnee: { x: number; y: number }
    leftAnkle: { x: number; y: number }
    rightAnkle: { x: number; y: number }
    leftHeel: { x: number; y: number }
    rightHeel: { x: number; y: number }
    leftFootIndex: { x: number; y: number }
    rightFootIndex: { x: number; y: number }
    leftWrist: { x: number; y: number }
    rightWrist: { x: number; y: number }
    leftElbow: { x: number; y: number }
    rightElbow: { x: number; y: number }
  }>
): FrameResult {
  const lm = new Array(33).fill(null).map(() => createMockLandmark(0.5, 0.5))

  // Fill in landmarks
  if (overrides.nose) lm[0] = createMockLandmark(overrides.nose.x, overrides.nose.y)
  if (overrides.leftShoulder) lm[11] = createMockLandmark(overrides.leftShoulder.x, overrides.leftShoulder.y)
  if (overrides.rightShoulder) lm[12] = createMockLandmark(overrides.rightShoulder.x, overrides.rightShoulder.y)
  if (overrides.leftHip) lm[23] = createMockLandmark(overrides.leftHip.x, overrides.leftHip.y)
  if (overrides.rightHip) lm[24] = createMockLandmark(overrides.rightHip.x, overrides.rightHip.y)
  if (overrides.leftKnee) lm[25] = createMockLandmark(overrides.leftKnee.x, overrides.leftKnee.y)
  if (overrides.rightKnee) lm[26] = createMockLandmark(overrides.rightKnee.x, overrides.rightKnee.y)
  if (overrides.leftAnkle) lm[27] = createMockLandmark(overrides.leftAnkle.x, overrides.leftAnkle.y)
  if (overrides.rightAnkle) lm[28] = createMockLandmark(overrides.rightAnkle.x, overrides.rightAnkle.y)
  if (overrides.leftHeel) lm[29] = createMockLandmark(overrides.leftHeel.x, overrides.leftHeel.y)
  if (overrides.rightHeel) lm[30] = createMockLandmark(overrides.rightHeel.x, overrides.rightHeel.y)
  if (overrides.leftFootIndex) lm[31] = createMockLandmark(overrides.leftFootIndex.x, overrides.leftFootIndex.y)
  if (overrides.rightFootIndex) lm[32] = createMockLandmark(overrides.rightFootIndex.x, overrides.rightFootIndex.y)
  if (overrides.leftWrist) lm[15] = createMockLandmark(overrides.leftWrist.x, overrides.leftWrist.y)
  if (overrides.rightWrist) lm[16] = createMockLandmark(overrides.rightWrist.x, overrides.rightWrist.y)
  if (overrides.leftElbow) lm[13] = createMockLandmark(overrides.leftElbow.x, overrides.leftElbow.y)
  if (overrides.rightElbow) lm[14] = createMockLandmark(overrides.rightElbow.x, overrides.rightElbow.y)

  return { timestamp: 100, landmarks: lm as any }
}

// ─── Gait Analysis Tests ────────────────────────────────────────

describe("analyzeGait", () => {
  it("returns findings for limited frames", () => {
    const frames = [createMockFrame({})]
    const result = analyzeGait(frames)
    expect(result.findings.length).toBeGreaterThan(0)
    expect(result.overallScore).toBeGreaterThanOrEqual(0)
    expect(result.overallScore).toBeLessThanOrEqual(1)
  })

  it("analyzes balanced gait with proper landmarks", () => {
    const frames: FrameResult[] = []
    for (let i = 0; i < 5; i++) {
      const offset = Math.sin(i * 0.5) * 0.02
      frames.push(
        createMockFrame({
          leftShoulder: { x: 0.45, y: 0.3 },
          rightShoulder: { x: 0.55, y: 0.3 },
          leftHip: { x: 0.48, y: 0.5 },
          rightHip: { x: 0.52, y: 0.5 },
          leftKnee: { x: 0.48, y: 0.65 },
          rightKnee: { x: 0.52, y: 0.65 },
          leftAnkle: { x: 0.48 + offset, y: 0.85 },
          rightAnkle: { x: 0.52 - offset, y: 0.85 },
          leftWrist: { x: 0.35, y: 0.4 },
          rightWrist: { x: 0.65, y: 0.4 },
          leftHeel: { x: 0.48, y: 0.88 },
          rightHeel: { x: 0.52, y: 0.88 },
          leftFootIndex: { x: 0.48, y: 0.92 },
          rightFootIndex: { x: 0.52, y: 0.92 },
        })
      )
    }
    const result = analyzeGait(frames)
    expect(result.strideLengthScore).toBeGreaterThanOrEqual(0)
    expect(result.armSwingSymmetry).toBeGreaterThanOrEqual(0)
    expect(result.hipStabilityScore).toBeGreaterThanOrEqual(0)
  })

  it("handles empty frames gracefully", () => {
    const result = analyzeGait([])
    expect(result.severity).toBe("moderate")
    expect(result.overallScore).toBe(0.5)
  })
})

// ─── Squat Analysis Tests ───────────────────────────────────────

describe("analyzeSquat", () => {
  it("returns severity for limited frames", () => {
    const frames = [createMockFrame({})]
    const result = analyzeSquat(frames)
    expect(result.severity).toBe("moderate")
  })

  it("analyzes proper squat form", () => {
    const frames: FrameResult[] = [
      createMockFrame({
        nose: { x: 0.5, y: 0.15 },
        leftShoulder: { x: 0.45, y: 0.25 },
        rightShoulder: { x: 0.55, y: 0.25 },
        leftHip: { x: 0.48, y: 0.55 },
        rightHip: { x: 0.52, y: 0.55 },
        leftKnee: { x: 0.47, y: 0.7 },
        rightKnee: { x: 0.53, y: 0.7 },
        leftAnkle: { x: 0.48, y: 0.9 },
        rightAnkle: { x: 0.52, y: 0.9 },
        leftHeel: { x: 0.48, y: 0.92 },
        rightHeel: { x: 0.52, y: 0.92 },
        leftFootIndex: { x: 0.5, y: 0.95 },
        rightFootIndex: { x: 0.5, y: 0.95 },
      }),
      createMockFrame({
        nose: { x: 0.5, y: 0.2 },
        leftShoulder: { x: 0.45, y: 0.3 },
        rightShoulder: { x: 0.55, y: 0.3 },
        leftHip: { x: 0.48, y: 0.7 },
        rightHip: { x: 0.52, y: 0.7 },
        leftKnee: { x: 0.47, y: 0.7 },
        rightKnee: { x: 0.53, y: 0.7 },
        leftAnkle: { x: 0.48, y: 0.9 },
        rightAnkle: { x: 0.52, y: 0.9 },
        leftHeel: { x: 0.48, y: 0.92 },
        rightHeel: { x: 0.52, y: 0.92 },
        leftFootIndex: { x: 0.5, y: 0.95 },
        rightFootIndex: { x: 0.5, y: 0.95 },
      }),
      createMockFrame({
        nose: { x: 0.5, y: 0.25 },
        leftShoulder: { x: 0.45, y: 0.35 },
        rightShoulder: { x: 0.55, y: 0.35 },
        leftHip: { x: 0.48, y: 0.8 },
        rightHip: { x: 0.52, y: 0.8 },
        leftKnee: { x: 0.47, y: 0.75 },
        rightKnee: { x: 0.53, y: 0.75 },
        leftAnkle: { x: 0.48, y: 0.9 },
        rightAnkle: { x: 0.52, y: 0.9 },
        leftHeel: { x: 0.48, y: 0.92 },
        rightHeel: { x: 0.52, y: 0.92 },
        leftFootIndex: { x: 0.5, y: 0.95 },
        rightFootIndex: { x: 0.5, y: 0.95 },
      }),
    ]
    const result = analyzeSquat(frames)
    expect(result.depthScore).toBeGreaterThanOrEqual(0)
    expect(result.kneeTrackingScore).toBeGreaterThanOrEqual(0)
    expect(result.torsoLeanScore).toBeGreaterThanOrEqual(0)
    expect(result.findings.length).toBeGreaterThan(0)
  })
})

// ─── Bending Analysis Tests ─────────────────────────────────────

describe("analyzeBending", () => {
  it("returns results for minimal frames", () => {
    const frames = [createMockFrame({})]
    const result = analyzeBending(frames)
    expect(result.severity).toBe("moderate")
  })

  it("analyzes bending pattern", () => {
    const frames: FrameResult[] = [
      createMockFrame({
        nose: { x: 0.5, y: 0.2 },
        leftShoulder: { x: 0.45, y: 0.3 },
        rightShoulder: { x: 0.55, y: 0.3 },
        leftHip: { x: 0.48, y: 0.5 },
        rightHip: { x: 0.52, y: 0.5 },
        leftKnee: { x: 0.48, y: 0.7 },
        rightKnee: { x: 0.52, y: 0.7 },
        leftAnkle: { x: 0.48, y: 0.9 },
        rightAnkle: { x: 0.52, y: 0.9 },
        leftHeel: { x: 0.48, y: 0.92 },
        rightHeel: { x: 0.52, y: 0.92 },
        leftFootIndex: { x: 0.5, y: 0.95 },
        rightFootIndex: { x: 0.5, y: 0.95 },
      }),
      createMockFrame({
        nose: { x: 0.55, y: 0.5 },
        leftShoulder: { x: 0.5, y: 0.55 },
        rightShoulder: { x: 0.6, y: 0.55 },
        leftHip: { x: 0.48, y: 0.6 },
        rightHip: { x: 0.52, y: 0.6 },
        leftKnee: { x: 0.48, y: 0.7 },
        rightKnee: { x: 0.52, y: 0.7 },
        leftAnkle: { x: 0.48, y: 0.9 },
        rightAnkle: { x: 0.52, y: 0.9 },
        leftHeel: { x: 0.48, y: 0.92 },
        rightHeel: { x: 0.52, y: 0.92 },
        leftFootIndex: { x: 0.5, y: 0.95 },
        rightFootIndex: { x: 0.5, y: 0.95 },
      }),
      createMockFrame({
        nose: { x: 0.6, y: 0.65 },
        leftShoulder: { x: 0.55, y: 0.65 },
        rightShoulder: { x: 0.65, y: 0.65 },
        leftHip: { x: 0.48, y: 0.65 },
        rightHip: { x: 0.52, y: 0.65 },
        leftKnee: { x: 0.48, y: 0.7 },
        rightKnee: { x: 0.52, y: 0.7 },
        leftAnkle: { x: 0.48, y: 0.9 },
        rightAnkle: { x: 0.52, y: 0.9 },
        leftHeel: { x: 0.48, y: 0.92 },
        rightHeel: { x: 0.52, y: 0.92 },
        leftFootIndex: { x: 0.5, y: 0.95 },
        rightFootIndex: { x: 0.5, y: 0.95 },
      }),
    ]
    const result = analyzeBending(frames)
    expect(result.romScore).toBeGreaterThanOrEqual(0)
    expect(result.hipHingeScore).toBeGreaterThanOrEqual(0)
    expect(result.symmetryScore).toBeGreaterThanOrEqual(0)
  })
})
