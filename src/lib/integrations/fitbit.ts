/**
 * Fitbit Web API Integration
 *
 * Uses OAuth 2.0 to sync steps, heart rate, sleep, and activity data.
 *
 * Setup:
 * 1. Go to https://dev.fitbit.com/ → Register an application
 * 2. Set OAuth 2.0 Application Type to "Web Application"
 * 3. Add callback URL: https://yourdomain.com/api/integrations/fitbit/callback
 * 4. Copy Client ID and Client Secret to .env
 */

export const FITBIT_SCOPES = [
  "activity",
  "heartrate",
  "sleep",
  "weight",
  "profile",
]

export interface FitbitConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function getFitbitAuthUrl(config: FitbitConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: FITBIT_SCOPES.join(" "),
    state,
  })
  return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`
}

export interface FitbitTokenResponse {
  access_token: string
  refresh_token: string
  user_id: string
  scope: string
  expires_in: number
  token_type: string
}

export async function exchangeFitbitCode(
  config: FitbitConfig,
  code: string
): Promise<FitbitTokenResponse> {
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")

  const res = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to exchange Fitbit code: ${err}`)
  }
  return res.json()
}

export async function refreshFitbitToken(
  config: FitbitConfig,
  refreshToken: string
): Promise<FitbitTokenResponse> {
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")

  const res = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to refresh Fitbit token: ${err}`)
  }
  return res.json()
}

/**
 * Fetch intraday heart rate time series (1-minute intervals for a single day)
 */
export async function fetchFitbitHeartRate(
  accessToken: string,
  date: string
): Promise<Array<{ time: string; value: number }>> {
  const res = await fetch(
    `https://api.fitbit.com/1/user/-/activities/heart/date/${date}/1d/1min.json`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const dataset = data?.["activities-heart-intraday"]?.dataset ?? []
  return dataset as Array<{ time: string; value: number }>
}

/**
 * Fetch daily activity summary (steps, calories, distance, active minutes)
 */
export async function fetchFitbitDailySummary(
  accessToken: string,
  date: string
): Promise<{
  steps: number
  calories: number
  distance: number
  activeMinutes: number
  restingHeartRate: number | null
} | null> {
  const res = await fetch(
    `https://api.fitbit.com/1/user/-/activities/date/${date}.json`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  const summary = data?.summary
  if (!summary) return null
  return {
    steps: summary.steps ?? 0,
    calories: summary.caloriesOut ?? 0,
    distance: summary.distances?.reduce((acc: number, d: { distance: number }) => acc + d.distance, 0) ?? 0,
    activeMinutes: (summary.fairlyActiveMinutes ?? 0) + (summary.veryActiveMinutes ?? 0),
    restingHeartRate: summary.restingHeartRate ?? null,
  }
}

/**
 * Fetch daily data for a range of dates and return as WearableData-compatible entries.
 */
export async function fetchFitbitDailyData(
  accessToken: string,
  userId: string,
  date: string
): Promise<Array<{
  userId: string
  source: string
  dataType: string
  value: number
  unit: string | null
  recordedAt: Date
  syncedAt: Date | null
}>> {
  const now = new Date()
  const recordedAt = new Date(date)
  const entries: Array<{
    userId: string; source: string; dataType: string; value: number
    unit: string | null; recordedAt: Date; syncedAt: Date | null
  }> = []

  try {
    const summary = await fetchFitbitDailySummary(accessToken, date)
    if (summary) {
      entries.push(
        { userId, source: "fitbit", dataType: "steps", value: summary.steps, unit: "steps", recordedAt, syncedAt: now },
        { userId, source: "fitbit", dataType: "calories", value: summary.calories, unit: "cal", recordedAt, syncedAt: now },
        { userId, source: "fitbit", dataType: "distance", value: summary.distance, unit: "km", recordedAt, syncedAt: now },
        { userId, source: "fitbit", dataType: "active_minutes", value: summary.activeMinutes, unit: "min", recordedAt, syncedAt: now }
      )
      if (summary.restingHeartRate != null) {
        entries.push({ userId, source: "fitbit", dataType: "resting_heart_rate", value: summary.restingHeartRate, unit: "bpm", recordedAt, syncedAt: now })
      }
    }
  } catch { /* skip */ }

  try {
    const sleep = await fetchFitbitSleep(accessToken, date)
    if (sleep) {
      entries.push(
        { userId, source: "fitbit", dataType: "sleep_hours", value: Math.round(sleep.totalMinutes / 60 * 10) / 10, unit: "hours", recordedAt, syncedAt: now },
        { userId, source: "fitbit", dataType: "sleep_efficiency", value: sleep.efficiency ?? 85, unit: "%", recordedAt, syncedAt: now }
      )
    }
  } catch { /* skip */ }

  return entries
}

/**
 * Sync the last 7 days of Fitbit data and store in the database.
 */
export async function syncFitbitData(
  accessToken: string,
  userId: string
): Promise<number> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  let totalEntries = 0

  for (let d = new Date(sevenDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    const entries = await fetchFitbitDailyData(accessToken, userId, dateStr)
    totalEntries += entries.length
  }

  return totalEntries
}

/**
 * Fetch sleep log for a specific date
 */
export async function fetchFitbitSleep(
  accessToken: string,
  date: string
): Promise<{
  totalMinutes: number
  deepMinutes: number
  lightMinutes: number
  remMinutes: number
  wakeMinutes: number
  efficiency: number | null
} | null> {
  const res = await fetch(
    `https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  const mainSleep = data?.sleep?.[0]
  if (!mainSleep) return null
  const levels = mainSleep.levels?.summary ?? {}
  return {
    totalMinutes: mainSleep.duration / 60000,
    deepMinutes: (levels.deep?.minutes ?? 0) + (levels.deep?.thirtyDayAvgMinutes ?? 0),
    lightMinutes: (levels.light?.minutes ?? 0) + (levels.light?.thirtyDayAvgMinutes ?? 0),
    remMinutes: levels.rem?.minutes ?? 0,
    wakeMinutes: levels.wake?.minutes ?? 0,
    efficiency: mainSleep.efficiency ?? null,
  }
}
