"use client"

import { motion, useReducedMotion } from "framer-motion"

const sources = [
  { label: "Medical reports", detail: "Labs and clinical documents", icon: "report", position: "top-8 left-4 md:left-10" },
  { label: "Daily habits", detail: "Sleep, movement, and check-ins", icon: "sun", position: "top-8 right-4 md:right-10" },
  { label: "Wearables", detail: "Activity and recovery signals", icon: "watch", position: "bottom-8 left-4 md:left-10" },
  { label: "Your goals", detail: "What you want to improve", icon: "target", position: "bottom-8 right-4 md:right-10" },
] as const

const iconPaths = {
  report: <><path d="M7 3h7l3 3v15H7z" /><path d="M14 3v4h4M10 11h4M10 15h4" /></>,
  sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  watch: <><rect x="7" y="5" width="10" height="14" rx="2" /><path d="M9 2h6M9 22h6M10 9h4M10 13h4" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="m15 9 5-5M16 4h4v4" /></>,
}

function SourceIcon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  )
}

export default function OnePlatformSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="section bg-[#f5f7fa] py-24 md:py-32">
      <div className="section-inner">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="eyebrow-gradient mb-5">One connected picture</p>
            <h2 className="text-balance text-4xl font-bold tracking-[-0.03em] text-[#172033] md:text-5xl">
              Your health data, made useful together.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#4B5870] md:text-lg">
              HealthOS brings the signals you already have into one private, practical view—then helps you focus on what matters next.
            </p>

            <dl className="mt-10 divide-y divide-[#dce3ec] border-y border-[#dce3ec]">
              {[
                ["Connect", "Bring reports, routines, and day-to-day signals together."],
                ["Understand", "See clear patterns with context, not alarmist scores."],
                ["Act", "Turn observations into manageable next steps."],
              ].map(([term, description]) => (
                <div key={term} className="grid grid-cols-[5.5rem_1fr] gap-4 py-4">
                  <dt className="text-sm font-semibold text-[#172033]">{term}</dt>
                  <dd className="text-sm leading-6 text-[#4B5870]">{description}</dd>
                </div>
              ))}
            </dl>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative min-h-[34rem] overflow-hidden rounded-2xl border border-[#dce3ec] bg-white p-4 shadow-[0_12px_30px_rgba(20,37,63,0.07)] md:min-h-[38rem] md:p-6"
          >
            <div className="absolute inset-x-4 top-4 flex items-center justify-between border-b border-[#dce3ec] pb-4 text-xs text-[#4B5870] md:inset-x-6 md:top-6">
              <span className="font-semibold text-[#172033]">Your health picture</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#176B63]" /> Synced securely</span>
            </div>

            <div className="absolute inset-x-5 top-24 bottom-5 md:inset-x-10 md:top-28 md:bottom-10">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {["18,18 50,50", "82,18 50,50", "18,82 50,50", "82,82 50,50"].map((points, index) => (
                  <g key={points}>
                    <line
                      x1={points.split(" ")[0].split(",")[0]}
                      y1={points.split(" ")[0].split(",")[1]}
                      x2={points.split(" ")[1].split(",")[0]}
                      y2={points.split(" ")[1].split(",")[1]}
                      stroke="#b8cdc8"
                      strokeWidth="0.5"
                      strokeDasharray="2 2"
                    />
                    {!reduceMotion && (
                      <motion.circle
                        r="1.1"
                        fill="#176b63"
                        initial={{ cx: Number(points.split(" ")[0].split(",")[0]), cy: Number(points.split(" ")[0].split(",")[1]), opacity: 0 }}
                        animate={{ cx: Number(points.split(" ")[1].split(",")[0]), cy: Number(points.split(" ")[1].split(",")[1]), opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 2.6, delay: index * 0.55, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                  </g>
                ))}
              </svg>

              {sources.map((source, index) => (
                <motion.div
                  key={source.label}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.11, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute ${source.position} w-[calc(50%-0.75rem)] max-w-[13rem] rounded-xl border border-[#dce3ec] bg-white p-3 shadow-[0_4px_12px_rgba(20,37,63,0.05)] transition-transform duration-200 hover:-translate-y-1 hover:border-[#9cc9c0] md:p-4`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dcefe9] text-[#176B63]">
                      <SourceIcon name={source.icon} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#172033]">{source.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-[#4B5870]">{source.detail}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.65, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-1/2 top-1/2 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#172033] p-5 text-white shadow-[0_12px_24px_rgba(23,32,51,0.22)] md:w-48 md:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">H</span>
                  <span className="text-xs text-white/65">HealthOS</span>
                </div>
                <p className="mt-8 text-sm font-semibold">A clearer next step</p>
                <p className="mt-1 text-xs leading-5 text-white/65">Personal context, gathered in one place.</p>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    className="h-full rounded-full bg-[#8fd3c4]"
                    initial={{ width: "22%" }}
                    animate={reduceMotion ? { width: "68%" } : { width: ["22%", "68%", "48%", "76%"] }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#dce3ec] pt-6 text-sm text-[#4B5870]">
          <span className="font-medium text-[#172033]">Built for clarity, not clutter.</span>
          <span>Private by design</span>
          <span>Explainable recommendations</span>
          <a href="/register" className="inline-flex items-center gap-2 font-semibold text-[#176B63] transition-colors hover:text-[#10554f]">
            Explore HealthOS <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  )
}
