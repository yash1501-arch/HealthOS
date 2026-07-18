"use client"

import { motion } from "framer-motion"
import Link from "next/link"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Modules", href: "#modules" },
  { label: "Insights", href: "#insights" },
]

export default function NavBar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div
        className="mx-4 mt-4 max-w-7xl lg:mx-auto rounded-2xl border transition-all duration-300"
        style={{
          background: "rgba(10, 11, 18, 0.75)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          borderColor: "rgba(255, 255, 255, 0.06)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -2 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #2FE6C4, #8B7FFF)",
                boxShadow: "0 0 24px rgba(46,230,196,0.15)",
              }}
            >
              H
            </motion.div>
            <span className="text-sm font-semibold tracking-tight text-[#F5F7FA] hidden sm:inline">
              HealthOS
            </span>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink key={link.label} href={link.href} label={link.label} />
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-[#8B93A1] hover:text-[#F5F7FA] transition-colors duration-200 px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="relative text-xs font-semibold px-5 py-2 rounded-xl transition-all duration-300 overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, #2FE6C4, #1CAF92)",
                color: "#05060A",
              }}
            >
              {/* Shimmer overlay */}
              <motion.div
                className="absolute inset-0 -translate-x-full"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
              />
              <span className="relative z-10">Get Started</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

// ─── Nav Link Component ───────────────────────────────────────

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="relative group px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200"
      style={{ color: "#8B93A1" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#F5F7FA"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#8B93A1"
      }}
    >
      {label}
      <motion.span
        className="absolute bottom-0 left-3 right-3 h-px rounded-full opacity-0 group-hover:opacity-100"
        style={{
          background: "linear-gradient(90deg, transparent, #2FE6C4, transparent)",
        }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
      />
    </Link>
  )
}
