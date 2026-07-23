import { Sidebar } from "@/components/layout/sidebar"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { PageTransition } from "@/components/ui/page-transition"

export default function PractitionerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="health-app flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-5 py-6 md:px-8 md:py-8">
          <ErrorBoundary>
            <PageTransition>{children}</PageTransition>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
