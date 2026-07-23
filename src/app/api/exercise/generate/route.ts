import { NextResponse } from "next/server"

import { checkRateLimit } from "@/lib/ai/rate-limiter"
import { exerciseEngine } from "@/lib/ai/engines/exercise-engine"
import { getAuthUserIdFromRequest } from "@/lib/auth"

/**
 * POST /api/exercise/generate — Generate a personalized AI exercise plan.
 *
 * Uses posture analysis data to create corrective exercise plans.
 * Rate limited: 3/week for free, 10/week for pro (configured in rate-limiter.ts).
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

    const rateLimit = await checkRateLimit(userId, "exercise")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Weekly exercise plan limit reached (${rateLimit.limit}/week). Resets at ${rateLimit.resetAt.toISOString()}.`,
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

    const plan = await exerciseEngine.generate(userId)

    return NextResponse.json(
      { data: plan },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
        },
      }
    )
  } catch (error) {
    console.error("Exercise generate API error:", error)

    const message = error instanceof Error ? error.message : "Exercise plan generation failed"

    if (message.includes("rate limit")) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message } },
        { status: 429 }
      )
    }

    if (message.includes("Emergency content")) {
      return NextResponse.json(
        {
          error: {
            code: "SAFETY_BLOCK",
            message: "Your request triggered safety filters. Please rephrase.",
          },
        },
        { status: 422 }
      )
    }

    return NextResponse.json(
      {
        error: {
          code: "AI_ERROR",
          message:
            "Exercise plan generation temporarily unavailable. Try again later.",
        },
      },
      { status: 500 }
    )
  }
}
