import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { parseAppleHealthXml, convertAppleRecordsToMetrics } from "@/lib/integrations/apple-health"

// ─── POST /api/integrations/apple-health — Import Apple Health XML ─

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const source = (formData.get("source") as string) || "apple_health"

    if (!file) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No file provided" } },
        { status: 422 }
      )
    }

    // Parse XML
    const xmlText = await file.text()
    const parsed = parseAppleHealthXml(xmlText)

    if (parsed.records.length === 0) {
      return NextResponse.json(
        { error: { code: "PARSE_ERROR", message: "No health records found in the file. Make sure it's an Apple Health export.xml." } },
        { status: 422 }
      )
    }

    // Convert to metrics
    const metrics = convertAppleRecordsToMetrics(parsed.records, userId)

    // Save to database (batch in chunks of 100)
    let savedCount = 0
    for (let i = 0; i < metrics.length; i += 100) {
      const batch = metrics.slice(i, i + 100)
      await prisma.progressMetric.createMany({ data: batch, skipDuplicates: true })
      savedCount += batch.length
    }

    // Log the import
    await prisma.healthTimelineEntry.create({
      data: {
        userId,
        eventType: "report_uploaded",
        title: `Health data imported from ${source === "apple_health" ? "Apple Health" : source}`,
        description: `${savedCount} records imported (${new Date(parsed.exportDate).toLocaleDateString()})`,
        eventDate: new Date(),
        metadata: {
          source,
          recordCount: parsed.records.length,
          savedCount,
          types: [...new Set(parsed.records.map((r) => r.type))],
        },
      },
    })

    // Summary by type
    const summary = parsed.records.reduce(
      (acc, r) => {
        const key = r.type.split("Identifier").pop() || r.type
        acc[key] = (acc[key] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      data: {
        success: true,
        totalRecords: parsed.records.length,
        savedCount,
        exportDate: parsed.exportDate,
        types: Object.keys(summary),
        summary,
      },
    })
  } catch (error) {
    console.error("Apple Health import error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Import failed. Make sure you're uploading a valid export.xml file." } },
      { status: 500 }
    )
  }
}

// ─── GET /api/integrations/apple-health — Check import status ──

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) return unauth()

    const imports = await prisma.healthTimelineEntry.findMany({
      where: { userId, eventType: "report_uploaded", title: { contains: "Health data imported" } },
      orderBy: { eventDate: "desc" },
      take: 5,
    })

    return NextResponse.json({
      data: imports.map((i: any) => ({
        date: i.eventDate.toISOString(),
        description: i.description,
        metadata: i.metadata,
      })),
    })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

function unauth() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
}
