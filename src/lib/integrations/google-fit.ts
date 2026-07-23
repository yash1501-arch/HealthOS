/**
 * Google Fit Integration
 *
 * Uses OAuth 2.0 + Google Fitness REST API v1 to sync
 * steps, weight, heart rate, and activity data.
 *
 * Setup:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a project → Enable Fitness API
 * 3. Credentials → OAuth 2.0 Client ID (Web application)
 * 4. Add redirect URI: https://yourdomain.com/api/integrations/google-fit/callback
 * 5. Copy Client ID and Client Secret to .env
 */

export const GOOGLE_FIT_SCOPES = [
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.body.read",
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.sleep.read",
]

export interface GoogleFitConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function getGoogleFitAuthUrl(config: GoogleFitConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_FIT_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export interface GoogleFitTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

export async function exchangeGoogleFitCode(
  config: GoogleFitConfig,
  code: string
): Promise<GoogleFitTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!res.ok) throw new Error("Failed to exchange Google Fit code")
  return res.json()
}

export async function refreshGoogleFitToken(
  config: GoogleFitConfig,
  refreshToken: string
): Promise<GoogleFitTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) throw new Error("Failed to refresh Google Fit token")
  return res.json()
}

export async function fetchGoogleFitSteps(
  accessToken: string,
  startTimeNs: number,
  endTimeNs: number
): Promise<number> {
  const res = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: Math.floor(startTimeNs / 1e6),
        endTimeMillis: Math.floor(endTimeNs / 1e6),
      }),
    }
  )

  if (!res.ok) return 0
  const data = await res.json()
  const bucket = data.bucket?.[0]
  if (!bucket) return 0

  const dataset = bucket.dataset?.[0]
  const point = dataset?.point?.[0]
  const value = point?.value?.[0]?.intVal
  return value ?? 0
}

export async function fetchGoogleFitWeight(
  accessToken: string,
  startTimeNs: number,
  endTimeNs: number
): Promise<number | null> {
  const res = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: "com.google.weight" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: Math.floor(startTimeNs / 1e6),
        endTimeMillis: Math.floor(endTimeNs / 1e6),
      }),
    }
  )

  if (!res.ok) return null
  const data = await res.json()
  const bucket = data.bucket?.[0]
  if (!bucket) return null

  const dataset = bucket.dataset?.[0]
  const point = dataset?.point?.[0]
  const value = point?.value?.[0]?.fpVal
  return value ?? null
}
