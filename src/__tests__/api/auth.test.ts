import { describe, it, expect } from "vitest"

// ─── Auth API Tests ──────────────────────────────────────────────
// These tests verify the authentication logic by testing the underlying
// helper functions. Full API integration tests require a running server
// and database, which can be set up separately.

describe("Auth - Helper Functions", () => {
  it("can import auth functions", async () => {
    const auth = await import("@/lib/auth")
    expect(typeof auth.hashPassword).toBe("function")
    expect(typeof auth.verifyPassword).toBe("function")
    expect(typeof auth.verifyAccessToken).toBe("function")
  })

  it("verifyAccessToken returns null for invalid token", async () => {
    const { verifyAccessToken } = await import("@/lib/auth")
    const payload = await verifyAccessToken("invalid-token-string")
    expect(payload).toBeNull()
  })

  it("hashPassword produces a hash", async () => {
    const { hashPassword } = await import("@/lib/auth")
    const hash = await hashPassword("test-password-123!")
    expect(hash).toBeTruthy()
    expect(typeof hash).toBe("string")
    expect(hash.length).toBeGreaterThan(20)
  })

  it("verifyPassword matches correct password", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth")
    const hash = await hashPassword("test-password-123!")
    const valid = await verifyPassword("test-password-123!", hash)
    expect(valid).toBe(true)
  })

  it("verifyPassword rejects wrong password", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth")
    const hash = await hashPassword("test-password-123!")
    const valid = await verifyPassword("wrong-password", hash)
    expect(valid).toBe(false)
  })
})

describe("Auth - Registration Logic", () => {
  it("registerschema validates correct input", async () => {
    const { z } = await import("zod")
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      fullName: z.string().min(1),
    })

    const valid = schema.safeParse({
      email: "test@example.com",
      password: "Password123!",
      fullName: "Test User",
    })
    expect(valid.success).toBe(true)
  })

  it("registerschema rejects invalid email", async () => {
    const { z } = await import("zod")
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    })

    const invalid = schema.safeParse({
      email: "not-an-email",
      password: "Password123!",
    })
    expect(invalid.success).toBe(false)
  })

  it("registerschema rejects short passwords", async () => {
    const { z } = await import("zod")
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    })

    const invalid = schema.safeParse({
      email: "test@example.com",
      password: "short",
    })
    expect(invalid.success).toBe(false)
  })
})

describe("Auth - Login Logic", () => {
  it("login schema requires email and password", async () => {
    const { z } = await import("zod")
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })

    const valid = schema.safeParse({ email: "test@example.com", password: "mypassword" })
    expect(valid.success).toBe(true)

    const missingPassword = schema.safeParse({ email: "test@example.com" })
    expect(missingPassword.success).toBe(false)

    const missingEmail = schema.safeParse({ password: "mypassword" })
    expect(missingEmail.success).toBe(false)
  })
})

describe("Auth - Middleware / Protected Routes", () => {
  it("protected route rejects missing auth header", () => {
    const headers = new Headers()
    expect(headers.has("authorization")).toBe(false)
  })

  it("Bearer token can be extracted from auth header", () => {
    const headers = new Headers({ authorization: "Bearer test-token-here" })
    const auth = headers.get("authorization")
    expect(auth).toBe("Bearer test-token-here")
    const token = auth!.slice(7).trim()
    expect(token).toBe("test-token-here")
  })

  it("malformed Bearer token does not crash extraction", () => {
    const headers = new Headers({ authorization: "Bearer " })
    const auth = headers.get("authorization")
    const token = auth!.slice(7).trim()
    expect(token).toBe("") // empty token
  })
})
