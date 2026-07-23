"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"

import { lifestyleSchema } from "@/lib/onboarding-schema"
import { z } from "zod"

/** Form field values type for Lifestyle step — uses Zod input to match optional form fields. */
type LifestyleFormValues = z.input<typeof lifestyleSchema>
import { useOnboardingStore } from "@/stores/onboarding-store"
import {
  TextInput,
  NumberInput,
  SelectInput,
} from "./FormField"
import {
  SLEEP_QUALITY_OPTIONS,
  EXERCISE_FREQ_OPTIONS,
  SMOKING_OPTIONS,
  ALCOHOL_OPTIONS,
} from "@/lib/onboarding-schema"

interface StepLifestyleProps {
  onNext: () => void
}

export default function StepLifestyle({ onNext }: StepLifestyleProps) {
  const savedData = useOnboardingStore((s) => s.lifestyle)
  const setLifestyle = useOnboardingStore((s) => s.setLifestyle)

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LifestyleFormValues>({
    resolver: zodResolver(lifestyleSchema),
    defaultValues: savedData,
    mode: "onChange",
  })

  function onSubmit(data: LifestyleFormValues) {
    setLifestyle(data)
    onNext()
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
      {/* Sleep */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sleep & Recovery</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            name="wakeUpTime"
            control={control}
            render={({ field }) => (
              <TextInput
                name="wakeUpTime"
                value={field.value ?? ""}
                onChange={field.onChange}
                type="time"
              />
            )}
          />
          <Controller
            name="bedTime"
            control={control}
            render={({ field }) => (
              <TextInput
                name="bedTime"
                value={field.value ?? ""}
                onChange={field.onChange}
                type="time"
              />
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            name="avgSleepHours"
            control={control}
            render={({ field }) => (
              <NumberInput
                name="avgSleepHours"
                value={field.value}
                onChange={field.onChange}
                min={0}
                max={24}
                step={0.5}
                suffix="hrs"
                error={errors.avgSleepHours?.message}
              />
            )}
          />
          <Controller
            name="sleepQuality"
            control={control}
            render={({ field }) => (
              <SelectInput
                name="sleepQuality"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={SLEEP_QUALITY_OPTIONS}
              />
            )}
          />
        </div>
      </div>

      {/* Daily Activity */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Daily Activity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            name="walkingSteps"
            control={control}
            render={({ field }) => (
              <NumberInput
                name="walkingSteps"
                value={field.value}
                onChange={field.onChange}
                min={0}
                max={200_000}
                step={100}
                suffix="steps"
                error={errors.walkingSteps?.message}
              />
            )}
          />
          <Controller
            name="exerciseFreq"
            control={control}
            render={({ field }) => (
              <SelectInput
                name="exerciseFreq"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={EXERCISE_FREQ_OPTIONS}
              />
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            name="waterIntakeL"
            control={control}
            render={({ field }) => (
              <NumberInput
                name="waterIntakeL"
                value={field.value}
                onChange={field.onChange}
                min={0}
                max={15}
                step={0.5}
                suffix="L"
                error={errors.waterIntakeL?.message}
              />
            )}
          />
          <Controller
            name="sunlightMinutes"
            control={control}
            render={({ field }) => (
              <NumberInput
                name="sunlightMinutes"
                value={field.value}
                onChange={field.onChange}
                min={0}
                max={1440}
                step={5}
                suffix="min"
                error={errors.sunlightMinutes?.message}
              />
            )}
          />
        </div>
        <Controller
          name="screenTimeHours"
          control={control}
          render={({ field }) => (
            <NumberInput
              name="screenTimeHours"
              value={field.value}
              onChange={field.onChange}
              min={0}
              max={24}
              step={0.5}
              suffix="hrs"
              error={errors.screenTimeHours?.message}
            />
          )}
        />
      </div>

      {/* Lifestyle Factors */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Lifestyle Factors</h3>
        <Controller
          name="stressLevel"
          control={control}
          render={({ field }) => (
            <NumberInput
              name="stressLevel"
              value={field.value}
              onChange={field.onChange}
              min={0}
              max={10}
              step={1}
              hint="0 = no stress, 10 = extremely stressed"
              error={errors.stressLevel?.message}
            />
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            name="smoking"
            control={control}
            render={({ field }) => (
              <SelectInput
                name="smoking"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={SMOKING_OPTIONS}
              />
            )}
          />
          <Controller
            name="alcohol"
            control={control}
            render={({ field }) => (
              <SelectInput
                name="alcohol"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={ALCOHOL_OPTIONS}
              />
            )}
          />
        </div>
        <Controller
          name="caffeineIntake"
          control={control}
          render={({ field }) => (
            <NumberInput
              name="caffeineIntake"
              value={field.value}
              onChange={field.onChange}
              min={0}
              max={50}
              step={1}
              suffix="drinks"
              error={errors.caffeineIntake?.message}
            />
          )}
        />
      </div>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={!isValid}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#176B63] to-[#2FE6C4] text-white font-semibold
            text-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#176B63]/20
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          Continue to Nutrition
        </button>
      </div>
    </motion.form>
  )
}
