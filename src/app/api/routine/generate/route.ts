import { NextResponse } from "next/server"

import { checkRateLimit } from "@/lib/ai/rate-limiter"
import { routineEngine } from "@/lib/ai/engines/routine-engine"
import { getAuthUserIdFromRequest } from "@/lib/auth"

/**
 * POST /api/routine/generate — Generate a personalized AI daily routine.
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

    const rateLimit = await checkRateLimit(userId, "routine")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Daily routine limit reached (${rateLimit.limit}/day). Resets at ${rateLimit.resetAt.toISOString()}.`,
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

    const routine = await routineEngine.generate(userId)

    return NextResponse.json(
      { data: routine },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
        },
      }
    )
  } catch (error) {
    console.error("Routine generate API error:", error)
    const message = error instanceof Error ? error.message : "Routine generation failed"
    if (message.includes("rate limit")) {
      return NextResponse.json({ error: { code: "RATE_LIMITED", message } }, { status: 429 })
    }
    return NextResponse.json(
      { error: { code: "AI_ERROR", message: "Routine generation temporarily unavailable. Try again later." } },
      { status: 500 }
    )
  }
}
