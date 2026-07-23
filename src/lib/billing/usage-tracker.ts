import { prisma } from "@/lib/prisma"
import { getPlan, type PlanId } from "@/lib/billing/plans"

/**
 * Tracks usage of AI calls and report uploads against the user's plan limits.
 *
 * Usage counters are stored in the Subscription record and reset when the
 * subscription period ends or manually on the 1st of each month.
 */

// ─── Types ───────────────────────────────────────────────────────

export type UsageType = "ai_call" | "report_upload"

export interface UsageCheckResult {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  plan: PlanId
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Ensures a user has a Subscription record (creates FREE if missing).
 */
async function ensureSubscription(userId: string) {
  let sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) {
    sub = await prisma.subscription.create({
      data: { userId, plan: "FREE", status: "ACTIVE" },
    })
  }
  return sub
}

/**
 * Resets usage counters on the Subscription record.
 * Called when a subscription period ends or on the 1st of each month.
 */
export async function resetMonthlyUsage(userId?: string): Promise<void> {
  if (userId) {
    const plan = await prisma.subscription.findUnique({ where: { userId }, select: { plan: true } })
    const planConfig = getPlan(plan?.plan ?? "FREE")
    await prisma.subscription.update({
      where: { userId },
      data: {
        aiCallsUsed: 0,
        reportUploadsUsed: 0,
        aiCallsLimit: planConfig.aiCallsPerDay,
        reportUploadsLimit: planConfig.reportUploadsPerMonth,
      },
    })
  } else {
    // Reset all users' monthly usage
    const allSubs = await prisma.subscription.findMany({ select: { userId: true, plan: true } })
    for (const s of allSubs) {
      const planConfig = getPlan(s.plan)
      await prisma.subscription.update({
        where: { userId: s.userId },
        data: {
          aiCallsUsed: 0,
          reportUploadsUsed: 0,
          aiCallsLimit: planConfig.aiCallsPerDay,
          reportUploadsLimit: planConfig.reportUploadsPerMonth,
        },
      })
    }
  }
}

// ─── Core API ────────────────────────────────────────────────────

/**
 * Checks whether a user is under their plan's usage limit for the given type.
 *
 * Does NOT increment the counter — use `trackUsage` after confirming the action.
 */
export async function checkUsageLimit(
  userId: string,
  type: UsageType
): Promise<UsageCheckResult> {
  const sub = await ensureSubscription(userId)

  const used = type === "ai_call" ? sub.aiCallsUsed : sub.reportUploadsUsed
  const limit = type === "ai_call" ? sub.aiCallsLimit : sub.reportUploadsLimit

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    plan: sub.plan as PlanId,
  }
}

/**
 * Tracks a usage event by incrementing the counter in the Subscription record.
 * Should be called AFTER the action is completed successfully.
 */
export async function trackUsage(
  userId: string,
  type: UsageType
): Promise<UsageCheckResult> {
  const sub = await ensureSubscription(userId)

  const field = type === "ai_call" ? "aiCallsUsed" : "reportUploadsUsed"
  const limitField = type === "ai_call" ? "aiCallsLimit" : "reportUploadsLimit"
  const used = sub[field]
  const limit = sub[limitField]

  // Don't increment past the limit
  const newUsed = Math.min(used + 1, limit)

  await prisma.subscription.update({
    where: { userId },
    data: { [field]: newUsed },
  })

  return {
    allowed: used < limit,
    used: newUsed,
    limit,
    remaining: Math.max(0, limit - newUsed),
    plan: sub.plan as PlanId,
  }
}

/**
 * Gets the current usage status for a user (both AI calls and report uploads).
 */
export async function getUsageStatus(userId: string): Promise<{
  aiCalls: UsageCheckResult
  reportUploads: UsageCheckResult
  plan: PlanId
  currentPeriodEnd?: Date
}> {
  const sub = await ensureSubscription(userId)

  const aiCalls: UsageCheckResult = {
    allowed: sub.aiCallsUsed < sub.aiCallsLimit,
    used: sub.aiCallsUsed,
    limit: sub.aiCallsLimit,
    remaining: Math.max(0, sub.aiCallsLimit - sub.aiCallsUsed),
    plan: sub.plan as PlanId,
  }

  const reportUploads: UsageCheckResult = {
    allowed: sub.reportUploadsUsed < sub.reportUploadsLimit,
    used: sub.reportUploadsUsed,
    limit: sub.reportUploadsLimit,
    remaining: Math.max(0, sub.reportUploadsLimit - sub.reportUploadsUsed),
    plan: sub.plan as PlanId,
  }

  return {
    aiCalls,
    reportUploads,
    plan: sub.plan as PlanId,
    currentPeriodEnd: sub.currentPeriodEnd ?? undefined,
  }
}
