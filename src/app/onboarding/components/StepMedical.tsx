"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"

import { medicalHistorySchema } from "@/lib/onboarding-schema"
import { z } from "zod"

/** Form field values type for Medical History step — uses Zod input to match optional form fields. */
type MedicalFormValues = z.input<typeof medicalHistorySchema>
import { useOnboardingStore } from "@/stores/onboarding-store"
import { TagsInput, TextArea, SelectInput } from "./FormField"
import { PREGNANCY_OPTIONS } from "@/lib/onboarding-schema"

const CONDITION_SUGGESTIONS = [
  "High blood pressure",
  "Type 2 diabetes",
  "Asthma",
  "Arthritis",
  "Anxiety",
  "Depression",
  "Thyroid disorder",
  "High cholesterol",
  "GERD",
  "Migraines",
  "Back pain",
  "Allergies",
]

const MEDICATION_SUGGESTIONS = [
  "Metformin",
  "Lisinopril",
  "Atorvastatin",
  "Omeprazole",
  "Levothyroxine",
  "Sertraline",
  "Ibuprofen",
  "Acetaminophen",
  "Aspirin",
  "Vitamin D",
  "Vitamin B12",
  "Iron supplement",
]

const SURGERY_SUGGESTIONS = [
  "Appendectomy",
  "Gallbladder removal",
  "Tonsillectomy",
  "Hernia repair",
  "C-section",
  "Knee replacement",
  "Hip replacement",
  "Wisdom teeth removal",
  "ACL reconstruction",
  "Spinal fusion",
]

interface StepMedicalProps {
  onBack: () => void
  onSubmitAll: () => void
}

export default function StepMedical({ onBack, onSubmitAll }: StepMedicalProps) {
  const savedData = useOnboardingStore((s) => s.medicalHistory)
  const setMedicalHistory = useOnboardingStore((s) => s.setMedicalHistory)
  const isSubmitting = useOnboardingStore((s) => s.isSubmitting)

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<MedicalFormValues>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: savedData,
    mode: "onChange",
  })

  function onSubmit(data: MedicalFormValues) {
    setMedicalHistory(data)
    onSubmitAll()
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Current Health */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Health</h3>
        <Controller
          name="currentConditions"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="currentConditions"
              values={field.value ?? []}
              onChange={field.onChange}
              suggestions={CONDITION_SUGGESTIONS}
            />
          )}
        />
        <Controller
          name="currentMedications"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="currentMedications"
              values={field.value ?? []}
              onChange={field.onChange}
              suggestions={MEDICATION_SUGGESTIONS}
            />
          )}
        />
        <Controller
          name="allergies"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="allergies"
              values={field.value ?? []}
              onChange={field.onChange}
              suggestions={["Penicillin", "Sulfa", "Aspirin", "Ibuprofen", "Latex", "Pollen", "Dust", "Pet dander"]}
            />
          )}
        />
      </div>

      {/* Past Medical History */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Past Medical History</h3>
        <Controller
          name="pastIllnesses"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="pastIllnesses"
              values={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="pastSurgeries"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="pastSurgeries"
              values={field.value ?? []}
              onChange={field.onChange}
              suggestions={SURGERY_SUGGESTIONS}
            />
          )}
        />
      </div>

      {/* Family & Pregnancy */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Family & Pregnancy</h3>
        <Controller
          name="familyHistory"
          control={control}
          render={({ field }) => (
            <TextArea
              name="familyHistory"
              value={field.value ?? ""}
              onChange={field.onChange}
              rows={3}
            />
          )}
        />
        <Controller
          name="pregnancyStatus"
          control={control}
          render={({ field }) => (
            <SelectInput
              name="pregnancyStatus"
              value={field.value ?? ""}
              onChange={field.onChange}
              options={PREGNANCY_OPTIONS}
            />
          )}
        />
      </div>

      {/* Medical Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Privacy note:</strong> Your medical information is encrypted and stored securely.
          It will only be used to personalize your health recommendations.
          You can delete your data at any time from your settings.
        </p>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="h-12 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm
            transition-all duration-200 hover:bg-gray-50 hover:border-gray-300
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="h-12 rounded-xl bg-gradient-to-r from-[#176B63] to-[#2FE6C4] text-white font-semibold
            text-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#176B63]/20
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
            flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            "Complete Setup"
          )}
        </button>
      </div>
    </motion.form>
  )
}
