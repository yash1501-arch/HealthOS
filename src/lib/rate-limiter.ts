/**
 * Rate Limiter — supports three backends with automatic fallback:
 *
 *   "redis"    → Fast, shared across instances (requires REDIS_URL)
 *   "database" → Shared across instances (uses Prisma + AiAuditLog)
 *   "memory"   → Per-instance only (default, fastest for single server)
 *
 * Auto-detection priority: redis > database > memory
 * Set RATE_LIMIT_BACKEND=redis|database|memory to override.
 */

import { prisma } from "@/lib/prisma"

// ─── Redis Client (lazy-loaded) ─────────────────────────────────

let redisClient: any = null

async function getRedis(): Promise<any> {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) return null
    try {
      const Redis = (await import("ioredis")).default
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't auto-reconnect — fail fast
        lazyConnect: true,
      })
      await redisClient.connect()
    } catch {
      console.warn("Redis unavailable — falling back to database rate limiter")
      redisClient = null
      return null
    }
  }
  return redisClient
}

// ─── Backend Detection ──────────────────────────────────────────

type Backend = "redis" | "database" | "memory"

let detectedBackend: Backend | null = null

async function detectBackend(): Promise<Backend> {
  if (detectedBackend) return detectedBackend

  const override = process.env.RATE_LIMIT_BACKEND as Backend | undefined
  if (override === "redis" || override === "database" || override === "memory") {
    detectedBackend = override
    return detectedBackend
  }

  // Auto-detect: try Redis first, then database, default to memory
  if (process.env.REDIS_URL) {
    const redis = await getRedis()
    if (redis) {
      detectedBackend = "redis"
      return detectedBackend
    }
  }

  if (process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    detectedBackend = "database"
    return detectedBackend
  }

  detectedBackend = "memory"
  return detectedBackend
}

// ─── Rate Limit Result ──────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter: number
  backend: Backend
}

// ─── Redis Backend ──────────────────────────────────────────────

async function redisCheck(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  try {
    const redis = await getRedis()
    if (!redis) return null

    const now = Date.now()
    const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`

    const count = await redis.incr(windowKey)
    if (count === 1) {
      await redis.pexpire(windowKey, windowMs)
    }

    const ttl = await redis.pttl(windowKey)
    const resetAt = now + Math.max(ttl, 0)
    const allowed = count <= maxAttempts

    return {
      allowed,
      remaining: Math.max(0, maxAttempts - count),
      resetAt,
      retryAfter: Math.max(0, Math.ceil((resetAt - now) / 1000)),
      backend: "redis",
    }
  } catch {
    return null // Fall through to next backend
  }
}

// ─── Database Backend ───────────────────────────────────────────

async function databaseCheck(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)

  // Clean old entries (best-effort)
  await prisma.aiAuditLog.deleteMany({
    where: { module: "ratelimit", action: key, createdAt: { lt: windowStart } },
  }).catch(() => {})

  const count = await prisma.aiAuditLog.count({
    where: { module: "ratelimit", action: key, createdAt: { gte: windowStart } },
  })

  if (count >= maxAttempts) {
    const oldest = await prisma.aiAuditLog.findFirst({
      where: { module: "ratelimit", action: key },
      orderBy: { createdAt: "asc" },
    })
    const resetAt = oldest ? oldest.createdAt.getTime() + windowMs : now.getTime() + windowMs
    return { allowed: false, remaining: 0, resetAt, retryAfter: Math.max(0, Math.ceil((resetAt - now.getTime()) / 1000)), backend: "database" }
  }

  await prisma.aiAuditLog.create({
    data: { userId: "system", module: "ratelimit", action: key, prompt: String(maxAttempts), model: "v1" },
  }).catch(() => {})

  const resetAt = now.getTime() + windowMs
  return { allowed: true, remaining: maxAttempts - count - 1, resetAt, retryAfter: 0, backend: "database" }
}

// ─── Memory Backend ─────────────────────────────────────────────

interface MemEntry { count: number; resetAt: number }
const memStore = new Map<string, MemEntry>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memStore) {
    if (now > entry.resetAt) memStore.delete(key)
  }
}, 300_000)

async function memoryCheck(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const entry = memStore.get(key)

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs, retryAfter: 0, backend: "memory" }
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfter: Math.max(0, Math.ceil((entry.resetAt - now) / 1000)), backend: "memory" }
  }

  entry.count++
  return { allowed: true, remaining: maxAttempts - entry.count, resetAt: entry.resetAt, retryAfter: 0, backend: "memory" }
}

// ─── Unified API ────────────────────────────────────────────────

export async function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const backend = await detectBackend()

  if (backend === "redis") {
    const result = await redisCheck(key, maxAttempts, windowMs)
    if (result) return result
    // Redis failed — try database
  }

  if (backend === "database" || (backend === "redis" && process.env.DATABASE_URL)) {
    return databaseCheck(key, maxAttempts, windowMs)
  }

  return memoryCheck(key, maxAttempts, windowMs)
}

/**
 * Login-specific rate limit: compound key (email + IP)
 */
export async function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  const [ipResult, emailResult] = await Promise.all([
    checkRateLimit(`login:ip:${identifier}`, 5, 60_000),
    checkRateLimit(`login:email:${identifier}`, 3, 300_000),
  ])

  const allowed = ipResult.allowed && emailResult.allowed
  const resetAt = Math.max(ipResult.resetAt, emailResult.resetAt)

  return {
    allowed,
    remaining: Math.min(ipResult.remaining, emailResult.remaining),
    resetAt,
    retryAfter: Math.max(0, Math.ceil((resetAt - Date.now()) / 1000)),
    backend: ipResult.backend,
  }
}

/**
 * Reset rate limit state (useful in tests or after password change)
 */
export async function resetRateLimit(key: string): Promise<void> {
  memStore.delete(key)
  if (redisClient) {
    try {
      const redis = await getRedis()
      if (redis) {
        const keys = await redis.keys(`ratelimit:${key}:*`)
        if (keys.length > 0) await redis.del(...keys)
      }
    } catch { /* ignore */ }
  }
}

/**
 * Get the current backend name for health checks
 */
export async function getRateLimitBackend(): Promise<string> {
  const backend = await detectBackend()
  return backend
}
