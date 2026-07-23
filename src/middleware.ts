import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

// ─── Configuration ──────────────────────────────────────────────

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET
  if (!secret) return new TextEncoder().encode("fallback-secret")
  return new TextEncoder().encode(secret)
})()

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]

const PUBLIC_PAGE_PATHS = ["/", "/login", "/register"]

// ─── Rate Limiting (per IP, in-memory) ──────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 100 // 100 requests per window

function checkRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false }
  }

  entry.count += 1
  return { allowed: true }
}

// ─── Cleanup stale entries every 5 minutes ──────────────────────

let lastCleanup = Date.now()
function cleanupStaleEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60 * 1000) return
  lastCleanup = now
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(key)
  }
}

// ─── Middleware ──────────────────────────────────────────────────

/**
 * Next.js middleware that protects dashboard and API routes.
 *
 * - Dashboard routes (`/dashboard/*`) redirect unauthenticated users to `/login`
 * - API routes (`/api/*`) return 401 for unauthenticated requests
 * - Public auth API paths are excluded from JWT checks
 * - Rate limits all requests to 100 per 15 minutes per IP
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cleanup stale rate limit entries
  cleanupStaleEntries()

  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"

  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } },
        { status: 429 }
      )
    }
    return new NextResponse("Too many requests", { status: 429 })
  }

  // Public paths — no auth needed
  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const isPublicPage = PUBLIC_PAGE_PATHS.some((p) => pathname === p)

  if (isPublicApi || isPublicPage) {
    return NextResponse.next()
  }

  // Static files and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/images/") ||
    pathname.includes(".") // any file extension
  ) {
    return NextResponse.next()
  }

  // Extract token: Authorization header > cookie
  let token: string | null = null

  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim()
  }

  if (!token) {
    token = request.cookies.get("access_token")?.value ?? null
  }

  // Verify JWT
  let userId: string | null = null
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      userId = (payload.sub ?? payload.userId) as string | null
    } catch {
      userId = null
    }
  }

  // Add userId to request headers for downstream use
  const requestHeaders = new Headers(request.headers)
  if (userId) {
    requestHeaders.set("x-user-id", userId)
  }

  // Protected API routes
  if (pathname.startsWith("/api/")) {
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      )
    }
    return NextResponse.next({ headers: requestHeaders })
  }

  // Protected page routes (dashboard, etc.)
  if (!userId) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next({ headers: requestHeaders })
}

// ─── Matcher ─────────────────────────────────────────────────────

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match all dashboard routes
    "/dashboard/:path*",
    // Match auth pages (so we don't redirect already-authenticated users)
    "/login",
    "/register",
  ],
}
