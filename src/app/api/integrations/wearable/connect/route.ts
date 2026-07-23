import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

const connectSchema = z.object({
  source: z.enum(["apple_health", "google_fit", "fitbit"]),
})

// ─── POST /api/integrations/wearable/connect ─────────────────────

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const body = await request.json()
    const parsed = connectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid source", details: parsed.error.issues } }, { status: 422 })
    }

    const { source } = parsed.data

    if (source === "apple_health") {
      // Apple Health uses XML export uploads — return instructions
      return NextResponse.json({
        data: {
          source: "apple_health",
          requiresFileUpload: true,
          instructions: {
            title: "How to export Apple Health data",
            steps: [
              "Open the Health app on your iPhone",
              "Tap your profile picture (top right)",
              "Scroll down and tap 'Export All Health Data'",
              "Wait for the export to generate (may take a few minutes)",
              "Share the export.zip file to your computer and extract it",
              "Upload the export.xml file on the next screen",
            ],
            supportedTypes: ["steps", "heart_rate", "sleep_hours", "calories", "workout"],
            fileType: ".xml",
          },
        },
      })
    }

    // OAuth-based integrations
    const state = crypto.randomUUID()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    // Store state in a session/verification table
    // In production, use a proper state store (e.g., Redis)
    await prisma.notification.create({
      data: {
        userId,
        type: "routine",
        title: `${source} connection initiated`,
        body: "Complete the authorization in the popup window.",
        channel: "in_app",
      },
    })

    let authUrl: string

    if (source === "google_fit") {
      const clientId = process.env.GOOGLE_FIT_CLIENT_ID
      if (!clientId) {
        return NextResponse.json({ error: { code: "CONFIG_ERROR", message: "Google Fit is not configured" } }, { status: 500 })
      }
      const redirectUri = `${baseUrl}/api/integrations/wearable/callback/google-fit`
      const { getGoogleFitAuthUrl } = await import("@/lib/integrations/google-fit")
      authUrl = getGoogleFitAuthUrl(
        { clientId, clientSecret: process.env.GOOGLE_FIT_CLIENT_SECRET ?? "", redirectUri },
        state
      )
    } else if (source === "fitbit") {
      const clientId = process.env.FITBIT_CLIENT_ID
      if (!clientId) {
        return NextResponse.json({ error: { code: "CONFIG_ERROR", message: "Fitbit is not configured" } }, { status: 500 })
      }
      const redirectUri = `${baseUrl}/api/integrations/wearable/callback/fitbit`
      const { getFitbitAuthUrl } = await import("@/lib/integrations/fitbit")
      authUrl = getFitbitAuthUrl(
        { clientId, clientSecret: process.env.FITBIT_CLIENT_SECRET ?? "", redirectUri },
        state
      )
    } else {
      return NextResponse.json({ error: { code: "UNSUPPORTED", message: `Unsupported source: ${source}` } }, { status: 400 })
    }

    return NextResponse.json({ data: { source, authUrl, state } })
  } catch (error) {
    console.error("Wearable connect error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}
