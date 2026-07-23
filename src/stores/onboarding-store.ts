"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import { type LifestyleData, type NutritionData, type MedicalHistoryData, DEFAULT_ONBOARDING_DATA } from "@/lib/onboarding-schema"

export type OnboardingStep = "lifestyle" | "nutrition" | "medical"

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "lifestyle",
  "nutrition",
  "medical",
]

export const STEP_LABELS: Record<OnboardingStep, string> = {
  lifestyle: "Lifestyle",
  nutrition: "Nutrition",
  medical: "Medical History",
}

export const STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  lifestyle: "Tell us about your daily habits",
  nutrition: "Share your eating preferences",
  medical: "Your health background",
}

interface OnboardingState {
  /** Current step in the wizard flow. */
  currentStep: number
  /** Form data for each step, persisted across sessions. */
  lifestyle: LifestyleData
  nutrition: NutritionData
  medicalHistory: MedicalHistoryData
  /** Whether the full onboarding has been completed. */
  isCompleted: boolean
  /** Whether a submission is in progress. */
  isSubmitting: boolean
  /** Last submission error message. */
  error: string | null

  // ─── Actions ─────────────────────────────────────────────

  /** Update the current step index. */
  setStep: (step: number) => void
  /** Go to the next step. */
  nextStep: () => void
  /** Go to the previous step. */
  prevStep: () => void
  /** Update lifestyle data (partial merge). */
  setLifestyle: (data: Partial<LifestyleData>) => void
  /** Update nutrition data (partial merge). */
  setNutrition: (data: Partial<NutritionData>) => void
  /** Update medical history data (partial merge). */
  setMedicalHistory: (data: Partial<MedicalHistoryData>) => void
  /** Set submission loading state. */
  setSubmitting: (value: boolean) => void
  /** Set error message. */
  setError: (error: string | null) => void
  /** Reset the entire store to defaults. */
  reset: () => void
  /** Mark onboarding as complete. */
  complete: () => void
}

/**
 * Zustand store for the multi-step onboarding wizard.
 *
 * Features:
 * - Persists form data to localStorage so users can safely navigate away
 * - Partial updates per step (merge, not replace)
 * - Tracks current step, submission state, and completion
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // ── Initial State ──
      currentStep: 0,
      ...DEFAULT_ONBOARDING_DATA,
      isCompleted: false,
      isSubmitting: false,
      error: null,

      // ── Actions ──
      setStep: (step) => {
        const clamped = Math.max(0, Math.min(step, ONBOARDING_STEPS.length - 1))
        set({ currentStep: clamped, error: null })
      },

      nextStep: () => {
        const { currentStep } = get()
        const next = Math.min(currentStep + 1, ONBOARDING_STEPS.length - 1)
        set({ currentStep: next, error: null })
      },

      prevStep: () => {
        const { currentStep } = get()
        const prev = Math.max(currentStep - 1, 0)
        set({ currentStep: prev, error: null })
      },

      setLifestyle: (data) => {
        set((state) => ({
          lifestyle: { ...state.lifestyle, ...data },
        }))
      },

      setNutrition: (data) => {
        set((state) => ({
          nutrition: { ...state.nutrition, ...data },
        }))
      },

      setMedicalHistory: (data) => {
        set((state) => ({
          medicalHistory: { ...state.medicalHistory, ...data },
        }))
      },

      setSubmitting: (value) => {
        set({ isSubmitting: value })
      },

      setError: (error) => {
        set({ error })
      },

      reset: () => {
        set({
          currentStep: 0,
          ...DEFAULT_ONBOARDING_DATA,
          isCompleted: false,
          isSubmitting: false,
          error: null,
        })
      },

      complete: () => {
        set({ isCompleted: true, isSubmitting: false })
      },
    }),
    {
      name: "healthos-onboarding",
      // Only persist the form data, not transient UI state
      partialize: (state) => ({
        lifestyle: state.lifestyle,
        nutrition: state.nutrition,
        medicalHistory: state.medicalHistory,
        currentStep: state.currentStep,
        isCompleted: state.isCompleted,
      }),
    }
  )
)
