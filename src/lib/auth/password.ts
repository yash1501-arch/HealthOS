import bcrypt from "bcryptjs"

const BCRYPT_ROUNDS = 12

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Compares a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export interface PasswordStrengthResult {
  valid: boolean
  score: number // 0-100
  label: "weak" | "fair" | "good" | "strong"
  errors: string[]
  checks: {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
    hasSpecial: boolean
  }
}

/**
 * Validates password strength against HealthOS requirements.
 *
 * Rules:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*()_+-=[]{}|;':\",./<>?`)
 *
 * Returns a detailed result with score, label, and which checks passed/failed.
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`]/.test(password),
  }

  const errors: string[] = []
  if (!checks.minLength) errors.push("At least 8 characters")
  if (!checks.hasUppercase) errors.push("One uppercase letter")
  if (!checks.hasLowercase) errors.push("One lowercase letter")
  if (!checks.hasNumber) errors.push("One number")
  if (!checks.hasSpecial) errors.push("One special character")

  const valid = errors.length === 0

  // Calculate score
  let score = 0
  if (checks.minLength) score += 20
  if (checks.hasUppercase) score += 20
  if (checks.hasLowercase) score += 20
  if (checks.hasNumber) score += 20
  if (checks.hasSpecial) score += 20
  // Bonus for longer passwords
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10
  // Cap at 100
  score = Math.min(score, 100)

  let label: PasswordStrengthResult["label"]
  if (score < 40) label = "weak"
  else if (score < 60) label = "fair"
  else if (score < 80) label = "good"
  else label = "strong"

  return { valid, score, label, errors, checks }
}
