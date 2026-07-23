"use client"

import { useToastStore, type Toast, type ToastType } from "@/stores/toast"
import { motion, AnimatePresence } from "framer-motion"

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  warning: "⚠",
}

const STYLES: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: "bg-[#176B63]/8",
    border: "border-[#176B63]/20",
    icon: "bg-[#176B63] text-white",
    text: "text-[#0F4528]",
  },
  error: {
    bg: "bg-[#B53A45]/8",
    border: "border-[#B53A45]/20",
    icon: "bg-[#B53A45] text-white",
    text: "text-[#8B2D36]",
  },
  info: {
    bg: "bg-[#476A91]/8",
    border: "border-[#476A91]/20",
    icon: "bg-[#476A91] text-white",
    text: "text-[#2D4A6E]",
  },
  warning: {
    bg: "bg-[#9B651B]/8",
    border: "border-[#9B651B]/20",
    icon: "bg-[#9B651B] text-white",
    text: "text-[#7A4E13]",
  },
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const style = STYLES[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm ${style.bg} ${style.border}`}
      style={{ background: "rgba(255,255,255,0.97)", minWidth: "300px", maxWidth: "420px" }}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${style.icon}`}>
        {ICONS[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#172033" }}>{toast.title}</p>
        {toast.message && (
          <p className="text-xs mt-0.5" style={{ color: "#4B5870" }}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 text-[#4B5870]/40 hover:text-[#4B5870] transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
