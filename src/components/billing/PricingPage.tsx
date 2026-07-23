"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api-client"
import { PLANS, type PlanId } from "@/lib/billing/plans"
import { type UsageCheckResult } from "@/lib/billing/usage-tracker"

const ease = [0.16, 1, 0.3, 1] as const

interface PricingPageProps {
  /** The user's current plan ID. */
  currentPlan?: PlanId
  /** Usage data for the current billing period. */
  usage?: {
    aiCalls: UsageCheckResult
    reportUploads: UsageCheckResult
    currentPeriodEnd?: string
  }
}

/**
 * Full pricing page with three plan cards, monthly/annual toggle,
 * feature lists, and a FAQ section.
 */
export function PricingPage({ currentPlan = "FREE", usage }: PricingPageProps) {
  const [interval, setInterval] = useState<"month" | "year">("month")
  const [loading, setLoading] = useState<PlanId | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const handleUpgrade = useCallback(async (plan: PlanId) => {
    if (plan === "FREE") return

    setLoading(plan)
    try {
      const result = await api.post<{ url: string }>("/billing/checkout", {
        plan,
        interval,
      })
      window.location.href = result.url
    } catch (err: unknown) {
      const e = err as { message?: string }
      alert(e.message || "Failed to create checkout session")
    } finally {
      setLoading(null)
    }
  }, [interval])

  const handleManageSubscription = useCallback(async () => {
    if (currentPlan === "FREE") return

    setPortalLoading(true)
    try {
      const result = await api.post<{ url: string }>("/billing/portal")
      window.location.href = result.url
    } catch (err: unknown) {
      const e = err as { message?: string }
      alert(e.message || "Failed to open billing portal")
    } finally {
      setPortalLoading(false)
    }
  }, [currentPlan])

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      {/* ── Header ── */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-[#172033]">
          Choose Your Plan
        </h1>
        <p className="text-sm text-[#4B5870] max-w-md mx-auto">
          Unlock the full potential of HealthOS. Upgrade for advanced AI features,
          unlimited tracking, and priority support.
        </p>
      </div>

      {/* ── Usage Meters (if provided) ── */}
      {usage && (
        <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UsageMeterInline
            label="AI Calls"
            used={usage.aiCalls.used}
            limit={usage.aiCalls.limit}
            resetsAt={usage.currentPeriodEnd}
            upgradeHref="#plans"
          />
          <UsageMeterInline
            label="Report Uploads"
            used={usage.reportUploads.used}
            limit={usage.reportUploads.limit}
            resetsAt={usage.currentPeriodEnd}
            upgradeHref="#plans"
          />
        </div>
      )}

      {/* ── Monthly/Annual Toggle ── */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setInterval("month")}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
            interval === "month"
              ? "bg-[#176B63] text-white"
              : "text-[#4B5870] hover:text-[#172033]"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval("year")}
          className={`relative text-sm font-medium px-4 py-2 rounded-lg transition-all ${
            interval === "year"
              ? "bg-[#176B63] text-white"
              : "text-[#4B5870] hover:text-[#172033]"
          }`}
        >
          Annual
          <span className="absolute -top-2 -right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#2FE6C4] text-white">
            -20%
          </span>
        </button>
      </div>

      {/* ── Plan Cards ── */}
      <div
        id="plans"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {PLANS.map((plan, i) => {
          const isCurrent = plan.id === currentPlan
          const price = interval === "month" ? plan.monthlyPriceCents : plan.yearlyPriceCents

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, ease }}
              className={`relative rounded-2xl border-2 p-6 flex flex-col transition-shadow ${
                isCurrent
                  ? "border-[#176B63] shadow-lg"
                  : plan.id === "PRO"
                    ? "border-[#176B63]/30 shadow-md"
                    : "border-[#E2E8F0] shadow-sm hover:shadow-md"
              }`}
            >
              {/* "Current Plan" badge */}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#176B63] text-white text-[10px] font-semibold">
                  Current Plan
                </div>
              )}

              {/* Plan header */}
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#172033]">{plan.name}</h2>
                <p className="text-xs text-[#4B5870] mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-[#172033]">
                    {price === 0 ? "Free" : `$${(price / 100).toFixed(0)}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-[#4B5870] ml-1">
                      /{interval === "month" ? "mo" : "yr"}
                    </span>
                  )}
                </div>
                {interval === "year" && price > 0 && (
                  <p className="text-[10px] text-[#2FE6C4] font-medium mt-1">
                    Save {plan.yearlySavingsPercent}% vs monthly
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="flex-1 space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <div key={feature.name} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#176B63" strokeWidth="2.5" className="w-4 h-4 mt-0.5 shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#B53A45" strokeWidth="2" className="w-4 h-4 mt-0.5 shrink-0">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                    <div>
                      <span className={`text-xs ${feature.included ? "text-[#172033]" : "text-[#4B5870]/50"}`}>
                        {feature.name}
                      </span>
                      {feature.detail && (
                        <span className="text-[10px] text-[#4B5870]/50 ml-1">({feature.detail})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              {plan.id === "FREE" ? (
                <div className="text-center text-xs text-[#4B5870]/60 py-3">
                  {currentPlan === "FREE" ? "Your current plan" : "Downgrade to Free"}
                </div>
              ) : isCurrent ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full h-11 rounded-xl bg-white border border-[#176B63] text-[#176B63] text-sm font-medium
                    hover:bg-[#176B63]/5 disabled:opacity-40 transition-all"
                >
                  {portalLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#176B63]/30 border-t-[#176B63] rounded-full animate-spin" />
                      Opening...
                    </span>
                  ) : (
                    "Manage Subscription"
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full h-11 rounded-xl text-sm font-medium transition-all ${
                    plan.id === "PRO"
                      ? "bg-[#176B63] text-white hover:bg-[#10554F] shadow-sm"
                      : "bg-[#172033] text-white hover:bg-[#2A3A5C] shadow-sm"
                  } disabled:opacity-40`}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Redirecting...
                    </span>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* ── FAQ Section ── */}
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-xl font-bold text-[#172033] text-center">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group bg-white rounded-xl border border-[#E2E8F0]">
              <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-[#172033] cursor-pointer list-none">
                {item.q}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4 text-[#4B5870]/40 group-open:rotate-180 transition-transform"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="px-4 pb-3.5 text-xs text-[#4B5870] leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────

function UsageMeterInline({
  label,
  used,
  limit,
  resetsAt,
  upgradeHref,
}: {
  label: string
  used: number
  limit: number
  resetsAt?: string
  upgradeHref?: string
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const color = pct >= 90 ? "bg-[#B53A45]" : pct >= 70 ? "bg-[#9B651B]" : "bg-[#176B63]"

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[#4B5870]">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-[#172033]">{used}/{limit}</span>
      </div>
      <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 70 && upgradeHref && (
        <a href={upgradeHref} className="block text-[10px] text-[#176B63] hover:underline mt-1">
          Upgrade for more
        </a>
      )}
    </div>
  )
}

// ─── FAQ Items ──────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, and you'll be charged the prorated difference. Downgrades take effect at the end of your current billing period.",
  },
  {
    q: "What happens when I hit my usage limits?",
    a: "When you reach your daily AI call limit or monthly report upload limit, you'll see a notification in your dashboard. You can either wait for the limit to reset (daily for AI calls, monthly for uploads) or upgrade to a higher tier for increased limits.",
  },
  {
    q: "Is my health data secure on paid plans?",
    a: "Absolutely. All plans include the same enterprise-grade security: AES-256-GCM encryption for sensitive health data, SOC 2 compliance, and GDPR-compliant data handling. Your data is encrypted both in transit and at rest.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes, you can cancel anytime from the billing portal. Your subscription will remain active until the end of the current billing period, after which you'll be downgraded to the Free plan. Your data will be preserved for 30 days.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team within 14 days of your first payment for a full refund.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) through Stripe. Annual plans can also be paid via invoice for clinic customers.",
  },
]
