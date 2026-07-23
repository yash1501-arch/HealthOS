/**
 * Subscription plan definitions for HealthOS.
 *
 * Defines pricing, feature entitlements, and usage limits for each tier.
 */

export type PlanId = "FREE" | "PRO" | "CLINIC" | "ENTERPRISE"

export interface BillingPlan {
  id: PlanId
  name: string
  description: string
  monthlyPriceCents: number
  yearlyPriceCents: number
  yearlySavingsPercent: number
  aiCallsPerDay: number
  reportUploadsPerMonth: number
  features: PlanFeature[]
  stripePriceIdMonthly?: string
  stripePriceIdYearly?: string
}

export interface PlanFeature {
  name: string
  included: boolean
  detail?: string
}

export const PLANS: BillingPlan[] = [
  {
    id: "FREE",
    name: "Free",
    description: "Get started with basic health tracking and AI insights",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    yearlySavingsPercent: 0,
    aiCallsPerDay: 10,
    reportUploadsPerMonth: 3,
    features: [
      { name: "AI Health Recommendations", included: true, detail: "10 calls/day" },
      { name: "AI Diet Plan Generation", included: true, detail: "Basic plans" },
      { name: "AI Exercise Plan Generation", included: true, detail: "Basic plans" },
      { name: "AI Daily Routine", included: true, detail: "Basic" },
      { name: "Posture Analysis", included: true },
      { name: "Vision Analysis", included: true },
      { name: "Medical Report Uploads", included: true, detail: "3/month" },
      { name: "Report Analysis", included: true, detail: "Basic" },
      { name: "Weekly Check-in", included: false },
      { name: "Health Timeline Query", included: false },
      { name: "Plan Modifications", included: false },
      { name: "Data Export", included: false },
      { name: "Practitioner Dashboard", included: false },
      { name: "Patient Management", included: false },
      { name: "Priority Support", included: false },
      { name: "Custom Branding", included: false },
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    description: "Unlock advanced AI features and unlimited health tracking",
    monthlyPriceCents: 1499,
    yearlyPriceCents: 11999,
    yearlySavingsPercent: 33,
    aiCallsPerDay: 50,
    reportUploadsPerMonth: 20,
    features: [
      { name: "AI Health Recommendations", included: true, detail: "50 calls/day" },
      { name: "AI Diet Plan Generation", included: true, detail: "Advanced + modifications" },
      { name: "AI Exercise Plan Generation", included: true, detail: "Advanced + modifications" },
      { name: "AI Daily Routine", included: true, detail: "Advanced" },
      { name: "Posture Analysis", included: true },
      { name: "Vision Analysis", included: true },
      { name: "Medical Report Uploads", included: true, detail: "20/month" },
      { name: "Report Analysis", included: true, detail: "Enhanced" },
      { name: "Weekly Check-in", included: true },
      { name: "Health Timeline Query", included: true },
      { name: "Plan Modifications", included: true },
      { name: "Data Export", included: true },
      { name: "Practitioner Dashboard", included: false },
      { name: "Patient Management", included: false },
      { name: "Priority Support", included: false },
      { name: "Custom Branding", included: false },
    ],
  },
  {
    id: "CLINIC",
    name: "Clinic",
    description: "For healthcare practitioners and clinics managing multiple patients",
    monthlyPriceCents: 29999,
    yearlyPriceCents: 299999,
    yearlySavingsPercent: 16,
    aiCallsPerDay: 500,
    reportUploadsPerMonth: 200,
    features: [
      { name: "AI Health Recommendations", included: true, detail: "500 calls/day" },
      { name: "AI Diet Plan Generation", included: true, detail: "Unlimited modifications" },
      { name: "AI Exercise Plan Generation", included: true, detail: "Unlimited modifications" },
      { name: "AI Daily Routine", included: true, detail: "Full" },
      { name: "Posture Analysis", included: true },
      { name: "Vision Analysis", included: true },
      { name: "Medical Report Uploads", included: true, detail: "200/month" },
      { name: "Report Analysis", included: true, detail: "Full" },
      { name: "Weekly Check-in", included: true },
      { name: "Health Timeline Query", included: true },
      { name: "Plan Modifications", included: true },
      { name: "Data Export", included: true },
      { name: "Practitioner Dashboard", included: true },
      { name: "Patient Management", included: true },
      { name: "Priority Support", included: true },
      { name: "Custom Branding", included: true },
    ],
  },
]

/**
 * Gets plan configuration by ID.
 */
export function getPlan(planId: PlanId): BillingPlan {
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) throw new Error(`Unknown plan: ${planId}`)
  return plan
}

/**
 * Stripe Price IDs (set via environment variables or Stripe dashboard).
 * Format: price_pro_monthly, price_pro_yearly, price_clinic_monthly, price_clinic_yearly
 */
export function getStripePriceId(planId: PlanId, interval: "month" | "year"): string | undefined {
  const envKey = `STRIPE_PRICE_${planId}_${interval.toUpperCase()}`
  return process.env[envKey] ?? undefined
}
