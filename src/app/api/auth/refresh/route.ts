import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const oldRefreshToken = cookieStore.get("refresh_token")?.value

    if (!oldRefreshToken) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "No refresh token" } },
        { status: 401 }
      )
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken: oldRefreshToken },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Session expired" } },
        { status: 401 }
      )
    }

    await prisma.session.delete({ where: { id: session.id } })

    const newRefreshToken = await createRefreshToken()
    await prisma.session.create({
      data: {
        userId: session.userId,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const accessToken = await createAccessToken(session.userId)
    await setAuthCookies(accessToken, newRefreshToken)

    return NextResponse.json({ data: { accessToken, refreshToken: newRefreshToken } })
  } catch (error) {
    console.error("Refresh error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
