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
          className="eyebrow-gradient mb-16 text-center"
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
            <p className="eyebrow mb-4" style={{ color: "rgba(0,0,0,0.25)" }}>
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
                  <span className="mt-1 text-[#4B5870]">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </span>
                  <span className="text-[#4B5870]">{item.before}</span>
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
            <p className="eyebrow mb-4" style={{ color: "#176B63" }}>
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
                  <span className="mt-1" style={{ color: "#176B63" }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                  <span className="text-[#172033]">{item.after}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Divider */}
          <div
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(47,230,196,0.15), transparent)",
            }}
          />
        </div>
      </div>
    </section>
  )
}