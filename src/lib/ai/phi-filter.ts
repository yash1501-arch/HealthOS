/**
 * PHI (Protected Health Information) Filter
 *
 * Security boundary: This module is the FIRST layer of defense before any
 * medical data is sent to external LLM providers. It aggressively strips
 * identifiable patient information while preserving clinical content.
 *
 * HIPAA Safe Harbor: The patterns below aim to satisfy the §164.514(b)(2)
 * safe harbor method by removing 18 identifiers enumerated in the rule.
 *
 * NOTE: Regex-based redaction is NOT a substitute for a proper de-identification
 * pipeline. This is a defense-in-depth measure. For production HIPAA compliance,
 * pair this with a trained NER model (e.g., spacy, AWS Comprehend Medical).
 */

export interface RedactionEntry {
  /** The original text that was redacted (first 80 chars). */
  original: string
  /** The replacement token used. */
  replacement: string
  /** Category of the redacted PHI. */
  category: RedactionCategory
  /** Character index in the original text where this match was found. */
  index: number
}

export type RedactionCategory =
  | "name"
  | "email"
  | "phone"
  | "ssn"
  | "date_of_birth"
  | "mrn"
  | "address"
  | "patient_id"
  | "passport"
  | "driver_license"
  | "insurance_id"
  | "age_over_89"
  | "url"
  | "ip_address"
  | "fax"
  | "account_number"
  | "device_identifier"
  | "biometric"

export interface StripPHIResult {
  /** The sanitized text with all PHI replaced by tokens. */
  sanitized: string
  /** Array of redaction entries describing what was removed. */
  redactions: RedactionEntry[]
  /** Total count of redacted items. */
  redactedCount: number
}

/**
 * Pattern descriptor for a single PHI detection rule.
 */
interface PHIPattern {
  /** Human-readable category label. */
  category: RedactionCategory
  /** Replacement token. */
  replacement: string
  /** The compiled regex to match. */
  regex: RegExp
}

// ─── PHI Detection Patterns ─────────────────────────────────────
//
// Ordered roughly by specificity (more specific patterns first) to
// minimise false positives from the generic "2+ capitalized names" pattern.
//
// eslint-disable-next-line @typescript-eslint/naming-convention
const PHI_PATTERNS: PHIPattern[] = [
  // ── Email addresses ───────────────────────────────────────────
  {
    category: "email",
    replacement: "[EMAIL_REDACTED]",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },

  // ── URLs containing identifiable info ─────────────────────────
  {
    category: "url",
    replacement: "[URL_REDACTED]",
    regex: /https?:\/\/[^\s,;)]+/g,
  },

  // ── IPv4 addresses ────────────────────────────────────────────
  {
    category: "ip_address",
    replacement: "[IP_REDACTED]",
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  },

  // ── US Phone Numbers (with optional country code) ─────────────
  {
    category: "phone",
    replacement: "[PHONE_REDACTED]",
    regex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  },

  // ── International Phone (starts with + and country code) ─────
  {
    category: "phone",
    replacement: "[PHONE_REDACTED]",
    regex: /\b\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}(?:[-.\s]?\d{3,4})?\b/g,
  },

  // ── Fax numbers (often prefixed) ─────────────────────────────
  {
    category: "fax",
    replacement: "[FAX_REDACTED]",
    regex: /\b(?:fax|facsimile)[:\s]*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gi,
  },

  // ── US Social Security Numbers ───────────────────────────────
  {
    category: "ssn",
    replacement: "[SSN_REDACTED]",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
  },

  // ── Passport numbers (US: 1 letter + 8 digits, or 9 digits) ─
  {
    category: "passport",
    replacement: "[PASSPORT_REDACTED]",
    regex: /\b(?:P[astekgmnrl]+[-\s]?\d{6,9}|\b[A-Z]\d{8})\b/g,
  },

  // ── US Driver's License (varies by state; broad heuristic) ───
  {
    category: "driver_license",
    replacement: "[DL_REDACTED]",
    regex: /\b(?:DL[:\s#]*(?=[A-Z0-9]{6,15}\b)|Driver(?:'s)?\s*Lic(?:ense)?[:\s#]*[A-Z0-9]{6,15})\b/gi,
  },

  // ── Dates of Birth ────────────────────────────────────────────
  // Context-dependent: only redact dates when preceded by DOB/birth keywords.
  {
    category: "date_of_birth",
    replacement: "[DOB_REDACTED]",
    regex: /(?:DOB|Date\s*of\s*Birth|Birth\s*Date|Born|Date\s*of\s*Birth\s*:|Birthdate)[:\s]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/gi,
  },
  // Standalone dates that appear within 3 words of a DOB indicator on the same line
  {
    category: "date_of_birth",
    replacement: "[DOB_REDACTED]",
    regex: /(?:(?:DOB|birth|born|date\s*of\s*birth)\s*[^\n]{0,40}?)\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/gi,
  },

  // ── Age > 89 (HIPAA safe harbor requires reporting as "90+" only) ──
  {
    category: "age_over_89",
    replacement: "[AGE_REDACTED]",
    regex: /\b(?:age|Age|AGE)[:\s]*(?:9[0-9]|1\d{2})\b/g,
  },

  // ── Medical Record Numbers ────────────────────────────────────
  {
    category: "mrn",
    replacement: "[MRN_REDACTED]",
    regex: /\b(?:MRN|Medical\s*Record\s*(?:Number|#)?|Chart\s*(?:Number|#)?|EMR\s*(?:ID|Number)?)[:\s#]*[A-Z0-9][A-Z0-9/-]{3,20}\b/gi,
  },

  // ── Patient IDs ──────────────────────────────────────────────
  {
    category: "patient_id",
    replacement: "[PATIENT_ID_REDACTED]",
    regex: /\b(?:Patient\s*(?:ID|Identifier|Number|#)|PID)[:\s#]*[A-Z0-9][A-Z0-9/-]{3,20}\b/gi,
  },

  // ── Insurance / Health Plan IDs ─────────────────────────────
  {
    category: "insurance_id",
    replacement: "[INSURANCE_REDACTED]",
    regex: /\b(?:Insurance\s*(?:ID|Number|Policy|#)|Member\s*(?:ID|Number)|Group\s*(?:Number|#)|Subscriber\s*(?:ID|Number)|Claim\s*(?:ID|Number))[:\s#]*[A-Z0-9][A-Z0-9/-]{3,30}\b/gi,
  },

  // ── Account Numbers ──────────────────────────────────────────
  {
    category: "account_number",
    replacement: "[ACCOUNT_REDACTED]",
    regex: /\b(?:Account\s*(?:Number|#|ID)|Acct\s*(?:#|Number))[:\s#]*\d{4,20}\b/gi,
  },

  // ── Device Identifiers (serial numbers, IMEI) ────────────────
  {
    category: "device_identifier",
    replacement: "[DEVICE_ID_REDACTED]",
    regex: /\b(?:Serial\s*(?:Number|#)|IMEI|Device\s*ID)[:\s#]*[A-Z0-9]{6,20}\b/gi,
  },

  // ── US Street Addresses ──────────────────────────────────────
  {
    category: "address",
    replacement: "[ADDRESS_REDACTED]",
    regex: /\b\d{1,5}\s+(?:Main|Oak|Maple|Pine|Cedar|Elm|Park|Lake|Hill|River|Spring|Church|Market|Broad|High|School|College|Washington|Lincoln|Jefferson|Madison|Franklin|Jackson|Hamilton|Adams)\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Circle|Cir|Place|Pl)(?:,?\s*(?:Apt|Suite|Unit|Ste|Room|Rm|#)\s*\d+)?\b/gi,
  },

  // ── Biometric Identifiers ────────────────────────────────────
  {
    category: "biometric",
    replacement: "[BIOMETRIC_REDACTED]",
    regex: /\b(?:Fingerprint|DNA|Genetic\s*(?:test|profile|info)|Retina|Iris\s*scan)[:\s]*[A-Z0-9/-]{4,}\b/gi,
  },

  // ── Full Names (2+ capitalized words in sequence) ────────────
  // Must come LAST to avoid false positives on medical terms.
  // Conservative: 3+-character words only; skip common medical terms.
  {
    category: "name",
    replacement: "[NAME_REDACTED]",
    regex: /\b(?:Dr\.|Mr\.|Mrs\.|Ms\.|Miss|Prof\.|Rev\.|Hon\.)?\s*[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})+\b/g,
  },
]

/**
 * Checks whether a potential name match is likely a medical term,
 * drug name, or lab value that should NOT be redacted.
 */
const MEDICAL_TERMS = new Set([
  // Common test names that match the 2-capitalized-words pattern
  "White Blood", "Red Blood", "Blood Urea", "Blood Pressure",
  "Systolic Blood", "Diastolic Blood", "Mean Arterial",
  "Body Mass", "High Density", "Low Density", "Very Low",
  "Total Protein", "C Reactive", "Thyroid Stimulating",
  "Fasting Blood", "Random Blood", "Post Prandial",
  "Glycated Hemoglobin", "Hemoglobin A1c",
  "Vitamin B12", "Vitamin D", "Vitamin C", "Vitamin A", "Vitamin E", "Vitamin K",
  "N Terminal", "Parathyroid Hormone", "Luteinizing Hormone",
  "Follicle Stimulating", "Growth Hormone", "Cortisol Morning",
  "Iron Binding", "Iron Saturation",
  // Anatomical terms
  "Left Atrium", "Right Atrium", "Left Ventricle", "Right Ventricle",
  "Left Kidney", "Right Kidney", "Left Lung", "Right Lung",
  "Central Nervous", "Cerebral Spinal",
  // Common drug names
  "Acetaminophen Tylenol",
])

/**
 * Determines if a matched name-like string is actually a medical term.
 */
function isMedicalTerm(name: string): boolean {
  // Extract the core words (skip title prefixes)
  const words = name.replace(/^(?:Dr|Mr|Mrs|Ms|Prof|Rev|Hon)\.\s*/i, "").trim()
  return MEDICAL_TERMS.has(words) || MEDICAL_TERMS.has(words.replace(/\s+/g, " "))
}

/**
 * Aggressively strips Protected Health Information from medical report text.
 *
 * Returns both the sanitized text and a detailed redaction log for audit/compliance.
 *
 * @param text - Raw text extracted from a medical report (OCR or PDF).
 * @returns An object with the sanitized text and an array of redaction entries.
 */
export function stripPHI(text: string): StripPHIResult {
  if (!text || typeof text !== "string") {
    return { sanitized: text ?? "", redactions: [], redactedCount: 0 }
  }

  const redactions: RedactionEntry[] = []
  let sanitized = text

  for (const pattern of PHI_PATTERNS) {
    // For names, skip matches that are medical terms
    if (pattern.category === "name") {
      sanitized = sanitized.replace(pattern.regex, (match: string, offset: number) => {
        if (isMedicalTerm(match)) {
          return match // Don't redact medical terms
        }
        redactions.push({
          original: match.slice(0, 80),
          replacement: pattern.replacement,
          category: pattern.category,
          index: offset,
        })
        return pattern.replacement
      })
      continue
    }

    // For all other patterns, apply normally
    sanitized = sanitized.replace(pattern.regex, (match: string, offset: number) => {
      redactions.push({
        original: match.slice(0, 80),
        replacement: pattern.replacement,
        category: pattern.category,
        index: offset,
      })
      return pattern.replacement
    })
  }

  // ── Post-processing cleanup ─────────────────────────────────
  // Remove duplicate consecutive redaction tokens
  sanitized = sanitized.replace(
    /(\[.*?_REDACTED\])(?:\s+\1)+/g,
    "$1"
  )

  return {
    sanitized,
    redactions,
    redactedCount: redactions.length,
  }
}

/**
 * Lightweight wrapper that returns only the sanitized string.
 * Useful as a drop-in replacement for the existing phii-filter.ts export.
 *
 * @see stripPHI for the full result with audit trail.
 */
export function stripPHIString(text: string): string {
  return stripPHI(text).sanitized
}
