import { containsDiagnosticLanguage, stripPHI } from "@/lib/ai/phii-filter"
import type { AIRole } from "@/lib/ai/prompts"

export const MEDICAL_DISCLAIMER =
  "This information is for educational and wellness purposes only and is not medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns."

export const EMERGENCY_MESSAGE =
  "Please seek immediate medical attention. Some symptoms you described may require urgent care. Call emergency services or go to the nearest emergency department if you are in distress."

const EMERGENCY_PATTERNS: RegExp[] = [
  /\bchest pain\b/i,
  /\b(?:suicidal|kill myself|end my life|self[- ]harm)\b/i,
  /\bdifficulty breathing\b/i,
  /\b(?:can't|cannot) breathe\b/i,
  /\bsudden vision loss\b/i,
  /\b(?:sudden|complete) loss of vision\b/i,
  /\bsevere bleeding\b/i,
  /\b(?:uncontrolled|heavy) bleeding\b/i,
]

const DIAGNOSTIC_REWRITES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\byou have\b/gi, replacement: "your data may suggest" },
  { pattern: /\bdiagnosed with\b/gi, replacement: "may be worth discussing with your doctor regarding" },
  { pattern: /\bconfirmed\b/gi, replacement: "may indicate" },
  { pattern: /\bpositive for\b/gi, replacement: "results may be consistent with" },
  { pattern: /\bthis is\b/gi, replacement: "this may suggest" },
  { pattern: /\byou(?:'re| are) suffering from\b/gi, replacement: "you may be experiencing symptoms associated with" },
]

const MEDICATION_PATTERNS: RegExp[] = [
  /\b(?:take|start|stop|increase|decrease)\s+\d+\s*mg\b/i,
  /\bprescribe(?:d|)\b/i,
  /\b(?:start|switch to|try)\s+(?:metformin|insulin|aspirin|statins?|antibiotics?|antidepressants?|blood pressure medication)\b/i,
  /\b(?:dosage|dose)\s+(?:of|should be)\b/i,
]

export interface ValidateAIOutputResult {
  safe: boolean
  sanitizedOutput: string
  warnings: string[]
  emergencyDetected: boolean
}

/**
 * Detects emergency symptom language in user or model text.
 */
export function detectEmergencySymptoms(text: string): { detected: boolean; matches: string[] } {
  const matches: string[] = []
  for (const pattern of EMERGENCY_PATTERNS) {
    const match = text.match(pattern)
    if (match?.[0]) matches.push(match[0])
  }
  return { detected: matches.length > 0, matches: [...new Set(matches)] }
}

/**
 * Rewrites diagnostic phrasing into cautious, non-diagnostic language.
 */
function rewriteDiagnosticLanguage(text: string): string {
  let rewritten = text
  for (const { pattern, replacement } of DIAGNOSTIC_REWRITES) {
    rewritten = rewritten.replace(pattern, replacement)
  }
  return rewritten
}

/**
 * Removes explicit medication recommendation sentences from text.
 */
function removeMedicationRecommendations(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const filtered = sentences.filter((sentence) => {
    return !MEDICATION_PATTERNS.some((pattern) => pattern.test(sentence))
  })
  return filtered.join(" ").trim()
}

/**
 * Ensures a medical disclaimer is present at the end of the output.
 */
function injectDisclaimer(text: string): string {
  const normalized = text.trim()
  if (normalized.toLowerCase().includes("not medical advice")) {
    return normalized
  }
  return `${normalized}\n\n${MEDICAL_DISCLAIMER}`
}

/**
 * Validates and sanitizes AI output for safety before returning to users.
 */
export function validateAIOutput(
  output: string,
  type: AIRole | string,
  input?: string
): ValidateAIOutputResult {
  const warnings: string[] = []
  let sanitized = stripPHI(output)

  const emergencySource = [input ?? "", output].filter(Boolean).join("\n")
  const emergency = detectEmergencySymptoms(emergencySource)
  if (emergency.detected) {
    warnings.push(`Emergency symptoms detected: ${emergency.matches.join(", ")}`)
    return {
      safe: false,
      sanitizedOutput: EMERGENCY_MESSAGE,
      warnings,
      emergencyDetected: true,
    }
  }

  const diagnostic = containsDiagnosticLanguage(sanitized)
  if (diagnostic.found) {
    warnings.push(`Diagnostic language rewritten: ${diagnostic.matches.join(", ")}`)
    sanitized = rewriteDiagnosticLanguage(sanitized)
  }

  const medicationMatches = MEDICATION_PATTERNS.filter((pattern) => pattern.test(sanitized))
  if (medicationMatches.length > 0) {
    warnings.push("Medication recommendations removed from output")
    sanitized = removeMedicationRecommendations(sanitized)
  }

  // Check for remaining diagnostic language BEFORE injecting the fixed disclaimer
  // (the disclaimer itself contains safe words like "diagnosis" by design)
  const stillUnsafe = containsDiagnosticLanguage(sanitized).found

  sanitized = injectDisclaimer(sanitized)
  if (stillUnsafe) {
    warnings.push(`Output for ${type} still contains cautious-review language after sanitization`)
  }

  return {
    safe: !stillUnsafe && warnings.length === 0,
    sanitizedOutput: sanitized,
    warnings,
    emergencyDetected: false,
  }
}
