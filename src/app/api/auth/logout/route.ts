import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clearAuthCookies } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get("refresh_token")?.value

    if (refreshToken) {
      await prisma.session.deleteMany({ where: { refreshToken } })
    }

    await clearAuthCookies()

    return NextResponse.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
