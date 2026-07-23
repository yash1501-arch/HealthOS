import { NextResponse } from "next/server"

import { checkRateLimit } from "@/lib/ai/rate-limiter"
import { dietEngine } from "@/lib/ai/engines/diet-engine"
import { getAuthUserIdFromRequest } from "@/lib/auth"

/**
 * POST /api/diet/generate — Generate a personalized AI diet plan for the authenticated user.
 *
 * Rate limits: 2/week for free users, 5/week for pro users (configured in rate-limiter.ts).
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

    // Rate limit: diet type enforces 2/week free, 5/week pro
    const rateLimit = await checkRateLimit(userId, "diet")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Weekly diet plan limit reached (${rateLimit.limit}/week). Resets at ${rateLimit.resetAt.toISOString()}.`,
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

    const plan = await dietEngine.generate(userId)

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
    console.error("Diet generate API error:", error)

    const message = error instanceof Error ? error.message : "Diet plan generation failed"

    if (message.includes("rate limit")) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message } },
        { status: 429 }
      )
    }

    if (message.includes("Emergency content")) {
      return NextResponse.json(
        { error: { code: "SAFETY_BLOCK", message: "Your request triggered safety filters. Please rephrase." } },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: { code: "AI_ERROR", message: "Diet plan generation temporarily unavailable. Try again later." } },
      { status: 500 }
    )
  }
}
