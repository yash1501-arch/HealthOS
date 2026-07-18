"use client"

import { motion } from "framer-motion"

const ease = [0.16, 1, 0.3, 1] as const

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function HeroSection() {
  return (
    <section className="flex flex-col items-center justify-center min-h-screen px-6 text-center relative">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(46,230,196,0.08) 0%, transparent 60%)",
        }}
      />

      <motion.div
        className="relative"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } } }}
      >
        <motion.p
          variants={item}
          transition={{ duration: 0.7, ease }}
          className="eyebrow mb-6"
        >
          AI-Powered Health Intelligence
        </motion.p>

        <motion.h1
          variants={item}
          transition={{ duration: 0.7, ease }}
          className="display-xl max-w-5xl mx-auto mb-6"
        >
          The Operating System
          <br />
          <span style={{ color: "#2FE6C4" }}>for Human Health</span>
        </motion.h1>

        <motion.p
          variants={item}
          transition={{ duration: 0.7, ease }}
          className="body-lg max-w-xl mx-auto mb-10"
        >
          One platform that learns from your records, wearables, labs, and habits —
          shifting care from reactive to proactive.
        </motion.p>

        <motion.div
          variants={item}
          transition={{ duration: 0.7, ease }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a href="/register" className="btn-primary">
            Start Your Health Journey
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2.5L11.5 7L7 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11.5 7H2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </a>
          <button className="btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5.5 4.5V9.5L9.5 7L5.5 4.5Z" fill="currentColor"/>
            </svg>
            Watch Demo
          </button>
        </motion.div>
      </motion.div>
    </section>
  )
}
