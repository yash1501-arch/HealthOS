import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const syncSchema = z.object({
  source: z.enum(["google_fit", "fitbit"]).optional(),
})

// ─── POST /api/integrations/wearable/sync ────────────────────────

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = syncSchema.safeParse(body)
    const sourceFilter = parsed.success ? parsed.data.source : undefined

    // Find connected wearable accounts (tokens stored in a config table)
    // For now, this checks the user's lifestyle for integration markers
    const lifestyle = await prisma.lifestyle.findUnique({ where: { userId } })
    if (!lifestyle) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "User profile not found" } }, { status: 404 })
    }

    // For a full implementation, store OAuth tokens in a WearableConfig table
    // For now, sync from the progress_metrics source field
    const sources = sourceFilter ? [sourceFilter] : ["google_fit", "fitbit", "apple_health"]

    const results: Array<{ source: string; status: string; recordsSynced: number }> = []

    for (const source of sources) {
      try {
        // Check if the user has data from this source
        const existingData = await prisma.wearableData.count({
          where: { userId, source },
          take: 1,
        })

        // For each source, look for recently recorded data in progress_metrics
        // In a full implementation, this would call the respective OAuth API
        if (existingData > 0) {
          results.push({ source, status: "synced", recordsSynced: existingData })
        } else {
          results.push({ source, status: "not_connected", recordsSynced: 0 })
        }
      } catch (error) {
        console.error(`[WearableSync] Error syncing ${source}:`, error)
        results.push({ source, status: "error", recordsSynced: 0 })
      }
    }

    return NextResponse.json({ data: { synced: results, timestamp: new Date().toISOString() } })
  } catch (error) {
    console.error("Wearable sync error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}

// ─── GET /api/integrations/wearable/sync ─────────────────────────
// Returns the sync status for all wearable sources

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const sources = ["apple_health", "google_fit", "fitbit"]
    const connections: Array<{
      source: string
      connected: boolean
      lastSync: string | null
      dataTypes: string[]
    }> = []

    for (const source of sources) {
      const latest = await prisma.wearableData.findFirst({
        where: { userId, source },
        orderBy: { recordedAt: "desc" },
        select: { recordedAt: true, dataType: true },
      })

      const dataTypes = await prisma.wearableData.findMany({
        where: { userId, source },
        distinct: ["dataType"],
        select: { dataType: true },
      })

      connections.push({
        source,
        connected: latest != null,
        lastSync: latest?.recordedAt.toISOString() ?? null,
        dataTypes: dataTypes.map((d) => d.dataType),
      })
    }

    return NextResponse.json({ data: { connections } })
  } catch (error) {
    console.error("Wearable status error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 })
  }
}
