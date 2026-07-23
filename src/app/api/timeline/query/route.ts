import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthUserId } from "@/lib/auth"
import { checkRateLimit } from "@/lib/ai/rate-limiter"
import { timelineEngine } from "@/lib/ai/engines/timeline-engine"

const querySchema = z.object({
  query: z.string().min(3).max(2000),
  timeRange: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
})

/**
 * POST /api/timeline/query — Ask a natural language question about your health timeline.
 */
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const rateCheck = await checkRateLimit(userId, "timeline")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Timeline query limit reached (${rateCheck.limit}/day). Resets at ${rateCheck.resetAt.toISOString()}.`,
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": String(rateCheck.remaining),
            "X-RateLimit-Reset": rateCheck.resetAt.toISOString(),
          },
        }
      )
    }

    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON body")
    })

    const parsed = querySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
          },
        },
        { status: 422 }
      )
    }

    const { query, timeRange } = parsed.data

    const result = await timelineEngine.query(userId, query, timeRange)

    return NextResponse.json(
      { data: result },
      {
        headers: {
          "X-RateLimit-Limit": String(rateCheck.limit),
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          "X-RateLimit-Reset": rateCheck.resetAt.toISOString(),
        },
      }
    )
  } catch (error) {
    console.error("Timeline query API error:", error)
    const message = error instanceof Error ? error.message : "Timeline query failed"
    if (message.includes("Invalid JSON")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
        { status: 422 }
      )
    }
    if (message.includes("rate limit")) {
      return NextResponse.json({ error: { code: "RATE_LIMITED", message } }, { status: 429 })
    }
    return NextResponse.json(
      { error: { code: "AI_ERROR", message: "Timeline query temporarily unavailable. Try again later." } },
      { status: 500 }
    )
  }
}
