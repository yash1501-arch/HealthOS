"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

import { useOnboardingStore, ONBOARDING_STEPS } from "@/stores/onboarding-store"
import { onboardingSchema } from "@/lib/onboarding-schema"
import { useToastStore } from "@/stores/toast"

import StepIndicator from "./components/StepIndicator"
import StepLifestyle from "./components/StepLifestyle"
import StepNutrition from "./components/StepNutrition"
import StepMedical from "./components/StepMedical"

/**
 * Onboarding Wizard Page
 *
 * Multi-step form that collects Lifestyle, Nutrition, and Medical History data.
 * Features:
 * - Framer-motion slide transitions between steps
 * - Zustand store for persistent cross-step state
 * - Step indicator with progress bar
 * - Final submission to POST /api/onboarding/complete
 * - Error handling with toast notifications
 */
export default function OnboardingPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)

  const currentStep = useOnboardingStore((s) => s.currentStep)
  const setStep = useOnboardingStore((s) => s.setStep)
  const setSubmitting = useOnboardingStore((s) => s.setSubmitting)
  const setError = useOnboardingStore((s) => s.setError)
  const error = useOnboardingStore((s) => s.error)
  const isSubmitting = useOnboardingStore((s) => s.isSubmitting)
  const { lifestyle, nutrition, medicalHistory } = useOnboardingStore(
    (s) => ({
      lifestyle: s.lifestyle,
      nutrition: s.nutrition,
      medicalHistory: s.medicalHistory,
    })
  )

  const [direction, setDirection] = useState<1 | -1>(1)

  const handleNext = useCallback(() => {
    setDirection(1)
    setStep(currentStep + 1)
  }, [currentStep, setStep])

  const handleBack = useCallback(() => {
    setDirection(-1)
    setStep(currentStep - 1)
  }, [currentStep, setStep])

  const handleComplete = useCallback(async () => {
    setDirection(1)
    setSubmitting(true)
    setError(null)

    try {
      const data = { lifestyle, nutrition, medicalHistory }

      // Validate the full payload before sending
      const parsed = onboardingSchema.safeParse(data)
      if (!parsed.success) {
        throw new Error("Please check all fields and try again.")
      }

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to save your information")
      }

      useOnboardingStore.getState().complete()

      addToast({
        type: "success",
        title: "Welcome to HealthOS!",
        message: "Your profile is set up and ready to go.",
        duration: 5000,
      })

      router.push("/dashboard")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      setError(message)
      addToast({
        type: "error",
        title: "Setup failed",
        message,
        duration: 6000,
      })
    } finally {
      setSubmitting(false)
    }
  }, [lifestyle, nutrition, medicalHistory, setSubmitting, setError, addToast, router])

  const stepComponents = [
    <StepLifestyle key="lifestyle" onNext={handleNext} />,
    <StepNutrition key="nutrition" onBack={handleBack} onNext={handleNext} />,
    <StepMedical key="medical" onBack={handleBack} onSubmitAll={handleComplete} />,
  ]

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F9F8] via-white to-[#F3F0FF]">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#176B63]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[#8B7FFF]/5 blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12 min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#176B63] to-[#2FE6C4] mb-4 shadow-lg shadow-[#176B63]/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {currentStep === 0
              ? "Let's get to know you"
              : currentStep === 1
                ? "Tell us about your eating habits"
                : "A bit about your health"
            }
          </h1>
          <p className="text-sm text-gray-500">
            {currentStep === 0
              ? "This helps us personalize your health plan."
              : currentStep === 1
                ? "So we can create meal plans you'll actually enjoy."
                : "So we can keep your health history in mind."
            }
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3"
            >
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {stepComponents[currentStep]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Your data is encrypted and secure.
            We never share your health information without explicit consent.
          </p>
        </div>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-4 text-[#176B63] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium text-gray-600">Setting up your profile...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
