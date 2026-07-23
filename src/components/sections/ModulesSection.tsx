"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import modules from "@/data/modules.json"

gsap.registerPlugin(ScrollTrigger)

const clusterIcons: Record<string, React.ReactNode> = {
  intelligence: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M12 2a4 4 0 0 1 4 4c0 2-1 3-2 4h-4c-1-1-2-2-2-4a4 4 0 0 1 4-4Z" /><path d="M8 14h8" /><path d="M10 18h4" /><path d="M12 22v-4" />
    </svg>
  ),
  monitoring: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
    </svg>
  ),
  fitness: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M21 15V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v10" /><path d="M3 12h18" /><path d="M12 3v18" />
    </svg>
  ),
  wellness: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M12 8v8" /><path d="M8 12h8" />
    </svg>
  ),
  care: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M19 14c1.5-1.5 3-3 3-5a5 5 0 0 0-5-5c-1.5 0-3 .7-4 2-1-.8-2.5-2-4-2A5 5 0 0 0 4 9c0 2 1.5 3.5 3 5l5 5 5-5Z" /><path d="M9 9h.01" /><path d="M15 9h.01" />
    </svg>
  ),
  family: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
}

export default function ModulesSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const wrapper = wrapperRef.current
    const track = trackRef.current

    if (!section || !wrapper || !track) return

    const ctx = gsap.context(() => {
      ScrollTrigger.refresh()

      const getDistance = () =>
        Math.max(0, track.scrollWidth - wrapper.offsetWidth)

      gsap.set(track, {
        x: 0,
      })

      gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getDistance()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="modules"
      className="relative bg-[#F5F7FA]"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 bottom-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#176B63]/5 blur-[180px]" />
        <div className="absolute right-1/4 top-1/2 h-[400px] w-[600px] rounded-full bg-[#476A91]/3 blur-[180px]" />
      </div>

      <div
        className="min-h-[44rem] flex flex-col justify-center"
        style={{
          paddingTop: 72,
          paddingBottom: 56,
        }}
      >
        <div className="text-center px-6 mb-10">
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="eyebrow-gradient mb-4"
          >
            HealthOS Modules
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-5xl font-bold tracking-[-0.03em] text-[#172033] mt-3"
          >
            Everything You Need
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-[#4B5870] max-w-xl mx-auto mt-4 text-base leading-7"
          >
            Every HealthOS capability is organized into intelligent modules
            working together as one AI-powered health operating system.
          </motion.p>
        </div>

        {/* IMPORTANT */}
        <div
          ref={wrapperRef}
          className="overflow-hidden w-full"
        >
          <div
            ref={trackRef}
            className="flex gap-5"
            style={{
              width: "max-content",
              paddingLeft: 40,
              paddingRight: 40,
            }}
          >
            {modules.clusters.map((cluster, idx) => (
              <motion.div
                key={cluster.id}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  delay: idx * 0.08,
                  duration: 0.6,
                }}
                whileHover={{
                  y: -5,
                }}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  width: 320,
                  height: 410,
                  background: "#FFFFFF",
                  border: "1px solid #dce3ec",
                  boxShadow: "0 4px 12px rgba(20,37,63,.05)",
                }}
              >
                <div
                  className="absolute -right-20 -top-20 w-56 h-56 rounded-full blur-3xl opacity-20"
                  style={{
                    background: cluster.color,
                  }}
                />

                <div className="relative p-6 h-full flex flex-col">
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: `${cluster.color}14`,
                      border: `1px solid ${cluster.color}26`,
                      color: cluster.color,
                    }}
                    whileHover={{ scale: 1.1, rotate: -3 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    {clusterIcons[cluster.id]}
                  </motion.div>

                  <h3
                    className="mt-3 text-2xl font-bold"
                    style={{
                      color: cluster.color,
                    }}
                  >
                    {cluster.title}
                  </h3>

                  <p className="text-[#4B5870] mt-1 text-sm">
                    {cluster.modules.length} Features
                  </p>

                  <div className="h-px bg-[#dce3ec] my-5" />

                  <div className="space-y-3">
                    {cluster.modules.map((module) => (
                      <div
                        key={module}
                        className="flex items-center gap-4"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: cluster.color,
                          }}
                        />

                        <span className="text-sm text-[#172033]/80">
                          {module}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <button
                      className="mt-5 rounded-lg px-4 py-2 text-sm font-medium transition"
                      style={{
                        background: `${cluster.color}20`,
                        color: cluster.color,
                      }}
                    >
                      Explore module →
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
