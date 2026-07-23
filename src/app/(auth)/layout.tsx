import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="health-auth min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 relative">
        <div className="brand-mark w-9 h-9 flex items-center justify-center text-sm font-bold">
          H
        </div>
        <span className="text-lg font-bold tracking-tight text-[#172033]">HealthOS</span>
      </Link>

      {/* Card */}
      <div className="auth-surface w-full max-w-md relative overflow-hidden">
        {children}
      </div>

      <p className="text-xs text-slate-500 mt-8">
        © 2026 HealthOS. All rights reserved.
      </p>
    </div>
  )
}
