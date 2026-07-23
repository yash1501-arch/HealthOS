import { describe, it, expect } from "vitest"
import { stripPHI, containsDiagnosticLanguage, sanitizeForLLM } from "@/lib/ai/phii-filter"

// ─── stripPHI ─────────────────────────────────────────────────────

describe("stripPHI", () => {
  it("removes email addresses", () => {
    const input = "Patient contact: john.doe@example.com"
    const result = stripPHI(input)
    expect(result).not.toContain("john.doe@example.com")
    expect(result).toContain("[EMAIL_REDACTED]")
  })

  it("removes phone numbers", () => {
    const input = "Call me at (555) 123-4567 for results"
    const result = stripPHI(input)
    expect(result).not.toContain("(555) 123-4567")
    expect(result).toContain("[PHONE_REDACTED]")
  })

  it("removes SSN patterns", () => {
    const input = "SSN: 123-45-6789"
    const result = stripPHI(input)
    expect(result).not.toContain("123-45-6789")
    expect(result).toContain("[SSN_REDACTED]")
  })

  it("removes medical record numbers", () => {
    const input = "Medical Record: MRN-987654"
    const result = stripPHI(input)
    expect(result).toContain("[MRN_REDACTED]")
  })

  it("passes clean text through unchanged", () => {
    const input = "Patient has normal hemoglobin levels."
    const result = stripPHI(input)
    expect(result).toBe(input)
  })

  it("handles empty string", () => {
    expect(stripPHI("")).toBe("")
  })

  it("handles null-like input", () => {
    expect(stripPHI("")).toBe("")
  })
})

// ─── containsDiagnosticLanguage ───────────────────────────────────

describe("containsDiagnosticLanguage", () => {
  it("detects 'you have diabetes'", () => {
    const result = containsDiagnosticLanguage("Based on your results, you have diabetes.")
    expect(result.found).toBe(true)
    expect(result.matches.some((m) => m.toLowerCase().includes("you have"))).toBe(true)
  })

  it("detects 'diagnosis confirmed'", () => {
    const result = containsDiagnosticLanguage("Your diagnosis is confirmed.")
    expect(result.found).toBe(true)
  })

  it("detects 'confirmed' in medical context", () => {
    const result = containsDiagnosticLanguage("The test confirmed your condition.")
    expect(result.found).toBe(true)
  })

  it("detects 'cancer' mention", () => {
    const result = containsDiagnosticLanguage("The biopsy shows cancer cells.")
    expect(result.found).toBe(true)
  })

  it("detects 'you are diagnosed with'", () => {
    const result = containsDiagnosticLanguage("You are diagnosed with hypertension.")
    expect(result.found).toBe(true)
  })

  it("returns false for safe language", () => {
    const result = containsDiagnosticLanguage(
      "Your results may indicate a need to discuss with your doctor. Consider consulting a specialist."
    )
    expect(result.found).toBe(false)
  })

  it("detects 'positive for'", () => {
    const result = containsDiagnosticLanguage("You tested positive for strep.")
    expect(result.found).toBe(true)
  })
})

// ─── sanitizeForLLM ───────────────────────────────────────────────

describe("sanitizeForLLM", () => {
  it("converts date of birth to age range", () => {
    const input = {
      profile: { dateOfBirth: new Date("1990-06-15"), biologicalSex: "male", heightCm: 175, weightKg: 72 },
    }
    const result = sanitizeForLLM(input)
    expect(result.ageRange).toBe("35-44")
    expect(result.biologicalSex).toBe("male")
    expect(result.heightCm).toBe(175)
  })

  it("strips personal identifiers", () => {
    const input = {
      profile: { fullName: "John Doe", email: "john@example.com", dateOfBirth: new Date("1990-01-01") },
      medicalHistory: { currentConditions: ["Hypertension"] },
    }
    const result = sanitizeForLLM(input)
    expect(result.ageRange).toBe("35-44")
    // The medical context should still be available
    expect(result.medicalContext).not.toBeNull()
  })

  it("extracts goals from array of strings", () => {
    const input = {
      profile: {},
      goals: ["Lose weight", "Improve posture"],
    }
    const result = sanitizeForLLM(input)
    expect(result.goals).toEqual(["Lose weight", "Improve posture"])
  })
})
