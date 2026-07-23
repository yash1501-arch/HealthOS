"use client"

import { useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

/* ─── DATA ─────────────────────────────────────────── */

const events = [
  { year: "2024", title: "Health Baseline", desc: "Your complete health picture established", icon: "◈" },
  { year: "2025", title: "Wearables Live", desc: "Continuous data stream begins", icon: "◇" },
  { year: "2026", title: "AI Predicts", desc: "First predictive alerts", icon: "○" },
  { year: "2027", title: "Network Live", desc: "Seamless doctor referrals", icon: "⊡" },
  { year: "2028", title: "Genome Active", desc: "Personalized prevention", icon: "⊚" },
  { year: "2030", title: "Full Autonomy", desc: "Your health, fully understood", icon: "★" },
] as const

const LAST_IDX = events.length - 1
const CARD_MIN_W = 300
const CARD_GAP = 48
const TRACK_PAD = 80

/* ─── STAR ZOOM CONFIG ──────────────────────────────── */

const ZOOM_CONFIG = {
  freezeDuration: 0.2,       // how fast other cards dim
  zoomStart: 0.12,           // delay before zoom begins
  zoomDuration: 0.4,         // speed of the star filling the screen
  zoomScaleMultiplier: 10,   // 1.0 = exactly fills screen, >1 = overshoot
  starFadeDuration: 0.18,    // how fast the zoomed star dissolves
  flashInDuration: 0.06,     // flash ramp up
  flashFadeDuration: 0.18,   // flash decay
  contentStart: 0.8,         // when completion text begins to appear
  contentDuration: 0.35,     // completion text fade in
} as const

/* ─── COLORS ────────────────────────────────────────── */

const PURPLE = { r: 139, g: 127, b: 255 }
const CYAN = { r: 46, g: 230, b: 196 }
const DOT_INACTIVE = "rgba(0,0,0,0.12)"
const DOT_ACTIVE = "#176B63"

/* ─── ACTIVE / INACTIVE STATE HELPERS ───────────────── */

function activeCardVars() {
  return {
    scale: 1.05,
    opacity: 1,
    filter: "blur(0px)",
    y: -12,
    borderColor: "rgba(46,230,196,0.35)",
    background: "rgba(46,230,196,0.04)",
    boxShadow: "0 24px 80px rgba(46,230,196,0.10)",
  }
}

function inactiveCardVars() {
  return {
    scale: 0.92,
    opacity: 0.25,
    filter: "blur(3px)",
    y: 0,
    borderColor: "rgba(0,0,0,0.08)",
    background: "rgba(0,0,0,0.02)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  }
}

/* ─── MAIN COMPONENT ────────────────────────────────── */

export default function FutureVisionSection() {
  /* ── Refs ── */
  const sectionRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const timelineAccentRef = useRef<HTMLDivElement>(null)
  const celebrationContentRef = useRef<HTMLDivElement>(null)
  const leftSpacerRef = useRef<HTMLDivElement>(null)
  const rightSpacerRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const dotRefs = useRef<(HTMLDivElement | null)[]>([])
  const iconRefs = useRef<(HTMLDivElement | null)[]>([])
  const cardGlowRefs = useRef<(HTMLDivElement | null)[]>([])
  const connectorRefs = useRef<(HTMLDivElement | null)[]>([])

  /* ── Mutable state (no React re-renders) ── */
  const state = useRef({
    activeIdx: 0,
    lastActiveIdx: -1,
    celebrationTriggered: false,
    zoomStarEl: null as HTMLElement | null,
    flashEl: null as HTMLElement | null,
  })

  /* ── Build ref arrays ── */
  const setCardRef = useCallback((i: number) => (el: HTMLDivElement | null) => { cardRefs.current[i] = el }, [])
  const setDotRef = useCallback((i: number) => (el: HTMLDivElement | null) => { dotRefs.current[i] = el }, [])
  const setIconRef = useCallback((i: number) => (el: HTMLDivElement | null) => { iconRefs.current[i] = el }, [])
  const setCardGlowRef = useCallback((i: number) => (el: HTMLDivElement | null) => { cardGlowRefs.current[i] = el }, [])
  const setConnectorRef = useCallback((i: number) => (el: HTMLDivElement | null) => { connectorRefs.current[i] = el }, [])

  /* ─── CORE: Find the card nearest viewport center ─── */

  const getActiveIndex = useCallback(() => {
    const vpCenter = window.innerWidth / 2
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < events.length; i++) {
      const el = cardRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const c = rect.left + rect.width / 2
      const d = Math.abs(c - vpCenter)
      if (d < bestDist) { bestDist = d; best = i }
    }
    return best
  }, [])

  /* ─── TRANSITIONS ──────────────────────────────────── */

  const transitionCards = useCallback((newIdx: number, oldIdx: number) => {
    const dur = 0.55

    // Deactivate previous
    if (oldIdx >= 0 && oldIdx < events.length) {
      const prev = cardRefs.current[oldIdx]
      if (prev) {
        gsap.to(prev, { ...inactiveCardVars(), duration: dur, ease: "power3.out" })
      }
      const prevGlow = cardGlowRefs.current[oldIdx]
      if (prevGlow) gsap.to(prevGlow, { opacity: 0, duration: dur, ease: "power3.out" })
    }

    // Activate new
    const next = cardRefs.current[newIdx]
    if (next) {
      gsap.to(next, { ...activeCardVars(), duration: dur, ease: "power3.out" })
    }
    const nextGlow = cardGlowRefs.current[newIdx]
    if (nextGlow) gsap.to(nextGlow, { opacity: 0.8, duration: dur, ease: "power3.out" })

    // Icon rotation
    if (oldIdx >= 0) {
      const oldIcon = iconRefs.current[oldIdx]
      if (oldIcon) gsap.to(oldIcon, { rotate: 0, duration: 0.4, ease: "power2.out" })
    }
    const newIcon = iconRefs.current[newIdx]
    if (newIcon) gsap.to(newIcon, { rotate: 8, duration: 0.5, ease: "power2.out" })
  }, [])

  const transitionDots = useCallback((newIdx: number, oldIdx: number) => {
    const dur = 0.4

    if (oldIdx >= 0) {
      const oldDot = dotRefs.current[oldIdx]
      if (oldDot) {
        gsap.to(oldDot, { backgroundColor: DOT_INACTIVE, boxShadow: "none", scale: 1, duration: dur })
      }
      const oldConn = connectorRefs.current[oldIdx]
      if (oldConn) gsap.to(oldConn, { opacity: 0.15, duration: dur })
    }

    const newDot = dotRefs.current[newIdx]
    if (newDot) {
      gsap.to(newDot, {
        backgroundColor: DOT_ACTIVE,
        boxShadow: "0 0 14px rgba(46,230,196,0.6), 0 0 40px rgba(46,230,196,0.2)",
        scale: 1.4,
        duration: dur,
        ease: "back.out(2)",
      })
    }
    const newConn = connectorRefs.current[newIdx]
    if (newConn) gsap.to(newConn, { opacity: 1, duration: dur })
  }, [])

  /* ─── BACKGROUND GLOW ──────────────────────────────── */

  const moveGlow = useCallback((progress: number) => {
    const glow = glowRef.current
    const wrapper = wrapperRef.current
    if (!glow || !wrapper) return

    // Parallax: glow moves 60% of the track speed
    const maxMove = wrapper.offsetWidth - 400
    const x = -progress * maxMove * 0.6
    gsap.to(glow, { x, duration: 0.8, ease: "power2.out" })

    // Interpolate color: purple → cyan as progress increases
    const w = Math.min(progress * 1.2, 1) // bias toward cyan earlier
    const r = Math.round(PURPLE.r + (CYAN.r - PURPLE.r) * w)
    const g = Math.round(PURPLE.g + (CYAN.g - PURPLE.g) * w)
    const b = Math.round(PURPLE.b + (CYAN.b - PURPLE.b) * w)
    gsap.to(glow, {
      background: `radial-gradient(ellipse, rgba(${r},${g},${b},0.07) 0%, rgba(${r},${g},${b},0.025) 40%, transparent 60%)`,
      duration: 1,
      ease: "power1.inOut",
    })
  }, [])

  /* ─── STAR ZOOM SEQUENCE ──────────────────────────────── */

  const triggerCelebration = useCallback(() => {
    if (state.current.celebrationTriggered) return
    state.current.celebrationTriggered = true

    const lastCard = cardRefs.current[LAST_IDX]
    const content = celebrationContentRef.current
    const starIconEl = iconRefs.current[LAST_IDX]
    const others = cardRefs.current.slice(0, LAST_IDX)

    gsap.killTweensOf(others)
    gsap.killTweensOf(lastCard)

    // Get the star icon's position on screen
    const rect = starIconEl?.getBoundingClientRect()
    const sx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const sy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const starSize = rect ? Math.max(rect.width, rect.height) : 30

    // Hide the original star in the card
    if (starIconEl) gsap.set(starIconEl, { opacity: 0 })

    // Create the zoom star — large font, positioned at the card star, scaled down via GSAP
    const zoomStar = document.createElement("div")
    zoomStar.textContent = "★"
    zoomStar.style.cssText = `
      position: fixed;
      left: ${sx}px;
      top: ${sy}px;
      font-size: 250px;
      line-height: 1;
      color: #176B63;
      text-shadow: 0 0 40px rgba(46,230,196,0.3), 0 0 80px rgba(46,230,196,0.1);
      pointer-events: none;
      z-index: 100;
      will-change: transform, opacity;
    `
    // Use GSAP for ALL transforms so scale animation doesn't overwrite centering
    gsap.set(zoomStar, { xPercent: -50, yPercent: -50, scale: starSize / 250 })
    document.body.appendChild(zoomStar)
    state.current.zoomStarEl = zoomStar

    // Create the flash overlay — bright cyan-white burst at peak zoom
    const flash = document.createElement("div")
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle at center, rgba(46,230,196,0.35) 0%, rgba(255,255,255,0.25) 30%, rgba(46,230,196,0.08) 60%, transparent 80%);
      pointer-events: none;
      z-index: 50;
      opacity: 0;
      will-change: opacity;
    `
    document.body.appendChild(flash)
    state.current.flashEl = flash

    const tl = gsap.timeline({
      onComplete: () => {
        zoomStar.remove()
        flash.remove()
        state.current.zoomStarEl = null
        state.current.flashEl = null
      },
    })

    const {
      freezeDuration, zoomStart, zoomDuration, zoomScaleMultiplier,
      starFadeDuration, flashInDuration, flashFadeDuration,
      contentStart, contentDuration
    } = ZOOM_CONFIG

    // Phase 1 — freeze: dim others, highlight last card, fade headers
    tl.to(others, {
      opacity: 0.06,
      scale: 0.9,
      filter: "blur(3px)",
      duration: freezeDuration,
      ease: "power2.out",
    }, 0)

    tl.to(lastCard, {
      scale: 1.08,
      y: -8,
      borderColor: "rgba(46,230,196,0.4)",
      boxShadow: "0 0 40px rgba(46,230,196,0.15), 0 0 80px rgba(46,230,196,0.05)",
      duration: freezeDuration,
      ease: "power3.out",
    }, 0)

    tl.to("[data-timeline-header]", {
      opacity: 0,
      duration: freezeDuration * 0.8,
      ease: "power2.out",
    }, 0)

    // Phase 2 — star zooms to fill the screen
    const scaleToFit = Math.max(window.innerWidth / 250, window.innerHeight / 250) * zoomScaleMultiplier

    tl.to(zoomStar, {
      scale: scaleToFit,
      duration: zoomDuration,
      ease: "power3.inOut",
    }, zoomStart)

    // Phase 3 — flash burst at peak zoom
    const flashStart = zoomStart + zoomDuration - 0.03  // just before star peaks
    tl.to(flash, {
      opacity: 1,
      duration: flashInDuration,
      ease: "power1.in",
    }, flashStart)

    tl.to(flash, {
      opacity: 0,
      duration: flashFadeDuration,
      ease: "power2.out",
    }, flashStart + flashInDuration)

    // Phase 4 — star fades out (starts just after flash peaks)
    const fadeStart = flashStart + flashInDuration + 0.04
    tl.to(zoomStar, {
      opacity: 0,
      duration: starFadeDuration,
      ease: "power2.in",
    }, fadeStart)

    // Phase 5 — reveal completion content
    tl.to(content, {
      opacity: 1,
      y: 0,
      duration: contentDuration,
      ease: "power3.out",
      onStart: () => { if (content) content.style.pointerEvents = "auto" },
    }, contentStart)
  }, [])

  /* ─── SCROLL HANDLER ───────────────────────────────── */

  const onScroll = useCallback((progress: number) => {
    const s = state.current
    const activeIdx = getActiveIndex()

    if (activeIdx !== s.activeIdx) {
      transitionCards(activeIdx, s.activeIdx)
      transitionDots(activeIdx, s.activeIdx)
      s.lastActiveIdx = s.activeIdx
      s.activeIdx = activeIdx
    }

    moveGlow(progress)

    // Celebration trigger when last card is near center with high progress
    if (activeIdx === LAST_IDX && progress > 0.94 && !s.celebrationTriggered) {
      triggerCelebration()
    }
  }, [getActiveIndex, transitionCards, transitionDots, moveGlow, triggerCelebration])

  /* ─── GSAP SETUP ────────────────────────────────────── */

  useEffect(() => {
    const section = sectionRef.current
    const wrapper = wrapperRef.current
    const track = trackRef.current
    const timelineAccent = timelineAccentRef.current

    if (!section || !wrapper || !track) return

    const ctx = gsap.context(() => {
      ScrollTrigger.refresh()

      const getDistance = () => Math.max(0, track.scrollWidth - wrapper.offsetWidth)

      /* ── Symmetric spacers: first card starts centered, last card ends centered ── */
      const vpCenter = window.innerWidth / 2
      const cardHalf = CARD_MIN_W / 2
      const spacerW = Math.max(0, vpCenter - cardHalf - TRACK_PAD)
      if (leftSpacerRef.current) gsap.set(leftSpacerRef.current, { width: spacerW })
      if (rightSpacerRef.current) gsap.set(rightSpacerRef.current, { width: spacerW })

      /* ── Initial states ── */
      cardRefs.current.forEach((card, i) => {
        if (!card) return
        gsap.set(card, i === 0 ? activeCardVars() : inactiveCardVars())
      })

      dotRefs.current.forEach((dot, i) => {
        if (!dot) return
        gsap.set(dot, {
          backgroundColor: i === 0 ? DOT_ACTIVE : DOT_INACTIVE,
          boxShadow: i === 0 ? "0 0 14px rgba(46,230,196,0.6), 0 0 40px rgba(46,230,196,0.2)" : "none",
          scale: i === 0 ? 1.4 : 1,
        })
      })

      cardGlowRefs.current.forEach((glow, i) => {
        if (!glow) return
        gsap.set(glow, { opacity: i === 0 ? 0.8 : 0 })
      })

      connectorRefs.current.forEach((conn, i) => {
        if (!conn) return
        gsap.set(conn, { opacity: i === 0 ? 1 : 0.15 })
      })

      if (iconRefs.current[0]) gsap.set(iconRefs.current[0], { rotate: 8 })

      // Floating icons
      iconRefs.current.forEach((icon) => {
        if (!icon) return
        gsap.to(icon, {
          y: -4,
          duration: 2.5 + Math.random(),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })
      })

      /* ── Horizontal scroll + active tracking ── */
      gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          id: "future-scroll",
          trigger: section,
          start: "top top",
          end: () => `+=${getDistance()}`,
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => { onScroll(self.progress) },
        },
      })

      // Timeline accent line (glowing line) animates width with scroll
      if (timelineAccent) {
        gsap.to(timelineAccent, {
          width: "100%",
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${getDistance()}`,
            scrub: 1,
          },
        })
      }
    }, section)

    return () => {
      // Clean up dynamically-created DOM elements if they still exist
      if (state.current.zoomStarEl) {
        state.current.zoomStarEl.remove()
        state.current.zoomStarEl = null
      }
      if (state.current.flashEl) {
        state.current.flashEl.remove()
        state.current.flashEl = null
      }
      ctx.revert()
    }
  }, [onScroll])

  /* ─── RENDER ────────────────────────────────────────── */

  return (
    <section
      ref={sectionRef}
      id="future"
      className="relative bg-[#F5F7FA] overflow-hidden"
    >
      {/* ── Background glow (parallax layer) ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          ref={glowRef}
          className="absolute left-1/2 top-1/2 -translate-y-1/2 w-[600px] md:w-[800px] h-[400px] md:h-[500px] rounded-full blur-[120px]"
          style={{ marginLeft: "-300px", background: "radial-gradient(ellipse, rgba(139,127,255,0.04) 0%, transparent 60%)" }}
        />
      </div>

      {/* ── Celebration content overlay ── */}
      <div
        ref={celebrationContentRef}
        className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none z-30"
        style={{ transform: "translateY(20px)" }}
      >
        <div className="text-center px-6 max-w-xl">
          <div className="text-[#176B63] text-2xl mb-6">✦</div>
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#176B63] mb-4">
            ✓ Health Journey Complete
          </p>
          <h2 className="display-lg text-[#172033] mb-4">
            Your Health,<br />
            Fully Understood.
          </h2>
          <p className="text-[#4B5870]/70 text-lg mb-10 leading-relaxed">
            The future of personalized healthcare is now active.
          </p>
          <button className="btn-primary text-base px-8 py-4">
            Start Your Health Journey →
          </button>
        </div>
      </div>

      {/* ── Main content wrapper ── */}
      <div
        className="min-h-screen flex flex-col justify-center"
        ref={mainContentRef}
        style={{ paddingTop: 120, paddingBottom: 80 }}
      >
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          data-timeline-header
          className="eyebrow mb-3 text-center"
        >
          THE FUTURE
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          data-timeline-header
          className="display-lg text-center max-w-3xl mx-auto mb-20"
        >
          Your Life, Understood.
        </motion.h2>

        {/* ── Horizontal scroll track ── */}
        <div ref={wrapperRef} className="overflow-hidden w-full">
          <div
            ref={trackRef}
            className="flex items-start relative"
            style={{
              width: "max-content",
              paddingLeft: TRACK_PAD,
              paddingRight: TRACK_PAD,
              gap: CARD_GAP,
            }}
          >
            {/* Timeline base line */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(to right, transparent 2%, rgba(46,230,196,0.10) 15%, rgba(139,127,255,0.10) 85%, transparent 98%)",
              }}
            />

            {/* Timeline accent line (glows, animates width with scroll) */}
            <div
              ref={timelineAccentRef}
              className="absolute top-0 left-0 h-px"
              style={{
                width: "0%",
                background: "linear-gradient(to right, #176B63, #476A91)",
                boxShadow: "0 0 8px rgba(46,230,196,0.3), 0 0 20px rgba(46,230,196,0.1)",
              }}
            />

            {/* Left spacer — pushes first card to viewport center */}
            <div ref={leftSpacerRef} className="shrink-0" />

            {/* Cards */}
            {events.map((ev, i) => {
              const isLast = i === LAST_IDX
              return (
                <div
                  key={ev.year}
                  ref={setCardRef(i)}
                  className="relative shrink-0 group cursor-default"
                  style={{ minWidth: CARD_MIN_W }}
                >
                  {/* ── Per-card glow (behind card) ── */}
                  <div
                    ref={setCardGlowRef(i)}
                    className="absolute -inset-8 rounded-full opacity-0 pointer-events-none"
                    style={{
                      background: isLast
                        ? "radial-gradient(ellipse, rgba(46,230,196,0.08) 0%, transparent 60%)"
                        : "radial-gradient(ellipse, rgba(139,127,255,0.06) 0%, transparent 60%)",
                      filter: "blur(40px)",
                    }}
                  />

                  {/* ── Timeline dot ── */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div
                      ref={setDotRef(i)}
                      className="w-[10px] h-[10px] rounded-full transition-shadow"
                      style={{ backgroundColor: DOT_INACTIVE }}
                    />
                    {/* Vertical connector line from dot to card */}
                    <div
                      ref={setConnectorRef(i)}
                      className="absolute top-[10px] left-1/2 w-px -translate-x-1/2"
                      style={{
                        height: "24px",
                        background: `linear-gradient(to bottom, ${isLast ? "#176B63" : "rgba(0,0,0,0.06)"}, transparent)`,
                        opacity: i === 0 ? 1 : 0.15,
                      }}
                    />
                  </div>

                  {/* ── Card body ── */}
                  <div
                    className="relative rounded-2xl p-7 overflow-hidden backdrop-blur-sm transition-colors"    style={{
      background: "rgba(255,255,255,0.8)",
      border: "1px solid rgba(0,0,0,0.08)",
    }}
                  >
                    {/* Icon */}
                    <div
                      ref={setIconRef(i)}
                      className="text-2xl mb-4"
                    style={{
                      color: isLast ? "#176B63" : "rgba(0,0,0,0.15)",
                      filter: isLast ? "none" : "grayscale(0.4)",
                    }}
                    >
                      {ev.icon}
                    </div>

                    {/* Year */}
                    <div
                      className="data-text text-xs font-bold mb-1.5 tracking-wider"
                      style={{ color: isLast ? "rgba(46,230,196,0.6)" : "rgba(0,0,0,0.25)" }}
                    >
                      {ev.year}
                    </div>

                    {/* Title */}
                    <div className="text-base md:text-lg font-semibold text-[#172033] mb-2 leading-tight">
                      {ev.title}
                    </div>

                    {/* Description */}
                    <div className="text-sm text-[#4B5870]/60 leading-relaxed">
                      {ev.desc}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Right spacer — allows last card to reach viewport center */}
            <div ref={rightSpacerRef} className="shrink-0" />
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1, duration: 0.6 }}
          data-timeline-header
          className="flex items-center justify-center gap-2 mt-12"
        >
          <div className="h-px w-8 bg-gradient-to-r from-transparent            to-black/10" />
          <span          className="text-[10px] text-[#4B5870]/50 tracking-[0.15em] uppercase">
            Scroll to explore the journey
          </span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent            to-black/10" />
        </motion.div>
      </div>
    </section>
  )
}
