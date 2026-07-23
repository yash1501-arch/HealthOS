import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { createBillingPortalSession } from "@/lib/billing/stripe-client"

/**
 * POST /api/billing/portal — Create a Stripe Billing Portal session for managing subscription.
 *
 * Auth required. Returns the portal URL for redirect.
 */
export async function POST() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const url = await createBillingPortalSession(userId)

    return NextResponse.json({ data: { url } })
  } catch (error) {
    console.error("Portal API error:", error)
    const message = error instanceof Error ? error.message : "Portal session failed"
    if (message.includes("No Stripe customer")) {
      return NextResponse.json(
        { error: { code: "NO_SUBSCRIPTION", message: "No active subscription found." } },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: { code: "STRIPE_ERROR", message: "Billing portal temporarily unavailable." } },
      { status: 502 }
    )
  }
}
