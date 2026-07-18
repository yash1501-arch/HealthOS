"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import DatePicker from "@/components/ui/date-picker"

// ─── Helpers ────────────────────────────────────────────────────

function calculateAge(dob: string): number | null {
  if (!dob) return null
  const [y, m, d] = dob.split("-").map(Number)
  if (!y || !m || !d) return null
  const birth = new Date(y, m - 1, d)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// ─── Types ─────────────────────────────────────────────────────

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7

type ProfileData = {
  fullName: string
  dateOfBirth: string
  biologicalSex: "" | "male" | "female" | "other"
  heightCm: string
  weightKg: string
  waistCm: string
  bloodGroup: string
}

type OccupationData = {
  jobTitle: string
  industry: string
  workingHours: string
  shiftSchedule: string
  workType: string
  sittingHours: string
  standingHours: string
  drivingHours: string
}

type LifestyleData = {
  wakeUpTime: string
  bedTime: string
  avgSleepHours: string
  sleepQuality: string
  waterIntakeL: string
  sunlightMinutes: string
  screenTimeHours: string
  walkingSteps: string
  exerciseFreq: string
  stressLevel: string
  smoking: string
  alcohol: string
  caffeineIntake: string
}

type NutritionData = {
  dietType: string
  foodAllergies: string[]
  dietaryRestrictions: string[]
  religiousPreferences: string[]
  cookingTimeMin: string
  monthlyBudget: string
  favoriteFoods: string[]
  foodsToAvoid: string[]
}

type PainAssessmentData = {
  bodyArea: string
  severity: number
  duration: string
  frequency: string
  painType: string
  triggeringActivities: string[]
  relievingFactors: string[]
  morningStiffness: boolean
  mobilityLimitation: string
}

type MedicalHistoryData = {
  currentConditions: string[]
  pastIllnesses: string[]
  pastSurgeries: string[]
  currentMedications: string[]
  allergies: string[]
  familyHistory: string
  pregnancyStatus: string
}

type GoalData = {
  goal: string
  priority: number
}

type AssessmentFormData = {
  profile: ProfileData
  occupation: OccupationData
  lifestyle: LifestyleData
  nutrition: NutritionData
  medicalHistory: MedicalHistoryData
  painAssessments: PainAssessmentData[]
  goals: GoalData[]
}

// ─── Constants ─────────────────────────────────────────────────

const DRAFT_KEY = "healthos-assessment-draft"

const BODY_AREAS = [
  { id: "neck", label: "Neck", emoji: "🧣" },
  { id: "back", label: "Back", emoji: "🔙" },
  { id: "knee", label: "Knee", emoji: "🦵" },
  { id: "shoulder", label: "Shoulder", emoji: "💪" },
  { id: "hip", label: "Hip", emoji: "🦴" },
  { id: "foot", label: "Foot", emoji: "🦶" },
  { id: "wrist", label: "Wrist", emoji: "🤚" },
  { id: "elbow", label: "Elbow", emoji: "🔃" },
]

const PREDEFINED_GOALS = [
  { id: "reduce_pain", label: "Reduce pain", icon: "💊" },
  { id: "improve_posture", label: "Improve posture", icon: "🧘" },
  { id: "lose_weight", label: "Lose weight", icon: "⚖️" },
  { id: "build_strength", label: "Build strength", icon: "🏋️" },
  { id: "better_sleep", label: "Better sleep", icon: "😴" },
  { id: "reduce_stress", label: "Reduce stress", icon: "🧠" },
  { id: "eat_healthier", label: "Eat healthier", icon: "🥗" },
  { id: "increase_energy", label: "Increase energy", icon: "⚡" },
  { id: "improve_flexibility", label: "Improve flexibility", icon: "🤸" },
  { id: "walk_more", label: "Walk more daily", icon: "🚶" },
  { id: "better_work_ergonomics", label: "Better ergonomics", icon: "💻" },
  { id: "build_routine", label: "Build a daily routine", icon: "📋" },
]

const DIET_TYPES = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "non-vegetarian", label: "Non-Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
]

const SLEEP_QUALITIES = [
  { value: "excellent", label: "Excellent — wake up refreshed" },
  { value: "good", label: "Good — generally rested" },
  { value: "fair", label: "Fair — often wake up tired" },
  { value: "poor", label: "Poor — rarely feel rested" },
]

const EXERCISE_FREQ = [
  { value: "daily", label: "Daily" },
  { value: "4-6 times/week", label: "4-6 times a week" },
  { value: "2-3 times/week", label: "2-3 times a week" },
  { value: "once/week", label: "Once a week" },
  { value: "rarely", label: "Rarely" },
  { value: "never", label: "Never" },
]

const SMOKING_OPTIONS = [
  { value: "never", label: "Never smoked" },
  { value: "occasionally", label: "Occasionally (social)" },
  { value: "regularly", label: "Regularly" },
  { value: "quit", label: "Quit smoking" },
]

const ALCOHOL_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "occasionally", label: "Occasionally (1-2/week)" },
  { value: "moderately", label: "Moderately (3-5/week)" },
  { value: "frequently", label: "Frequently (daily)" },
  { value: "quit", label: "Quit drinking" },
]

// ─── Initial State ─────────────────────────────────────────────

const emptyProfile: ProfileData = {
  fullName: "", dateOfBirth: "", biologicalSex: "",
  heightCm: "", weightKg: "", waistCm: "", bloodGroup: "",
}

const emptyOccupation: OccupationData = {
  jobTitle: "", industry: "", workingHours: "", shiftSchedule: "",
  workType: "", sittingHours: "", standingHours: "", drivingHours: "",
}

const emptyLifestyle: LifestyleData = {
  wakeUpTime: "", bedTime: "", avgSleepHours: "", sleepQuality: "",
  waterIntakeL: "", sunlightMinutes: "", screenTimeHours: "",
  walkingSteps: "", exerciseFreq: "", stressLevel: "",
  smoking: "", alcohol: "", caffeineIntake: "",
}

const emptyNutrition: NutritionData = {
  dietType: "", foodAllergies: [], dietaryRestrictions: [],
  religiousPreferences: [], cookingTimeMin: "", monthlyBudget: "",
  favoriteFoods: [], foodsToAvoid: [],
}

const emptyMedicalHistory: MedicalHistoryData = {
  currentConditions: [], pastIllnesses: [], pastSurgeries: [],
  currentMedications: [], allergies: [], familyHistory: "", pregnancyStatus: "",
}

const emptyForm: AssessmentFormData = {
  profile: emptyProfile,
  occupation: emptyOccupation,
  lifestyle: emptyLifestyle,
  nutrition: emptyNutrition,
  medicalHistory: emptyMedicalHistory,
  painAssessments: [],
  goals: [],
}

const STEPS = [
  { id: 1, label: "Personal Info", emoji: "👤" },
  { id: 2, label: "Occupation", emoji: "💼" },
  { id: 3, label: "Lifestyle", emoji: "🌅" },
  { id: 4, label: "Nutrition", emoji: "🥗" },
  { id: 5, label: "Medical History", emoji: "🏥" },
  { id: 6, label: "Pain Assessment", emoji: "🤕" },
  { id: 7, label: "Goals", emoji: "🎯" },
] as const

// ─── Reusable UI Components ────────────────────────────────────

function Input({ label, type = "text", value, onChange, placeholder, min, max, step, required = false, className = "" }: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: number
  max?: number
  step?: number
  required?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required={required}
        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm
          focus:outline-none focus:ring-2 focus:ring-[#0F6CBF]/20 focus:border-[#0F6CBF]
          transition-all duration-200"
      />
    </div>
  )
}

function Select({ label, value, onChange, options, required = false, placeholder = "Select..." }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white
          focus:outline-none focus:ring-2 focus:ring-[#0F6CBF]/20 focus:border-[#0F6CBF]
          transition-all duration-200 appearance-none
          bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-10"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function Slider({ label, value, onChange, min = 0, max = 10, showValue = true, unit = "" }: {
  label: string
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
  showValue?: boolean
  unit?: string
}) {
  const numValue = parseFloat(value) || 0
  const percentage = ((numValue - min) / (max - min)) * 100

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {showValue && (
          <span className="text-sm font-semibold text-[#0F6CBF]">
            {numValue}{unit}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value || min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
          accent-[#0F6CBF] [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:bg-[#0F6CBF] [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
        style={{
          background: `linear-gradient(to right, #0F6CBF 0%, #0F6CBF ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function TagInput({ label, tags, onChange, placeholder = "Type and press Enter" }: {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState("")

  function addTag() {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
      setInput("")
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E8F2FB] text-[#0F6CBF] text-xs font-medium rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-red-500 transition-colors"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
          placeholder={placeholder}
          className="flex-1 h-10 px-3 rounded-lg border border-gray-300 text-sm
            focus:outline-none focus:ring-2 focus:ring-[#0F6CBF]/20 focus:border-[#0F6CBF]"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!input.trim()}
          className="px-3 h-10 bg-gray-100 text-gray-600 text-sm rounded-lg
            hover:bg-gray-200 disabled:opacity-40 transition-colors font-medium"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ─── Step Components ───────────────────────────────────────────

function Step1PersonalInfo({ data, onChange }: {
  data: ProfileData
  onChange: (d: ProfileData) => void
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
        <p className="text-sm text-gray-500 mt-1">Let's start with the basics about you</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Full Name" value={data.fullName} onChange={(v) => onChange({ ...data, fullName: v })} placeholder="John Doe" required />
        <DatePicker label="Date of Birth" value={data.dateOfBirth} onChange={(v) => onChange({ ...data, dateOfBirth: v })} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Age
          </label>
          <div className={`w-full h-10 px-3 rounded-lg border text-sm flex items-center gap-2 transition-all duration-200
            ${data.dateOfBirth
              ? "border-[#0F6CBF]/30 bg-[#F0F7FF] text-[#0F6CBF] font-semibold"
              : "border-gray-200 bg-gray-50 text-gray-400"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {data.dateOfBirth ? (() => {
                const age = calculateAge(data.dateOfBirth)
                return age !== null ? `${age} years` : "—"
              })() : "—"}
            </span>
          </div>
        </div>
      </div>

      <Select
        label="Biological Sex"
        value={data.biologicalSex}
        onChange={(v) => onChange({ ...data, biologicalSex: v as ProfileData["biologicalSex"] })}
        options={[
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
          { value: "other", label: "Other" },
        ]}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Height (cm)" type="number" value={data.heightCm} onChange={(v) => onChange({ ...data, heightCm: v })} placeholder="175" min={50} max={300} />
        <Input label="Weight (kg)" type="number" value={data.weightKg} onChange={(v) => onChange({ ...data, weightKg: v })} placeholder="72" min={10} max={500} />
        <Input label="Waist (cm)" type="number" value={data.waistCm} onChange={(v) => onChange({ ...data, waistCm: v })} placeholder="88" min={30} max={200} />
      </div>

      <Select
        label="Blood Group"
        value={data.bloodGroup}
        onChange={(v) => onChange({ ...data, bloodGroup: v })}
        options={[
          { value: "A+", label: "A+" }, { value: "A-", label: "A-" },
          { value: "B+", label: "B+" }, { value: "B-", label: "B-" },
          { value: "AB+", label: "AB+" }, { value: "AB-", label: "AB-" },
          { value: "O+", label: "O+" }, { value: "O-", label: "O-" },
        ]}
        placeholder="Select blood group"
      />
    </div>
  )
}

function Step2Occupation({ data, onChange }: {
  data: OccupationData
  onChange: (d: OccupationData) => void
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Occupation</h2>
        <p className="text-sm text-gray-500 mt-1">Your work routine helps us personalize recommendations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Job Title" value={data.jobTitle} onChange={(v) => onChange({ ...data, jobTitle: v })} placeholder="Software Engineer" />
        <Input label="Industry" value={data.industry} onChange={(v) => onChange({ ...data, industry: v })} placeholder="Technology" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Weekly Working Hours" type="number" value={data.workingHours} onChange={(v) => onChange({ ...data, workingHours: v })} placeholder="40" min={0} max={168} />
        <Select
          label="Shift Schedule"
          value={data.shiftSchedule}
          onChange={(v) => onChange({ ...data, shiftSchedule: v })}
          options={[
            { value: "day", label: "Day shift" },
            { value: "night", label: "Night shift" },
            { value: "rotating", label: "Rotating shifts" },
            { value: "flexible", label: "Flexible schedule" },
          ]}
          placeholder="Select schedule"
        />
      </div>

      <Select
        label="Work Type"
        value={data.workType}
        onChange={(v) => onChange({ ...data, workType: v })}
        options={[
          { value: "remote", label: "Remote (work from home)" },
          { value: "office", label: "Office" },
          { value: "hybrid", label: "Hybrid" },
          { value: "field", label: "Field work" },
          { value: "labor", label: "Physical labor" },
        ]}
        placeholder="Select work type"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Sitting (hrs/day)" type="number" value={data.sittingHours} onChange={(v) => onChange({ ...data, sittingHours: v })} placeholder="8" min={0} max={24} />
        <Input label="Standing (hrs/day)" type="number" value={data.standingHours} onChange={(v) => onChange({ ...data, standingHours: v })} placeholder="2" min={0} max={24} />
        <Input label="Driving (hrs/day)" type="number" value={data.drivingHours} onChange={(v) => onChange({ ...data, drivingHours: v })} placeholder="1" min={0} max={24} />
      </div>
    </div>
  )
}

function Step3Lifestyle({ data, onChange }: {
  data: LifestyleData
  onChange: (d: LifestyleData) => void
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Lifestyle</h2>
        <p className="text-sm text-gray-500 mt-1">Daily habits that affect your health</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Wake-up Time" type="time" value={data.wakeUpTime} onChange={(v) => onChange({ ...data, wakeUpTime: v })} />
        <Input label="Bed Time" type="time" value={data.bedTime} onChange={(v) => onChange({ ...data, bedTime: v })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Avg. Sleep (hours)" type="number" value={data.avgSleepHours} onChange={(v) => onChange({ ...data, avgSleepHours: v })} placeholder="7" min={0} max={24} step={0.5} />
        <Select label="Sleep Quality" value={data.sleepQuality} onChange={(v) => onChange({ ...data, sleepQuality: v })} options={SLEEP_QUALITIES} placeholder="How well do you sleep?" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Water (L/day)" type="number" value={data.waterIntakeL} onChange={(v) => onChange({ ...data, waterIntakeL: v })} placeholder="2" min={0} max={20} step={0.1} />
        <Input label="Sunlight (min/day)" type="number" value={data.sunlightMinutes} onChange={(v) => onChange({ ...data, sunlightMinutes: v })} placeholder="20" min={0} />
        <Input label="Screen Time (hrs/day)" type="number" value={data.screenTimeHours} onChange={(v) => onChange({ ...data, screenTimeHours: v })} placeholder="6" min={0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Daily Steps" type="number" value={data.walkingSteps} onChange={(v) => onChange({ ...data, walkingSteps: v })} placeholder="8000" min={0} />
        <Select label="Exercise Frequency" value={data.exerciseFreq} onChange={(v) => onChange({ ...data, exerciseFreq: v })} options={EXERCISE_FREQ} placeholder="How often do you exercise?" />
      </div>

      <Slider label="Stress Level" value={data.stressLevel} onChange={(v) => onChange({ ...data, stressLevel: v })} unit="/10" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select label="Smoking" value={data.smoking} onChange={(v) => onChange({ ...data, smoking: v })} options={SMOKING_OPTIONS} placeholder="Select" />
        <Select label="Alcohol" value={data.alcohol} onChange={(v) => onChange({ ...data, alcohol: v })} options={ALCOHOL_OPTIONS} placeholder="Select" />
        <Input label="Caffeine (cups/day)" type="number" value={data.caffeineIntake} onChange={(v) => onChange({ ...data, caffeineIntake: v })} placeholder="2" min={0} />
      </div>
    </div>
  )
}

function Step4Nutrition({ data, onChange }: {
  data: NutritionData
  onChange: (d: NutritionData) => void
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Nutrition</h2>
        <p className="text-sm text-gray-500 mt-1">Your eating habits help create personalized meal plans</p>
      </div>

      <Select label="Diet Type" value={data.dietType} onChange={(v) => onChange({ ...data, dietType: v })} options={DIET_TYPES} required placeholder="Select your diet" />

      <TagInput label="Food Allergies" tags={data.foodAllergies} onChange={(tags) => onChange({ ...data, foodAllergies: tags })} placeholder="e.g. peanuts, shellfish" />
      <TagInput label="Foods You Love" tags={data.favoriteFoods} onChange={(tags) => onChange({ ...data, favoriteFoods: tags })} placeholder="e.g. grilled chicken, salads" />
      <TagInput label="Foods to Avoid" tags={data.foodsToAvoid} onChange={(tags) => onChange({ ...data, foodsToAvoid: tags })} placeholder="e.g. fried food, soda" />
      <TagInput label="Dietary Restrictions" tags={data.dietaryRestrictions} onChange={(tags) => onChange({ ...data, dietaryRestrictions: tags })} placeholder="e.g. gluten-free, low-carb" />
      <TagInput label="Religious Preferences" tags={data.religiousPreferences} onChange={(tags) => onChange({ ...data, religiousPreferences: tags })} placeholder="e.g. halal, kosher" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Cooking Time (min/day)" type="number" value={data.cookingTimeMin} onChange={(v) => onChange({ ...data, cookingTimeMin: v })} placeholder="30" min={0} />
        <Input label="Monthly Food Budget" type="number" value={data.monthlyBudget} onChange={(v) => onChange({ ...data, monthlyBudget: v })} placeholder="5000" min={0} />
      </div>
    </div>
  )
}

function Step5MedicalHistory({ data, onChange }: {
  data: MedicalHistoryData
  onChange: (d: MedicalHistoryData) => void
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Medical History</h2>
        <p className="text-sm text-gray-500 mt-1">This helps us recommend safe, personalized plans</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
        ⚕️ This information is used only for personalization. We are not a diagnostic tool — always consult a doctor.
      </div>

      <TagInput label="Current Conditions" tags={data.currentConditions} onChange={(tags) => onChange({ ...data, currentConditions: tags })} placeholder="e.g. lower back pain, diabetes" />
      <TagInput label="Past Illnesses" tags={data.pastIllnesses} onChange={(tags) => onChange({ ...data, pastIllnesses: tags })} placeholder="e.g. typhoid, dengue" />
      <TagInput label="Past Surgeries" tags={data.pastSurgeries} onChange={(tags) => onChange({ ...data, pastSurgeries: tags })} placeholder="e.g. ACL repair, appendix" />
      <TagInput label="Current Medications" tags={data.currentMedications} onChange={(tags) => onChange({ ...data, currentMedications: tags })} placeholder="e.g. vitamin D 1000 IU" />
      <TagInput label="Allergies" tags={data.allergies} onChange={(tags) => onChange({ ...data, allergies: tags })} placeholder="e.g. peanuts, pollen" />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Family History</label>
        <textarea
          value={data.familyHistory}
          onChange={(e) => onChange({ ...data, familyHistory: e.target.value })}
          placeholder="e.g. Father: Diabetes, Mother: Hypertension"
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm
            focus:outline-none focus:ring-2 focus:ring-[#0F6CBF]/20 focus:border-[#0F6CBF] resize-none"
        />
      </div>

      <Select
        label="Pregnancy Status"
        value={data.pregnancyStatus}
        onChange={(v) => onChange({ ...data, pregnancyStatus: v })}
        options={[
          { value: "not_pregnant", label: "Not pregnant" },
          { value: "pregnant", label: "Currently pregnant" },
          { value: "trying", label: "Trying to conceive" },
          { value: "nursing", label: "Nursing / Lactating" },
          { value: "prefer_not_to_say", label: "Prefer not to say" },
        ]}
        placeholder="Select (if applicable)"
      />
    </div>
  )
}

function Step6PainAssessment({ assessments, onChange }: {
  assessments: PainAssessmentData[]
  onChange: (d: PainAssessmentData[]) => void
}) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null)

  const currentAssessment = assessments.find((a) => a.bodyArea === selectedArea) ?? {
    bodyArea: selectedArea ?? "",
    severity: 5,
    duration: "",
    frequency: "",
    painType: "",
    triggeringActivities: [],
    relievingFactors: [],
    morningStiffness: false,
    mobilityLimitation: "",
  }

  function selectArea(areaId: string) {
    setSelectedArea(areaId)
    if (!assessments.find((a) => a.bodyArea === areaId)) {
      onChange([...assessments, { ...currentAssessment, bodyArea: areaId }])
    }
  }

  function updateCurrentAssessment(update: Partial<PainAssessmentData>) {
    onChange(
      assessments.map((a) => (a.bodyArea === selectedArea ? { ...a, ...update } : a))
    )
  }

  function removeArea(areaId: string) {
    onChange(assessments.filter((a) => a.bodyArea !== areaId))
    if (selectedArea === areaId) setSelectedArea(null)
  }

  const selectedAreas = assessments.map((a) => a.bodyArea)

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pain Assessment</h2>
        <p className="text-sm text-gray-500 mt-1">Select areas where you experience pain or discomfort</p>
      </div>

      {/* Body area selector */}
      <div className="grid grid-cols-4 gap-3">
        {BODY_AREAS.map((area) => {
          const isSelected = selectedAreas.includes(area.id)
          const isActive = selectedArea === area.id
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => selectArea(area.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-[#0F6CBF] text-white shadow-md scale-105"
                  : isSelected
                    ? "bg-[#E8F2FB] text-[#0F6CBF] border border-[#0F6CBF]/30"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                }`}
            >
              <span className="text-lg">{area.emoji}</span>
              <span>{area.label}</span>
              {isSelected && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeArea(area.id) }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </button>
          )
        })}
      </div>

      {selectedAreas.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Click a body area above to start assessing your pain
        </div>
      )}

      {/* Pain details for selected area */}
      {selectedArea && (
        <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900">
            {BODY_AREAS.find((a) => a.id === selectedArea)?.label} Pain Details
          </h3>

          <Slider label="Pain Severity" value={String(currentAssessment.severity)} onChange={(v) => updateCurrentAssessment({ severity: parseInt(v) || 0 })} min={0} max={10} unit="/10" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Duration" value={currentAssessment.duration} onChange={(v) => updateCurrentAssessment({ duration: v })} options={[
              { value: "days", label: "Days" },
              { value: "weeks", label: "Weeks" },
              { value: "months", label: "Months" },
              { value: "years", label: "Years" },
              { value: "just_started", label: "Just started" },
            ]} placeholder="How long?" />
            <Select label="Frequency" value={currentAssessment.frequency} onChange={(v) => updateCurrentAssessment({ frequency: v })} options={[
              { value: "constant", label: "Constant / Always" },
              { value: "daily", label: "Daily" },
              { value: "few_times_week", label: "Few times a week" },
              { value: "few_times_month", label: "Few times a month" },
              { value: "occasionally", label: "Occasionally" },
            ]} placeholder="How often?" />
          </div>

          <Select label="Pain Type" value={currentAssessment.painType} onChange={(v) => updateCurrentAssessment({ painType: v })} options={[
            { value: "dull_ache", label: "Dull ache" },
            { value: "sharp", label: "Sharp / stabbing" },
            { value: "burning", label: "Burning sensation" },
            { value: "throbbing", label: "Throbbing / pulsating" },
            { value: "tingling", label: "Tingling / numbness" },
            { value: "stiffness", label: "Stiffness / tightness" },
          ]} placeholder="Type of pain" />

          <TagInput label="Triggering Activities" tags={currentAssessment.triggeringActivities} onChange={(tags) => updateCurrentAssessment({ triggeringActivities: tags })} placeholder="e.g. sitting long, bending" />
          <TagInput label="Relieving Factors" tags={currentAssessment.relievingFactors} onChange={(tags) => updateCurrentAssessment({ relievingFactors: tags })} placeholder="e.g. stretching, walking" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-[#0F6CBF]/30 transition-colors">
              <input
                type="checkbox"
                checked={currentAssessment.morningStiffness}
                onChange={(e) => updateCurrentAssessment({ morningStiffness: e.target.checked })}
                className="w-4 h-4 text-[#0F6CBF] rounded"
              />
              <div>
                <div className="text-sm font-medium text-gray-700">Morning Stiffness</div>
                <div className="text-xs text-gray-400">Pain or stiffness when waking up</div>
              </div>
            </label>
            <Select label="Mobility Limitation" value={currentAssessment.mobilityLimitation} onChange={(v) => updateCurrentAssessment({ mobilityLimitation: v })} options={[
              { value: "none", label: "No limitation" },
              { value: "mild", label: "Mild — can do most activities" },
              { value: "moderate", label: "Moderate — some activities limited" },
              { value: "severe", label: "Severe — many activities limited" },
            ]} placeholder="Select" />
          </div>
        </div>
      )}
    </div>
  )
}

function Step7Goals({ data, onChange }: {
  data: GoalData[]
  onChange: (d: GoalData[]) => void
}) {
  const [customGoal, setCustomGoal] = useState("")

  const selectedGoalIds = data.map((g) => g.goal)

  function toggleGoal(goalId: string) {
    if (selectedGoalIds.includes(goalId)) {
      onChange(data.filter((g) => g.goal !== goalId))
    } else {
      onChange([...data, { goal: goalId, priority: data.length + 1 }])
    }
  }

  function addCustomGoal() {
    const trimmed = customGoal.trim()
    if (trimmed && !selectedGoalIds.includes(trimmed)) {
      onChange([...data, { goal: trimmed, priority: data.length + 1 }])
      setCustomGoal("")
    }
  }

  const sortedGoals = [...data].sort((a, b) => a.priority - b.priority)

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Your Goals</h2>
        <p className="text-sm text-gray-500 mt-1">What do you want to achieve with HealthOS?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PREDEFINED_GOALS.map((goal) => {
          const isSelected = selectedGoalIds.includes(goal.id)
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => toggleGoal(goal.id)}
              className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isSelected
                  ? "bg-[#E8F2FB] text-[#0F6CBF] border-2 border-[#0F6CBF]"
                  : "bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                }`}
            >
              <span className="text-lg">{goal.icon}</span>
              <span>{goal.label}</span>
              {isSelected && <span className="ml-auto text-[#0F6CBF]">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Priority ordering */}
      {sortedGoals.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Priority Order</h3>
          <div className="space-y-1.5">
            {sortedGoals.map((goal, idx) => (
              <div key={goal.goal} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200">
                <span className="w-6 h-6 rounded-full bg-[#0F6CBF] text-white text-xs flex items-center justify-center font-medium">
                  {idx + 1}
                </span>
                <span className="text-sm text-gray-700">{PREDEFINED_GOALS.find((g) => g.id === goal.goal)?.label || goal.goal}</span>
                <button
                  type="button"
                  onClick={() => onChange(data.filter((g) => g.goal !== goal.goal))}
                  className="ml-auto text-gray-400 hover:text-red-500 text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Goals are ordered by selection. Remove and re-add to reorder.</p>
        </div>
      )}

      {/* Custom goal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Add a Custom Goal</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomGoal() } }}
            placeholder="e.g. Run a 5K in 3 months"
            className="flex-1 h-10 px-3 rounded-lg border border-gray-300 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#0F6CBF]/20 focus:border-[#0F6CBF]"
          />
          <button
            type="button"
            onClick={addCustomGoal}
            disabled={!customGoal.trim()}
            className="px-4 h-10 bg-[#0F6CBF] text-white text-sm rounded-lg
              hover:bg-[#0A4F8A] disabled:opacity-40 transition-colors font-medium"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Summary Step ──────────────────────────────────────────────

function Summary({ form }: { form: AssessmentFormData }) {
  const fields: { label: string; value: string }[] = [
    { label: "Name", value: form.profile.fullName },
    { label: "Age", value: form.profile.dateOfBirth ? (() => {
      const age = calculateAge(form.profile.dateOfBirth)
      return age !== null ? `${age} years` : form.profile.dateOfBirth
    })() : "—" },
    { label: "Sex", value: form.profile.biologicalSex === "male" ? "Male" : form.profile.biologicalSex === "female" ? "Female" : form.profile.biologicalSex || "—" },
    { label: "Height", value: form.profile.heightCm ? `${form.profile.heightCm} cm` : "—" },
    { label: "Weight", value: form.profile.weightKg ? `${form.profile.weightKg} kg` : "—" },
    { label: "Job", value: form.occupation.jobTitle || "—" },
    { label: "Work Type", value: form.occupation.workType ? form.occupation.workType.charAt(0).toUpperCase() + form.occupation.workType.slice(1) : "—" },
    { label: "Sleep", value: form.lifestyle.avgSleepHours ? `${form.lifestyle.avgSleepHours}h` : "—" },
    { label: "Exercise", value: form.lifestyle.exerciseFreq || "—" },
    { label: "Stress", value: form.lifestyle.stressLevel ? `${form.lifestyle.stressLevel}/10` : "—" },
    { label: "Diet", value: form.nutrition.dietType ? DIET_TYPES.find((d) => d.value === form.nutrition.dietType)?.label || form.nutrition.dietType : "—" },
    { label: "Allergies", value: form.nutrition.foodAllergies.length ? form.nutrition.foodAllergies.join(", ") : "None" },
    { label: "Conditions", value: form.medicalHistory.currentConditions.length ? form.medicalHistory.currentConditions.join(", ") : "None reported" },
    { label: "Medications", value: form.medicalHistory.currentMedications.length ? form.medicalHistory.currentMedications.join(", ") : "None" },
    { label: "Pain Areas", value: form.painAssessments.length ? form.painAssessments.map((p) => `${BODY_AREAS.find((a) => a.id === p.bodyArea)?.label || p.bodyArea} (${p.severity}/10)`).join(", ") : "None" },
    { label: "Goals", value: form.goals.map((g) => PREDEFINED_GOALS.find((pg) => pg.id === g.goal)?.label || g.goal).join(", ") || "—" },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review Your Assessment</h2>
        <p className="text-sm text-gray-500 mt-1">Please review all information before submitting</p>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-medium text-gray-600">{f.label}</span>
            <span className="text-sm text-gray-900 max-w-[60%] text-right">{f.value || "—"}</span>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">📋 All set!</p>
        <p>Your assessment will be saved and used to personalize your recommendations, diet plans, and exercise routines. You can always edit it later.</p>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────

export default function AssessmentPage() {
  const router = useRouter()
  const [step, setStep] = useState<StepId>(1)
  const [form, setForm] = useState<AssessmentFormData>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [draftRestored, setDraftRestored] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const initialLoadDone = useRef(false)

  // Load existing assessment data
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    async function load() {
      try {
        // Check for draft first
        const draft = localStorage.getItem(DRAFT_KEY)
        if (draft) {
          try {
            const parsed = JSON.parse(draft) as AssessmentFormData
            setForm(parsed)
            setDraftRestored(true)
            setLoading(false)
            return
          } catch { /* ignore corrupt draft */ }
        }

        // Try loading from server
        const data = await api.get<any>("/assessment")
        if (data) {
          setForm({
            profile: {
              fullName: data.profile?.fullName || "",
              dateOfBirth: data.profile?.dateOfBirth ? new Date(data.profile.dateOfBirth).toISOString().split("T")[0] : "",
              biologicalSex: data.profile?.biologicalSex || "",
              heightCm: data.profile?.heightCm?.toString() || "",
              weightKg: data.profile?.weightKg?.toString() || "",
              waistCm: data.profile?.waistCm?.toString() || "",
              bloodGroup: data.profile?.bloodGroup || "",
            },
            occupation: {
              jobTitle: data.occupation?.jobTitle || "",
              industry: data.occupation?.industry || "",
              workingHours: data.occupation?.workingHours?.toString() || "",
              shiftSchedule: data.occupation?.shiftSchedule || "",
              workType: data.occupation?.workType || "",
              sittingHours: data.occupation?.sittingHours?.toString() || "",
              standingHours: data.occupation?.standingHours?.toString() || "",
              drivingHours: data.occupation?.drivingHours?.toString() || "",
            },
            lifestyle: {
              wakeUpTime: data.lifestyle?.wakeUpTime || "",
              bedTime: data.lifestyle?.bedTime || "",
              avgSleepHours: data.lifestyle?.avgSleepHours?.toString() || "",
              sleepQuality: data.lifestyle?.sleepQuality || "",
              waterIntakeL: data.lifestyle?.waterIntakeL?.toString() || "",
              sunlightMinutes: data.lifestyle?.sunlightMinutes?.toString() || "",
              screenTimeHours: data.lifestyle?.screenTimeHours?.toString() || "",
              walkingSteps: data.lifestyle?.walkingSteps?.toString() || "",
              exerciseFreq: data.lifestyle?.exerciseFreq || "",
              stressLevel: data.lifestyle?.stressLevel?.toString() || "",
              smoking: data.lifestyle?.smoking || "",
              alcohol: data.lifestyle?.alcohol || "",
              caffeineIntake: data.lifestyle?.caffeineIntake?.toString() || "",
            },
            nutrition: {
              dietType: data.nutrition?.dietType || "",
              foodAllergies: data.nutrition?.foodAllergies || [],
              dietaryRestrictions: data.nutrition?.dietaryRestrictions || [],
              religiousPreferences: data.nutrition?.religiousPreferences || [],
              cookingTimeMin: data.nutrition?.cookingTimeMin?.toString() || "",
              monthlyBudget: data.nutrition?.monthlyBudget?.toString() || "",
              favoriteFoods: data.nutrition?.favoriteFoods || [],
              foodsToAvoid: data.nutrition?.foodsToAvoid || [],
            },
            medicalHistory: {
              currentConditions: data.medicalHistory?.currentConditions || [],
              pastIllnesses: data.medicalHistory?.pastIllnesses || [],
              pastSurgeries: data.medicalHistory?.pastSurgeries || [],
              currentMedications: data.medicalHistory?.currentMedications || [],
              allergies: data.medicalHistory?.allergies || [],
              familyHistory: typeof data.medicalHistory?.familyHistory === "object"
                ? JSON.stringify(data.medicalHistory.familyHistory, null, 2)
                : data.medicalHistory?.familyHistory || "",
              pregnancyStatus: data.medicalHistory?.pregnancyStatus || "",
            },
            painAssessments: (data.painAssessments || []).map((p: any) => ({
              bodyArea: p.bodyArea,
              severity: p.severity,
              duration: p.duration || "",
              frequency: p.frequency || "",
              painType: p.painType || "",
              triggeringActivities: p.triggeringActivities || [],
              relievingFactors: p.relievingFactors || [],
              morningStiffness: p.morningStiffness || false,
              mobilityLimitation: p.mobilityLimitation || "",
            })),
            goals: (data.goals || []).map((g: any) => ({
              goal: g.goal,
              priority: g.priority,
            })),
          })
        }
      } catch (err) {
        console.log("No existing assessment, starting fresh")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [form, loading])

  const stepProgress = ((step - 1) / 7) * 100

  function validateStep(): boolean {
    if (step === 1 && !form.profile.fullName.trim()) {
      setError("Please enter your full name")
      return false
    }
    if (step === 7 && form.goals.length === 0) {
      setError("Please select at least one goal")
      return false
    }
    setError("")
    return true
  }

  function nextStep() {
    if (!validateStep()) return
    if (step < 7) setStep((step + 1) as StepId)
  }

  function handleReview() {
    if (!validateStep()) return
    setShowSummary(true)
  }

  function prevStep() {
    setError("")
    // If on the summary review, just dismiss it without changing step
    if (showSummary && step === 7) {
      setShowSummary(false)
      return
    }
    if (step > 1) setStep((step - 1) as StepId)
  }

  async function handleSubmit() {
    if (form.goals.length === 0) {
      setError("Please select at least one goal")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      await api.post("/assessment", {
        profile: {
          fullName: form.profile.fullName,
          dateOfBirth: form.profile.dateOfBirth || undefined,
          biologicalSex: form.profile.biologicalSex || undefined,
          heightCm: form.profile.heightCm ? parseFloat(form.profile.heightCm) : undefined,
          weightKg: form.profile.weightKg ? parseFloat(form.profile.weightKg) : undefined,
          waistCm: form.profile.waistCm ? parseFloat(form.profile.waistCm) : undefined,
          bloodGroup: form.profile.bloodGroup || undefined,
        },
        occupation: {
          jobTitle: form.occupation.jobTitle || undefined,
          industry: form.occupation.industry || undefined,
          workingHours: form.occupation.workingHours ? parseInt(form.occupation.workingHours) : undefined,
          shiftSchedule: form.occupation.shiftSchedule || undefined,
          workType: form.occupation.workType || undefined,
          sittingHours: form.occupation.sittingHours ? parseFloat(form.occupation.sittingHours) : undefined,
          standingHours: form.occupation.standingHours ? parseFloat(form.occupation.standingHours) : undefined,
          drivingHours: form.occupation.drivingHours ? parseFloat(form.occupation.drivingHours) : undefined,
        },
        lifestyle: {
          wakeUpTime: form.lifestyle.wakeUpTime || undefined,
          bedTime: form.lifestyle.bedTime || undefined,
          avgSleepHours: form.lifestyle.avgSleepHours ? parseFloat(form.lifestyle.avgSleepHours) : undefined,
          sleepQuality: form.lifestyle.sleepQuality || undefined,
          waterIntakeL: form.lifestyle.waterIntakeL ? parseFloat(form.lifestyle.waterIntakeL) : undefined,
          sunlightMinutes: form.lifestyle.sunlightMinutes ? parseInt(form.lifestyle.sunlightMinutes) : undefined,
          screenTimeHours: form.lifestyle.screenTimeHours ? parseFloat(form.lifestyle.screenTimeHours) : undefined,
          walkingSteps: form.lifestyle.walkingSteps ? parseInt(form.lifestyle.walkingSteps) : undefined,
          exerciseFreq: form.lifestyle.exerciseFreq || undefined,
          stressLevel: form.lifestyle.stressLevel ? parseInt(form.lifestyle.stressLevel) : undefined,
          smoking: form.lifestyle.smoking || undefined,
          alcohol: form.lifestyle.alcohol || undefined,
          caffeineIntake: form.lifestyle.caffeineIntake ? parseInt(form.lifestyle.caffeineIntake) : undefined,
        },
        nutrition: {
          dietType: form.nutrition.dietType || undefined,
          foodAllergies: form.nutrition.foodAllergies,
          dietaryRestrictions: form.nutrition.dietaryRestrictions,
          religiousPreferences: form.nutrition.religiousPreferences,
          cookingTimeMin: form.nutrition.cookingTimeMin ? parseInt(form.nutrition.cookingTimeMin) : undefined,
          monthlyBudget: form.nutrition.monthlyBudget ? parseFloat(form.nutrition.monthlyBudget) : undefined,
          favoriteFoods: form.nutrition.favoriteFoods,
          foodsToAvoid: form.nutrition.foodsToAvoid,
        },
        medicalHistory: {
          currentConditions: form.medicalHistory.currentConditions,
          pastIllnesses: form.medicalHistory.pastIllnesses,
          pastSurgeries: form.medicalHistory.pastSurgeries,
          currentMedications: form.medicalHistory.currentMedications,
          allergies: form.medicalHistory.allergies,
          familyHistory: form.medicalHistory.familyHistory ? form.medicalHistory.familyHistory : undefined,
          pregnancyStatus: form.medicalHistory.pregnancyStatus || undefined,
        },
        painAssessments: form.painAssessments.map((p) => ({
          bodyArea: p.bodyArea,
          severity: p.severity,
          duration: p.duration || undefined,
          frequency: p.frequency || undefined,
          painType: p.painType || undefined,
          triggeringActivities: p.triggeringActivities,
          relievingFactors: p.relievingFactors,
          morningStiffness: p.morningStiffness,
          mobilityLimitation: p.mobilityLimitation || undefined,
        })),
        goals: form.goals.map((g) => ({
          goal: g.goal,
          priority: g.priority,
        })),
      })

      // Clear draft
      localStorage.removeItem(DRAFT_KEY)

      router.push("/dashboard")
    } catch (err: unknown) {
      const error = err as { message?: string }
      setError(error.message || "Failed to save assessment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Health Assessment</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#0F6CBF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading your assessment...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Health Assessment</h1>
        <p className="text-sm text-gray-500 mt-1">Complete all 7 steps to personalize your health journey</p>
        {draftRestored && (
          <div className="mt-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg px-3 py-2">
            📝 Draft restored from your last session
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Step {step} of 7</span>
          <span className="text-xs font-medium text-[#0F6CBF]">{Math.round(stepProgress)}% complete</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0F6CBF] to-[#2E7D6F] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${stepProgress}%` }}
          />
        </div>
        {/* Step labels */}
        <div className="flex justify-between mt-3">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => s.id < step && setStep(s.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-200
                ${s.id === step ? "opacity-100" : s.id < step ? "opacity-60 hover:opacity-100 cursor-pointer" : "opacity-30"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                ${s.id === step ? "bg-[#0F6CBF] text-white shadow-md" :
                  s.id < step ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                {s.id < step ? "✓" : s.emoji}
              </div>
              <span className="text-[10px] font-medium text-gray-500 hidden sm:block">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 min-h-[400px]">
        {step === 1 && <Step1PersonalInfo data={form.profile} onChange={(d) => setForm({ ...form, profile: d })} />}
        {step === 2 && <Step2Occupation data={form.occupation} onChange={(d) => setForm({ ...form, occupation: d })} />}
        {step === 3 && <Step3Lifestyle data={form.lifestyle} onChange={(d) => setForm({ ...form, lifestyle: d })} />}
        {step === 4 && <Step4Nutrition data={form.nutrition} onChange={(d) => setForm({ ...form, nutrition: d })} />}
        {step === 5 && <Step5MedicalHistory data={form.medicalHistory} onChange={(d) => setForm({ ...form, medicalHistory: d })} />}
        {step === 6 && <Step6PainAssessment assessments={form.painAssessments} onChange={(d) => setForm({ ...form, painAssessments: d })} />}
        {step === 7 && <Step7Goals data={form.goals} onChange={(d) => setForm({ ...form, goals: d })} />}
      </div>

      {/* Summary review before final submission — only when user clicks "Review" from step 7 */}
      {showSummary && (
        <div className="mb-6">
          <Summary form={form} />
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 1}
          className="px-5 h-10 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg
            hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
        >
          ← Previous
        </button>

        <div className="text-xs text-gray-400">
          {step < 7 ? `Press Continue to move to step ${step + 1}` : showSummary ? "Ready to submit" : "Review before submitting"}
        </div>

        {step < 7 ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-5 h-10 text-sm font-medium text-white bg-[#0F6CBF] rounded-lg
              hover:bg-[#0A4F8A] transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Continue →
          </button>
        ) : !showSummary ? (
          <button
            type="button"
            onClick={handleReview}
            className="px-5 h-10 text-sm font-medium text-white bg-[#0F6CBF] rounded-lg
              hover:bg-[#0A4F8A] transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Review & Submit →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || form.goals.length === 0}
            className="px-6 h-10 text-sm font-medium text-white bg-gradient-to-r from-[#0F6CBF] to-[#2E7D6F] rounded-lg
              hover:from-[#0A4F8A] hover:to-[#1E5A4F] disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Confirm & Complete ✓"
            )}
          </button>
        )}
      </div>
    </div>
  )
}
