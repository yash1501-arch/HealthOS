"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { DietMeal } from "@/lib/ai/engines/diet-engine"

const ease = [0.16, 1, 0.3, 1] as const

const MEAL_TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  breakfast: { label: "Breakfast", color: "text-[#176B63]", bg: "bg-[#176B63]/10" },
  lunch: { label: "Lunch", color: "text-[#5B8CFF]", bg: "bg-[#5B8CFF]/10" },
  dinner: { label: "Dinner", color: "text-[#8B7FFF]", bg: "bg-[#8B7FFF]/10" },
  snack: { label: "Snack", color: "text-[#FFB86B]", bg: "bg-[#FFB86B]/10" },
}

interface MealCardProps {
  meal: DietMeal
  index: number
}

/**
 * Expandable meal card showing name, time, calories, ingredients,
 * macro breakdown bars, prep time, and collapsible recipe instructions.
 */
export function MealCard({ meal, index }: MealCardProps) {
  const [expanded, setExpanded] = useState(false)
  const style = MEAL_TYPE_STYLES[meal.type] ?? { label: meal.type, color: "text-[#4B5870]", bg: "bg-[#F5F7FA]" }

  const maxMacro = Math.max(meal.protein, meal.carbs, meal.fats, 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease }}
      className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:border-[#176B63]/20 hover:shadow-sm transition-all duration-200"
    >
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        {/* Meal type icon */}
        <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
          {meal.type === "breakfast" && (
            <svg viewBox="0 0 24 24" fill="none" stroke={style.color.replace("text-", "#").replace("/10", "") || "#176B63"} strokeWidth="1.5" className="w-5 h-5">
              <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
            </svg>
          )}
          {meal.type === "lunch" && (
            <svg viewBox="0 0 24 24" fill="none" stroke={style.color.replace("text-", "#").replace("/10", "") || "#5B8CFF"} strokeWidth="1.5" className="w-5 h-5">
              <path d="M12 2a10 10 0 1010 10M12 2v10l5 5" />
            </svg>
          )}
          {meal.type === "dinner" && (
            <svg viewBox="0 0 24 24" fill="none" stroke={style.color.replace("text-", "#").replace("/10", "") || "#8B7FFF"} strokeWidth="1.5" className="w-5 h-5">
              <path d="M3 3h18v2H3zM3 7h18v2H3zM3 11h18v2H3zM3 15h12v2H3zM17 15l4 4-2 2-4-4" />
            </svg>
          )}
          {meal.type === "snack" && (
            <svg viewBox="0 0 24 24" fill="none" stroke={style.color.replace("text-", "#").replace("/10", "") || "#FFB86B"} strokeWidth="1.5" className="w-5 h-5">
              <path d="M7 14h10l-1 6H8l-1-6zM5 8h14l-1 6H6L5 8zM8 2l1 6M16 2l-1 6" />
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-[#172033] text-sm truncate">{meal.name}</p>
            <span className="text-[10px] text-[#4B5870]/50 shrink-0">· {meal.time}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.color}`}>
              {style.label}
            </span>
            <span className="text-xs text-[#4B5870]">{meal.calories} cal</span>
            {meal.prepTime > 0 && (
              <span className="text-[10px] text-[#4B5870]/60 flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {meal.prepTime}min
              </span>
            )}
          </div>

          {/* Micro macro bars (always visible) */}
          <div className="flex items-center gap-3 mt-2">
            <MacroBar label="Protein" value={meal.protein} max={maxMacro} color="bg-[#5B8CFF]" />
            <MacroBar label="Carbs" value={meal.carbs} max={maxMacro} color="bg-[#FFB86B]" />
            <MacroBar label="Fats" value={meal.fats} max={maxMacro} color="bg-[#E8C84A]" />
          </div>
        </div>

        {/* Expand chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-[#4B5870]/30 mt-1 transition-transform duration-200 shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Expanded Content ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[#E2E8F0]">
              {/* Description */}
              {meal.description && (
                <p className="text-xs text-[#4B5870] leading-relaxed pt-3">{meal.description}</p>
              )}

              {/* Ingredients */}
              {meal.ingredients.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5870]/60 mb-1.5">
                    Ingredients
                  </p>
                  <ul className="grid grid-cols-2 gap-1">
                    {meal.ingredients.map((ingredient, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-[#4B5870]">
                        <span className="w-1 h-1 rounded-full bg-[#176B63]/30 shrink-0" />
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recipe */}
              {meal.recipe && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5870]/60 mb-1.5">
                    Instructions
                  </p>
                  <div className="bg-[#F5F7FA] rounded-lg p-3">
                    <p className="text-xs text-[#4B5870] leading-relaxed whitespace-pre-line">{meal.recipe}</p>
                  </div>
                </div>
              )}

              {/* Full macro breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <MacroDetail label="Protein" value={`${meal.protein}g`} color="text-[#5B8CFF]" bg="bg-[#5B8CFF]/10" />
                <MacroDetail label="Carbs" value={`${meal.carbs}g`} color="text-[#FFB86B]" bg="bg-[#FFB86B]/10" />
                <MacroDetail label="Fats" value={`${meal.fats}g`} color="text-[#E8C84A]" bg="bg-[#E8C84A]/10" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Macro Progress Bar ──

function MacroBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-[#4B5870] tabular-nums">{value}g</span>
    </div>
  )
}

// ── Macro Detail Badge ──

function MacroDetail({
  label,
  value,
  color,
  bg,
}: {
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className={`rounded-lg ${bg} p-2 text-center`}>
      <p className={`text-xs font-semibold ${color}`}>{value}</p>
      <p className="text-[10px] text-[#4B5870]/60">{label}</p>
    </div>
  )
}
