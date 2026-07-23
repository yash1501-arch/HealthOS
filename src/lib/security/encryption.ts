import crypto from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16

/**
 * Returns the configured encryption key (32 bytes hex) or throws.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex || keyHex.length < 64) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required (64 hex characters for 32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    )
  }
  return Buffer.from(keyHex.slice(0, 64), "hex")
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Returns a colon-delimited string in the format `iv:authTag:ciphertext`, all hex-encoded.
 */
export function encryptField(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let ciphertext = cipher.update(plaintext, "utf8", "hex")
  ciphertext += cipher.final("hex")
  const authTag = cipher.getAuthTag().toString("hex")

  return `${iv.toString("hex")}:${authTag}:${ciphertext}`
}

/**
 * Decrypts a string that was encrypted with `encryptField`.
 *
 * Expects the colon-delimited `iv:authTag:ciphertext` format.
 * Returns the original plaintext string.
 */
export function decryptField(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(":")

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted field format. Expected iv:authTag:ciphertext")
  }

  const [ivHex, tagHex, encrypted] = parts
  const iv = Buffer.from(ivHex!, "hex")
  const authTag = Buffer.from(tagHex!, "hex")

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(encrypted!, "hex", "utf8")
  plaintext += decipher.final("utf8")

  return plaintext
}

/**
 * Encrypts specific fields within an object.
 *
 * @param obj - The source object (will not be mutated).
 * @param fieldsToEncrypt - Array of field names to encrypt.
 * @returns A new object with the specified fields encrypted.
 */
export function encryptObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...obj }

  for (const field of fieldsToEncrypt) {
    const value = result[field]
    if (typeof value === "string" && value.length > 0) {
      (result as Record<string, unknown>)[field as string] = encryptField(value)
    } else if (value !== null && value !== undefined) {
      // JSON-stringify non-string values (e.g., numbers, arrays, nested objects)
      try {
        const serialized = JSON.stringify(value)
        ;(result as Record<string, unknown>)[field as string] = encryptField(serialized)
      } catch {
        // Skip fields that can't be serialized
      }
    }
  }

  return result
}

/**
 * Decrypts specific fields within an object.
 *
 * @param obj - The encrypted source object (will not be mutated).
 * @param fieldsToDecrypt - Array of field names to decrypt.
 * @returns A new object with the specified fields decrypted.
 */
export function decryptObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const result = { ...obj }

  for (const field of fieldsToDecrypt) {
    const value = result[field]
    if (typeof value === "string" && value.includes(":")) {
      try {
        const decrypted = decryptField(value)
        // Try to JSON-parse in case it was a non-string value
        try {
          (result as Record<string, unknown>)[field as string] = JSON.parse(decrypted)
        } catch {
          (result as Record<string, unknown>)[field as string] = decrypted
        }
      } catch {
        // If decryption fails, leave the value as-is
      }
    }
  }

  return result
}
