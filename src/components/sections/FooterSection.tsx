"use client"

import { motion } from "framer-motion"

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#" },
      { label: "AI Doctor", href: "#" },
      { label: "AI Report Analyzer", href: "#" },
      { label: "Health Dashboard", href: "#" },
      { label: "Medical Records", href: "#" },
      { label: "Wearable Integration", href: "#" },
      { label: "Health Timeline", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Roadmap", href: "#" },
      { label: "API", href: "#" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Individuals", href: "#" },
      { label: "Families", href: "#" },
      { label: "Hospitals", href: "#" },
      { label: "Clinics", href: "#" },
      { label: "Fitness", href: "#" },
      { label: "Corporate Wellness", href: "#" },
      { label: "Senior Care", href: "#" },
      { label: "Women's Health", href: "#" },
      { label: "Emergency Care", href: "#" },
      { label: "Insurance", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Developers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Help Center", href: "#" },
      { label: "Community", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Security", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
]

const getStartedLinks = [
  { label: "Create Account", href: "/register" },
  { label: "Login", href: "/login" },
  { label: "Book Demo", href: "#" },
  { label: "Download App", href: "#" },
  { label: "Join Beta", href: "#" },
]

const socialIcons = [
  { name: "GitHub", icon: "GH", href: "#" },
  { name: "LinkedIn", icon: "LI", href: "#" },
  { name: "Twitter/X", icon: "X", href: "#" },
  { name: "Instagram", icon: "IG", href: "#" },
  { name: "YouTube", icon: "YT", href: "#" },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
}

const ease = [0.16, 1, 0.3, 1] as const

export default function FinalCTASection() {
  return (
    <footer className="relative overflow-hidden">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-[#0B1120] pointer-events-none" />

      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(46,230,196,0.06) 0%, transparent 60%)",
            "radial-gradient(ellipse 80% 50% at 80% 80%, rgba(139,127,255,0.06) 0%, transparent 60%)",
            "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(46,230,196,0.06) 0%, transparent 60%)",
          ],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Dotted grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden
      >
        <span
          className="text-[clamp(6rem,20vw,16rem)] font-bold tracking-[-0.05em] opacity-[0.02]"
          style={{ filter: "blur(6px)" }}
        >
          HEALTHOS
        </span>
      </div>

      {/* ── CTA Section ── */}
      <section className="relative z-10 section py-32 md:py-40 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          <h2 className="display-xl max-w-4xl mx-auto mb-6">
            Ready to Take Control
            <br />
            <span style={{ color: "#2FE6C4" }}>of Your Health?</span>
          </h2>
          <p className="body-lg max-w-md mx-auto mb-10">
            Join thousands already using HealthOS to understand, predict, and protect their health.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="btn-primary">
              Get Started Free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2.5L11.5 7L7 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.5 7H2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </a>
            <button className="btn-outline">Talk to Sales</button>
          </div>
        </motion.div>
      </section>

      {/* ── Divider ── */}
      <div
        className="relative z-10 h-px mx-6 md:mx-12"
        style={{
          background: "linear-gradient(to right, transparent, rgba(46,230,196,0.15), rgba(139,127,255,0.15), transparent)",
        }}
      />

      {/* ── Footer Links ── */}
      <motion.div
        className="relative z-10 section py-20"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        <div className="section-inner">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-8">
            {/* Column 1: Brand */}
            <motion.div variants={fadeUp} transition={{ duration: 0.6, ease }} className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #2FE6C4, #8B7FFF)" }}
                >
                  H
                </div>
                <span className="text-sm font-semibold">HealthOS</span>
              </div>
              <p className="text-xs text-text-tertiary mb-1">Your AI Health Operating System</p>
              <p className="text-[11px] text-text-tertiary/50 leading-relaxed mb-6 max-w-xs">
                HealthOS is an AI-powered healthcare operating system that unifies medical records,
                wearable devices, AI diagnostics, health insights, nutrition, fitness, and preventive
                care into one intelligent platform.
              </p>

              {/* Social icons with glass effect */}
              <div className="flex gap-3 mb-6">
                {socialIcons.map((s) => (
                  <motion.a
                    key={s.name}
                    href={s.href}
                    whileHover={{ scale: 1.12, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs cursor-pointer transition-all duration-300"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.35)",
                    }}
                    aria-label={s.name}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(46,230,196,0.12)";
                      e.currentTarget.style.borderColor = "rgba(46,230,196,0.25)";
                      e.currentTarget.style.color = "#2FE6C4";
                      e.currentTarget.style.boxShadow = "0 0 20px rgba(46,230,196,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.35)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {s.icon}
                  </motion.a>
                ))}
              </div>

              <p className="text-[10px] text-text-tertiary/40">
                © 2026 HealthOS. All Rights Reserved.
              </p>
            </motion.div>

            {/* Columns 2-4: Link lists */}
            {footerLinks.map((col) => (
              <motion.div key={col.title} variants={fadeUp} transition={{ duration: 0.6, ease }}>
                <h3 className="text-xs font-semibold tracking-wider uppercase text-text-secondary mb-5">
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <motion.a
                        href={link.href}
                        className="text-[13px] text-text-tertiary/60 inline-block relative cursor-pointer"
                        whileHover={{ x: 3 }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#e8eaed";
                          e.currentTarget.querySelector("span")!.style.width = "100%";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "";
                          e.currentTarget.querySelector("span")!.style.width = "0%";
                        }}
                      >
                        {link.label}
                        <span
                          className="absolute bottom-0 left-0 h-px transition-all duration-300"
                          style={{
                            width: "0%",
                            background: "#2FE6C4",
                          }}
                        />
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}

            {/* Column 5: Get Started */}
            <motion.div variants={fadeUp} transition={{ duration: 0.6, ease }}>
              <h3 className="text-xs font-semibold tracking-wider uppercase text-text-secondary mb-5">
                Get Started
              </h3>
              <ul className="space-y-2.5 mb-6">
                {getStartedLinks.map(({ label, href }) => (
                  <li key={label}>
                    <motion.a
                      href={href}
                      className="text-[13px] text-text-tertiary/60 inline-block relative cursor-pointer"
                      whileHover={{ x: 3 }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#e8eaed";
                        e.currentTarget.querySelector("span")!.style.width = "100%";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "";
                        e.currentTarget.querySelector("span")!.style.width = "0%";
                      }}
                    >
                      {label}
                      <span
                        className="absolute bottom-0 left-0 h-px transition-all duration-300"
                        style={{ width: "0%", background: "#2FE6C4" }}
                      />
                    </motion.a>
                  </li>
                ))}
              </ul>

              {/* Newsletter */}
              <div>
                <p className="text-[11px] text-text-tertiary/50 mb-3 leading-relaxed">
                  Get weekly AI health tips and product updates.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all duration-500"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.6)",
                        backdropFilter: "blur(8px)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(46,230,196,0.4)";
                        e.currentTarget.style.boxShadow = "0 0 16px rgba(46,230,196,0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
                    style={{
                      background: "#2FE6C4",
                      color: "#05060A",
                      boxShadow: "0 0 20px rgba(46,230,196,0.15)",
                    }}
                  >
                    Subscribe
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom Bar ── */}
      <div
        className="relative z-10 h-px mx-6 md:mx-12"
        style={{
          background: "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />
      <div className="relative z-10 section py-5">
        <div className="section-inner flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-text-tertiary/40">
            Built with ❤️ using AI for a healthier future.
          </p>
          <div className="flex items-center gap-4">
            {["Status", "Privacy", "Cookies", "Accessibility"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-[10px] text-text-tertiary/30 hover:text-text-tertiary/60 transition-colors"
              >
                {item}
              </a>
            ))}
            <span className="text-[10px] text-text-tertiary/20 pl-2 border-l border-white/[0.04]">
              v1.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
