import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { grantRequiredConsents } from "@/lib/auth/consent"
import { validateOrigin } from "@/lib/security"
import { z } from "zod"

const consentSchema = z.object({
  consents: z.array(
    z.object({
      type: z.enum(["privacy", "disclaimer", "data_processing", "vision"]),
      granted: z.boolean(),
    })
  ).min(1),
})

/**
 * POST /api/auth/consent
 *
 * Records user consent for AI data processing, privacy, and medical disclaimer.
 * Called from the ConsentModal after registration or first login.
 */
export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Invalid request origin" } },
        { status: 403 }
      )
    }

    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = consentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues.map((i) => i.message).join("; "),
          },
        },
        { status: 422 }
      )
    }

    const { consents } = parsed.data

    // Store each consent
    for (const c of consents) {
      await prisma.consentLog.create({
        data: {
          userId,
          consentType: c.type,
          action: c.granted ? "granted" : "revoked",
        },
      })
    }

    // Update user record for fast consent checks
    const updateData: Record<string, boolean> = {}
    for (const c of consents) {
      if (c.type === "privacy") updateData.consentPrivacy = c.granted
      if (c.type === "disclaimer") updateData.consentDisclaimer = c.granted
      if (c.type === "vision") updateData.consentVision = c.granted
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Consent API error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/consent
 *
 * Returns the user's current consent status for all consent types.
 */
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const consentTypes = ["privacy", "disclaimer", "vision", "data_processing"] as const

    const consents: Record<string, boolean> = {}
    for (const type of consentTypes) {
      const latest = await prisma.consentLog.findFirst({
        where: { userId, consentType: type },
        orderBy: { createdAt: "desc" },
      })
      consents[type] = latest?.action === "granted"
    }

    return NextResponse.json({ data: consents })
  } catch (error) {
    console.error("Consent GET error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
