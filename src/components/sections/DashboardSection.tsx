"use client"

import { motion } from "framer-motion"

const vitals = [
  { label: "Heart Rate", value: "72", unit: "bpm", color: "#2FE6C4" },
  { label: "Blood Pressure", value: "120/80", unit: "mmHg", color: "#8B7FFF" },
  { label: "Blood Sugar", value: "95", unit: "mg/dL", color: "#FFB86B" },
  { label: "SpO₂", value: "98", unit: "%", color: "#2FE6C4" },
  { label: "Sleep", value: "7h 42m", unit: "", color: "#8B7FFF" },
  { label: "Steps", value: "8.4k", unit: "", color: "#FFB86B" },
]

const insights: { text: string; color: string }[] = [
  { text: "Blood pressure trending upward", color: "#FFB86B" },
  { text: "Diabetes risk increased 12%", color: "#8B7FFF" },
  { text: "Sleep quality improved 18%", color: "#2FE6C4" },
]

export default function DashboardSection() {
  return (
    <section id="dashboard" className="section py-32 md:py-40">
      <div className="section-inner">
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="eyebrow mb-4 text-center"
        >
          Live Dashboard
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="display-lg text-center max-w-3xl mx-auto mb-16"
        >
          Your Health, at a Glance.
        </motion.h2>

        <div className="grid lg:grid-cols-5 gap-6 mb-8">
          {/* Health Score */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 rounded-2xl p-8 md:p-10 flex flex-col items-center justify-center"
            style={{ background: "#0D0E14", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="eyebrow mb-6">Health Score</p>
            <div className="relative w-36 h-36 mb-4">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none" stroke="#2FE6C4" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={314.16} strokeDashoffset={47.12}
                  style={{ filter: "drop-shadow(0 0 8px rgba(46,230,196,0.3))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold data-text" style={{ color: "#2FE6C4" }}>85</span>
                <span className="text-xs text-text-secondary mt-0.5">/100</span>
              </div>
            </div>
            <span className="text-sm text-text-tertiary">
              <span style={{ color: "#2FE6C4" }}>↑ 3 pts</span> this month
            </span>
          </motion.div>

          {/* Vitals */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
            {vitals.map((v, i) => (
              <motion.div
                key={v.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
                className="rounded-xl p-5"
                style={{ background: "#0D0E14", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="eyebrow text-[10px] mb-1.5">{v.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl md:text-2xl font-bold data-text" style={{ color: v.color }}>
                    {v.value}
                  </span>
                  {v.unit && <span className="text-[10px] text-text-tertiary">{v.unit}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="grid md:grid-cols-3 gap-3">
          {insights.map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
              className="rounded-xl px-5 py-4"
              style={{ background: "#0D0E14", borderLeft: `3px solid ${item.color}` }}
            >
              <span className="text-xs text-text-secondary">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
