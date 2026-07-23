import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import {
  getGoogleFitAuthUrl,
  exchangeGoogleFitCode,
  refreshGoogleFitToken,
  fetchGoogleFitSteps,
  fetchGoogleFitWeight,
  type GoogleFitConfig,
} from "@/lib/integrations/google-fit"

function getConfig(): GoogleFitConfig | null {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID
  const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  return {
    clientId,
    clientSecret,
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/integrations/google-fit/callback`,
  }
}

// ─── GET /api/integrations/google-fit?action=connect ────────────

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const config = getConfig()
    if (!config) {
      return NextResponse.json({
        data: {
          connected: false,
          available: false,
          message: "Google Fit not configured. Set GOOGLE_FIT_CLIENT_ID and GOOGLE_FIT_CLIENT_SECRET in .env",
        },
      })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "status") {
      const integration = await prisma.aiAuditLog.findFirst({
        where: { userId, module: "google_fit", action: "connected" },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json({
        data: {
          connected: !!integration,
          available: true,
          connectedAt: integration?.createdAt.toISOString() ?? null,
        },
      })
    }

    if (action === "connect") {
      const state = JSON.stringify({ userId, timestamp: Date.now() })
      const url = getGoogleFitAuthUrl(config, state)
      return NextResponse.json({ data: { url } })
    }

    if (action === "sync") {
      // Get stored tokens
      const tokenEntry = await prisma.aiAuditLog.findFirst({
        where: { userId, module: "google_fit", action: "tokens" },
        orderBy: { createdAt: "desc" },
      })

      if (!tokenEntry?.response) {
        return NextResponse.json({ data: { synced: false, message: "Not connected to Google Fit" } })
      }

      const tokens = JSON.parse(tokenEntry.response)
      let accessToken = tokens.access_token

      // Refresh if needed
      if (Date.now() > tokens.expiry) {
        const refreshed = await refreshGoogleFitToken(config, tokens.refresh_token)
        accessToken = refreshed.access_token
        tokens.access_token = refreshed.access_token
        tokens.expiry = Date.now() + refreshed.expires_in * 1000
        await prisma.aiAuditLog.update({
          where: { id: tokenEntry.id },
          data: { response: JSON.stringify(tokens) },
        })
      }

      const now = Date.now()
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const [steps, weight] = await Promise.all([
        fetchGoogleFitSteps(accessToken, startOfDay.getTime() * 1e6, now * 1e6),
        fetchGoogleFitWeight(accessToken, startOfDay.getTime() * 1e6, now * 1e6),
      ])

      // Save steps
      if (steps > 0) {
        const existing = await prisma.progressMetric.findFirst({
          where: { userId, metricType: "google_fit_steps", metricDate: startOfDay },
        })
        if (existing) {
          await prisma.progressMetric.update({ where: { id: existing.id }, data: { value: steps } })
        } else {
          await prisma.progressMetric.create({ data: { userId, metricDate: startOfDay, metricType: "google_fit_steps", value: steps, source: "google_fit" } })
        }
      }

      // Save weight
      if (weight && weight > 0) {
        const existing = await prisma.progressMetric.findFirst({
          where: { userId, metricType: "weight", metricDate: startOfDay },
        })
        if (existing) {
          await prisma.progressMetric.update({ where: { id: existing.id }, data: { value: weight } })
        } else {
          await prisma.progressMetric.create({ data: { userId, metricDate: startOfDay, metricType: "weight", value: weight, source: "google_fit" } })
        }
      }

      return NextResponse.json({
        data: { synced: true, steps, weight, message: `Synced ${steps} steps and ${weight ?? "—"} kg` },
      })
    }

    return NextResponse.json({ data: { connected: false, available: true } })
  } catch (error) {
    console.error("Google Fit error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}

function unauth() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
}
