import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId, clearAuthCookies } from "@/lib/auth"

// ─── DELETE /api/auth/account — Delete user account & all data ──

export async function DELETE() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    // Delete user — cascade handles related records
    await prisma.user.delete({ where: { id: userId } })

    // Clear auth cookies
    await clearAuthCookies()

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Account deletion error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
