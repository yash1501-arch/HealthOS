import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/auth"
import { checkRateLimit, checkLoginRateLimit, validateOrigin } from "@/lib/security"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Name is required"),
  consentPrivacy: z.boolean().refine((val) => val === true, "Privacy consent is required"),
  consentDisclaimer: z.boolean().refine((val) => val === true, "Medical disclaimer must be accepted"),
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

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } },
        { status: 422 }
      )
    }

    // Rate limiting — per IP (max 3 registrations per hour)
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const rateResult = await checkRateLimit(`register:${ip}`, 3, 3_600_000)
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many registration attempts. Try again later." } },
        { status: 429 }
      )
    }

    const { email, password, fullName, consentPrivacy, consentDisclaimer } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "An account with this email already exists" } },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const refreshToken = await createRefreshToken()

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        consentPrivacy,
        consentDisclaimer,
        profile: { create: { fullName, dateOfBirth: new Date() } },
        sessions: { create: { refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
      },
    })

    const accessToken = await createAccessToken(user.id)
    await setAuthCookies(accessToken, refreshToken)

    return NextResponse.json(
      { data: { userId: user.id, email: user.email, accessToken, refreshToken } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
