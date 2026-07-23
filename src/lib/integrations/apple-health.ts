/**
 * Apple Health & Samsung Health Import
 *
 * Apple Health: Users can export their data from the Health app
 * (Profile → Export All Health Data → export.zip → export.xml)
 * and upload the XML for parsing.
 *
 * Samsung Health: Export via Settings → Download personal data → ZIP file.
 *
 * For native app integration (real-time HealthKit), a companion
 * iOS/macOS app using HealthKit API is required.
 */

export interface HealthRecord {
  type: string
  sourceName: string
  sourceVersion?: string
  unit?: string
  value: number
  startDate: string
  endDate: string
  creationDate: string
}

export interface AppleHealthExport {
  records: HealthRecord[]
  exportDate: string
  locale?: string
}

/**
 * Parse Apple Health XML export into structured health records.
 * Handles the standard export.xml format from the iOS Health app.
 */
export function parseAppleHealthXml(xmlText: string): AppleHealthExport {
  const records: HealthRecord[] = []
  let exportDate = ""

  // Extract export date
  const exportMatch = xmlText.match(/exportDate="([^"]+)"/)
  if (exportMatch) exportDate = exportMatch[1]

  // Parse Record elements using regex (faster than DOM parser for large files)
  const recordRegex = /<Record[^>]*type="([^"]+)"[^>]*sourceName="([^"]+)"[^>]*(?:sourceVersion="([^"]*)")?[^>]*(?:unit="([^"]*)")?[^>]*value="([^"]+)"[^>]*startDate="([^"]+)"[^>]*endDate="([^"]+)"[^>]*(?:creationDate="([^"]+)")?[^>]*\/>/g

  let match
  while ((match = recordRegex.exec(xmlText)) !== null) {
    records.push({
      type: match[1],
      sourceName: match[2],
      sourceVersion: match[3] || undefined,
      unit: match[4] || undefined,
      value: parseFloat(match[5]),
      startDate: match[6],
      endDate: match[7],
      creationDate: match[8] || "",
    })
  }

  return { records, exportDate }
}

/**
 * Map Apple Health record types to HealthOS metric types
 */
export const APPLE_TO_HEALTHOS_MAP: Record<string, string> = {
  HKQuantityTypeIdentifierStepCount: "steps",
  HKQuantityTypeIdentifierBodyMass: "weight",
  HKQuantityTypeIdentifierHeartRate: "heart_rate",
  HKQuantityTypeIdentifierBloodPressureSystolic: "blood_pressure_systolic",
  HKQuantityTypeIdentifierBloodPressureDiastolic: "blood_pressure_diastolic",
  HKQuantityTypeIdentifierHeight: "height",
  HKQuantityTypeIdentifierDietaryEnergyConsumed: "calories",
  HKQuantityTypeIdentifierActiveEnergyBurned: "active_calories",
  HKQuantityTypeIdentifierSleepAnalysis: "sleep_hours",
  HKQuantityTypeIdentifierRespiratoryRate: "respiratory_rate",
  HKQuantityTypeIdentifierBodyTemperature: "body_temperature",
  HKQuantityTypeIdentifierBloodGlucose: "blood_glucose",
  HKQuantityTypeIdentifierDistanceWalkingRunning: "distance",
  HKQuantityTypeIdentifierFlightsClimbed: "flights_climbed",
  HKCategoryTypeIdentifierSleepAnalysis: "sleep_quality",
  HKCategoryTypeIdentifierMindfulSession: "mindfulness",
}

/**
 * Convert Apple Health records to HealthOS progress metrics
 */
export function convertAppleRecordsToMetrics(
  records: HealthRecord[],
  userId: string
): Array<{
  userId: string
  metricDate: Date
  metricType: string
  value: number
  source: string
}> {
  return records
    .filter((r) => APPLE_TO_HEALTHOS_MAP[r.type])
    .map((r) => ({
      userId,
      metricDate: new Date(r.startDate),
      metricType: APPLE_TO_HEALTHOS_MAP[r.type],
      value: r.value,
      source: `apple_health:${r.sourceName}`,
    }))
}
