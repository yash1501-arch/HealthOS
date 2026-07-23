import { NextResponse } from "next/server"
import { z } from "zod"

import { exerciseEngine } from "@/lib/ai/engines/exercise-engine"
import { getAuthUserIdFromRequest } from "@/lib/auth"

const modifyRequestSchema = z.object({
  planId: z.string().uuid("Invalid plan ID"),
  modification: z
    .string()
    .min(5, "Modification request must be at least 5 characters")
    .max(1000, "Modification request too long"),
})

/**
 * POST /api/exercise/modify — Modify an existing exercise plan based on a user request.
 */
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON body")
    })

    const parsed = modifyRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
          },
        },
        { status: 422 }
      )
    }

    const { planId, modification } = parsed.data

    const updatedPlan = await exerciseEngine.modify(planId, modification)

    return NextResponse.json({ data: updatedPlan })
  } catch (error) {
    console.error("Exercise modify API error:", error)

    const message = error instanceof Error ? error.message : "Exercise modification failed"

    if (message.toLowerCase().includes("not found")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Exercise plan not found" } },
        { status: 404 }
      )
    }

    if (message.includes("Invalid JSON")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
        { status: 422 }
      )
    }

    return NextResponse.json(
      {
        error: {
          code: "AI_ERROR",
          message:
            "Plan modification temporarily unavailable. Try again later.",
        },
      },
      { status: 500 }
    )
  }
}
