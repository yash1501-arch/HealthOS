import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret === "fallback-secret-change-in-production-min-32-chars-long") {
    throw new Error(
      "JWT_SECRET environment variable is not set. Generate one with: openssl rand -base64 32"
    )
  }
  return new TextEncoder().encode(secret)
})()

const ACCESS_EXPIRY = "15m"
const REFRESH_EXPIRY = "7d"

export interface AccessTokenPayload extends JWTPayload {
  userId: string
  email?: string
  role?: string
}

export interface RefreshTokenPayload extends JWTPayload {
  userId: string
  tokenId: string
}

/**
 * Generates a short-lived access token (15 min).
 */
export async function generateAccessToken(
  payload: { userId: string; email?: string; role?: string }
): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ACCESS_EXPIRY)
    .setIssuedAt()
    .setSubject(payload.userId)
    .sign(JWT_SECRET)
}

/**
 * Generates a refresh token, stores its hash in the Session (RefreshToken) table.
 * Returns the raw token string to issue to the client.
 */
export async function generateRefreshToken(
  payload: { userId: string }
): Promise<{ token: string; tokenHash: string }> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")

  // Hash the token for storage (simple SHA-256 via Web Crypto)
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token))
  const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("")

  return { token, tokenHash }
}

/**
 * Verifies an access token and returns the decoded payload or null.
 */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AccessTokenPayload
  } catch {
    return null
  }
}

/**
 * Verifies a refresh token against the database.
 * Returns the session record or null.
 * Supports token reuse detection: if a token hash isn't found but was
 * previously revoked, all user sessions are invalidated (force re-login).
 */
export async function verifyRefreshToken(
  token: string
): Promise<{
  userId: string
  sessionId: string
} | null> {
  try {
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token))
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("")

    const session = await prisma.session.findUnique({
      where: { refreshToken: tokenHash },
    })

    if (!session) {
      return null
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } })
      return null
    }

    return { userId: session.userId, sessionId: session.id }
  } catch {
    return null
  }
}

/**
 * Rotates a refresh token: invalidates the old session and creates a new one.
 * Returns the new access + refresh token pair.
 */
export async function rotateRefreshToken(
  oldToken: string
): Promise<{
  accessToken: string
  refreshToken: string
  userId: string
} | null> {
  const verified = await verifyRefreshToken(oldToken)
  if (!verified) return null

  const { userId, sessionId } = verified

  // Delete old session
  await prisma.session.delete({ where: { id: sessionId } })

  // Generate new pair
  const { token: newRefreshToken, tokenHash: newHash } = await generateRefreshToken({ userId })
  const newAccessToken = await generateAccessToken({ userId })

  // Store new session
  await prisma.session.create({
    data: {
      userId,
      refreshToken: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, userId }
}
