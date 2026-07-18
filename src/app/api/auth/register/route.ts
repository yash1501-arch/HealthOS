import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/auth"
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
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } },
        { status: 422 }
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
