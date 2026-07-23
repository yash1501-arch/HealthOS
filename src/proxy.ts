import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify, SignJWT } from "jose"

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret === "fallback-secret-change-in-production-min-32-chars-long") {
    throw new Error("JWT_SECRET is not set. Generate one with: openssl rand -base64 32")
  }
  return new TextEncoder().encode(secret)
})()

const protectedRoutes = [
  "/dashboard",
  "/assessment",
  "/reports",
  "/vision",
  "/diet",
  "/exercise",
  "/routine",
  "/timeline",
  "/settings",
]

const authRoutes = ["/login", "/register"]

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string; exp?: number }
  } catch {
    return null
  }
}

async function attemptTokenRefresh(request: NextRequest): Promise<{ accessToken: string } | null> {
  const refreshToken = request.cookies.get("refresh_token")?.value
  if (!refreshToken) return null

  try {
    const baseUrl = new URL(request.url).origin
    // Send refresh_token as a cookie header since the refresh API reads it from cookies
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
    })
    if (!res.ok) return null
    const body = await res.json()
    return body.data || body
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle refresh endpoint itself — always allow through
  if (pathname === "/api/auth/refresh") {
    return NextResponse.next()
  }

  // Allow ALL API routes through — they handle their own auth via getAuthUserId()
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const authenticated = await verifyToken(
    request.cookies.get("access_token")?.value ?? ""
  )

  // Redirect authenticated users away from login/register
  if (authRoutes.includes(pathname)) {
    if (authenticated) {
      // Handle ?redirect= param on login page
      const redirectTo = request.nextUrl.searchParams.get("redirect") || "/dashboard"
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
    return NextResponse.next()
  }

  // Allow public API routes through
  if (pathname === "/api/health" || pathname === "/api/auth/login" || pathname === "/api/auth/register") {
    return NextResponse.next()
  }

  // Check protected page routes (API routes are handled above)
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtected) {
    // If access token is valid, proceed
    if (authenticated) {
      return NextResponse.next()
    }

    // Try to refresh the token
    const refreshResult = await attemptTokenRefresh(request)
    if (refreshResult) {
      const response = NextResponse.next()
      response.cookies.set("access_token", refreshResult.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60,
        path: "/",
      })
      return response
    }

    // If it's an API route, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    // Redirect to login with redirect back
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
