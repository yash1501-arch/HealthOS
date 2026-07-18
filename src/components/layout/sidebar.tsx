"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { motion } from "framer-motion"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/assessment", label: "Assessment", icon: "📝" },
  { href: "/reports", label: "Reports", icon: "📋" },
  { href: "/vision", label: "Vision", icon: "📸" },
  { href: "/diet", label: "Diet", icon: "🥗" },
  { href: "/exercise", label: "Exercise", icon: "🏋️" },
  { href: "/routine", label: "Routine", icon: "📅" },
  { href: "/timeline", label: "Timeline", icon: "⏱️" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await api.post("/auth/logout")
    router.push("/login")
  }

  return (
    <aside className="w-64 bg-[#0A0B12] border-r border-white/[0.04] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/[0.04]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2FE6C4] to-[#1CAF92] flex items-center justify-center text-[10px] font-bold text-[#05060A] shadow-lg shadow-[#2FE6C4]/20">
            H
          </div>
          <span className="text-base font-bold tracking-tight text-[#F5F7FA]">HealthOS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8B93A1]/40">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#2FE6C4]/10 text-[#2FE6C4] border border-[#2FE6C4]/15"
                  : "text-[#8B93A1] hover:bg-white/[0.03] hover:text-[#F5F7FA] border border-transparent"
              }`}
            >
              <span className={`text-base ${isActive ? "" : "opacity-50 group-hover:opacity-80 transition-opacity"}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2FE6C4] shadow-sm shadow-[#2FE6C4]/50"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-white/[0.04] space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8B93A1] hover:bg-white/[0.03] hover:text-[#F5F7FA] transition-all border border-transparent"
        >
          <span className="opacity-50">⚙️</span>
          <span>Settings</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8B93A1] hover:bg-red-500/5 hover:text-red-400 w-full transition-all border border-transparent"
        >
          <span className="opacity-50">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
