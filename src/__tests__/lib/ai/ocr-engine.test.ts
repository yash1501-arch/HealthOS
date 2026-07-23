import { describe, it, expect } from "vitest"
import { parseLabValues, standardizeLabValues } from "@/lib/ai/ocr-engine"
import type { ParsedLabValue } from "@/lib/ai/ocr-engine"

// ─── parseLabValues ───────────────────────────────────────────────

describe("parseLabValues", () => {
  it("parses Hemoglobin: 14.2 g/dL", () => {
    const result = parseLabValues("Hemoglobin: 14.2 g/dL")
    expect(result.length).toBeGreaterThanOrEqual(1)
    const hb = result.find((r) => r.testName === "Hemoglobin")
    expect(hb).toBeDefined()
    expect(hb!.value).toBeCloseTo(14.2, 1)
    expect(hb!.unit).toContain("g/dL")
  })

  it("parses HbA1c 5.6%", () => {
    const result = parseLabValues("HbA1c 5.6%")
    const a1c = result.find((r) => r.testName === "HbA1c")
    expect(a1c).toBeDefined()
    expect(a1c!.value).toBeCloseTo(5.6, 1)
    expect(a1c!.unit).toContain("%")
  })

  it("parses Total Cholesterol: 195 mg/dL", () => {
    const result = parseLabValues("Total Cholesterol: 195 mg/dL")
    const chol = result.find((r) => r.testName === "Total Cholesterol")
    expect(chol).toBeDefined()
    expect(chol!.value).toBeCloseTo(195, 1)
  })

  it("parses TSH: 2.5 mIU/L", () => {
    const result = parseLabValues("TSH: 2.5 mIU/L")
    const tsh = result.find((r) => r.testName === "TSH")
    expect(tsh).toBeDefined()
    expect(tsh!.value).toBeCloseTo(2.5, 1)
  })

  it("parses multiple values in one text block", () => {
    const text = `
      Hemoglobin: 14.2 g/dL
      WBC: 7.5 x10^3/uL
      Platelets: 250 x10^3/uL
      Total Cholesterol: 195 mg/dL
      HbA1c 5.6%
    `
    const results = parseLabValues(text)
    const testNames = results.map((r) => r.testName)
    expect(testNames).toContain("Hemoglobin")
    expect(testNames).toContain("WBC")
    expect(testNames).toContain("Platelets")
    expect(testNames).toContain("Total Cholesterol")
    expect(testNames).toContain("HbA1c")
  })

  it("assigns correct status for normal values", () => {
    const result = parseLabValues("Hemoglobin: 14.0 g/dL")
    const hb = result.find((r) => r.testName === "Hemoglobin")
    expect(hb).toBeDefined()
    expect(hb!.status).toBe("normal")
  })

  it("flags abnormal high values", () => {
    const result = parseLabValues("Total Cholesterol: 250 mg/dL")
    const chol = result.find((r) => r.testName === "Total Cholesterol")
    expect(chol).toBeDefined()
    expect(chol!.status).toBe("high")
  })

  it("flags abnormal low values", () => {
    const result = parseLabValues("Hemoglobin: 8.5 g/dL")
    const hb = result.find((r) => r.testName === "Hemoglobin")
    expect(hb).toBeDefined()
    expect(hb!.status).toBe("low")
  })
})

// ─── standardizeLabValues ─────────────────────────────────────────

describe("standardizeLabValues", () => {
  it("maps test aliases to standard names", () => {
    const parsed: ParsedLabValue[] = [
      { testName: "hgb", value: 14.0, unit: "g/dL", referenceRange: "12.0-17.5", status: "normal" },
    ]
    const result = standardizeLabValues(parsed)
    expect(result[0].standardName).toBe("Hemoglobin")
  })

  it("flags abnormal values with isAbnormal=true", () => {
    const parsed: ParsedLabValue[] = [
      { testName: "Total Cholesterol", value: 250, unit: "mg/dL", referenceRange: "<200", status: "high" },
    ]
    const result = standardizeLabValues(parsed)
    expect(result[0].isAbnormal).toBe(true)
  })

  it("assigns category based on test type", () => {
    const parsed: ParsedLabValue[] = [
      { testName: "ALT", value: 30, unit: "U/L", referenceRange: "7-56", status: "normal" },
      { testName: "TSH", value: 2.5, unit: "mIU/L", referenceRange: "0.4-4.0", status: "normal" },
    ]
    const result = standardizeLabValues(parsed)
    expect(result.find((r) => r.standardName === "ALT")?.category).toBe("Liver")
    expect(result.find((r) => r.standardName === "TSH")?.category).toBe("Thyroid")
  })
})
