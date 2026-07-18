import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#05060A]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
