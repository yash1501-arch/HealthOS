import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId, hashPassword, verifyPassword } from "@/lib/auth"
import { checkRateLimit, validateOrigin } from "@/lib/security"
import { z } from "zod"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export async function POST(request: Request) {
  try {
    // CSRF check
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

    // Rate limit: max 3 password changes per hour
    const rateResult = await checkRateLimit(`change-pw:${userId}`, 3, 3_600_000)
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many password change attempts. Try again later." } },
        { status: 429 }
      )
    }
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input" } },
        { status: 422 }
      )
    }

    const { currentPassword, newPassword } = parsed.data

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      )
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: { code: "INVALID_PASSWORD", message: "Current password is incorrect" } },
        { status: 403 }
      )
    }

    const newHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    })

    // Log the action
    await prisma.aiAuditLog.create({
      data: {
        userId,
        module: "auth",
        action: "change_password",
        model: "system",
      },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
