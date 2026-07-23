import { prisma } from "@/lib/prisma"

export type ConsentType = "privacy" | "disclaimer" | "vision" | "data_processing"

/**
 * Captures a consent action in the ConsentLog table.
 *
 * @param userId - The user granting or revoking consent.
 * @param consentType - The type of consent.
 * @param action - "granted" or "revoked".
 */
export async function captureConsent(
  userId: string,
  consentType: ConsentType,
  action: "granted" | "revoked"
): Promise<void> {
  await prisma.consentLog.create({
    data: {
      userId,
      consentType,
      action,
    },
  })
}

/**
 * Checks whether a user has an active (latest) consent for the given type.
 *
 * Looks at the most recent ConsentLog entry for the user + type.
 * Returns `true` if the latest action was "granted", `false` otherwise.
 */
export async function checkConsent(
  userId: string,
  consentType: ConsentType
): Promise<boolean> {
  const latest = await prisma.consentLog.findFirst({
    where: { userId, consentType },
    orderBy: { createdAt: "desc" },
  })

  return latest?.action === "granted"
}

/**
 * Revokes a user's consent for the given type.
 */
export async function revokeConsent(
  userId: string,
  consentType: ConsentType
): Promise<void> {
  await captureConsent(userId, consentType, "revoked")
}

/**
 * Checks whether a user has granted all required consents before using AI features.
 *
 * Required consents: privacy, disclaimer, data_processing.
 */
export async function hasRequiredConsents(userId: string): Promise<{
  allRequired: boolean
  missing: ConsentType[]
}> {
  const requiredTypes: ConsentType[] = ["privacy", "disclaimer", "data_processing"]
  const missing: ConsentType[] = []

  for (const type of requiredTypes) {
    const granted = await checkConsent(userId, type)
    if (!granted) missing.push(type)
  }

  return {
    allRequired: missing.length === 0,
    missing,
  }
}

/**
 * Grants all required consents at once (used during registration).
 */
export async function grantRequiredConsents(
  userId: string,
  consents: { privacy: boolean; disclaimer: boolean; dataProcessing: boolean }
): Promise<void> {
  const entries: Array<{ userId: string; consentType: ConsentType; action: "granted" | "revoked" }> = []

  if (consents.privacy) entries.push({ userId, consentType: "privacy", action: "granted" })
  if (consents.disclaimer) entries.push({ userId, consentType: "disclaimer", action: "granted" })
  if (consents.dataProcessing) entries.push({ userId, consentType: "data_processing", action: "granted" })

  if (entries.length > 0) {
    await prisma.consentLog.createMany({ data: entries })
  }
}
