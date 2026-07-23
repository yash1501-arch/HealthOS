/**
 * Notification Service
 *
 * Creates in-app notifications and sends email notifications
 * based on user preferences.
 */

import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/notifications/email-service"

export type NotificationType =
  | "checkin_reminder"
  | "routine"
  | "report_ready"
  | "weekly_summary"
  | "welcome"
  | "plan_generated"

interface NotificationData {
  title: string
  body?: string
  link?: string
  emailTemplate?: Parameters<typeof sendEmail>[1]
  emailData?: Record<string, unknown>
}

const NOTIFICATION_DEFINITIONS: Record<NotificationType, NotificationData> = {
  welcome: {
    title: "Welcome to HealthOS!",
    body: "Start by completing your health assessment to get personalized recommendations.",
    link: "/assessment",
    emailTemplate: "welcome",
    emailData: {},
  },
  checkin_reminder: {
    title: "Time for your weekly check-in",
    body: "Let us know how your week went so we can adjust your plans.",
    link: "/dashboard",
    emailTemplate: "checkin_reminder",
    emailData: {},
  },
  routine: {
    title: "Your daily routine is ready",
    body: "View today's schedule including meals, exercises, and breaks.",
    link: "/routine",
  },
  report_ready: {
    title: "Report analysis complete",
    body: "Your medical report has been analyzed by AI. View the results now.",
    link: "/reports",
    emailTemplate: "report_ready",
    emailData: {},
  },
  weekly_summary: {
    title: "Your weekly summary is ready",
    body: "Check out your progress and AI insights for the past week.",
    link: "/dashboard",
    emailTemplate: "weekly_summary",
    emailData: {},
  },
  plan_generated: {
    title: "New plan generated",
    body: "Your personalized diet or exercise plan is ready to view.",
    link: "/plan",
  },
}

/**
 * Create a notification and optionally send an email.
 * Stores the notification in the database and dispatches email if configured.
 */
export async function notify(
  userId: string,
  type: NotificationType,
  overrides?: Partial<NotificationData>
): Promise<string | null> {
  try {
    const def = NOTIFICATION_DEFINITIONS[type]
    if (!def) {
      console.error(`[Notifications] Unknown notification type: ${type}`)
      return null
    }

    const title = overrides?.title ?? def.title
    const body = overrides?.body ?? def.body
    const link = overrides?.link ?? def.link

    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body: body ?? null,
        link: link ?? null,
        channel: "in_app",
        sentAt: new Date(),
      },
    })

    // Get user profile for email notifications
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        onboardingComplete: true,
        profile: { select: { fullName: true } },
        lifestyle: { select: { screenTimeHours: true } },
      },
    })

    if (!user) return notification.id

    // Check notification preferences before sending email
    // Essential types (welcome) always send; others require onboarding completion as a consent proxy
    const canSendEmail =
      user.onboardingComplete === true || type === "welcome"

    // Send email if template is defined and user preferences allow it
    const emailTemplate = overrides?.emailTemplate ?? def.emailTemplate
    if (emailTemplate && canSendEmail) {
      await sendEmail(user.email, emailTemplate, {
        userName: user.profile?.fullName ?? undefined,
        dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://healthos.app"}${link ?? "/dashboard"}`,
        ...(overrides?.emailData as Record<string, string> | undefined),
      })
    }

    return notification.id
  } catch (error) {
    console.error("[Notifications] Failed to create notification:", error)
    return null
  }
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    })
  } catch (error) {
    console.error("[Notifications] Failed to mark as read:", error)
  }
}

/**
 * Mark all unread notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
  } catch (error) {
    console.error("[Notifications] Failed to mark all as read:", error)
  }
}

/**
 * Fetch recent notifications for a user.
 */
export async function getNotifications(
  userId: string,
  limit: number = 20
): Promise<Array<{
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: Date
}>> {
  try {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        read: true,
        createdAt: true,
      },
    })
  } catch (error) {
    console.error("[Notifications] Failed to fetch notifications:", error)
    return []
  }
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: { userId, read: false },
    })
  } catch (error) {
    console.error("[Notifications] Failed to count unread:", error)
    return 0
  }
}
