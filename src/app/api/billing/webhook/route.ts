import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getWebhookSecret, handleWebhook } from "@/lib/billing/stripe-client"

/**
 * POST /api/billing/webhook — Stripe webhook endpoint.
 *
 * Receives subscription lifecycle events from Stripe and updates the database.
 * Verifies the webhook signature for security.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json(
        { error: { code: "MISSING_SIGNATURE", message: "No webhook signature" } },
        { status: 400 }
      )
    }

    // Construct and verify the event
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
      apiVersion: "2025-04-30" as Stripe.LatestApiVersion,
    })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret())
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json(
        { error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" } },
        { status: 400 }
      )
    }

    // Process the event
    await handleWebhook(event)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Webhook processing failed" } },
      { status: 500 }
    )
  }
}
