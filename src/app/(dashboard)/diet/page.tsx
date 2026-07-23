"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { WeekPlan, DayPlan, Recipe, DailyTargets } from "@/types/diet"
import { motion } from "framer-motion"

const MEAL_SLOTS: { key: keyof DayPlan["meals"]; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2v20M17 5H7"/></svg>, color: "from-amber-400 to-amber-500" },
  { key: "morningSnack", label: "Morning Snack", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, color: "from-green-400 to-emerald-500" },
  { key: "lunch", label: "Lunch", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"/></svg>, color: "from-orange-400 to-orange-500" },
  { key: "eveningSnack", label: "Evening Snack", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 22V12M12 12l4-4M12 12l-4-4"/></svg>, color: "from-purple-400 to-violet-500" },
  { key: "dinner", label: "Dinner", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>, color: "from-indigo-400 to-indigo-500" },
]

export default function DietPage() {
  const [selectedDay, setSelectedDay] = useState(0)
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [shoppingTab, setShoppingTab] = useState<"plan" | "list">("plan")
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const { data: plan, isPending, error } = useQuery<WeekPlan>({
    queryKey: ["diet-plan"],
    queryFn: () => api.get("/diet/plan"),
  })

  if (isPending) {
    return (
      <div className="space-y-6">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-[#172033]">Diet Plans</motion.h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className="h-32 rounded-2xl bg-[#F5F7FA] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="space-y-6">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-[#172033]">Diet Plans</motion.h1>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#B53A45]/5 border border-[#B53A45]/10 text-[#B53A45] rounded-2xl p-6 text-center">
          <p className="text-[#B53A45] font-medium">Failed to load meal plan</p>
          <p className="text-sm text-[#B53A45]/70 mt-1">Please try again later</p>
        </motion.div>
      </div>
    )
  }

  const currentDay = plan.days[selectedDay]
  const categories = [...new Set(plan.shoppingList.map((item) => item.category))]

  const toggleItem = (name: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const totalCalories = calculateDayCalories(currentDay)
  const targets = plan.dailyTargets

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">Diet Plans</h1>
          <p className="text-sm text-[#4B5870] mt-1">
            {plan.weekStart} — {plan.weekEnd}
          </p>
        </div>
        <button disabled={true} className="btn-ghost">Regenerate Plan</button>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-1 bg-[#F5F7FA] rounded-2xl p-1">
        <button
          onClick={() => setShoppingTab("plan")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            shoppingTab === "plan"
              ? "bg-white text-[#172033] shadow-sm"
              : "text-[#4B5870] hover:text-[#172033]"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Meal Plan
          </span>
        </button>
        <button
          onClick={() => setShoppingTab("list")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            shoppingTab === "list"
              ? "bg-white text-[#172033] shadow-sm"
              : "text-[#4B5870] hover:text-[#172033]"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="18" cy="18" r="3"/><path d="M22 18h-6"/><path d="M18 22v-6"/><circle cx="6" cy="6" r="3"/><path d="M2 6h6"/><path d="M6 2v6"/></svg>
            Shopping List ({plan.shoppingList.length} items)
          </span>
        </button>
      </motion.div>

      {shoppingTab === "plan" ? (
        <>
          {/* Daily Targets Bar */}
          <DailyTargetsBar targets={targets} dayMeals={currentDay} totalCalories={totalCalories} />

          {/* Day Selector */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-2 overflow-x-auto pb-2">
            {plan.days.map((day, idx) => (
              <button
                key={day.date}
                onClick={() => {
                  setSelectedDay(idx)
                  setExpandedRecipe(null)
                  setExpandedMeal(null)
                }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  selectedDay === idx
                    ? "bg-gradient-to-r from-[#176B63] to-[#10554F] text-white shadow-md"
                    : "bg-white text-[#4B5870] border border-[#E2E8F0] hover:border-[#176B63] hover:text-[#176B63]"
                }`}
              >
                <span className="block text-xs opacity-75">{day.date.slice(5)}</span>
                <span className="block">{day.dayName.slice(0, 3)}</span>
              </button>
            ))}
          </motion.div>

          {/* Meals for the selected day */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
            {MEAL_SLOTS.map(({ key, label, icon, color }) => {
              const meal = currentDay.meals[key]
              const isExpanded = expandedMeal === key
              const isRecipeOpen = expandedRecipe === meal.recipe.id

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: MEAL_SLOTS.indexOf({ key, label, icon, color }) * 0.06 }}
                  className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                    isExpanded ? "shadow-lg" : "shadow-sm hover:shadow-md"
                  } glow-card`}
                  style={{
                    background: `linear-gradient(180deg, #FFFFFF 0%, #F5F7FA 100%)`,
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: isExpanded ? "0 12px 40px rgba(0,0,0,0.08)" : "0 4px 16px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Meal Header */}
                  <button
                    onClick={() => setExpandedMeal(isExpanded ? null : key)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color})`, color: "white" }}>
                        {icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#172033]">{label}</h3>
                        <p className="text-sm text-[#4B5870]">
                          {meal.name} · {meal.timing}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#4B5870]/80 bg-white/80 px-2 py-1 rounded-full">
                        {meal.recipe.nutritionalInfo.calories} cal
                      </span>
                      <svg
                        className={`w-5 h-5 text-[#4B5870] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Meal Content */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 space-y-4 border-t border-[#E2E8F0]/60"
                    >
                      {/* Quick Nutrition Info */}
                      <div className="flex gap-3 pt-3 text-xs text-[#4B5870]">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          P: {meal.recipe.nutritionalInfo.protein}g
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          C: {meal.recipe.nutritionalInfo.carbs}g
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-yellow-400" />
                          F: {meal.recipe.nutritionalInfo.fat}g
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-purple-400" />
                          Fiber: {meal.recipe.nutritionalInfo.fiber}g
                        </span>
                      </div>

                      {/* Recipe Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedRecipe(isRecipeOpen ? null : meal.recipe.id)
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white/80 rounded-lg text-sm hover:bg-white transition-colors"
                      >
                        <span className="font-medium text-[#172033] flex items-center gap-2">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M12 5v14M12 5l4 4M12 5l-4 4"/></svg>
                          View Recipe — {meal.recipe.name}
                        </span>
                        <div className="flex items-center gap-2 text-[#4B5870]/60">
                          <span>🕐 {meal.recipe.prepTime + meal.recipe.cookTime} min</span>
                          <span>🍽️ {meal.recipe.servings} serving</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${isRecipeOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Recipe Detail */}
                      {isRecipeOpen && <RecipeCard recipe={meal.recipe} />}
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </>
      ) : (
        /* Shopping List Tab */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h2 className="font-semibold text-[#172033] flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="18" cy="18" r="3"/><path d="M22 18h-6"/><path d="M18 22v-6"/><circle cx="6" cy="6" r="3"/><path d="M2 6h6"/><path d="M6 2v6"/></svg>
              Weekly Shopping List
            </h2>
            <p className="text-xs text-[#4B5870]/60 mt-1">
              {checkedItems.size} of {plan.shoppingList.length} items checked
            </p>
            <div className="mt-2 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(checkedItems.size / plan.shoppingList.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-[#E2E8F0] max-h-[600px] overflow-y-auto">
            {categories.map((category) => {
              const items = plan.shoppingList.filter((item) => item.category === category)
              const checkedInCategory = items.filter((i) => checkedItems.has(i.name)).length

              return (
                <div key={category} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-[#172033]">{category}</h3>
                    <span className="text-xs text-[#4B5870]/60">
                      {checkedInCategory}/{items.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <label key={item.name} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#F5F7FA] cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={checkedItems.has(item.name)}
                          onChange={() => toggleItem(item.name)}
                          className="w-4 h-4 rounded border-[#E2E8F0] text-[#176B63] focus:ring-[#176B63]"
                        />
                        <span className={`text-sm ${checkedItems.has(item.name) ? "line-through text-[#4B5870]/40" : "text-[#172033]/80"}`}>
                          {item.name}
                        </span>
                        <span className="ml-auto text-xs text-[#4B5870]/50">
                          {item.quantity} {item.unit}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-4 border-t border-[#E2E8F0] bg-[#F5F7FA]">
            <button
              onClick={() => setCheckedItems(new Set())}
              className="text-sm text-[#4B5870]/70 hover:text-[#172033] transition-colors"
            >
              Clear all checks
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ─── Daily Targets Progress Bar ─── */
function DailyTargetsBar({
  targets,
  dayMeals,
  totalCalories,
}: {
  targets: DailyTargets
  dayMeals: DayPlan
  totalCalories: number
}) {
  const meals = Object.values(dayMeals.meals)
  const totals = {
    protein: meals.reduce((s, m) => s + m.recipe.nutritionalInfo.protein, 0),
    carbs: meals.reduce((s, m) => s + m.recipe.nutritionalInfo.carbs, 0),
    fat: meals.reduce((s, m) => s + m.recipe.nutritionalInfo.fat, 0),
    fiber: meals.reduce((s, m) => s + m.recipe.nutritionalInfo.fiber, 0),
  }

  const bars = [
    { label: "Calories", current: totalCalories, target: targets.calories, unit: "cal", color: "from-blue-500 to-blue-400" },
    { label: "Protein", current: totals.protein, target: targets.protein, unit: "g", color: "from-blue-400 to-cyan-400" },
    { label: "Carbs", current: totals.carbs, target: targets.carbs, unit: "g", color: "from-green-400 to-emerald-400" },
    { label: "Fat", current: totals.fat, target: targets.fat, unit: "g", color: "from-yellow-400 to-amber-400" },
    { label: "Fiber", current: totals.fiber, target: targets.fiber, unit: "g", color: "from-purple-400 to-violet-400" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 glow-card"
    >
      <h2 className="text-sm font-semibold text-[#172033] mb-3 flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
        Daily Targets
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {bars.map((bar) => {
          const pct = Math.min((bar.current / bar.target) * 100, 100)
          return (
            <div key={bar.label} className="text-center">
              <div className="text-xs text-[#4B5870] mb-1">{bar.label}</div>
              <div className="text-lg font-bold text-[#172033]">
                {Math.round(bar.current)}
                <span className="text-xs font-normal text-[#4B5870] ml-0.5">/{bar.target}</span>
              </div>
              <div className="h-1.5 bg-[#E2E8F0] rounded-full mt-1 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${bar.color})` }}
                />
              </div>
              <div className="text-xs text-[#4B5870]/50 mt-1">{bar.unit}</div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ─── Recipe Card ─── */
function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden"
    >
      {/* Recipe Header */}
      <div className="p-4 border-b border-[#E2E8F0]">
        <h4 className="font-bold text-[#172033] text-base">{recipe.name}</h4>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
            🕐 {recipe.prepTime + recipe.cookTime} min
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            🍽️ {recipe.servings} serving{recipe.servings > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
            🎯 {recipe.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
            🌍 {recipe.cuisine}
          </span>
        </div>
        {recipe.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recipe.dietaryTags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-[#F5F7FA] text-[#4B5870] rounded text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
        {/* Ingredients */}
        <div className="p-4">
          <h5 className="font-semibold text-[#172033] text-sm mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M12 2v20"/><path d="M17 5H7"/><path d="M17 19H7"/></svg>
            Ingredients
          </h5>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="flex items-center justify-between text-sm">
                <span className="text-[#172033]/80">{ing.name}</span>
                <span className="font-medium text-[#172033] ml-2 flex-shrink-0">
                  {ing.quantity} {ing.unit}
                </span>
                {ing.notes && (
                  <span className="text-xs text-[#4B5870]/60 ml-1">({ing.notes})</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-blue-50 rounded-lg p-2">
                <span className="text-blue-700 font-bold block">{recipe.nutritionalInfo.calories}</span>
                <span className="text-blue-500">Calories</span>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <span className="text-green-700 font-bold block">{recipe.nutritionalInfo.protein}g</span>
                <span className="text-green-500">Protein</span>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2">
                <span className="text-yellow-700 font-bold block">{recipe.nutritionalInfo.carbs}g</span>
                <span className="text-yellow-500">Carbs</span>
              </div>
              <div className="bg-orange-50 rounded-lg p-2">
                <span className="text-orange-700 font-bold block">{recipe.nutritionalInfo.fat}g</span>
                <span className="text-orange-500">Fat</span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4">
          <h5 className="font-semibold text-[#172033] text-sm mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Instructions
          </h5>
          <ol className="space-y-3">
            {recipe.instructions.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#176B63]/10 text-[#176B63] flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-[#4B5870]/80 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {recipe.tips && recipe.tips.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
              <h6 className="text-xs font-semibold text-[#4B5870]/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>💡</span>
                Pro Tips
              </h6>
              <ul className="space-y-1.5">
                {recipe.tips.map((tip, idx) => (
                  <li key={idx} className="text-xs text-[#4B5870]/70 flex gap-2">
                    <span className="text-[#E2E8F0]">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Helper ─── */
function calculateDayCalories(day: DayPlan): number {
  return Object.values(day.meals).reduce(
    (sum, meal) => sum + meal.recipe.nutritionalInfo.calories,
    0
  )
}