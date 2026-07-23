/**
 * Sliding-window in-memory rate limiter.
 *
 * Supports per-user AND per-IP rate limiting with different limits per endpoint tier:
 * - Auth endpoints: 10 per minute
 * - AI generation: 5 per hour (free), 20 per hour (pro)
 * - API reads: 100 per minute
 * - File uploads: 10 per hour
 */

// ─── Types ───────────────────────────────────────────────────────

export type RateLimitTier =
  | "auth"
  | "ai_generation_free"
  | "ai_generation_pro"
  | "api_read"
  | "file_upload"
  | "data_export"

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  limit: number
  windowMs: number
}

interface WindowEntry {
  timestamps: number[]
}

// ─── Configuration ──────────────────────────────────────────────

interface TierConfig {
  limit: number
  windowMs: number
}

const TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  auth: { limit: 10, windowMs: 60_000 }, // 10 per minute
  ai_generation_free: { limit: 5, windowMs: 3_600_000 }, // 5 per hour
  ai_generation_pro: { limit: 20, windowMs: 3_600_000 }, // 20 per hour
  api_read: { limit: 100, windowMs: 60_000 }, // 100 per minute
  file_upload: { limit: 10, windowMs: 3_600_000 }, // 10 per hour
  data_export: { limit: 3, windowMs: 3_600_000 }, // 3 per hour
}

// ─── Storage ────────────────────────────────────────────────────

const windows = new Map<string, WindowEntry>()

// ─── Cleanup ────────────────────────────────────────────────────

let lastCleanup = Date.now()

function cleanupStaleWindows(): void {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return // Clean up at most once per minute
  lastCleanup = now

  for (const [key, entry] of windows) {
    // Find the oldest timestamp in the window
    if (entry.timestamps.length === 0) {
      windows.delete(key)
      continue
    }
    // If the entire window is stale, remove it
    const oldest = entry.timestamps[0]!
    if (now - oldest > 3_600_000) {
      windows.delete(key)
    }
  }
}

// ─── Core Logic ─────────────────────────────────────────────────

/**
 * Checks a rate limit using a sliding window algorithm.
 *
 * @param key - Unique identifier (e.g., "user:userId" or "ip:1.2.3.4").
 * @param tier - The rate limit tier to apply.
 * @returns Result with allowed status, remaining count, reset time, and limit.
 */
export async function checkSlidingLimit(
  key: string,
  tier: RateLimitTier
): Promise<RateLimitResult> {
  cleanupStaleWindows()

  const config = TIER_CONFIGS[tier]
  if (!config) {
    throw new Error(`Unknown rate limit tier: ${tier}`)
  }

  const { limit, windowMs } = config
  const now = Date.now()
  const windowStart = now - windowMs

  let entry = windows.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    windows.set(key, entry)
  }

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  // Check if limit exceeded
  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0]!
    const resetAt = new Date(oldest + windowMs)
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      limit,
      windowMs,
    }
  }

  // Record this request
  entry.timestamps.push(now)

  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    resetAt: new Date(now + windowMs),
    limit,
    windowMs,
  }
}

/**
 * Checks a rate limit for a specific user.
 *
 * @param userId - The user's ID.
 * @param tier - The rate limit tier.
 * @param isPro - Whether the user is a pro subscriber (affects AI generation limits).
 * @returns Rate limit result.
 */
export async function checkUserRateLimit(
  userId: string,
  tier: RateLimitTier,
  isPro?: boolean
): Promise<RateLimitResult> {
  let effectiveTier = tier

  // Pro users get higher AI generation limits
  if (tier === "ai_generation_free" && isPro) {
    effectiveTier = "ai_generation_pro"
  }

  return checkSlidingLimit(`user:${userId}`, effectiveTier)
}

/**
 * Checks a rate limit for a specific IP address.
 *
 * @param ip - The client IP address.
 * @param tier - The rate limit tier.
 * @returns Rate limit result.
 */
export async function checkIpRateLimit(
  ip: string,
  tier: RateLimitTier
): Promise<RateLimitResult> {
  return checkSlidingLimit(`ip:${ip}`, tier)
}

/**
 * Sets rate limit headers on a Response or NextResponse.
 */
export function setRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set("X-RateLimit-Limit", String(result.limit))
  headers.set("X-RateLimit-Remaining", String(result.remaining))
  headers.set("X-RateLimit-Reset", result.resetAt.toISOString())
}

/**
 * Resets all in-memory rate limit windows (useful for testing).
 */
export function resetRateLimits(): void {
  windows.clear()
}
