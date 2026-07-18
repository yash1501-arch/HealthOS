"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import modules from "@/data/modules.json"

gsap.registerPlugin(ScrollTrigger)

const clusterIcons: Record<string, string> = {
  intelligence: "⊚",
  monitoring: "◈",
  fitness: "◇",
  wellness: "○",
  care: "□",
  family: "△",
}

const ease = [0.16, 1, 0.3, 1] as const

export default function ModulesSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current

    if (!section || !track) return

    const ctx = gsap.context(() => {
      ScrollTrigger.refresh()

      const totalScroll =
        track.scrollWidth - section.clientWidth + 80

      gsap.to(track, {
        x: -totalScroll,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          pin: true,
          start: "top top",
          end: () => `+=${totalScroll}`,
          scrub: 1,
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
      className="relative bg-[#05070B] overflow-hidden"
    >
      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-cyan-400/10 blur-[180px]" />
      </div>

      {/* DO NOT use sticky here */}
      <div className="min-h-screen flex flex-col justify-start pt-28 pb-20">

        {/* Header */}

        <div className="text-center mb-16 px-6">

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: .5 }}
            className="uppercase tracking-[0.35em] text-cyan-400 text-xs font-semibold"
          >
            HealthOS Modules
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: .1 }}
            className="text-5xl md:text-7xl font-bold mt-4 text-white"
          >
            Everything You Need
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: .2 }}
            className="max-w-2xl mx-auto mt-6 text-white/60 text-lg"
          >
            Every HealthOS capability is organized into intelligent
            modules working together as one AI-powered health operating
            system.
          </motion.p>

        </div>

        {/* Horizontal Track */}

        <div
          ref={trackRef}
          className="flex gap-8 px-20"
          style={{
            width: "max-content",
            willChange: "transform",
          }}
        >
          {modules.clusters.map((cluster, idx) => (
            <motion.div
              key={cluster.id}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: .6,
                delay: idx * .08,
                ease,
              }}
              whileHover={{
                y: -12,
                scale: 1.02,
                transition: {
                  duration: .35,
                },
              }}
              className="relative rounded-3xl p-10 overflow-hidden"
              style={{
                minWidth: 430,
                height: idx % 2 === 0 ? 520 : 490,
                background:
                  "linear-gradient(180deg,#12151D 0%,#0B0E14 100%)",
                border: "1px solid rgba(255,255,255,.08)",
                boxShadow:
                  "0 20px 60px rgba(0,0,0,.45)",
              }}
            >
              {/* Glow */}

              <div
                className="absolute -right-20 -top-20 w-56 h-56 rounded-full blur-3xl opacity-20"
                style={{
                  background: cluster.color,
                }}
              />

              {/* Icon */}

              <div
                className="text-5xl mb-8"
                style={{
                  color: cluster.color,
                }}
              >
                {clusterIcons[cluster.id] ?? "⊡"}
              </div>

              {/* Title */}

              <h3
                className="text-2xl font-semibold"
                style={{
                  color: cluster.color,
                }}
              >
                {cluster.title}
              </h3>

              <p className="text-white/40 text-sm mt-2 mb-8">
                {cluster.modules.length} Features
              </p>

              <div className="h-px bg-white/10 mb-8" />

              <div className="space-y-5">

                {cluster.modules.map((module, i) => (
                  <motion.div
                    key={module}
                    initial={{
                      opacity: 0,
                      x: -20,
                    }}
                    whileInView={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay: .15 + i * .05,
                    }}
                    className="flex items-center gap-4"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: cluster.color,
                      }}
                    />

                    <span className="text-white/80 text-base">
                      {module}
                    </span>
                  </motion.div>
                ))}

              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}