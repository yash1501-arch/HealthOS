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
      {/* Ambient glow - multi-color */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(47,230,196,0.08) 0%, transparent 60%), " +
            "radial-gradient(ellipse 50% 40% at 50% 70%, rgba(139,127,255,0.06) 0%, transparent 60%), " +
            "radial-gradient(ellipse 40% 30% at 50% 50%, rgba(255,184,107,0.05) 0%, transparent 50%)",
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
          className="eyebrow-gradient mb-6"
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
          <span className="gradient-text">for Human Health</span>
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

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs text-[#4B5870]/50"
      >
        <span className="uppercase tracking-[0.2em]">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "linear-gradient(135deg, #176B63, #476A91)" }}
        />
      </motion.div>
    </section>
  )
}