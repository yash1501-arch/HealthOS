import { describe, it, expect } from "vitest"
import {
  validateAIOutput,
  detectEmergencySymptoms,
  MEDICAL_DISCLAIMER,
  EMERGENCY_MESSAGE,
} from "@/lib/ai/safety-engine"

// ─── detectEmergencySymptoms ─────────────────────────────────────

describe("detectEmergencySymptoms", () => {
  it("detects chest pain", () => {
    const result = detectEmergencySymptoms("Patient reports chest pain")
    expect(result.detected).toBe(true)
    expect(result.matches[0].toLowerCase()).toContain("chest pain")
  })

  it("detects suicidal ideation", () => {
    const result = detectEmergencySymptoms("I feel suicidal and need help")
    expect(result.detected).toBe(true)
  })

  it("detects difficulty breathing", () => {
    const result = detectEmergencySymptoms("Having difficulty breathing")
    expect(result.detected).toBe(true)
  })

  it("detects sudden vision loss", () => {
    const result = detectEmergencySymptoms("Sudden vision loss in right eye")
    expect(result.detected).toBe(true)
  })

  it("returns false for non-emergency text", () => {
    const result = detectEmergencySymptoms("Patient has mild headache")
    expect(result.detected).toBe(false)
  })
})

// ─── validateAIOutput ─────────────────────────────────────────────

describe("validateAIOutput", () => {
  it("rewrites diagnostic language", () => {
    const output = "Based on your data, you have high cholesterol."
    const result = validateAIOutput(output, "recommendation")
    expect(result.sanitizedOutput).not.toContain("you have")
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("detects emergency in input and returns emergency message", () => {
    const output = "Let me analyze your data."
    const input = "I'm having chest pain"
    const result = validateAIOutput(output, "recommendation", input)
    expect(result.emergencyDetected).toBe(true)
    expect(result.sanitizedOutput).toBe(EMERGENCY_MESSAGE)
    expect(result.safe).toBe(false)
  })

  it("injects disclaimer when missing", () => {
    const output = "Your posture has improved this month."
    const result = validateAIOutput(output, "posture")
    expect(result.sanitizedOutput).toContain("not medical advice")
    expect(result.sanitizedOutput).toContain(MEDICAL_DISCLAIMER)
  })

  it("does not duplicate disclaimer if already present", () => {
    const output = `Good progress. ${MEDICAL_DISCLAIMER}`
    const result = validateAIOutput(output, "recommendation")
    // Count occurrences — should be exactly 1
    const count = result.sanitizedOutput.split("not medical advice").length - 1
    expect(count).toBe(1)
  })

  it("removes medication recommendations", () => {
    const output = "You should take 500mg of metformin daily. Also try some light walking."
    const result = validateAIOutput(output, "recommendation")
    expect(result.sanitizedOutput).not.toMatch(/take \d+mg/i)
    expect(result.warnings.some((w) => w.includes("Medication"))).toBe(true)
  })

  it("returns safe=true for clean output", () => {
    const output = "Consider discussing your results with a doctor."
    const result = validateAIOutput(output, "general")
    expect(result.safe).toBe(true)
    expect(result.emergencyDetected).toBe(false)
  })
})
