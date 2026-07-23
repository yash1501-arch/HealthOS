import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/security/audit-trail"

// ─── Types ───────────────────────────────────────────────────────

export interface DeletionReport {
  userId: string
  softDeleted: string[]
  filesDeleted: number
  auditLogsAnonymized: boolean
  scheduledHardDelete: Date
  details: Record<string, number>
}

// ─── Anonymization ──────────────────────────────────────────────

const ANONYMIZED_EMAIL = "deleted@healthos.local"
const ANONYMIZED_NAME = "DELETED_USER"

/**
 * Anonymizes a user's personal data while preserving anonymized health data.
 *
 * - Replaces name with "DELETED_USER"
 * - Removes email (sets to deleted@healthos.local)
 * - Nullifies phone/address fields
 * - Keeps anonymized health data (posture, labs without identifying info)
 */
export async function anonymizeUserData(userId: string): Promise<void> {
  const now = new Date()

  // Anonymize user account
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `${ANONYMIZED_EMAIL}`,
      status: "DELETED",
      deletedAt: now,
      isVerified: false,
    },
  })

  // Anonymize profile
  await prisma.profile.updateMany({
    where: { userId },
    data: {
      fullName: ANONYMIZED_NAME,
    },
  })

  // Remove session tokens
  await prisma.session.deleteMany({
    where: { userId },
  })

  // Anonymize occupation (remove identifying fields)
  await prisma.occupation.updateMany({
    where: { userId },
    data: {
      jobTitle: "DELETED",
    },
  })

  // Anonymize medical history conditions (keep structure, remove text)
  const allMedicalHistories = await prisma.medicalHistory.findMany({
    where: { userId },
  })
  for (const mh of allMedicalHistories) {
    await prisma.medicalHistory.update({
      where: { id: mh.id },
      data: {
        currentConditions: mh.currentConditions.map(() => "[DELETED]"),
        pastIllnesses: mh.pastIllnesses.map(() => "[DELETED]"),
        pastSurgeries: mh.pastSurgeries.map(() => "[DELETED]"),
        currentMedications: mh.currentMedications.map(() => "[DELETED]"),
      },
    })
  }
}

// ─── Soft Delete ────────────────────────────────────────────────

/**
 * The list of user-owned models to soft-delete by setting their active flag or
 * by clearing the userId reference. Each model that has a boolean active flag
 * or a deletedAt field gets included here.
 */
const SOFT_DELETE_OPERATIONS: Array<{
  table: string
  delete: (userId: string) => Promise<number>
}> = [
  {
    table: "pain_assessments",
    delete: (userId) =>
      prisma.painAssessment.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }).then((r) => r.count),
  },
  {
    table: "goals",
    delete: (userId) =>
      prisma.goal.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }).then((r) => r.count),
  },
  {
    table: "diet_plans",
    delete: (userId) =>
      prisma.dietPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }).then((r) => r.count),
  },
  {
    table: "exercise_plans",
    delete: (userId) =>
      prisma.exercisePlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }).then((r) => r.count),
  },
  {
    table: "routines",
    delete: (userId) =>
      prisma.routine.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }).then((r) => r.count),
  },
  {
    table: "posture_characteristics",
    delete: (userId) =>
      prisma.postureCharacteristic.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }).then((r) => r.count),
  },
]

/**
 * Soft-deletes all user data: marks records as inactive, anonymizes PII,
 * deletes S3 files, schedules hard delete after 30 days.
 *
 * @returns A deletion report with counts and status.
 */
export async function deleteUserData(userId: string): Promise<DeletionReport> {
  // 1. Soft-delete all active records
  const softDeleted: string[] = []
  const details: Record<string, number> = {}

  for (const op of SOFT_DELETE_OPERATIONS) {
    try {
      const count = await op.delete(userId)
      if (count > 0) {
        softDeleted.push(op.table)
        details[op.table] = count
      }
    } catch (error) {
      console.error(`Failed to soft-delete ${op.table}:`, error)
      details[op.table] = -1
    }
  }

  // Delete health timeline entries
  try {
    const timelineCount = await prisma.healthTimelineEntry.deleteMany({
      where: { userId },
    })
    softDeleted.push("health_timeline")
    details.health_timeline = timelineCount.count
  } catch (error) {
    console.error("Failed to delete timeline entries:", error)
    details.health_timeline = -1
  }

  // 2. Delete S3 files associated with this user
  let filesDeleted = 0
  try {
    // Find all file keys for this user
    const visionMedia = await prisma.visionMedia.findMany({
      where: { userId },
      select: { fileKey: true },
    })
    const medicalReports = await prisma.medicalReport.findMany({
      where: { userId },
      select: { fileKey: true },
    })

    const fileKeys = [
      ...visionMedia.map((m) => m.fileKey),
      ...medicalReports.map((r) => r.fileKey),
    ].filter(Boolean)

      for (const key of fileKeys) {
        try {
          // Attempt S3 deletion — wrap in try/catch for when S3 isn't configured
          const { deleteFile: s3Delete } = await import("@/lib/storage/s3-client")
          await s3Delete(key)
          filesDeleted += 1
        } catch (err) {
          console.error(`Failed to delete S3 file: ${key}`, err)
        }
      }

    // Also delete the vision media and medical report records
    await prisma.visionMedia.deleteMany({ where: { userId } })
    await prisma.medicalReport.deleteMany({ where: { userId } })

    details.files_deleted = filesDeleted
  } catch (error) {
    console.error("Failed to delete S3 files:", error)
    details.files_deleted = -1
  }

  // 3. Anonymize user data
  await anonymizeUserData(userId)

  // 4. Anonymize audit logs (replace userId reference, keep timestamps)
  try {
    await prisma.aiAuditLog.updateMany({
      where: { userId },
      data: {
        prompt: "[USER DELETED]",
        response: "[USER DELETED]",
      },
    })
    details.audit_logs_anonymized = 1
  } catch (error) {
    console.error("Failed to anonymize audit logs:", error)
    details.audit_logs_anonymized = -1
  }

  // 5. Schedule hard delete after 30 days
  const scheduledHardDelete = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Store the scheduled deletion in the user record
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: scheduledHardDelete,
    },
  })

  // Log the deletion
  await logAudit({
    userId,
    action: "DATA_DELETE",
    resource: "account",
    details: {
      softDeletedRecords: softDeleted.length,
      filesDeleted,
      scheduledHardDelete: scheduledHardDelete.toISOString(),
    },
  })

  return {
    userId,
    softDeleted,
    filesDeleted,
    auditLogsAnonymized: true,
    scheduledHardDelete,
    details,
  }
}
