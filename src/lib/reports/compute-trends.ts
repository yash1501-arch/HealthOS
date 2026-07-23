import type { LabTrend } from "@/types/reports"

type HistoricalLabRow = {
  testName: string
  value: unknown
  testDate: Date | null
  reportDate: Date | null
  createdAt: Date
}

export function computeLabTrends(
  currentResults: Array<{ testName: string; value: number | null }>,
  historicalResults: HistoricalLabRow[],
  currentReportDate: Date | null
): LabTrend[] {
  const trends: LabTrend[] = []

  for (const current of currentResults) {
    if (current.value === null) continue

    const normalizedName = normalizeTestName(current.testName)
    const previous = historicalResults
      .filter((row) => normalizeTestName(row.testName) === normalizedName)
      .sort((a, b) => getRowDate(b).getTime() - getRowDate(a).getTime())[0]

    if (!previous) {
      trends.push({
        testName: current.testName,
        previousValue: null,
        currentValue: current.value,
        previousDate: null,
        trend: "new",
      })
      continue
    }

    const previousValue = previous.value !== null && previous.value !== undefined ? Number(previous.value) : null
    if (previousValue === null || Number.isNaN(previousValue)) continue

    const delta = current.value - previousValue
    const trend: LabTrend["trend"] =
      Math.abs(delta) < 0.05 ? "stable" : delta > 0 ? "worsening" : "improving"

    trends.push({
      testName: current.testName,
      previousValue,
      currentValue: current.value,
      previousDate: getRowDate(previous).toISOString().slice(0, 10),
      trend,
    })
  }

  return trends
}

function normalizeTestName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getRowDate(row: HistoricalLabRow): Date {
  return row.testDate ?? row.reportDate ?? row.createdAt
}

export function computeConfidenceScore(
  labResultCount: number,
  rawTextLength: number,
  usedLlm: boolean
): number {
  let score = 0.45
  if (labResultCount >= 3) score += 0.2
  if (labResultCount >= 8) score += 0.1
  if (rawTextLength > 200) score += 0.1
  if (usedLlm) score += 0.15
  return Math.min(0.95, Math.round(score * 100) / 100)
}
