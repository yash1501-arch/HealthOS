import { z } from "zod"

// ─── Step 1: Lifestyle ──────────────────────────────────────────

/**
 * Conversational labels & options for the Lifestyle step.
 * Mirrors the Prisma Lifestyle model fields.
 */
export const lifestyleSchema = z.object({
  wakeUpTime: z.string().optional().default(""),
  bedTime: z.string().optional().default(""),
  avgSleepHours: z
    .number()
    .min(0, "Sleep hours can't be negative")
    .max(24, "Sleep hours can't exceed 24")
    .optional()
    .nullable(),
  sleepQuality: z
    .enum(["poor", "fair", "good", "very_good", "excellent", ""])
    .optional()
    .default(""),
  waterIntakeL: z
    .number()
    .min(0, "Water intake can't be negative")
    .max(15, "Water intake seems too high")
    .optional()
    .nullable(),
  sunlightMinutes: z
    .number()
    .min(0, "Sunlight minutes can't be negative")
    .max(1440)
    .optional()
    .nullable(),
  screenTimeHours: z
    .number()
    .min(0, "Screen time can't be negative")
    .max(24, "Screen time can't exceed 24 hours")
    .optional()
    .nullable(),
  walkingSteps: z
    .number()
    .min(0, "Steps can't be negative")
    .max(200_000)
    .optional()
    .nullable(),
  exerciseFreq: z
    .enum(["never", "rarely", "sometimes", "often", "daily", ""])
    .optional()
    .default(""),
  stressLevel: z
    .number()
    .min(0, "Stress level must be 0–10")
    .max(10, "Stress level must be 0–10")
    .optional()
    .nullable(),
  smoking: z
    .enum(["never", "former", "occasional", "regular", ""])
    .optional()
    .default(""),
  alcohol: z
    .enum(["never", "rarely", "occasionally", "regularly", ""])
    .optional()
    .default(""),
  caffeineIntake: z
    .number()
    .min(0, "Caffeine intake can't be negative")
    .max(50)
    .optional()
    .nullable(),
})

export type LifestyleData = z.infer<typeof lifestyleSchema>

// ─── Step 2: Nutrition ──────────────────────────────────────────

export const nutritionSchema = z.object({
  dietType: z
    .enum([
      "omnivore",
      "vegetarian",
      "vegan",
      "pescatarian",
      "keto",
      "paleo",
      "mediterranean",
      "gluten_free",
      "other",
      "",
    ])
    .optional()
    .default(""),
  foodAllergies: z.array(z.string()).optional().default([]),
  dietaryRestrictions: z.array(z.string()).optional().default([]),
  religiousPreferences: z.array(z.string()).optional().default([]),
  cookingTimeMin: z
    .number()
    .min(0)
    .max(1440)
    .optional()
    .nullable(),
  monthlyBudget: z
    .number()
    .min(0)
    .optional()
    .nullable(),
  favoriteFoods: z.array(z.string()).optional().default([]),
  foodsToAvoid: z.array(z.string()).optional().default([]),
})

export type NutritionData = z.infer<typeof nutritionSchema>

// ─── Step 3: Medical History ────────────────────────────────────

export const medicalHistorySchema = z.object({
  currentConditions: z.array(z.string()).optional().default([]),
  pastIllnesses: z.array(z.string()).optional().default([]),
  pastSurgeries: z.array(z.string()).optional().default([]),
  currentMedications: z.array(z.string()).optional().default([]),
  allergies: z.array(z.string()).optional().default([]),
  familyHistory: z
    .string()
    .max(2000, "Family history is too long")
    .optional()
    .default(""),
  pregnancyStatus: z
    .enum(["not_pregnant", "pregnant", "trying", "breastfeeding", "prefer_not_to_say", ""])
    .optional()
    .default(""),
})

export type MedicalHistoryData = z.infer<typeof medicalHistorySchema>

// ─── Aggregated Onboarding Schema ───────────────────────────────

export const onboardingSchema = z.object({
  lifestyle: lifestyleSchema,
  nutrition: nutritionSchema,
  medicalHistory: medicalHistorySchema,
})

export type OnboardingData = z.infer<typeof onboardingSchema>

// ─── Default Values ─────────────────────────────────────────────

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  lifestyle: {
    wakeUpTime: "",
    bedTime: "",
    avgSleepHours: null,
    sleepQuality: "",
    waterIntakeL: null,
    sunlightMinutes: null,
    screenTimeHours: null,
    walkingSteps: null,
    exerciseFreq: "",
    stressLevel: null,
    smoking: "",
    alcohol: "",
    caffeineIntake: null,
  },
  nutrition: {
    dietType: "",
    foodAllergies: [],
    dietaryRestrictions: [],
    religiousPreferences: [],
    cookingTimeMin: null,
    monthlyBudget: null,
    favoriteFoods: [],
    foodsToAvoid: [],
  },
  medicalHistory: {
    currentConditions: [],
    pastIllnesses: [],
    pastSurgeries: [],
    currentMedications: [],
    allergies: [],
    familyHistory: "",
    pregnancyStatus: "",
  },
}

// ─── Conversational Labels for Form Fields ─────────────────────

export const FIELD_LABELS: Record<string, string> = {
  wakeUpTime: "What time do you usually wake up?",
  bedTime: "What time do you usually go to bed?",
  avgSleepHours: "How many hours do you typically sleep?",
  sleepQuality: "How would you describe your sleep quality?",
  waterIntakeL: "How much water do you drink daily? (in liters)",
  sunlightMinutes: "How many minutes of sunlight do you get daily?",
  screenTimeHours: "How many hours do you spend on screens daily?",
  walkingSteps: "How many steps do you walk daily?",
  exerciseFreq: "How often do you exercise?",
  stressLevel: "How would you rate your stress level? (0–10)",
  smoking: "What's your smoking status?",
  alcohol: "How often do you drink alcohol?",
  caffeineIntake: "How many caffeinated drinks do you have daily?",
  dietType: "What best describes your diet?",
  foodAllergies: "Do you have any food allergies?",
  dietaryRestrictions: "Do you have any dietary restrictions?",
  religiousPreferences: "Do you have any religious dietary preferences?",
  cookingTimeMin: "How much time do you spend cooking daily? (minutes)",
  monthlyBudget: "What's your monthly budget for food? ($)",
  favoriteFoods: "What are some of your favorite foods?",
  foodsToAvoid: "Are there any foods you avoid?",
  currentConditions: "Do you have any current medical conditions?",
  pastIllnesses: "Have you had any significant past illnesses?",
  pastSurgeries: "Have you undergone any surgeries?",
  currentMedications: "Are you currently taking any medications?",
  allergies: "Do you have any allergies? (medications, environmental, etc.)",
  familyHistory: "Is there any relevant family medical history?",
  pregnancyStatus: "What's your current pregnancy status?",
}

export const FIELD_PLACEHOLDERS: Record<string, string> = {
  wakeUpTime: "e.g., 6:30 AM",
  bedTime: "e.g., 10:00 PM",
  avgSleepHours: "e.g., 7.5",
  waterIntakeL: "e.g., 2",
  sunlightMinutes: "e.g., 30",
  screenTimeHours: "e.g., 4",
  walkingSteps: "e.g., 8000",
  stressLevel: "e.g., 5",
  caffeineIntake: "e.g., 2",
  cookingTimeMin: "e.g., 30",
  monthlyBudget: "e.g., 400",
  familyHistory: "Describe any relevant family medical history...",
}

// ─── Select Options ─────────────────────────────────────────────

export const SLEEP_QUALITY_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "poor", label: "Poor — I rarely feel rested" },
  { value: "fair", label: "Fair — I could sleep better" },
  { value: "good", label: "Good — I usually feel rested" },
  { value: "very_good", label: "Very good — I sleep well most nights" },
  { value: "excellent", label: "Excellent — I wake up refreshed daily" },
]

export const EXERCISE_FREQ_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "never", label: "Never — I don't exercise" },
  { value: "rarely", label: "Rarely — Once or twice a month" },
  { value: "sometimes", label: "Sometimes — Once or twice a week" },
  { value: "often", label: "Often — 3–5 times a week" },
  { value: "daily", label: "Daily — I exercise every day" },
]

export const SMOKING_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "never", label: "Never smoked" },
  { value: "former", label: "Former smoker — I quit" },
  { value: "occasional", label: "Occasional — Socially only" },
  { value: "regular", label: "Regular smoker" },
]

export const ALCOHOL_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "never", label: "Never — I don't drink" },
  { value: "rarely", label: "Rarely — A few times a year" },
  { value: "occasionally", label: "Occasionally — A few times a month" },
  { value: "regularly", label: "Regularly — Weekly or more" },
]

export const DIET_TYPE_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "omnivore", label: "Omnivore — I eat everything" },
  { value: "vegetarian", label: "Vegetarian — No meat, but dairy & eggs ok" },
  { value: "vegan", label: "Vegan — No animal products" },
  { value: "pescatarian", label: "Pescatarian — Fish & plant-based" },
  { value: "keto", label: "Keto — Low carb, high fat" },
  { value: "paleo", label: "Paleo — Whole foods, no grains" },
  { value: "mediterranean", label: "Mediterranean — Olive oil, fish, greens" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "other", label: "Other" },
]

export const PREGNANCY_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "not_pregnant", label: "Not pregnant" },
  { value: "pregnant", label: "Currently pregnant" },
  { value: "trying", label: "Trying to conceive" },
  { value: "breastfeeding", label: "Currently breastfeeding" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
]
