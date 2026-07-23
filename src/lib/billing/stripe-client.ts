import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { getPlan, getStripePriceId, type PlanId } from "@/lib/billing/plans"
import { logAudit } from "@/lib/security/audit-trail"

// ─── Initialization ─────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set")
  }
  return new Stripe(key, {
    apiVersion: "2025-04-30" as Stripe.LatestApiVersion,
    typescript: true,
  })
}

// ─── Webhook Secret ─────────────────────────────────────────────

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set")
  }
  return secret
}

// ─── Customer ───────────────────────────────────────────────────

/**
 * Creates a Stripe customer for the given user and stores the customer ID.
 */
export async function createCustomer(
  userId: string,
  email: string,
  name: string
): Promise<Stripe.Customer> {
  const stripe = getStripe()

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  })

  // Upsert the subscription record with the Stripe customer ID
  await prisma.subscription.upsert({
    where: { userId },
    update: { stripeCustomerId: customer.id },
    create: {
      userId,
      plan: "FREE",
      status: "ACTIVE",
      stripeCustomerId: customer.id,
    },
  })

  return customer
}

// ─── Checkout Session ───────────────────────────────────────────

/**
 * Creates a Stripe Checkout Session for upgrading to a paid plan.
 *
 * @param userId - The user's internal ID.
 * @param plan - The target plan (PRO or CLINIC).
 * @param interval - "month" or "year" billing interval.
 * @returns The checkout URL.
 */
export async function createCheckoutSession(
  userId: string,
  plan: PlanId,
  interval: "month" | "year" = "month"
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, subscription: true },
  })

  if (!user) throw new Error("User not found")

  // Ensure Stripe customer exists
  let customerId = user.subscription?.stripeCustomerId
  if (!customerId) {
    const customer = await createCustomer(
      userId,
      user.email,
      user.profile?.fullName ?? "HealthOS User"
    )
    customerId = customer.id
  }

  const priceId = getStripePriceId(plan, interval)
  if (!priceId) {
    throw new Error(`No Stripe price configured for ${plan} ${interval}`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/billing?canceled=true`,
    metadata: { userId, plan, interval },
    subscription_data: {
      metadata: { userId, plan },
    },
    allow_promotion_codes: true,
  })

  if (!session.url) {
    throw new Error("Failed to create checkout session URL")
  }

  await logAudit({
    userId,
    action: "PLAN_GENERATE",
    resource: "billing",
    resourceId: session.id,
    details: { action: "checkout_created", plan, interval },
  })

  return { url: session.url, sessionId: session.id }
}

// ─── Billing Portal ─────────────────────────────────────────────

/**
 * Creates a Stripe Billing Portal session for managing the subscription.
 */
export async function createBillingPortalSession(
  userId: string
): Promise<string> {
  const stripe = getStripe()

  const sub = await prisma.subscription.findUnique({ where: { userId } })
  const customerId = sub?.stripeCustomerId

  if (!customerId) {
    throw new Error("No Stripe customer found. Subscribe to a plan first.")
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/billing`,
  })

  await logAudit({
    userId,
    action: "PLAN_GENERATE",
    resource: "billing",
    resourceId: session.id,
    details: { action: "portal_created" },
  })

  return session.url
}

// ─── Cancel Subscription ────────────────────────────────────────

/**
 * Cancels a user's paid subscription and downgrades to FREE.
 */
export async function cancelSubscription(
  userId: string
): Promise<void> {
  const stripe = getStripe()

  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub?.stripeSubscriptionId) {
    throw new Error("No active subscription to cancel")
  }

  await stripe.subscriptions.cancel(sub.stripeSubscriptionId, {
    prorate: true,
  })

  const planConfig = getPlan("FREE")

  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: "FREE",
      status: "CANCELLED",
      stripeSubscriptionId: null,
      currentPeriodEnd: new Date(),
      aiCallsLimit: planConfig.aiCallsPerDay,
      reportUploadsLimit: planConfig.reportUploadsPerMonth,
    },
  })

  await logAudit({
    userId,
    action: "PLAN_GENERATE",
    resource: "billing",
    details: { action: "subscription_cancelled", previousPlan: sub.plan },
  })
}

// ─── Upgrade / Change Plan ──────────────────────────────────────

/**
 * Upgrades or changes a user's subscription plan.
 * This is typically handled by Stripe via checkout, but this provides
 * a direct method for admin operations or post-webhook processing.
 */
export async function upgradePlan(
  userId: string,
  newPlan: PlanId
): Promise<void> {
  const planConfig = getPlan(newPlan)

  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: newPlan,
      aiCallsLimit: planConfig.aiCallsPerDay,
      reportUploadsLimit: planConfig.reportUploadsPerMonth,
    },
  })

  await logAudit({
    userId,
    action: "PLAN_GENERATE",
    resource: "billing",
    details: { action: "plan_upgraded", newPlan },
  })
}

// ─── Webhook Handler ────────────────────────────────────────────

/**
 * Handles Stripe webhook events related to subscriptions and payments.
 *
 * Supported events:
 * - checkout.session.completed → Activate subscription
 * - customer.subscription.updated → Update plan/status
 * - customer.subscription.deleted → Downgrade to FREE
 * - invoice.payment_failed → Mark PAST_DUE
 */
export async function handleWebhook(
  event: Stripe.Event
): Promise<void> {
  const stripe = getStripe()

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const plan = session.metadata?.plan as PlanId | undefined

      if (!userId || !plan) {
        console.warn("Checkout session missing userId or plan metadata", session.id)
        return
      }

      // Fetch the subscription details from Stripe
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        const planConfig = getPlan(plan)

        const subData = subscription as unknown as { current_period_end: number }
        await prisma.subscription.update({
          where: { userId },
          data: {
            plan,
            status: "ACTIVE",
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date(subData.current_period_end * 1000),
            aiCallsLimit: planConfig.aiCallsPerDay,
            reportUploadsLimit: planConfig.reportUploadsPerMonth,
          },
        })
      }

      // Record payment
      if (session.payment_intent) {
        await prisma.paymentHistory.create({
          data: {
            userId,
            amount: session.amount_total ?? 0,
            currency: session.currency ?? "usd",
            description: `${plan} subscription`,
            stripePaymentId: session.payment_intent as string,
            status: "completed",
          },
        })
      }

      await logAudit({
        userId,
        action: "PLAN_GENERATE",
        resource: "billing",
        resourceId: session.id,
        details: { action: "checkout_completed", plan },
      })
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId

      if (!userId) {
        // Try to find user by customer ID
        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: subscription.customer as string },
        })
        if (!sub) return

        const planByStripe = subscription.items.data[0]?.price?.metadata?.plan as PlanId | undefined
        const plan = planByStripe ?? "PRO"

        const updatedSub = subscription as unknown as { status: string; current_period_end: number }
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: updatedSub.status === "active" ? "ACTIVE"
              : updatedSub.status === "past_due" ? "PAST_DUE"
              : updatedSub.status === "trialing" ? "TRIALING"
              : "CANCELLED",
            currentPeriodEnd: new Date(updatedSub.current_period_end * 1000),
            plan,
          },
        })
      }
      break
    }

    case "customer.subscription.deleted": {
      const deletedSub = event.data.object as Stripe.Subscription
      const deletedUserId = deletedSub.metadata?.userId

      const planConfig = getPlan("FREE")

      if (deletedUserId) {
        await prisma.subscription.update({
          where: { userId: deletedUserId },
          data: {
            plan: "FREE",
            status: "CANCELLED",
            stripeSubscriptionId: null,
            aiCallsLimit: planConfig.aiCallsPerDay,
            reportUploadsLimit: planConfig.reportUploadsPerMonth,
          },
        })
      } else {
        // Fallback: find by customer ID
        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: deletedSub.customer as string },
        })
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              plan: "FREE",
              status: "CANCELLED",
              stripeSubscriptionId: null,
              aiCallsLimit: planConfig.aiCallsPerDay,
              reportUploadsLimit: planConfig.reportUploadsPerMonth,
            },
          })
        }
      }
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const sub = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      })

      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "PAST_DUE" },
        })

        await logAudit({
          userId: sub.userId,
          action: "PLAN_GENERATE",
          resource: "billing",
          details: { action: "payment_failed", invoiceId: invoice.id },
        })
      }
      break
    }

    default:
      // Unhandled event type — just acknowledge
      break
  }
}
