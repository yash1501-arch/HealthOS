"use client"

import { motion } from "framer-motion"

const items = [
  { before: "Wait for symptoms to appear", after: "Predict risks before they emerge" },
  { before: "Disconnected doctors and specialists", after: "Unified care across your network" },
  { before: "Paper records and siloed data", after: "Every record, lab, wearable in one place" },
  { before: "One-size-fits-all medicine", after: "AI that learns your unique biology" },
]

export default function TheShiftSection() {
  return (
    <section id="shift" className="section py-32 md:py-40">
      <div className="section-inner">
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="eyebrow mb-16 text-center"
        >
          The Shift
        </motion.p>

        <div className="relative grid md:grid-cols-2 gap-12 md:gap-20">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
              Reactive
            </p>
            <div className="space-y-5">
              {items.map((item, i) => (
                <motion.div
                  key={item.before}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1 text-text-tertiary">✕</span>
                  <span className="text-text-tertiary">{item.before}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow mb-4" style={{ color: "#2FE6C4" }}>
              Proactive
            </p>
            <div className="space-y-5">
              {items.map((item, i) => (
                <motion.div
                  key={item.after}
                  initial={{ opacity: 0, x: 15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1" style={{ color: "#2FE6C4" }}>→</span>
                  <span>{item.after}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Divider */}
          <div
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(46,230,196,0.15), transparent)",
            }}
          />
        </div>
      </div>
    </section>
  )
}
