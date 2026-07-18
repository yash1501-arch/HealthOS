"use client"

import { motion } from "framer-motion"

const competitors = [
  "Apple Health", "Google Fit", "Fitbit",
  "MyFitnessPal", "Hospital Apps", "Medication Apps",
  "Mental Health", "Nutrition Apps",
]

const ease = [0.16, 1, 0.3, 1] as const

export default function OnePlatformSection() {
  return (
    <section className="section py-32 md:py-40 overflow-hidden">
      <div className="section-inner">
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease }}
          className="eyebrow mb-4 text-center"
        >
          One Platform
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="display-lg text-center max-w-3xl mx-auto mb-4"
        >
          Everything, Unified.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="body-lg text-center max-w-xl mx-auto mb-20"
        >
          Replace a dozen disconnected apps with one intelligent system.
        </motion.p>

        <div className="relative max-w-lg mx-auto" style={{ height: "320px" }}>
          {/* Center orb */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.2 }}
            >
              <div
                className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #2FE6C4, #8B7FFF)",
                  boxShadow: "0 0 40px rgba(46,230,196,0.2)",
                }}
              >
                <span className="text-lg md:text-xl font-bold text-base">H</span>
              </div>
            </motion.div>
          </div>

          {/* Rotating ring container */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Orbit ring */}
            <motion.div
              className="rounded-full border border-white/10"
              style={{ width: "280px", height: "280px" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            />

            {/* Inner ring */}
            <motion.div
              className="absolute inset-8 rounded-full border border-white/[0.05]"
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />

            {/* Orbiting labels */}
            {competitors.map((name, i) => {
              const angle = (i / competitors.length) * Math.PI * 2 - Math.PI / 2
              const r = 140
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.07, duration: 0.5, ease }}
                  className="absolute left-1/2 top-1/2 text-xs md:text-sm text-text-secondary/50 whitespace-nowrap"
                  style={{
                    transform: `translate(calc(-50% + ${Math.cos(angle) * r}px), calc(-50% + ${Math.sin(angle) * r}px))`,
                  }}
                >
                  <motion.span
                    className="inline-block"
                    whileHover={{ scale: 1.1, color: "#e8eaed" }}
                    transition={{ duration: 0.2 }}
                  >
                    {name}
                  </motion.span>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
