import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/lib/providers"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "HealthOS — Your AI Health Companion",
  description: "Personalized AI-powered health coaching, report analysis, and wellness planning",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-darker text-gray-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
