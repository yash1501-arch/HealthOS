/**
 * Security utilities: CSRF protection, input sanitization
 *
 * Rate limiting has been moved to src/lib/rate-limiter.ts
 * with Redis/database/memory backends.
 */

export { checkRateLimit, checkLoginRateLimit, resetRateLimit, getRateLimitBackend } from "./rate-limiter"

// ─── CSRF Protection ────────────────────────────────────────────

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const host = request.headers.get("host")
  if (!origin && !referer) return true

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://${host || "localhost:3000"}`
  const allowedOrigin = new URL(baseUrl).origin

  for (const header of [origin, referer]) {
    if (!header) continue
    try {
      if (new URL(header).origin !== allowedOrigin) return false
    } catch {
      return false
    }
  }
  return true
}

// ─── Input Sanitization ─────────────────────────────────────────

export function sanitize(input: string): string {
  return input
    .replace(/[<>"']/g, "")
    .replace(/[;&|`$]/g, "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, 1000)
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitize(value)
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>)
    }
  }
  return result
}
