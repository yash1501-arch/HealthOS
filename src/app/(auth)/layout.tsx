import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#05060A" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(46,230,196,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 60%, rgba(139,127,255,0.04) 0%, transparent 60%)",
        }}
      />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 relative">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg"
          style={{
            background: "linear-gradient(135deg, #2FE6C4, #8B7FFF)",
            boxShadow: "0 0 30px rgba(46,230,196,0.15)",
          }}
        >
          H
        </div>
        <span className="text-lg font-bold tracking-tight text-[#F5F7FA]">HealthOS</span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl border relative overflow-hidden"
        style={{
          background: "#0D0E14",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {children}
      </div>

      <p className="text-[10px] text-[#8B93A1]/30 mt-8 relative">
        © 2026 HealthOS. All rights reserved.
      </p>
    </div>
  )
}
