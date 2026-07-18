"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { WeekPlan, DayPlan, Recipe, DailyTargets } from "@/types/diet"
const MEAL_SLOTS: { key: keyof DayPlan["meals"]; label: string; icon: string; color: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "🌅", color: "bg-amber-50 border-amber-200" },
  { key: "morningSnack", label: "Morning Snack", icon: "🍎", color: "bg-green-50 border-green-200" },
  { key: "lunch", label: "Lunch", icon: "☀️", color: "bg-orange-50 border-orange-200" },
  { key: "eveningSnack", label: "Evening Snack", icon: "🌆", color: "bg-purple-50 border-purple-200" },
  { key: "dinner", label: "Dinner", icon: "🌙", color: "bg-indigo-50 border-indigo-200" },
]

export default function DietPage() {
  const [selectedDay, setSelectedDay] = useState(0)
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [shoppingTab, setShoppingTab] = useState<"plan" | "list">("plan")

  const { data: plan, isPending, error } = useQuery<WeekPlan>({
    queryKey: ["diet-plan"],
    queryFn: () => api.get("/diet/plan"),
  })

  if (isPending) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Diet Plans</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Diet Plans</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load meal plan</p>
          <p className="text-red-500 text-sm mt-1">Please try again later</p>
        </div>
      </div>
    )
  }

  const currentDay = plan.days[selectedDay]
  const categories = [...new Set(plan.shoppingList.map((item) => item.category))]
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diet Plans</h1>
          <p className="text-sm text-gray-500 mt-1">
            {plan.weekStart} — {plan.weekEnd}
          </p>
        </div>
        <button
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
          title="Coming soon"
        >
          Regenerate Plan
        </button>
        {/* TODO: Wire up to POST /api/diet/plan/regenerate */}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setShoppingTab("plan")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            shoppingTab === "plan"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📋 Meal Plan
        </button>
        <button
          onClick={() => setShoppingTab("list")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            shoppingTab === "list"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🛒 Shopping List ({plan.shoppingList.length} items)
        </button>
      </div>

      {shoppingTab === "plan" ? (
        <>
          {/* Daily Targets Bar */}
          <DailyTargetsBar targets={targets} dayMeals={currentDay} totalCalories={totalCalories} />

          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
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
                    ? "bg-[#0F6CBF] text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-[#0F6CBF] hover:text-[#0F6CBF]"
                }`}
              >
                <span className="block text-xs opacity-75">{day.date.slice(5)}</span>
                <span className="block">{day.dayName.slice(0, 3)}</span>
              </button>
            ))}
          </div>

          {/* Meals for the selected day */}
          <div className="space-y-4">
            {MEAL_SLOTS.map(({ key, label, icon, color }) => {
              const meal = currentDay.meals[key]
              const isExpanded = expandedMeal === key
              const isRecipeOpen = expandedRecipe === meal.recipe.id

              return (
                <div
                  key={key}
                  className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                    isExpanded ? "shadow-md" : "shadow-sm hover:shadow-md"
                  } ${color}`}
                >
                  {/* Meal Header */}
                  <button
                    onClick={() => setExpandedMeal(isExpanded ? null : key)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{label}</h3>
                        <p className="text-sm text-gray-500">
                          {meal.name} · {meal.timing}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-400 bg-white/80 px-2 py-1 rounded-full">
                        {meal.recipe.nutritionalInfo.calories} cal
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
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
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-200/60">
                      {/* Quick Nutrition Info */}
                      <div className="flex gap-3 pt-3 text-xs text-gray-500">
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
                        <span className="font-medium text-gray-700">
                          👩‍🍳 View Recipe — {meal.recipe.name}
                        </span>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span>🕐 {meal.recipe.prepTime + meal.recipe.cookTime} min</span>
                          <span>🍽️ {meal.recipe.servings} serving</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isRecipeOpen ? "rotate-180" : ""
                            }`}
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* Shopping List Tab */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">🛒 Weekly Shopping List</h2>
            <p className="text-xs text-gray-500 mt-1">
              {checkedItems.size} of {plan.shoppingList.length} items checked
            </p>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(checkedItems.size / plan.shoppingList.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {categories.map((category) => {
              const items = plan.shoppingList.filter((item) => item.category === category)
              const checkedInCategory = items.filter((i) => checkedItems.has(i.name)).length

              return (
                <div key={category} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">{category}</h3>
                    <span className="text-xs text-gray-400">
                      {checkedInCategory}/{items.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <label
                        key={item.name}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checkedItems.has(item.name)}
                          onChange={() => toggleItem(item.name)}
                          className="w-4 h-4 rounded border-gray-300 text-[#0F6CBF] focus:ring-[#0F6CBF]"
                        />
                        <span
                          className={`text-sm ${
                            checkedItems.has(item.name)
                              ? "line-through text-gray-400"
                              : "text-gray-700"
                          }`}
                        >
                          {item.name}
                        </span>
                        <span className="ml-auto text-xs text-gray-400">
                          {item.quantity} {item.unit}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setCheckedItems(new Set())}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all checks
            </button>
          </div>
        </div>
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
    { label: "Calories", current: totalCalories, target: targets.calories, unit: "cal", color: "bg-blue-500" },
    { label: "Protein", current: totals.protein, target: targets.protein, unit: "g", color: "bg-blue-400" },
    { label: "Carbs", current: totals.carbs, target: targets.carbs, unit: "g", color: "bg-green-400" },
    { label: "Fat", current: totals.fat, target: targets.fat, unit: "g", color: "bg-yellow-400" },
    { label: "Fiber", current: totals.fiber, target: targets.fiber, unit: "g", color: "bg-purple-400" },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">📊 Daily Targets</h2>
      <div className="grid grid-cols-5 gap-3">
        {bars.map((bar) => {
          const pct = Math.min((bar.current / bar.target) * 100, 100)
          return (
            <div key={bar.label} className="text-center">
              <div className="text-xs text-gray-500 mb-1">{bar.label}</div>
              <div className="text-lg font-bold text-gray-900">
                {Math.round(bar.current)}
                <span className="text-xs font-normal text-gray-400 ml-0.5">/{bar.target}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${bar.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">{bar.unit}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Recipe Card ─── */
function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Recipe Header */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="font-bold text-gray-900 text-base">{recipe.name}</h4>
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
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Ingredients */}
        <div className="p-4">
          <h5 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <span>🥘</span> Ingredients
          </h5>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{ing.name}</span>
                <span className="font-medium text-gray-900 ml-2 flex-shrink-0">
                  {ing.quantity} {ing.unit}
                </span>
                {ing.notes && (
                  <span className="text-xs text-gray-400 ml-1">({ing.notes})</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-gray-100">
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
          <h5 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <span>📝</span> Instructions
          </h5>
          <ol className="space-y-3">
            {recipe.instructions.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E8F2FB] text-[#0F6CBF] flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-gray-600 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {recipe.tips && recipe.tips.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                💡 Pro Tips
              </h6>
              <ul className="space-y-1.5">
                {recipe.tips.map((tip, idx) => (
                  <li key={idx} className="text-xs text-gray-500 flex gap-2">
                    <span className="text-gray-300">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Helper ─── */
function calculateDayCalories(day: DayPlan): number {
  return Object.values(day.meals).reduce(
    (sum, meal) => sum + meal.recipe.nutritionalInfo.calories,
    0
  )
}
