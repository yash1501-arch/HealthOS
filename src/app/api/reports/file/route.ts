import { NextResponse } from "next/server"
import { readReportFile } from "@/lib/storage"

// ─── GET /api/reports/file?key=<fileKey> — Serve report file ───

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileKey = searchParams.get("key")

    if (!fileKey) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing file key" } },
        { status: 422 }
      )
    }

    const buffer = await readReportFile(fileKey)

    // Infer content type from file extension
    const ext = fileKey.split(".").pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    }
    const contentType = mimeTypes[ext ?? ""] || "application/octet-stream"

    // Convert Buffer to Uint8Array for edge-runtime compatibility
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${fileKey.split("/").pop()}"`,
      },
    })
  } catch (error) {
    console.error("File serve error:", error)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "File not found" } },
      { status: 404 }
    )
  }
}
