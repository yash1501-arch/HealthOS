import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPassword, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/auth"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 422 }
      )
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401 }
      )
    }

    const refreshToken = await createRefreshToken()
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const accessToken = await createAccessToken(user.id)
    await setAuthCookies(accessToken, refreshToken)

    return NextResponse.json({
      data: {
        userId: user.id,
        email: user.email,
        accessToken,
        refreshToken,
        onboardingComplete: user.onboardingComplete,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
