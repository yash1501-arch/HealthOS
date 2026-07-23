"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"

import { nutritionSchema } from "@/lib/onboarding-schema"
import { z } from "zod"

/** Form field values type for Nutrition step — uses Zod input to match optional form fields. */
type NutritionFormValues = z.input<typeof nutritionSchema>
import { useOnboardingStore } from "@/stores/onboarding-store"
import { SelectInput, NumberInput, TagsInput } from "./FormField"
import { DIET_TYPE_OPTIONS } from "@/lib/onboarding-schema"

const ALLERGY_SUGGESTIONS = [
  "Peanuts",
  "Tree nuts",
  "Dairy",
  "Eggs",
  "Gluten",
  "Soy",
  "Shellfish",
  "Fish",
  "Sesame",
  "Lactose",
]

const RESTRICTION_SUGGESTIONS = [
  "Gluten-free",
  "Dairy-free",
  "Low carb",
  "Low sodium",
  "Sugar-free",
  "Halal",
  "Kosher",
  "Low FODMAP",
]

const FOOD_SUGGESTIONS = [
  "Avocado",
  "Salmon",
  "Blueberries",
  "Dark chocolate",
  "Greek yogurt",
  "Almonds",
  "Quinoa",
  "Sweet potatoes",
  "Spinach",
  "Eggs",
  "Oatmeal",
  "Green tea",
]

interface StepNutritionProps {
  onBack: () => void
  onNext: () => void
}

export default function StepNutrition({ onBack, onNext }: StepNutritionProps) {
  const savedData = useOnboardingStore((s) => s.nutrition)
  const setNutrition = useOnboardingStore((s) => s.setNutrition)

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<NutritionFormValues>({
    resolver: zodResolver(nutritionSchema),
    defaultValues: savedData,
    mode: "onChange",
  })

  function onSubmit(data: NutritionFormValues) {
    setNutrition(data)
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
      {/* Diet Basics */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Diet Basics</h3>
        <Controller
          name="dietType"
          control={control}
          render={({ field }) => (
            <SelectInput
              name="dietType"
              value={field.value ?? ""}
              onChange={field.onChange}
              options={DIET_TYPE_OPTIONS}
            />
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            name="cookingTimeMin"
            control={control}
            render={({ field }) => (
              <NumberInput
                name="cookingTimeMin"
                value={field.value}
                onChange={field.onChange}
                min={0}
                max={1440}
                step={5}
                suffix="min"
              />
            )}
          />
          <Controller
            name="monthlyBudget"
            control={control}
            render={({ field }) => (
              <NumberInput
                name="monthlyBudget"
                value={field.value}
                onChange={field.onChange}
                min={0}
                step={50}
                suffix="$"
              />
            )}
          />
        </div>
      </div>

      {/* Allergies & Restrictions */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Allergies & Restrictions</h3>
        <Controller
          name="foodAllergies"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="foodAllergies"
              values={field.value ?? []}
              onChange={field.onChange}
              suggestions={ALLERGY_SUGGESTIONS}
            />
          )}
        />
        <Controller
          name="dietaryRestrictions"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="dietaryRestrictions"
              values={field.value ?? []}
              onChange={field.onChange}
              suggestions={RESTRICTION_SUGGESTIONS}
            />
          )}
        />
        <Controller
          name="religiousPreferences"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="religiousPreferences"
              values={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Food Preferences */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Food Preferences</h3>
        <Controller
          name="favoriteFoods"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="favoriteFoods"
              values={field.value ?? []}
              onChange={field.onChange}
              suggestions={FOOD_SUGGESTIONS}
            />
          )}
        />
        <Controller
          name="foodsToAvoid"
          control={control}
          render={({ field }) => (
            <TagsInput
              name="foodsToAvoid"
              values={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="h-12 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm
            transition-all duration-200 hover:bg-gray-50 hover:border-gray-300"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className="h-12 rounded-xl bg-gradient-to-r from-[#176B63] to-[#2FE6C4] text-white font-semibold
            text-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#176B63]/20
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          Continue to Medical
        </button>
      </div>
    </motion.form>
  )
}
