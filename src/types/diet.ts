export interface Ingredient {
  name: string
  quantity: number
  unit: string
  notes?: string
}

export interface NutritionalInfo {
  calories: number
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  fiber: number // grams
}

export interface Recipe {
  id: string
  name: string
  prepTime: number // minutes
  cookTime: number // minutes
  servings: number
  difficulty: "easy" | "medium" | "hard"
  cuisine: string
  dietaryTags: string[]
  ingredients: Ingredient[]
  instructions: string[]
  tips?: string[]
  nutritionalInfo: NutritionalInfo
}

export interface MealSlot {
  mealId: string
  name: string
  timing: string
  recipe: Recipe
}

export interface DayPlan {
  date: string
  dayName: string
  meals: {
    breakfast: MealSlot
    morningSnack: MealSlot
    lunch: MealSlot
    eveningSnack: MealSlot
    dinner: MealSlot
  }
}

export interface DailyTargets {
  calories: number
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  fiber: number // grams
  water: number // liters
}

export interface ShoppingItem {
  name: string
  quantity: number
  unit: string
  category: string
  checked: boolean
}

export interface WeekPlan {
  weekStart: string
  weekEnd: string
  days: DayPlan[]
  dailyTargets: DailyTargets
  shoppingList: ShoppingItem[]
}
