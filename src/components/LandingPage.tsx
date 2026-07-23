"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import NavBar from "@/components/sections/NavBar"
import HeroSection from "@/components/sections/HeroSection"
import TheShiftSection from "@/components/sections/TheShiftSection"
import OnePlatformSection from "@/components/sections/OnePlatformSection"
import ModulesSection from "@/components/sections/ModulesSection"
import DashboardSection from "@/components/sections/DashboardSection"
import AIInsightsSection from "@/components/sections/AIInsightsSection"
import FutureVisionSection from "@/components/sections/FutureVisionSection"
import FooterSection from "@/components/sections/FooterSection"

gsap.registerPlugin(ScrollTrigger)

export default function LandingPage() {
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let lenis: any
    let ticking = true
    let rafCallback: ((time: number) => void) | null = null

    const init = async () => {
      const Lenis = (await import("lenis")).default
      if (!ticking) return // Component was unmounted during import

      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1,
      })

      lenis.on("scroll", ScrollTrigger.update)

      rafCallback = (time: number) => {
        if (!ticking) return
        lenis.raf(time * 1000)
      }

      gsap.ticker.add(rafCallback)
      gsap.ticker.lagSmoothing(0)
    }

    init()

    return () => {
      ticking = false
      if (rafCallback) {
        gsap.ticker.remove(rafCallback)
      }
      if (lenis) {
        lenis.destroy()
      }
    }
  }, [])

  return (
    <main ref={mainRef} className="health-marketing min-h-screen">
      <NavBar />
      <HeroSection />
      <TheShiftSection />
      <OnePlatformSection />
      <ModulesSection />
      <DashboardSection />
      <AIInsightsSection />
      <FutureVisionSection />
      <FooterSection />
    </main>
  )
}
