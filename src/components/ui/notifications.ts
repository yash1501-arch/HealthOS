"use client"

import { toastInfo } from "@/stores/toast"

// ─── Permission ─────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false
  if (Notification.permission === "granted") return true
  if (Notification.permission === "denied") return false

  const permission = await Notification.requestPermission()
  return permission === "granted"
}

// ─── Send Notification ──────────────────────────────────────────

export function sendNotification(title: string, options?: NotificationOptions): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return

  try {
    new Notification(title, {
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      ...options,
    })
  } catch {
    // Fallback to toast
    toastInfo(title, options?.body)
  }
}

// ─── Schedule Check ─────────────────────────────────────────────

export interface ReminderSchedule {
  id: string
  title: string
  type: string
  time: string // "HH:MM"
  daysOfWeek: number[] // 0=Sun, 6=Sat
  note?: string
}

export function checkAndFireReminders(reminders: ReminderSchedule[]) {
  const now = new Date()
  const currentDay = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const r of reminders) {
    if (!r.daysOfWeek.includes(currentDay)) continue

    const [h, m] = r.time.split(":").map(Number)
    const reminderMinutes = h * 60 + m

    // Fire if within 1 minute of the reminder time
    if (Math.abs(currentMinutes - reminderMinutes) <= 1) {
      const icons: Record<string, string> = {
        medication: "💊",
        checkin: "📋",
        exercise: "🏋️",
        water: "💧",
        sleep: "😴",
        custom: "🔔",
      }
      sendNotification(`${icons[r.type] || "🔔"} ${r.title}`, {
        body: r.note || `Time for ${r.type}!`,
        tag: r.id,
      })
    }
  }
}
