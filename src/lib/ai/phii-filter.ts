/**
 * PHI (Protected Health Information) filtering utilities.
 * Strips identifiers before data is sent to external LLM providers.
 */

/** Words and phrases that indicate diagnostic language in AI output. */
const DIAGNOSTIC_PATTERNS: RegExp[] = [
  /\bdiagnos(?:is|e|ed|ing)\b/i,
  /\byou have\b/i,
  /\byou(?:'re| are) (?:suffering from|experiencing|diagnosed with)\b/i,
  /\bconfirmed\b/i,
  /\b(?:you )?(?:have|has) (?:a |an )?(?:disease|disorder|syndrome|condition)\b/i,
  /\bcancer\b/i,
  /\bpositive for\b/i,
  /\bdefinitely have\b/i,
  /\bthis (?:is|means you have)\b/i,
]

/** Regex patterns for common PII/PHI identifiers. */
const PHI_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[EMAIL_REDACTED]",
  },
  {
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE_REDACTED]",
  },
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[SSN_REDACTED]",
  },
  {
    pattern: /\b(?:MRN|Medical Record(?: Number)?|Patient ID)[:\s#]*[\w-]+\b/gi,
    replacement: "[MRN_REDACTED]",
  },
  {
    pattern:
      /\b\d+\s+(?:Main|Oak|Maple|Pine|Cedar|Elm|Park|Lake|Hill|Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way)\b[^,\n]*/gi,
    replacement: "[ADDRESS_REDACTED]",
  },
  {
    pattern: /\b(?:Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
    replacement: "[NAME_REDACTED]",
  },
  {
    pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    replacement: "[NAME_REDACTED]",
  },
]

/** Fields stripped entirely from user profiles before LLM use. */
const STRIP_FIELDS = new Set([
  "id",
  "userId",
  "email",
  "passwordHash",
  "fullName",
  "firstName",
  "lastName",
  "name",
  "phone",
  "address",
  "ssn",
  "dateOfBirth",
  "refreshToken",
])

export interface DiagnosticLanguageResult {
  found: boolean
  matches: string[]
}

export interface SanitizedUserData {
  ageRange: string | null
  biologicalSex: string | null
  heightCm: number | null
  weightKg: number | null
  lifestyle: Record<string, unknown> | null
  nutrition: Record<string, unknown> | null
  medicalContext: Record<string, unknown> | null
  goals: string[]
  painAreas: string[]
}

/**
 * Converts an exact age in years to a coarse range bucket.
 */
function toAgeRange(ageYears: number): string {
  if (ageYears < 18) return "under_18"
  if (ageYears < 25) return "18-24"
  if (ageYears < 35) return "25-34"
  if (ageYears < 45) return "35-44"
  if (ageYears < 55) return "45-54"
  if (ageYears < 65) return "55-64"
  return "65_plus"
}

/**
 * Computes age in years from a date of birth.
 */
function computeAgeYears(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1
  }
  return age
}

/**
 * Recursively removes sensitive keys from nested objects.
 */
function redactObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactObject)
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (STRIP_FIELDS.has(key)) continue
      result[key] = redactObject(nested)
    }
    return result
  }
  if (typeof value === "string") {
    return stripPHI(value)
  }
  return value
}

/**
 * Removes names, emails, phone numbers, SSNs, addresses, and medical record numbers from text.
 */
export function stripPHI(text: string): string {
  if (!text) return text

  let sanitized = text
  for (const { pattern, replacement } of PHI_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement)
  }
  return sanitized
}

/**
 * Converts a full user profile object into an anonymous version suitable for LLM prompts.
 */
export function sanitizeForLLM(userData: Record<string, unknown>): SanitizedUserData {
  const profile = (userData.profile ?? userData) as Record<string, unknown>
  const lifestyle = (userData.lifestyle ?? null) as Record<string, unknown> | null
  const nutrition = (userData.nutritionProfile ?? userData.nutrition ?? null) as Record<
    string,
    unknown
  > | null
  const medical = (userData.medicalHistory ?? userData.medical ?? null) as Record<
    string,
    unknown
  > | null
  const goalsRaw = userData.goals
  const painRaw = userData.painAssessments ?? userData.painAreas

  let ageRange: string | null = null
  const dob = profile.dateOfBirth
  if (dob instanceof Date) {
    ageRange = toAgeRange(computeAgeYears(dob))
  } else if (typeof dob === "string") {
    const parsed = new Date(dob)
    if (!Number.isNaN(parsed.getTime())) {
      ageRange = toAgeRange(computeAgeYears(parsed))
    }
  }

  const goals: string[] = Array.isArray(goalsRaw)
    ? goalsRaw
        .map((g) => (typeof g === "string" ? g : (g as { goal?: string }).goal))
        .filter((g): g is string => Boolean(g))
    : []

  const painAreas: string[] = Array.isArray(painRaw)
    ? painRaw
        .map((p) =>
          typeof p === "string" ? p : (p as { bodyArea?: string }).bodyArea
        )
        .filter((p): p is string => Boolean(p))
    : []

  const medicalContext = medical
    ? (redactObject({
        currentConditions: medical.currentConditions,
        pastIllnesses: medical.pastIllnesses,
        allergies: medical.allergies,
        pregnancyStatus: medical.pregnancyStatus,
      }) as Record<string, unknown>)
    : null

  return {
    ageRange,
    biologicalSex: typeof profile.biologicalSex === "string" ? profile.biologicalSex : null,
    heightCm: profile.heightCm != null ? Number(profile.heightCm) : null,
    weightKg: profile.weightKg != null ? Number(profile.weightKg) : null,
    lifestyle: lifestyle ? (redactObject(lifestyle) as Record<string, unknown>) : null,
    nutrition: nutrition ? (redactObject(nutrition) as Record<string, unknown>) : null,
    medicalContext,
    goals,
    painAreas,
  }
}

/**
 * Detects diagnostic or definitive medical language in text.
 */
export function containsDiagnosticLanguage(text: string): DiagnosticLanguageResult {
  const matches: string[] = []

  for (const pattern of DIAGNOSTIC_PATTERNS) {
    const match = text.match(pattern)
    if (match?.[0]) {
      matches.push(match[0])
    }
  }

  return {
    found: matches.length > 0,
    matches: [...new Set(matches)],
  }
}
