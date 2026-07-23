import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateOrigin } from "@/lib/security"
import { z } from "zod"

const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
})

/**
 * POST /api/auth/forgot-password
 *
 * Generates a password reset token with a 1-hour expiry.
 * In production, this would send an email. Currently logs to console.
 */
export async function POST(request: Request) {
  try {
    // CSRF check
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Invalid request origin" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid input",
          },
        },
        { status: 422 }
      )
    }

    const { email } = parsed.data

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({
        data: { message: "If an account exists, a reset link has been sent." },
      })
    }

    // Generate reset token (secure random)
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const resetToken = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")

    // Hash token for storage
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(resetToken))
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("")

    // Store token in user record (expires in 1 hour)
    // Note: We use the healthTimeline entry to store reset tokens since we don't have a
    // dedicated password reset table
    await prisma.healthTimelineEntry.create({
      data: {
        userId: user.id,
        eventType: "password_reset",
        title: "Password Reset Requested",
        description: `Reset token hash: ${tokenHash.slice(0, 8)}...`,
        eventDate: new Date(),
        metadata: {
          resetTokenHash: tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      },
    })

    // In production, send email here
    console.log(`[Password Reset] Token for ${email}: ${resetToken}`)
    console.log(`[Password Reset] Expires: ${new Date(Date.now() + 60 * 60 * 1000).toISOString()}`)

    return NextResponse.json({
      data: { message: "If an account exists, a reset link has been sent." },
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
