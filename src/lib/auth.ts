import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-change-in-production")
const ACCESS_TOKEN_EXPIRY = "15m"
const REFRESH_TOKEN_EXPIRY = "7d"

type TokenPayload = JWTPayload & { userId: string }

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createAccessToken(userId: string): Promise<string> {
  return new SignJWT({ userId } as TokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function createRefreshToken(): Promise<string> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as TokenPayload
  } catch {
    return null
  }
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()
  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  })
  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  })
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.set("access_token", "", { maxAge: 0, path: "/" })
  cookieStore.set("refresh_token", "", { maxAge: 0, path: "/" })
}

export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("access_token")?.value
  if (!token) return null
  const payload = await verifyAccessToken(token)
  return payload?.userId ?? null
}

export function generateSessionId(): string {
  return crypto.randomUUID()
}
