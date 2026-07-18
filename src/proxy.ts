import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-change-in-production")

const protectedRoutes = [
  "/dashboard",
  "/assessment",
  "/reports",
  "/vision",
  "/diet",
  "/exercise",
  "/routine",
  "/timeline",
]

const authRoutes = ["/login", "/register"]

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const accessToken = request.cookies.get("access_token")?.value
  if (!accessToken) return false
  try {
    const { payload } = await jwtVerify(accessToken, JWT_SECRET)
    return !!payload.userId
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const authenticated = await isAuthenticated(request)

  // Redirect authenticated users away from login/register
  if (pathname === "/login" || pathname === "/register") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  // Allow API routes through (they handle their own auth)
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Protect dashboard routes
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))
  if (isProtected && !authenticated) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
