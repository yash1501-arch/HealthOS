"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"
import { useRouter } from "next/navigation"
import { toastInfo } from "@/stores/toast"

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

type NotificationsResponse = {
  notifications: Notification[]
  unreadCount: number
}

const TYPE_ICONS: Record<string, string> = {
  checkin_reminder: "📋",
  routine: "⏰",
  report_ready: "📄",
  weekly_summary: "📊",
  welcome: "👋",
  plan_generated: "📝",
}

const EASE = [0.16, 1, 0.3, 1] as const

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<NotificationsResponse>("/notifications", {
        params: { limit: "10" },
      })
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // Not authenticated or error — silently handle
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  async function handleMarkAllRead() {
    try {
      await api.patch("/notifications", { markAll: true })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      toastInfo("All notifications marked as read")
    } catch {
      // Silently fail
    }
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.read) {
      try {
        await api.patch("/notifications", { id: n.id })
        setNotifications((prev) => prev.map((no) => (no.id === n.id ? { ...no, read: true } : no)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch {
        // Silently fail
      }
    }
    setOpen(false)
    if (n.link) {
      router.push(n.link)
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-[#4B5870] hover:bg-[#F8F9FB] hover:text-[#172033] transition-all"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[#B53A45] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
              <h3 className="text-xs font-semibold text-[#172033]">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-medium text-[#176B63] hover:text-[#10554F] transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 bg-[#E2E8F0] rounded-lg animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-[#E2E8F0] rounded animate-pulse w-3/4" />
                        <div className="h-2.5 bg-[#E2E8F0] rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F9FB] flex items-center justify-center mb-2">
                    <svg className="w-5 h-5 text-[#4B5870]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </div>
                  <p className="text-xs text-[#4B5870]">No notifications yet</p>
                  <p className="text-[10px] text-[#4B5870]/60 mt-0.5">We'll notify you about check-ins and updates</p>
                </div>
              ) : (
                notifications.map((n, i) => (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-[#F8F9FB] transition-colors ${
                      !n.read ? "bg-[#F0FDF4]/30" : ""
                    } border-b border-[#E2E8F0]/40 last:border-b-0`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                        !n.read ? "bg-[#176B63]/10" : "bg-[#F8F9FB]"
                      }`}
                    >
                      {TYPE_ICONS[n.type] ?? "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${n.read ? "text-[#4B5870]" : "font-medium text-[#172033]"}`}>
                          {n.title}
                        </p>
                        <span className="text-[9px] text-[#4B5870]/40 whitespace-nowrap mt-0.5">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="text-[10px] text-[#4B5870]/70 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                    </div>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#176B63] mt-1.5 shrink-0" />
                    )}
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
