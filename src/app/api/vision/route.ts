import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────

const consentSchema = z.object({
  consentVision: z.literal(true),
})

const mediaSchema = z.object({
  mediaType: z.enum(["photo", "video"]),
  angle: z.string().optional(),
  movementType: z.string().optional(),
  fileKey: z.string().min(1),
  fileSizeBytes: z.number().optional(),
  mimeType: z.string().optional(),
})

const analysisResultSchema = z.object({
  postureCharacteristics: z.array(
    z.object({
      characteristic: z.string(),
      severity: z.string(),
      confidence: z.number().optional(),
      description: z.string().optional(),
    })
  ).optional(),
  findings: z.any().optional(),
  summary: z.string().optional(),
  confidenceScore: z.number().optional(),
  processingTimeMs: z.number().optional(),
  modelVersion: z.string().optional(),
})

// ─── POST /api/vision/consent ─────────────────────────────────

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const action = url.searchParams.get("action")

    if (action === "consent") {
      const body = await request.json()
      const parsed = consentSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "You must accept the privacy terms" } },
          { status: 422 }
        )
      }

      await prisma.user.update({
        where: { id: userId },
        data: { consentVision: true },
      })

      await prisma.consentLog.create({
        data: {
          userId,
          consentType: "vision_analysis",
          action: "granted",
        },
      })

      return NextResponse.json({ data: { success: true } })
    }

    if (action === "upload-media") {
      const body = await request.json()
      const parsed = mediaSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid media data", details: parsed.error.issues } },
          { status: 422 }
        )
      }

      const { mediaType, angle, movementType, fileKey, fileSizeBytes, mimeType } = parsed.data

      const media = await prisma.visionMedia.create({
        data: {
          userId,
          mediaType,
          angle,
          movementType,
          fileKey,
          fileSizeBytes,
          mimeType,
          status: "pending",
        },
      })

      return NextResponse.json({ data: media })
    }

    if (action === "save-analysis") {
      const body = await request.json()
      const parsed = analysisResultSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid analysis data" } },
          { status: 422 }
        )
      }

      // Find or create a media record to link the analysis to
      let mediaId: string | null = null

      // Try to find completed media from this session
      const latestMedia = await prisma.visionMedia.findFirst({
        where: { userId, status: { not: "deleted" } },
        orderBy: { createdAt: "desc" },
      })

      if (latestMedia) {
        mediaId = latestMedia.id
        await prisma.visionMedia.update({
          where: { id: latestMedia.id },
          data: { status: "completed" },
        })
      } else {
        // Create a synthetic media record to satisfy the FK constraint
        const syntheticMedia = await prisma.visionMedia.create({
          data: {
            userId,
            mediaType: "photo",
            fileKey: `vision/${userId}/analysis_${Date.now()}`,
            status: "completed",
          },
        })
        mediaId = syntheticMedia.id
      }

      // Create analysis linked to media
      const analysis = await prisma.visionAnalysis.create({
        data: {
          userId,
          mediaId,
          analysisType: "posture",
          findings: parsed.data.findings || {},
          summary: parsed.data.summary || "Posture analysis completed",
          confidenceScore: parsed.data.confidenceScore,
          processingTimeMs: parsed.data.processingTimeMs,
          modelVersion: parsed.data.modelVersion,
          status: "completed",
        },
      })

      if (parsed.data.postureCharacteristics) {
        await prisma.postureCharacteristic.createMany({
          data: parsed.data.postureCharacteristics.map((pc) => ({
            userId,
            analysisId: analysis.id,
            characteristic: pc.characteristic,
            severity: pc.severity,
            confidence: pc.confidence,
            description: pc.description,
          })),
        })
      }

      // Mark onboarding complete
      await prisma.user.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      })

      return NextResponse.json({ data: { ...analysis, postureCharacteristics: parsed.data.postureCharacteristics } })
    }

    return NextResponse.json(
      { error: { code: "INVALID_ACTION", message: "Unknown action" } },
      { status: 400 }
    )
  } catch (error) {
    console.error("Vision API error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── GET /api/vision ─────────────────────────────────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { consentVision: true },
    })

    const [analyses, media] = await Promise.all([
      prisma.visionAnalysis.findMany({
        where: { userId },
        include: {
          postureCharacteristics: {
            where: { isActive: true },
          },
          media: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.visionMedia.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({
      data: {
        consentVision: user?.consentVision ?? false,
        analyses,
        media,
      },
    })
  } catch (error) {
    console.error("Vision GET error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/vision ──────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const mediaId = url.searchParams.get("mediaId")

    if (mediaId) {
      // Soft-delete a specific media item
      await prisma.visionMedia.update({
        where: { id: mediaId, userId },
        data: { deletedAt: new Date() },
      })
      return NextResponse.json({ data: { success: true } })
    }

    // Delete all user vision data
    await prisma.$transaction([
      prisma.postureCharacteristic.deleteMany({ where: { userId } }),
      prisma.visionAnalysis.deleteMany({ where: { userId } }),
      prisma.visionMedia.updateMany({
        where: { userId },
        data: { deletedAt: new Date() },
      }),
    ])

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Vision DELETE error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
