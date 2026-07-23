import { prisma } from "@/lib/prisma"

/**
 * Actions that must be tracked in the audit trail.
 */
export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "VIEW_REPORT"
  | "UPLOAD_REPORT"
  | "AI_QUERY"
  | "DATA_EXPORT"
  | "DATA_DELETE"
  | "CONSENT_CHANGE"
  | "PLAN_GENERATE"
  | "PASSWORD_CHANGE"
  | "ACCOUNT_DELETE"
  | "SETTINGS_UPDATE"

export interface AuditLogParams {
  userId: string
  action: AuditAction
  resource?: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Logs a security-relevant action to the immutable audit trail.
 *
 * Audit logs are INSERT-only. No update or delete operations are exposed.
 * The AiAuditLog table stores: timestamp, userId, action, resource,
 * resourceId, IP address, user agent, and details as JSON.
 *
 * @returns The created audit log entry.
 */
export async function logAudit(params: AuditLogParams): Promise<{
  id: string
  createdAt: Date
}> {
  const { userId, action, resource, resourceId, details, ipAddress, userAgent } = params

  const entry = await prisma.aiAuditLog.create({
    data: {
      userId,
      module: resource ?? "system",
      action,
      prompt: details
        ? JSON.stringify({
            ...details,
            ...(ipAddress ? { _ip: ipAddress } : {}),
            ...(userAgent ? { _ua: userAgent } : {}),
          })
        : JSON.stringify({
            ...(ipAddress ? { _ip: ipAddress } : {}),
            ...(userAgent ? { _ua: userAgent } : {}),
          }),
      response: resourceId ?? undefined,
      model: "audit",
    },
    select: { id: true, createdAt: true },
  })

  return entry
}

/**
 * Retrieves audit log entries for a user (read-only).
 *
 * @param userId - The user to retrieve logs for.
 * @param options - Optional filters (action, limit, offset).
 * @returns Array of audit log entries.
 */
export async function getAuditLogs(
  userId: string,
  options: {
    action?: AuditAction
    limit?: number
    offset?: number
  } = {}
): Promise<
  Array<{
    id: string
    action: string
    resource: string
    resourceId: string | null
    performedAt: Date
    details: Record<string, unknown> | null
  }>
> {
  const { action, limit = 50, offset = 0 } = options

  const where: Record<string, unknown> = { userId }
  if (action) where.action = action

  const entries = await (prisma.aiAuditLog.findMany as (
    args: Record<string, unknown>
  ) => ReturnType<typeof prisma.aiAuditLog.findMany>)({
    where,
    orderBy: { createdAt: "desc" } as const,
    take: limit,
    skip: offset,
  })

  return entries.map((e) => {
    let details: Record<string, unknown> | null = null
    if (e.prompt) {
      try {
        details = JSON.parse(e.prompt)
        // Strip internal fields
        if (details && typeof details === "object") {
          const { _ip, _ua, ...rest } = details as Record<string, unknown> & { _ip?: string; _ua?: string }
          details = rest
        }
      } catch {
        details = { raw: e.prompt }
      }
    }

    return {
      id: e.id,
      action: e.action,
      resource: e.module,
      resourceId: e.response,
      performedAt: e.createdAt,
      details,
    }
  })
}

/**
 * Counts audit log entries for a user, optionally filtered by action.
 */
export async function countAuditLogs(
  userId: string,
  action?: AuditAction
): Promise<number> {
  const where: Record<string, unknown> = { userId }
  if (action) where.action = action

  return (prisma.aiAuditLog.count as (
    args: Record<string, unknown>
  ) => ReturnType<typeof prisma.aiAuditLog.count>)({
    where,
  })
}
