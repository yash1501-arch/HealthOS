import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"

// ─── GET /api/notifications ──────────────────────────────────────
// Returns recent notifications for the authenticated user

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)
    const unreadOnly = searchParams.get("unread") === "true"

    const where = { userId, ...(unreadOnly ? { read: false } : {}) }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        read: true,
        createdAt: true,
      },
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    })

    return NextResponse.json({ data: { notifications, unreadCount } })
  } catch (error) {
    console.error("Notifications fetch error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}

// ─── PATCH /api/notifications ────────────────────────────────────
// Mark one or all notifications as read

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const body = await request.json()
    const { id, markAll = false } = body

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      })
      return NextResponse.json({ data: { markedAll: true } })
    }

    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { read: true },
      })
      return NextResponse.json({ data: { markedId: id } })
    }

    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Provide 'id' or 'markAll: true'" } }, { status: 422 })
  } catch (error) {
    console.error("Notifications update error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}
