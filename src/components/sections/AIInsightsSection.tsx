"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useScroll, useTransform, useSpring } from "framer-motion"

const insights = [
  "Your blood pressure has been gradually trending upward over the past 6 weeks.",
  "Risk of Type 2 diabetes increased by 12% based on latest HbA1c and fasting glucose.",
  "Vitamin D deficiency likely. Sun exposure down 40% this season.",
  "Sleep quality improved 18% after adjusting your bedtime to 10:30 PM.",
  "Your resting heart rate variability suggests elevated stress levels this week.",
]

const stages = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Families",
    desc: "One dashboard for every member.",
    color: "#176B63",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M19 14c1.5-1.5 3-3 3-5a5 5 0 0 0-5-5c-1.5 0-3 .7-4 2-1-.8-2.5-2-4-2A5 5 0 0 0 4 9c0 2 1.5 3.5 3 5l5 5 5-5Z" /><path d="M9 9h.01" /><path d="M15 9h.01" />
      </svg>
    ),
    title: "Doctors",
    desc: "AI-assisted diagnostics & referrals.",
    color: "#476A91",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v10" /><path d="M3 12h18" /><path d="M12 5l7 7-7 7" />
      </svg>
    ),
    title: "Athletes",
    desc: "Performance optimization in real-time.",
    color: "#9B651B",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
    ),
    title: "Seniors",
    desc: "Medication & fall detection.",
    color: "#B53A45",
  },
]

const ease = [0.16, 1, 0.3, 1] as const

// --- Floating AI Icon -----------------------------------------

function FloatingAI() {
  return (
    <motion.div
      className="flex items-center justify-center"
      animate={{ y: [-4, 4, -4] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg relative"
        style={{
          background: "linear-gradient(135deg, #176B63, #476A91)",
          boxShadow: "0 0 24px rgba(47,230,196,0.15)",
        }}
      >
        <span className="font-bold text-[#172033]">AI</span>
        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{
            border: "1px solid rgba(47,230,196,0.3)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  )
}

// --- Typing Cursor --------------------------------------------

function TypingCursor() {
  return (
    <motion.span
      className="inline-block w-[2px] h-[1em] ml-0.5 align-middle rounded-full"
      style={{ background: "#176B63" }}
      animate={{
        opacity: [1, 0.3, 1],
        boxShadow: [
          "0 0 4px rgba(47,230,196,0.6)",
          "0 0 8px rgba(47,230,196,0.2)",
          "0 0 4px rgba(47,230,196,0.6)",
        ],
      }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
    />
  )
}

// --- Stage Card -----------------------------------------------

function StageCard({
  stage,
  index,
}: {
  stage: (typeof stages)[0]
  index: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, x: index % 2 === 0 ? -10 : 10 }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 14,
        delay: 0.15 + index * 0.1,
        mass: 0.8,
      }}
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { type: "spring", stiffness: 300, damping: 12 },
      }}
      className="group relative rounded-xl p-5 cursor-default overflow-hidden glow-card"
    >
      {/* Hover glow overlay */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${stage.color}08, transparent 70%)`,
        }}
      />

      <div className="flex items-center gap-4 relative z-10">
        {/* Icon container */}
        <motion.div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium shrink-0 transition-all duration-300"
          style={{ color: stage.color, background: `${stage.color}10` }}
          whileHover={{ scale: 1.1, rotate: -5 }}
          transition={{ type: "spring", stiffness: 300, damping: 10 }}
        >
          <motion.span
            animate={{ y: [0, -2, 0] }}
            transition={{
              duration: 2.5 + index * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.2,
            }}
          >
            {stage.icon}
          </motion.span>
        </motion.div>

        <div>
          <div className="text-sm font-medium text-[#172033]">{stage.title}</div>
          <div className="text-xs text-[#4B5870] mt-0.5">{stage.desc}</div>
        </div>

        {/* Arrow on hover */}
        <motion.div
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ color: stage.color }}
          initial={{ x: -5 }}
          whileHover={{ x: 2 }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  )
}

// --- Main Section ---------------------------------------------

export default function AIInsightsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [idx, setIdx] = useState(0)
  const [text, setText] = useState("")
  const [typing, setTyping] = useState(true)

  // Typing effect
  useEffect(() => {
    const insight = insights[idx]
    setTyping(true)
    setText("")
    let ci = 0
    const ti = setInterval(() => {
      if (ci < insight.length) {
        setText(insight.slice(0, ci + 1))
        ci++
      } else {
        clearInterval(ti)
        setTyping(false)
      }
    }, 22)
    return () => clearInterval(ti)
  }, [idx])

  // Auto-cycle insights
  useEffect(() => {
    const iv = setInterval(() => setIdx((p) => (p + 1) % insights.length), 5000)
    return () => clearInterval(iv)
  }, [])

  // Scroll-driven animations
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  })
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 20 })

  const leftX = useTransform(smoothProgress, [0, 0.6], [-20, 0])
  const leftOpa = useTransform(smoothProgress, [0, 0.5], [0, 1])
  const rightX = useTransform(smoothProgress, [0, 0.6], [20, 0])
  const rightOpa = useTransform(smoothProgress, [0, 0.5], [0, 1])

  return (
    <section
      ref={sectionRef}
      id="insights"
      className="section py-32 md:py-40 overflow-hidden relative"
    >
      {/* Ambient background glow */}
      <motion.div
        className="absolute top-1/3 -left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(47,230,196,0.04) 0%, transparent 70%)",
          x: useTransform(smoothProgress, [0, 1], [-100, 100]),
        }}
      />
      <motion.div
        className="absolute top-1/3 -right-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(139,127,255,0.04) 0%, transparent 70%)",
          x: useTransform(smoothProgress, [0, 1], [100, -100]),
        }}
      />

      <div className="section-inner relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* -- Left: AI Insights -- */}
          <motion.div style={{ x: leftX, opacity: leftOpa }}>
            {/* Floating AI icon */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease }}
              className="mb-6"
            >
              <FloatingAI />
            </motion.div>

            <p className="eyebrow-gradient mb-4">AI Intelligence</p>
            <h2 className="display-md mb-8">Insights That Matter.</h2>

            {/* Insight Card */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1, ease }}
              className="relative"
            >
              {/* Glow behind card */}
              <motion.div
                className="absolute -inset-4 rounded-2xl opacity-0"
                style={{
                  background:
                    "radial-gradient(circle, rgba(47,230,196,0.06) 0%, transparent 70%)",
                }}
                animate={{ opacity: typing ? 0.6 : 0.2 }}
                transition={{ duration: 1 }}
              />

              <div
                className="relative rounded-2xl p-6 md:p-8 min-h-[8rem] overflow-hidden glow-card"
                style={{
                  borderLeft: "3px solid #176B63",
                }}
              >
                {/* Pulsing border accent */}
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: "#176B63" }}
                  animate={{
                    boxShadow: typing
                      ? [
                          "0 0 6px rgba(47,230,196,0.3)",
                          "0 0 12px rgba(47,230,196,0.1)",
                          "0 0 6px rgba(47,230,196,0.3)",
                        ]
                      : "0 0 4px rgba(47,230,196,0.15)",
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />

                <p
                  className="eyebrow text-[10px] mb-3 flex items-center gap-2"
                  style={{ color: "rgba(47,230,196,0.5)" }}
                >
                  <motion.span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: "#176B63" }}
                    animate={{ opacity: typing ? [0.4, 1, 0.4] : 0.6 }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  AI Insight
                </p>

                <p className="text-base md:text-lg leading-relaxed" style={{ color: "#172033" }}>
                  {text}
                  {typing && <TypingCursor />}
                </p>
              </div>
            </motion.div>

            {/* Progress Dots */}
            <div className="flex gap-1.5 mt-4">
              {insights.map((_, i) => (
                <motion.div
                  key={i}
                  className="h-1 rounded-full cursor-pointer"
                  style={{
                    width: i === idx ? "24px" : "8px",
                    background: i === idx ? "#176B63" : "rgba(0,0,0,0.08)",
                  }}
                  animate={
                    i === idx
                      ? { scale: [1, 1.1, 1] }
                      : {}
                  }
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  onClick={() => setIdx(i)}
                />
              ))}
            </div>
          </motion.div>

          {/* -- Right: Life Stages -- */}
          <motion.div style={{ x: rightX, opacity: rightOpa }}>
            <p className="eyebrow-gradient mb-4">For Everyone</p>
            <h2 className="display-md mb-8">Every Life Stage.</h2>

            <div className="space-y-3">
              {stages.map((stage, i) => (
                <StageCard key={stage.title} stage={stage} index={i} />
              ))}
            </div>

            {/* Bottom accent text */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="text-xs text-[#4B5870]/60 mt-6 text-center flex items-center justify-center gap-2"
            >
              <span className="w-4 h-px bg-black/[0.06]" />
              Personalized for every stage of life
              <span className="w-4 h-px bg-black/[0.06]" />
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}