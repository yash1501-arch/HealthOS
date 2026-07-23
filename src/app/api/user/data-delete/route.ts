import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId, clearAuthCookies } from "@/lib/auth"
import { deleteUserData, type DeletionReport } from "@/lib/security/data-deletion"
import { logAudit } from "@/lib/security/audit-trail"
import { z } from "zod"

const deleteSchema = z.object({
  confirmation: z.string().refine(
    (val) => val === "DELETE MY DATA",
    { message: 'You must type "DELETE MY DATA" to confirm' }
  ),
})

/**
 * DELETE /api/user/data-delete — Trigger soft-delete of all user data.
 *
 * Auth required. Requires confirmation string "DELETE MY DATA".
 * Schedule hard delete after 30 days. Logs in audit trail.
 * Returns a deletion report.
 */
export async function DELETE(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON body")
    })

    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || 'Type "DELETE MY DATA" to confirm deletion.',
          },
        },
        { status: 422 }
      )
    }

    // Log the deletion request before proceeding
    await logAudit({
      userId,
      action: "DATA_DELETE",
      resource: "account",
      details: { requestedAt: new Date().toISOString() },
    })

    // Execute the soft delete process
    let report: DeletionReport
    try {
      report = await deleteUserData(userId)
    } catch (error) {
      console.error("Data deletion process failed:", error)
      return NextResponse.json(
        { error: { code: "DELETION_FAILED", message: "Failed to complete data deletion. Please contact support." } },
        { status: 500 }
      )
    }

    // Clear auth cookies so the user is logged out
    await clearAuthCookies()

    return NextResponse.json({
      data: {
        message: "Your account has been scheduled for deletion. Your data will be permanently deleted after 30 days.",
        report: {
          softDeletedTables: report.softDeleted,
          filesDeleted: report.filesDeleted,
          auditLogsAnonymized: report.auditLogsAnonymized,
          scheduledHardDelete: report.scheduledHardDelete.toISOString(),
        },
      },
    })
  } catch (error) {
    console.error("Data delete API error:", error)
    const message = error instanceof Error ? error.message : "Deletion failed"
    if (message.includes("Invalid JSON")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
        { status: 422 }
      )
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
