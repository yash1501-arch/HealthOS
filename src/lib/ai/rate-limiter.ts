/**
 * In-memory daily AI rate limiter by user tier.
 */

export type UserTier = "free" | "pro" | "clinic"

export type AIInteractionType =
  | "recommendation"
  | "diet"
  | "exercise"
  | "routine"
  | "report"
  | "checkin"
  | "timeline"
  | "safety"
  | "general"

export interface RateLimitCheckResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  tier: UserTier
  limit: number
}

interface RateLimitEntry {
  count: number
  resetAt: Date
}

const DAILY_LIMITS: Record<UserTier, number> = {
  free: 50,
  pro: 200,
  clinic: 1000,
}

/** Per-interaction overrides (falls back to DAILY_LIMITS when absent). */
const INTERACTION_DAILY_LIMITS: Partial<
  Record<AIInteractionType, Record<UserTier, number>>
> = {
  recommendation: { free: 3, pro: 10, clinic: 1000 },
  report: { free: 5, pro: 5, clinic: 50 },
}

const store = new Map<string, RateLimitEntry>()
const tierOverrides = new Map<string, UserTier>()

/**
 * Returns midnight UTC for the next calendar day.
 */
function getNextMidnightUtc(from: Date = new Date()): Date {
  const reset = new Date(from)
  reset.setUTCHours(24, 0, 0, 0)
  return reset
}

/**
 * Builds the storage key for a user's daily AI usage bucket.
 */
function buildKey(userId: string, type: AIInteractionType): string {
  const day = new Date().toISOString().slice(0, 10)
  return `ai:${userId}:${type}:${day}`
}

/**
 * Registers a user's subscription tier for rate limiting (in-memory).
 * Defaults to "free" when no override exists.
 */
export function setUserTier(userId: string, tier: UserTier): void {
  tierOverrides.set(userId, tier)
}

/**
 * Resolves the user's subscription tier for AI rate limits.
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  const override = tierOverrides.get(userId)
  if (override) return override

  const envTier = process.env[`AI_USER_TIER_${userId}`] as UserTier | undefined
  if (envTier === "free" || envTier === "pro" || envTier === "clinic") {
    return envTier
  }

  return "free"
}

/**
 * Checks whether a user may make another AI call today for the given interaction type.
 */
export async function checkRateLimit(
  userId: string,
  type: AIInteractionType = "general"
): Promise<RateLimitCheckResult> {
  try {
    const tier = await getUserTier(userId)
    const limit = INTERACTION_DAILY_LIMITS[type]?.[tier] ?? DAILY_LIMITS[tier]
    const key = buildKey(userId, type)
    const now = new Date()

    let entry = store.get(key)
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: getNextMidnightUtc(now) }
      store.set(key, entry)
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        tier,
        limit,
      }
    }

    entry.count += 1

    return {
      allowed: true,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
      tier,
      limit,
    }
  } catch (error) {
    console.error("AI rate limit check failed:", error)
    throw new Error(
      error instanceof Error ? error.message : "AI rate limit check failed"
    )
  }
}

/**
 * Resets in-memory rate limit state (primarily for tests).
 */
export function resetAIRateLimits(): void {
  store.clear()
  tierOverrides.clear()
}
