import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/lib/providers"
import { ServiceWorker } from "@/components/ui/service-worker"

export const metadata: Metadata = {
  title: "HealthOS — Your AI Health Companion",
  description: "Personalized AI-powered health coaching, report analysis, and wellness planning",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HealthOS",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full font-sans bg-white text-gray-900">
        <Providers>
          {children}
          <ServiceWorker />
        </Providers>
      </body>
    </html>
  )
}
