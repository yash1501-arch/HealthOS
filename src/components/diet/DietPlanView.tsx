"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"
import { MealCard } from "@/components/diet/MealCard"
import type { DietPlanOutput, WeekDayPlan, DietMeal, GroceryItem } from "@/lib/ai/engines/diet-engine"

const ease = [0.16, 1, 0.3, 1] as const
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/**
 * Serialises the plan to a plain-text document for download.
 */
function downloadPlanAsText(plan: DietPlanOutput) {
  const lines: string[] = [
    `=== ${plan.planName || "Diet Plan"} ===`,
    `Daily Calorie Target: ${plan.dailyCalorieTarget} cal`,
    `Macro Split: Protein ${plan.macroSplit.protein}% | Carbs ${plan.macroSplit.carbs}% | Fats ${plan.macroSplit.fats}%`,
    `Confidence: ${Math.round(plan.confidence * 100)}%`,
    "",
  ]

  for (const day of plan.weeklyPlan) {
    lines.push(`--- ${day.day} ---`)
    lines.push(`Daily Totals: ${day.dailyTotals.calories} cal | P ${day.dailyTotals.protein}g | C ${day.dailyTotals.carbs}g | F ${day.dailyTotals.fats}g`)
    lines.push(`Hydration: ${day.hydrationTarget}`)
    lines.push("")

    for (const meal of day.meals) {
      lines.push(`  ${meal.time} | ${meal.name} (${meal.calories} cal, P ${meal.protein}g, C ${meal.carbs}g, F ${meal.fats}g)`)
      if (meal.ingredients.length > 0) {
        lines.push(`    Ingredients: ${meal.ingredients.join(", ")}`)
      }
      if (meal.recipe) {
        lines.push(`    Recipe: ${meal.recipe.replace(/\n/g, " ")}`)
      }
      lines.push("")
    }
  }

  if (plan.groceryList.length > 0) {
    lines.push("=== Grocery List ===")
    for (const item of plan.groceryList) {
      lines.push(`  ${item.item} (${item.quantity}) [${item.category}]`)
    }
    lines.push("")
  }

  if (plan.tips.length > 0) {
    lines.push("=== Tips ===")
    plan.tips.forEach((t) => lines.push(`  ${t}`))
    lines.push("")
  }

  if (plan.labBasedRecommendations.length > 0) {
    lines.push("=== Lab-Based Recommendations ===")
    plan.labBasedRecommendations.forEach((r) => lines.push(`  ${r}`))
    lines.push("")
  }

  lines.push(`Disclaimer: ${plan.disclaimer}`)

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = window.document.createElement("a")
  a.href = url
  a.download = `diet-plan-${plan.planName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

interface DietPlanViewProps {
  /** The diet plan data to display. */
  plan: DietPlanOutput
  /** The database ID of the plan (required for modify). */
  planId: string
  /** Called when the plan is modified. */
  onPlanUpdated?: (updatedPlan: DietPlanOutput) => void
  /** Called when regeneration is requested. */
  onRegenerate?: () => void
}

/**
 * Full diet plan view showing a 7-day weekly calendar with meal cards,
 * macro progress bars, grocery list with checkboxes, lab-based recommendations,
 * foods to avoid/include, and a modify button.
 */
export function DietPlanView({ plan, planId, onPlanUpdated, onRegenerate }: DietPlanViewProps) {
  const [activeDay, setActiveDay] = useState(0)
  const [groceryChecked, setGroceryChecked] = useState<Set<number>>(new Set())
  const [showModifyInput, setShowModifyInput] = useState(false)
  const [modifyText, setModifyText] = useState("")
  const [modifying, setModifying] = useState(false)
  const [modifyError, setModifyError] = useState("")

  const toggleGroceryItem = useCallback((idx: number) => {
    setGroceryChecked((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const currentDay: WeekDayPlan | undefined = plan.weeklyPlan[activeDay]
  const allMeals: DietMeal[] = currentDay?.meals ?? []

  const handleModify = useCallback(async () => {
    if (!modifyText.trim() || !planId) return

    setModifying(true)
    setModifyError("")

    try {
      const updated = await api.post<DietPlanOutput>("/diet/modify", {
        planId,
        modification: modifyText.trim(),
      })
      onPlanUpdated?.(updated)
      setShowModifyInput(false)
      setModifyText("")
    } catch (err: unknown) {
      const e = err as { message?: string }
      setModifyError(e.message || "Modification failed. Please try again.")
    } finally {
      setModifying(false)
    }
  }, [modifyText, planId, onPlanUpdated])

  const totalGroceryItems = plan.groceryList?.length ?? 0
  const checkedCount = groceryChecked.size

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#172033]">{plan.planName || "Diet Plan"}</h1>
          <p className="text-sm text-[#4B5870] mt-1">
            {plan.dailyCalorieTarget > 0 && `${plan.dailyCalorieTarget} cal/day · `}
            {plan.macroSplit.protein > 0 && `P: ${plan.macroSplit.protein}% `}
            {plan.macroSplit.carbs > 0 && `C: ${plan.macroSplit.carbs}% `}
            {plan.macroSplit.fats > 0 && `F: ${plan.macroSplit.fats}%`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadPlanAsText(plan)}
            className="h-10 px-4 bg-[#F5F7FA] text-[#4B5870] rounded-xl text-sm font-medium hover:bg-[#E2E8F0] transition-all flex items-center gap-2"
            title="Download plan as text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
          <button
            onClick={() => setShowModifyInput(!showModifyInput)}
            className="h-10 px-4 bg-[#F5F7FA] text-[#172033] rounded-xl text-sm font-medium hover:bg-[#E2E8F0] transition-all flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Modify
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="h-10 px-4 bg-[#176B63] text-white rounded-xl text-sm font-medium hover:bg-[#10554F] transition-all shadow-sm"
            >
              Regenerate
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Modify Input ── */}
      <AnimatePresence>
        {showModifyInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="bg-[#F5F7FA] rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-[#172033]">Modify Your Plan</p>
              <p className="text-xs text-[#4B5870]">
                Tell us what you&apos;d like to change. Example: &quot;Replace broccoli with spinach&quot; or &quot;Add more protein to dinner.&quot;
              </p>
              <textarea
                value={modifyText}
                onChange={(e) => setModifyText(e.target.value)}
                placeholder="I don't like chicken, can you replace it with tofu?"
                className="w-full h-24 px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm resize-none focus:outline-none focus:border-[#176B63] focus:ring-2 focus:ring-[#176B63]/10"
                maxLength={1000}
              />
              {modifyError && (
                <p className="text-xs text-[#B53A45]">{modifyError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowModifyInput(false); setModifyText(""); setModifyError("") }}
                  disabled={modifying}
                  className="px-4 h-9 text-sm font-medium text-[#4B5870] hover:text-[#172033] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModify}
                  disabled={!modifyText.trim() || modifying}
                  className="px-5 h-9 bg-[#176B63] text-white rounded-lg text-sm font-medium hover:bg-[#10554F] disabled:opacity-40 transition-all"
                >
                  {modifying ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Modifying...
                    </span>
                  ) : (
                    "Apply Changes"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Macro Summary ── */}
      <MacroSummaryBar target={plan.dailyCalorieTarget} macroSplit={plan.macroSplit} currentDay={currentDay} />

      {/* ── Day Selector ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {plan.weeklyPlan.map((day, i) => {
          const dayIndex = new Date().getDay()
          const isToday = i === dayIndex
          return (
            <button
              key={day.day}
              onClick={() => setActiveDay(i)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                activeDay === i
                  ? "bg-[#176B63] text-white shadow-sm"
                  : isToday
                    ? "bg-[#176B63]/10 text-[#176B63]"
                    : "bg-[#F5F7FA] text-[#4B5870] hover:bg-[#E2E8F0]"
              }`}
            >
              <span className="block">{DAY_NAMES[new Date(day.day).getDay()] || day.day}</span>
              <span className="block text-[10px] mt-0.5 opacity-70">{day.dailyTotals.calories} cal</span>
            </button>
          )
        })}
      </div>

      {/* ── Meals for Active Day ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25, ease }}
          className="space-y-2"
        >
          {allMeals.length === 0 ? (
            <p className="text-sm text-[#4B5870] text-center py-8">No meals scheduled for this day.</p>
          ) : (
            <>
              {allMeals.map((meal, i) => (
                <MealCard key={`${meal.type}-${i}`} meal={meal} index={i} />
              ))}
              {/* Daily Totals */}
              {currentDay?.dailyTotals && (
                <div className="bg-[#F5F7FA] rounded-xl p-4 flex items-center justify-between text-sm">
                  <span className="text-[#4B5870] font-medium">Daily Totals</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#172033] font-semibold">{currentDay.dailyTotals.calories} cal</span>
                    <span className="text-[#5B8CFF]">P {currentDay.dailyTotals.protein}g</span>
                    <span className="text-[#FFB86B]">C {currentDay.dailyTotals.carbs}g</span>
                    <span className="text-[#FF6B6B]">F {currentDay.dailyTotals.fats}g</span>
                  </div>
                </div>
              )}
              {currentDay?.hydrationTarget && (
                <div className="flex items-center gap-2 text-xs text-[#4B5870] px-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#5B8CFF" strokeWidth="1.5" className="w-4 h-4">
                    <path d="M12 2L7 10a5 5 0 0010 0L12 2z" />
                  </svg>
                  Hydration target: {currentDay.hydrationTarget}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Lab-Based Recommendations ── */}
      {plan.labBasedRecommendations && plan.labBasedRecommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#5B8CFF]/5 border border-[#5B8CFF]/10 rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-[#172033] mb-2 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="#5B8CFF" strokeWidth="1.5" className="w-4 h-4">
              <path d="M9 3h6v6l4 4-4 4v2H9v-2l-4-4 4-4V3z" />
            </svg>
            Lab-Based Recommendations
          </h3>
          <ul className="space-y-1.5">
            {plan.labBasedRecommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#4B5870]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF] mt-1.5 shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* ── Foods to Include / Avoid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plan.foodsToInclude && plan.foodsToInclude.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#176B63]/5 border border-[#176B63]/10 rounded-xl p-4"
          >
            <h3 className="text-sm font-semibold text-[#176B63] mb-2">Foods to Include</h3>
            <div className="flex flex-wrap gap-1.5">
              {plan.foodsToInclude.map((food, i) => (
                <span key={i} className="px-2.5 py-1 bg-white rounded-lg text-xs text-[#172033] border border-[#176B63]/10">
                  {food}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {plan.foodsToAvoid && plan.foodsToAvoid.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#B53A45]/5 border border-[#B53A45]/10 rounded-xl p-4"
          >
            <h3 className="text-sm font-semibold text-[#B53A45] mb-2">Foods to Avoid</h3>
            <div className="flex flex-wrap gap-1.5">
              {plan.foodsToAvoid.map((food, i) => (
                <span key={i} className="px-2.5 py-1 bg-white rounded-lg text-xs text-[#B53A45] border border-[#B53A45]/10">
                  {food}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Grocery List ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold text-[#172033]">
            Grocery List
            {totalGroceryItems > 0 && (
              <span className="text-xs text-[#4B5870] font-normal ml-2">
                ({checkedCount}/{totalGroceryItems})
              </span>
            )}
          </h3>
          {totalGroceryItems > 0 && (
            <button
              onClick={() => setGroceryChecked(new Set())}
              className="text-[10px] text-[#4B5870]/60 hover:text-[#176B63] transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {totalGroceryItems === 0 ? (
          <p className="text-sm text-[#4B5870] text-center py-8">No grocery items.</p>
        ) : (
          <div className="divide-y divide-[#E2E8F0]/60">
            {/* Grouped by category */}
            {groupByCategory(plan.groceryList).map(([category, items]) => (
              <div key={category}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5870]/60 px-4 pt-3 pb-1">
                  {category}
                </p>
                {items.map((item, idx) => {
                  const globalIdx = findGlobalIndex(plan.groceryList, item)
                  const checked = groceryChecked.has(globalIdx)
                  return (
                    <label
                      key={globalIdx}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[#F5F7FA]/50 ${
                        checked ? "opacity-50" : ""
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          checked
                            ? "bg-[#176B63] border-[#176B63]"
                            : "border-[#E2E8F0] hover:border-[#176B63]/30"
                        }`}
                      >
                        {checked && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm flex-1 ${checked ? "line-through text-[#4B5870]/50" : "text-[#172033]"}`}>
                        {item.item}
                      </span>
                      <span className="text-xs text-[#4B5870]/60 shrink-0">{item.quantity}</span>
                    </label>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Tips ── */}
      {plan.tips && plan.tips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#F5F7FA] rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-[#172033] mb-2">Tips</h3>
          <ul className="space-y-1.5">
            {plan.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#4B5870]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#176B63] mt-1.5 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* ── Supplement Recommendations ── */}
      {currentDay?.supplements && currentDay.supplements.length > 0 && (
        <SupplementsSection supplements={currentDay.supplements} />
      )}

      {/* ── Disclaimer ── */}
      <div className="border-t border-[#E2E8F0] pt-4">
        <p className="text-xs text-[#4B5870]/60 leading-relaxed">
          {plan.disclaimer ||
            "This diet plan is generated by AI for informational and wellness purposes only. It is not a substitute for professional medical or nutritional advice. Always consult a qualified healthcare provider before making significant changes to your diet."}
        </p>
      </div>
    </div>
  )
}

// ── Macro Summary Bar ──

function MacroSummaryBar({
  target,
  macroSplit,
  currentDay,
}: {
  target: number
  macroSplit: { protein: number; carbs: number; fats: number }
  currentDay: WeekDayPlan | undefined
}) {
  const dayTotals = currentDay?.dailyTotals
  const calPct = target > 0 && dayTotals ? Math.min(100, (dayTotals.calories / target) * 100) : 0
  const proteinPct = macroSplit.protein > 0 ? macroSplit.protein : 30
  const carbsPct = macroSplit.carbs > 0 ? macroSplit.carbs : 40
  const fatsPct = macroSplit.fats > 0 ? macroSplit.fats : 30

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[#4B5870]">
          Daily Progress
          {dayTotals && <span className="ml-1 text-[#4B5870]/60">({dayTotals.calories} / {target} cal)</span>}
        </span>
        {calPct > 0 && (
          <span className="text-xs text-[#172033] font-semibold tabular-nums">{Math.round(calPct)}%</span>
        )}
      </div>
      {/* Calorie progress */}
      <div className="h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#176B63] to-[#2FE6C4] transition-all duration-500"
          style={{ width: `${calPct}%` }}
        />
      </div>
      {/* Macro split bars */}
      <div className="flex gap-2">
        <MacroPctBar label="Protein" pct={proteinPct} color="bg-[#5B8CFF]" />
        <MacroPctBar label="Carbs" pct={carbsPct} color="bg-[#FFB86B]" />
        <MacroPctBar label="Fats" pct={fatsPct} color="bg-[#E8C84A]" />
      </div>
    </div>
  )
}

function MacroPctBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="flex justify-between text-[10px] text-[#4B5870] mb-1">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

// ── Supplements Section ──

function SupplementsSection({ supplements }: { supplements: { name: string; dosage: string; timing: string; reason: string }[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
    >
      <div className="p-4 border-b border-[#E2E8F0]">
        <h3 className="text-sm font-semibold text-[#172033]">Supplement Recommendations</h3>
      </div>
      <div className="divide-y divide-[#E2E8F0]/60">
        {supplements.map((sup, i) => (
          <div key={i} className="px-4 py-3 hover:bg-[#F5F7FA]/50 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#172033]">{sup.name}</p>
              <span className="text-[10px] px-2 py-0.5 bg-[#176B63]/10 text-[#176B63] rounded-full font-medium">
                {sup.dosage}
              </span>
            </div>
            <p className="text-xs text-[#4B5870] mt-1">
              <span className="font-medium">Timing:</span> {sup.timing}
            </p>
            <p className="text-xs text-[#4B5870] mt-0.5">{sup.reason}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Helpers ──

function groupByCategory(items: GroceryItem[]): [string, GroceryItem[]][] {
  const map = new Map<string, GroceryItem[]>()
  for (const item of items) {
    const cat = item.category || "Other"
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(item)
  }
  return Array.from(map.entries())
}

function findGlobalIndex(list: GroceryItem[], target: GroceryItem): number {
  return list.findIndex((item) => item.item === target.item && item.quantity === target.quantity)
}
