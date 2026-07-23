import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ALLOWED_MIME_TYPES = ["text/xml", "application/xml"]

// ─── POST /api/integrations/wearable/upload ──────────────────────

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "No file provided" } }, { status: 422 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.endsWith(".xml")) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Only XML files are accepted" } }, { status: 422 })
    }

    const fileSize = file.size
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "File too large. Maximum 50MB." } }, { status: 422 })
    }

    // Read and parse the XML
    const xmlText = await file.text()

    // Parse Apple Health XML
    const { parseAppleHealthXml, convertAppleRecordsToWearableData } = await import("@/lib/integrations/apple-health")
    const parsed = parseAppleHealthXml(xmlText)

    if (parsed.records.length === 0) {
      return NextResponse.json({ error: { code: "PARSE_ERROR", message: "No health records found in the XML file" } }, { status: 422 })
    }

    // Convert and store records
    const wearableEntries = convertAppleRecordsToWearableData(parsed.records, userId)

    if (wearableEntries.length === 0) {
      return NextResponse.json({ error: { code: "PARSE_ERROR", message: "Could not extract any supported health data from the file" } }, { status: 422 })
    }

    // Batch insert in chunks of 500
    const CHUNK_SIZE = 500
    let inserted = 0
    for (let i = 0; i < wearableEntries.length; i += CHUNK_SIZE) {
      const chunk = wearableEntries.slice(i, i + CHUNK_SIZE)
      await prisma.wearableData.createMany({ data: chunk, skipDuplicates: true })
      inserted += chunk.length
    }

    // Update lifestyle steps count from the imported data
    const stepsRecords = wearableEntries.filter((w) => w.dataType === "steps")
    if (stepsRecords.length > 0) {
      const totalSteps = Math.round(stepsRecords.reduce((sum, w) => sum + w.value, 0) / stepsRecords.length)
      await prisma.lifestyle.upsert({
        where: { userId },
        create: { userId, walkingSteps: totalSteps },
        update: { walkingSteps: totalSteps },
      })
    }

    return NextResponse.json({
      data: {
        recordsFound: parsed.records.length,
        recordsImported: inserted,
        exportDate: parsed.exportDate,
        dataTypes: [...new Set(wearableEntries.map((w) => w.dataType))],
        message: `Imported ${inserted} health records from your Apple Health export.`,
      },
    })
  } catch (error) {
    console.error("Apple Health upload error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to process the file" } }, { status: 500 })
  }
}


