import { NextResponse } from "next/server"

import { checkRateLimit } from "@/lib/ai/rate-limiter"
import { recommendationEngine } from "@/lib/ai/engines/recommendation-engine"
import { getAuthUserIdFromRequest } from "@/lib/auth"

/**
 * POST /api/ai/recommendation — Generate AI health recommendations for the authenticated user.
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

    const rateLimit = await checkRateLimit(userId, "recommendation")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Daily recommendation limit reached (${rateLimit.limit}/day). Resets at ${rateLimit.resetAt.toISOString()}.`,
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
          },
        }
      )
    }

    const recommendation = await recommendationEngine.generate(userId)

    return NextResponse.json(
      { data: recommendation },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
        },
      }
    )
  } catch (error) {
    console.error("AI recommendation API error:", error)

    const message =
      error instanceof Error ? error.message : "Recommendation generation failed"

    if (message.includes("rate limit")) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message } },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: { code: "AI_ERROR", message: "Recommendations temporarily unavailable. Try again later." } },
      { status: 500 }
    )
  }
}
