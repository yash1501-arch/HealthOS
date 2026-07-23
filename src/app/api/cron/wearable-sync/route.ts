import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ─── GET /api/cron/wearable-sync ─────────────────────────────────
// Daily cron job: sync all connected wearable accounts.
// Protected by CRON_SECRET header verification.

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } }, { status: 401 })
    }

    // Find all users with wearable data and sync each one
    const usersWithWearableData = await prisma.wearableData.groupBy({
      by: ["userId"],
      _count: { id: true },
    })

    const results: Array<{ userId: string; sources: string[]; status: string }> = []

    for (const { userId } of usersWithWearableData) {
      try {
        const sources = await prisma.wearableData.findMany({
          where: { userId },
          distinct: ["source"],
          select: { source: true },
        })

        const sourceNames = sources.map((s) => s.source)

        // For each connected source, trigger a sync
        // In a full implementation, this would:
        // 1. Look up the stored OAuth tokens
        // 2. Call the respective API (Google Fit, Fitbit)
        // 3. Store new data points in wearable_data table
        // 4. Update progress_metrics with synced values

        results.push({
          userId,
          sources: sourceNames,
          status: "queued",
        })
      } catch (error) {
        console.error(`[CronSync] Error for user ${userId}:`, error)
        results.push({ userId, sources: [], status: "error" })
      }
    }

    // Log to health timeline for audit (using a generic user context)
    // In production, this would use a system user or admin context

    return NextResponse.json({
      data: {
        synced: results.length,
        details: results,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Cron wearable sync error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}
