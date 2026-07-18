"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

const insights = [
  "Your blood pressure has been gradually trending upward over the past 6 weeks.",
  "Risk of Type 2 diabetes increased by 12% based on latest HbA1c and fasting glucose.",
  "Vitamin D deficiency likely. Sun exposure down 40% this season.",
  "Sleep quality improved 18% after adjusting your bedtime to 10:30 PM.",
  "Your resting heart rate variability suggests elevated stress levels this week.",
]

const stages = [
  { icon: "∞", title: "Families", desc: "One dashboard for every member." },
  { icon: "⊞", title: "Doctors", desc: "AI-assisted diagnostics & referrals." },
  { icon: "↑", title: "Athletes", desc: "Performance optimization in real-time." },
  { icon: "⊙", title: "Seniors", desc: "Medication & fall detection." },
]

export default function AIInsightsSection() {
  const [idx, setIdx] = useState(0)
  const [text, setText] = useState("")
  const [typing, setTyping] = useState(true)

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
    }, 25)
    return () => clearInterval(ti)
  }, [idx])

  useEffect(() => {
    const iv = setInterval(() => setIdx((p) => (p + 1) % insights.length), 5000)
    return () => clearInterval(iv)
  }, [])

  return (
    <section id="insights" className="section py-32 md:py-40">
      <div className="section-inner">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Left: AI Insights */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow mb-4">AI Intelligence</p>
            <h2 className="display-md mb-8">Insights That Matter.</h2>
            <div
              className="rounded-xl p-6 md:p-8 min-h-[8rem]"
              style={{
                background: "#0D0E14",
                borderLeft: "3px solid #2FE6C4",
              }}
            >
              <p className="eyebrow text-[10px] mb-3" style={{ color: "rgba(46,230,196,0.5)" }}>
                AI Insight
              </p>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: "#e8eaed" }}>
                {text}
                {typing && (
                  <span
                    className="inline-block w-[2px] h-[1em] ml-0.5 align-middle"
                    style={{ background: "#2FE6C4" }}
                  />
                )}
              </p>
            </div>
            <div className="flex gap-1.5 mt-4">
              {insights.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: i === idx ? "24px" : "8px",
                    background: i === idx ? "#2FE6C4" : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Right: Life Stages */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow mb-4">For Everyone</p>
            <h2 className="display-md mb-8">Every Life Stage.</h2>
            <div className="space-y-3">
              {stages.map((s) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08, duration: 0.4 }}
                  className="flex items-center gap-4 rounded-xl p-5"
                  style={{ background: "#0D0E14", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span style={{ color: "#2FE6C4" }}>{s.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{s.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
