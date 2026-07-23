import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth/password"
import { validateOrigin } from "@/lib/security"
import { z } from "zod"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`]/, "Password must contain a special character"),
})

/**
 * POST /api/auth/reset-password
 *
 * Verifies a password reset token and updates the user's password.
 * Token must be valid and not expired (1 hour window).
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
    const parsed = resetPasswordSchema.safeParse(body)
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

    const { token, newPassword } = parsed.data

    // Hash the provided token to match against stored hashes
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token))
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("")

    // Find the password reset entry
    const resetEntry = await prisma.healthTimelineEntry.findFirst({
      where: {
        eventType: "password_reset",
        title: "Password Reset Requested",
      },
      orderBy: { createdAt: "desc" },
    })

    if (!resetEntry) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid or expired reset token" } },
        { status: 400 }
      )
    }

    const metadata = resetEntry.metadata as {
      resetTokenHash?: string
      expiresAt?: string
    } | null

    if (!metadata?.resetTokenHash || !metadata?.expiresAt) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid or expired reset token" } },
        { status: 400 }
      )
    }

    // Verify token hash
    if (metadata.resetTokenHash !== tokenHash) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid or expired reset token" } },
        { status: 400 }
      )
    }

    // Check expiry
    if (new Date(metadata.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: { code: "EXPIRED_TOKEN", message: "Reset token has expired. Request a new one." } },
        { status: 400 }
      )
    }

    // Update password
    const passwordHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: resetEntry.userId },
      data: { passwordHash },
    })

    // Invalidate all existing sessions for this user
    await prisma.session.deleteMany({
      where: { userId: resetEntry.userId },
    })

    // Mark the reset token as used
    await prisma.healthTimelineEntry.create({
      data: {
        userId: resetEntry.userId,
        eventType: "password_reset_completed",
        title: "Password Reset Completed",
        description: "Password was successfully reset via reset token.",
        eventDate: new Date(),
        metadata: { completedAt: new Date().toISOString() },
      },
    })

    return NextResponse.json({
      data: { message: "Password has been reset successfully. You can now log in with your new password." },
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
