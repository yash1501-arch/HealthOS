"use client"

import { motion } from "framer-motion"
import {
  ONBOARDING_STEPS,
  STEP_LABELS,
  STEP_DESCRIPTIONS,
  type OnboardingStep,
} from "@/stores/onboarding-store"

interface StepIndicatorProps {
  currentStep: number
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const totalSteps = ONBOARDING_STEPS.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Step counter */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#176B63] tracking-wider uppercase">
          Step {currentStep + 1} of {totalSteps}
        </p>
        <p className="text-xs text-gray-400">
          {Math.round(progress)}% complete
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#176B63] to-[#2FE6C4]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Step labels */}
      <div className="flex items-center justify-between">
        {ONBOARDING_STEPS.map((step: OnboardingStep, index: number) => {
          const isActive = index === currentStep
          const isCompleted = index < currentStep
          const stepNum = index + 1

          return (
            <div key={step} className="flex flex-col items-center flex-1">
              {/* Step circle */}
              <div className="relative mb-2">
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 rounded-full bg-[#176B63] flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                      transition-all duration-300
                      ${isActive
                        ? "bg-[#176B63] text-white shadow-lg shadow-[#176B63]/20"
                        : "bg-gray-100 text-gray-400"
                      }`}
                  >
                    {stepNum}
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs font-medium text-center transition-colors duration-300 hidden sm:block
                  ${isActive ? "text-[#176B63]" : isCompleted ? "text-gray-500" : "text-gray-300"}`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
