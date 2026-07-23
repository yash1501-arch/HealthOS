import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthUserId } from "@/lib/auth"
import { createCheckoutSession } from "@/lib/billing/stripe-client"
import { getPlan } from "@/lib/billing/plans"
import { logAudit } from "@/lib/security/audit-trail"

const checkoutSchema = z.object({
  plan: z.enum(["PRO", "CLINIC"]),
  interval: z.enum(["month", "year"]).optional().default("month"),
})

/**
 * POST /api/billing/checkout — Create a Stripe Checkout Session for upgrading.
 *
 * Auth required. Returns the checkout URL for redirect.
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

    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON body")
    })

    const parsed = checkoutSchema.safeParse(body)
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

    const { plan, interval } = parsed.data

    // Verify plan exists
    getPlan(plan)

    const result = await createCheckoutSession(userId, plan, interval)

    return NextResponse.json({
      data: { url: result.url, sessionId: result.sessionId },
    })
  } catch (error) {
    console.error("Checkout API error:", error)
    const message = error instanceof Error ? error.message : "Checkout failed"
    if (message.includes("Invalid JSON")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
        { status: 422 }
      )
    }
    if (message.includes("Stripe")) {
      return NextResponse.json(
        { error: { code: "STRIPE_ERROR", message: "Payment service temporarily unavailable." } },
        { status: 502 }
      )
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
