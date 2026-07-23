import type { ZodSchema } from "zod"

// ─── XSS Patterns ────────────────────────────────────────────────

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^\s>]+/gi,
  /<iframe\b[^>]*\/?>/gi,
  /<object\b[^>]*\/?>/gi,
  /<embed\b[^>]*\/?>/gi,
  /<svg\b[^>]*\/?>/gi,
  /<math\b[^>]*\/?>/gi,
  /<form\b[^>]*\/?>/gi,
  /<input\b[^>]*\/?>/gi,
  /<textarea\b[^>]*\/?>/gi,
  /<select\b[^>]*\/?>/gi,
  /<button\b[^>]*\/?>/gi,
  /<a\b[^>]*href\s*=\s*["']javascript:/gi,
  /eval\s*\(/gi,
  /document\.cookie/gi,
  /document\.write/gi,
  /window\.location/gi,
  /fetch\s*\(/gi,
  /XMLHttpRequest/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
]

// ─── SQL Injection Patterns ─────────────────────────────────────

const SQL_INJECTION_PATTERNS = [
  /(\bSELECT\b.*\bFROM\b)/gi,
  /(\bDROP\b.*\bTABLE\b)/gi,
  /(\bDELETE\b.*\bFROM\b)/gi,
  /(\bINSERT\b.*\bINTO\b)/gi,
  /(\bUPDATE\b.*\bSET\b)/gi,
  /(\bALTER\b.*\bTABLE\b)/gi,
  /(\bCREATE\b.*\bTABLE\b)/gi,
  /(\bTRUNCATE\b)/gi,
  /(\bEXEC\b|\bEXECUTE\b)/gi,
  /(\bUNION\b.*\bSELECT\b)/gi,
  /(\bOR\s+1\s*=\s*1\b)/gi,
  /('|")\s*(OR|AND)\s+['"]?\s*1\s*=\s*1/gi,
  /--\s*$/gm,
  /;\s*$/gm,
]

// ─── Characters to Strip ────────────────────────────────────────

const DANGEROUS_CHARS = /[<>\x00\x08\x0B\x0C\x0E-\x1F]/g

/**
 * Sanitizes a single input string by:
 * 1. Stripping HTML tags and dangerous characters
 * 2. Removing XSS attack patterns
 * 3. Removing SQL injection patterns
 * 4. Trimming whitespace
 * 5. Limiting max length to 10000 characters
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return input

  let sanitized = input

  // Strip dangerous control characters
  sanitized = sanitized.replace(DANGEROUS_CHARS, "")

  // Remove XSS patterns
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  // Remove SQL injection patterns (replace with empty string)
  for (const pattern of SQL_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  // Trim whitespace
  sanitized = sanitized.trim()

  // Limit max length (10k chars for safety)
  sanitized = sanitized.slice(0, 10000)

  return sanitized
}

/**
 * Recursively sanitizes all string values in an object.
 * Handles nested objects and arrays.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeInput(value)
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === "string") return sanitizeInput(item)
        if (item && typeof item === "object") return sanitizeObject(item as Record<string, unknown>)
        return item
      })
    } else {
      result[key] = value
    }
  }

  return result as T
}

/**
 * Validates data against a Zod schema, then recursively sanitizes all string fields.
 *
 * @param data - The raw input data to validate and sanitize.
 * @param schema - A Zod schema to validate against.
 * @returns The validated and sanitized data.
 * @throws ZodError if validation fails.
 */
export function validateAndSanitize<T>(
  data: unknown,
  schema: ZodSchema<T>
): T {
  const validated = schema.parse(data)
  return sanitizeObject(validated as unknown as Record<string, unknown>) as unknown as T
}

/**
 * Checks whether a string contains any suspicious patterns (for logging/threshold alerts).
 * Does NOT modify the string — use `sanitizeInput` for that.
 *
 * Returns an array of pattern types detected (e.g., ["xss", "sql_injection"]).
 */
export function detectSuspiciousInput(input: string): string[] {
  const detected: string[] = []

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      detected.push("xss")
      break
    }
  }

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detected.push("sql_injection")
      break
    }
  }

  return detected
}
