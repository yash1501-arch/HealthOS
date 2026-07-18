"use client"

import { motion } from "framer-motion"

const events = [
  { year: "2024", title: "Health Baseline", desc: "Your complete health picture established", icon: "◈" },
  { year: "2025", title: "Wearables Live", desc: "Continuous data stream begins", icon: "◇" },
  { year: "2026", title: "AI Predicts", desc: "First predictive alerts", icon: "○" },
  { year: "2027", title: "Network Live", desc: "Seamless doctor referrals", icon: "⊡" },
  { year: "2028", title: "Genome Active", desc: "Personalized prevention", icon: "⊚" },
  { year: "2030", title: "Full Autonomy", desc: "Your health, fully understood", icon: "★" },
]

const ease = [0.16, 1, 0.3, 1] as const

export default function FutureVisionSection() {
  return (
    <section className="section py-32 md:py-40 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "70vw",
            height: "50vh",
            background:
              "radial-gradient(ellipse, rgba(46,230,196,0.04) 0%, rgba(139,127,255,0.03) 40%, transparent 60%)",
            filter: "blur(80px)",
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="section-inner relative">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease }}
          className="eyebrow mb-4 text-center"
        >
          The Future
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="display-lg text-center max-w-3xl mx-auto mb-20"
        >
          Your Life, Understood.
        </motion.h2>

        {/* Timeline */}
        <div className="relative max-w-5xl mx-auto">
          {/* Main timeline line */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px origin-left"
            style={{
              background:
                "linear-gradient(to right, transparent 0%, rgba(46,230,196,0.15) 20%, rgba(139,127,255,0.15) 80%, transparent 100%)",
            }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Glowing secondary line */}
          <motion.div
            className="absolute top-0 left-0 h-px"
            style={{
              width: "0%",
              background:
                "linear-gradient(to right, #2FE6C4, #8B7FFF)",
              boxShadow: "0 0 8px rgba(46,230,196,0.3), 0 0 20px rgba(46,230,196,0.1)",
            }}
            initial={{ width: "0%" }}
            whileInView={{ width: "92%" }}
            viewport={{ once: true }}
            transition={{ duration: 2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Events grid */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12 } },
            }}
          >
            {events.map((ev, i) => {
              const isLast = i === events.length - 1
              return (
                <motion.div
                  key={ev.year}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.95, filter: "blur(4px)" },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      filter: "blur(0px)",
                      transition: { duration: 0.7, ease },
                    },
                  }}
                  className="relative pt-10 group cursor-default"
                >
                  {/* Timeline dot */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <motion.div
                      className="relative"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        delay: i * 0.12 + 0.3,
                        type: "spring",
                        stiffness: 400,
                        damping: 15,
                      }}
                    >
                      {/* Dot */}
                      <div
                        className="w-3 h-3 rounded-full transition-all duration-500"
                        style={{
                          background: isLast
                            ? "#2FE6C4"
                            : "rgba(255,255,255,0.12)",
                          boxShadow: isLast
                            ? "0 0 16px rgba(46,230,196,0.5), 0 0 40px rgba(46,230,196,0.2)"
                            : "none",
                        }}
                      />
                      {/* Expanding glow ring on hover */}
                      {isLast && (
                        <motion.div
                          className="absolute -inset-1 rounded-full border"
                          style={{
                            borderColor: "rgba(46,230,196,0.3)",
                          }}
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0.1, 0.5],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </motion.div>
                    {/* Connecting line from dot to top of card */}
                    <motion.div
                      className="absolute top-3 left-1/2 w-px -translate-x-1/2 origin-top"
                      style={{
                        height: "28px",
                        background: `linear-gradient(to bottom, ${
                          isLast ? "#2FE6C4" : "rgba(255,255,255,0.1)"
                        }, transparent)`,
                      }}
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + 0.5, duration: 0.4 }}
                    />
                  </div>

                  {/* Event card */}
                  <motion.div
                    className="rounded-xl p-5 transition-all duration-500"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                    whileHover={{
                      y: -4,
                      background: isLast
                        ? "rgba(46,230,196,0.04)"
                        : "rgba(255,255,255,0.04)",
                      borderColor: isLast
                        ? "rgba(46,230,196,0.15)"
                        : "rgba(255,255,255,0.1)",
                      transition: { duration: 0.3, ease },
                    }}
                  >
                    {/* Icon */}
                    <motion.div
                      className="text-lg mb-2"
                      style={{ color: isLast ? "#2FE6C4" : "rgba(255,255,255,0.15)" }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + 0.45, type: "spring", stiffness: 300 }}
                    >
                      {ev.icon}
                    </motion.div>

                    {/* Year */}
                    <motion.div
                      className="data-text text-xs font-bold mb-1"
                      style={{
                        color: isLast ? "#2FE6C4" : "rgba(255,255,255,0.3)",
                      }}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + 0.5, duration: 0.4 }}
                    >
                      {ev.year}
                    </motion.div>

                    {/* Title */}
                    <motion.div
                      className="text-sm font-semibold mb-1"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + 0.55, duration: 0.4 }}
                    >
                      {ev.title}
                    </motion.div>

                    {/* Description */}
                    <motion.div
                      className="text-xs text-text-tertiary leading-relaxed"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + 0.6, duration: 0.4 }}
                    >
                      {ev.desc}
                    </motion.div>

                  </motion.div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Scroll indicator at bottom of timeline */}
          <motion.div
            className="flex items-center justify-center gap-2 mt-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/10" />
            <span className="text-[10px] text-text-tertiary/30 tracking-[0.15em] uppercase">
              The journey continues
            </span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/10" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
