import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import type { WeekPlan, DayPlan, DailyTargets, ShoppingItem, MealSlot } from "@/types/diet"

// ─── GET /api/diet/plan — Get weekly meal plan ──────────────────

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    // Check for existing plan
    const existing = await prisma.dietPlan.findFirst({
      where: { userId, isActive: true, weekStart: { gte: getMonday(new Date()) } },
      orderBy: { createdAt: "desc" },
    })

    if (existing) {
      return NextResponse.json({
        data: {
          weekStart: existing.weekStart.toISOString().slice(0, 10),
          weekEnd: existing.weekEnd.toISOString().slice(0, 10),
          days: existing.meals as unknown as DayPlan[],
          dailyTargets: existing.dailyTargets as unknown as DailyTargets,
          shoppingList: existing.shoppingList as unknown as ShoppingItem[],
        },
      })
    }

    // Generate personalized plan
    const plan = await generatePersonalizedPlan(userId)
    return NextResponse.json({ data: plan })
  } catch (error) {
    console.error("Diet plan GET error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── POST /api/diet/plan — Regenerate meal plan ─────────────────

export async function POST() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    // Deactivate old plans
    await prisma.dietPlan.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })

    const plan = await generatePersonalizedPlan(userId)

    // Save to database
    await prisma.dietPlan.create({
      data: {
        userId,
        weekStart: new Date(plan.weekStart),
        weekEnd: new Date(plan.weekEnd),
        meals: plan.days as any,
        dailyTargets: plan.dailyTargets as any,
        shoppingList: plan.shoppingList as any,
      },
    })

    return NextResponse.json({ data: plan })
  } catch (error) {
    console.error("Diet plan POST error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

// ─── Personalized Plan Generator ─────────────────────────────────

async function generatePersonalizedPlan(userId: string): Promise<WeekPlan> {
  const [profile, goals, nutrition, lifestyle] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.goal.findMany({ where: { userId, isActive: true } }),
    prisma.nutritionProfile.findUnique({ where: { userId } }),
    prisma.lifestyle.findUnique({ where: { userId } }),
  ])

  const targets = computeTargets(profile, goals, nutrition, lifestyle)
  const dietType = nutrition?.dietType ?? "vegetarian"
  const days = generateWeek(dietType, goals.map((g: any) => g.goal))
  const shoppingList = generateShoppingList(days)

  const monday = getMonday(new Date())
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
    days,
    dailyTargets: targets,
    shoppingList,
  }
}

// ─── Target Computation ─────────────────────────────────────────

function computeTargets(
  profile: any | null,
  goals: any[],
  nutrition: any | null,
  lifestyle: any | null
): DailyTargets {
  const weightKg = profile?.weightKg ? Number(profile.weightKg) : 70
  const goalIds = goals.map((g) => g.goal)
  const exerciseFreq = lifestyle?.exerciseFreq ?? "rarely"

  // BMR estimate using Mifflin-St Jeor (assumes male if no sex data)
  const isFemale = profile?.biologicalSex === "female"
  const heightCm = profile?.heightCm ? Number(profile.heightCm) : 170
  const age = profile?.dateOfBirth ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / 31557600000) : 30
  let bmr = isFemale
    ? 447.6 + 9.25 * weightKg + 3.1 * heightCm - 4.33 * age
    : 88.36 + 13.4 * weightKg + 4.8 * heightCm - 5.68 * age

  // Activity multiplier
  const activityMult: Record<string, number> = {
    daily: 1.725, "4-6 times/week": 1.55, "2-3 times/week": 1.375,
    "once/week": 1.2, rarely: 1.2, never: 1.15,
  }
  const tdee = Math.round(bmr * (activityMult[exerciseFreq] ?? 1.2))

  // Adjust for goals
  let calories = tdee
  let proteinGPerKg = 1.6
  if (goalIds.includes("lose_weight")) { calories -= 350; proteinGPerKg = 2.0 }
  if (goalIds.includes("build_strength")) { calories += 200; proteinGPerKg = 2.2 }
  if (goalIds.includes("build_routine") || goalIds.includes("increase_energy")) { proteinGPerKg = 1.8 }

  const protein = Math.round(proteinGPerKg * weightKg)
  const fat = Math.round((calories * 0.25) / 9)
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4)
  const fiber = isFemale ? 25 : 30

  return { calories, protein: Math.min(protein, 250), carbs: Math.max(carbs, 100), fat: Math.max(fat, 30), fiber, water: 2.5 }
}

// ─── Week Generation ────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const MEAL_TEMPLATES = {
  // ── Vegetarian meals ──
  "veg-breakfast-1": { name: "Oats & Berry Bowl", timing: "7:30 AM", cuisine: "Continental", tags: ["vegetarian", "high-fiber"], cal: 385, p: 14, c: 58, f: 12, fib: 9, prep: 5, cook: 5, ingredients: [{ name: "Rolled Oats", qty: 50, unit: "g" }, { name: "Milk", qty: 200, unit: "ml" }, { name: "Mixed Berries", qty: 80, unit: "g" }, { name: "Honey", qty: 15, unit: "ml" }, { name: "Chia Seeds", qty: 10, unit: "g" }, { name: "Mixed Nuts", qty: 15, unit: "g" }], instructions: ["Bring milk to a gentle simmer in a saucepan.", "Add oats, reduce heat, cook 4-5 min stirring occasionally.", "Top with berries, nuts, chia seeds, and honey."], tips: ["For creamier oats, use half milk and half water."] },
  "veg-breakfast-2": { name: "Scrambled Eggs on Toast", timing: "7:30 AM", cuisine: "Continental", tags: ["high-protein"], cal: 340, p: 22, c: 26, f: 17, fib: 3, prep: 3, cook: 8, ingredients: [{ name: "Eggs", qty: 3, unit: "units" }, { name: "Whole Wheat Bread", qty: 2, unit: "slices" }, { name: "Butter", qty: 10, unit: "g" }, { name: "Milk", qty: 15, unit: "ml" }], instructions: ["Whisk eggs with milk, salt, and pepper.", "Melt butter in a non-stick pan over medium-low heat.", "Pour in eggs, push gently with spatula until just set.", "Serve over toasted bread."], tips: ["Remove from heat just before done — residual heat finishes cooking."] },
  "veg-breakfast-3": { name: "Banana Oat Pancakes", timing: "7:30 AM", cuisine: "Continental", tags: ["vegetarian", "high-fiber"], cal: 365, p: 18, c: 48, f: 12, fib: 5, prep: 5, cook: 10, ingredients: [{ name: "Banana", qty: 1, unit: "unit" }, { name: "Eggs", qty: 2, unit: "units" }, { name: "Rolled Oats", qty: 30, unit: "g" }, { name: "Butter", qty: 5, unit: "g" }, { name: "Honey", qty: 10, unit: "ml" }], instructions: ["Blend oats into flour. Mash banana, mix with eggs and oat flour.", "Cook small pancakes in buttered pan, 2-3 min per side.", "Stack and drizzle with honey."], tips: ["Add cinnamon to batter for extra flavor."] },
  "veg-breakfast-4": { name: "Veggie Avocado Toast", timing: "8:00 AM", cuisine: "Continental", tags: ["vegetarian", "vegan", "high-fiber"], cal: 285, p: 8, c: 32, f: 15, fib: 9, prep: 5, cook: 5, ingredients: [{ name: "Whole Wheat Bread", qty: 2, unit: "slices" }, { name: "Avocado", qty: 0.5, unit: "unit" }, { name: "Cherry Tomatoes", qty: 4, unit: "units" }, { name: "Lemon Juice", qty: 5, unit: "ml" }], instructions: ["Toast bread. Mash avocado with lemon juice, salt, pepper.", "Spread on toast, top with sliced tomatoes."], tips: ["Add a poached egg for extra protein."] },
  "veg-breakfast-5": { name: "Chia Pudding with Mango", timing: "8:30 AM", cuisine: "Continental", tags: ["vegetarian", "vegan", "high-fiber"], cal: 310, p: 10, c: 38, f: 14, fib: 14, prep: 5, cook: 0, ingredients: [{ name: "Chia Seeds", qty: 30, unit: "g" }, { name: "Milk", qty: 150, unit: "ml" }, { name: "Mango", qty: 0.5, unit: "unit" }, { name: "Honey", qty: 10, unit: "ml" }], instructions: ["Mix chia seeds with milk and honey. Refrigerate 4+ hours or overnight.", "Top with diced mango and serve."], tips: ["Make 3-4 jars at once for grab-and-go breakfasts."] },
  // Non-veg additional breakfast
  "nv-breakfast-1": { name: "Masala Omelette with Toast", timing: "7:30 AM", cuisine: "Indian", tags: ["high-protein"], cal: 320, p: 20, c: 18, f: 19, fib: 3, prep: 5, cook: 8, ingredients: [{ name: "Eggs", qty: 3, unit: "units" }, { name: "Onion", qty: 0.25, unit: "unit" }, { name: "Tomato", qty: 0.5, unit: "unit" }, { name: "Whole Wheat Bread", qty: 1, unit: "slice" }, { name: "Butter", qty: 10, unit: "g" }], instructions: ["Whisk eggs with salt. Mix in chopped onion and tomato.", "Cook in buttered pan 3-4 min, fold, serve with toast."], tips: ["Add turmeric for color and anti-inflammatory benefits."] },
  // Snacks
  "snack-1": { name: "Apple with Peanut Butter", timing: "10:30 AM", cuisine: "Continental", tags: ["vegetarian", "high-protein"], cal: 210, p: 8, c: 28, f: 9, fib: 5, prep: 2, cook: 0, ingredients: [{ name: "Apple", qty: 1, unit: "unit" }, { name: "Peanut Butter", qty: 30, unit: "g" }], instructions: ["Slice apple into wedges. Serve with peanut butter."], tips: [] },
  "snack-2": { name: "Greek Yogurt with Nuts", timing: "4:30 PM", cuisine: "Continental", tags: ["vegetarian", "high-protein"], cal: 195, p: 12, c: 18, f: 9, fib: 2, prep: 2, cook: 0, ingredients: [{ name: "Greek Yogurt", qty: 150, unit: "g" }, { name: "Mixed Nuts", qty: 20, unit: "g" }, { name: "Honey", qty: 10, unit: "ml" }], instructions: ["Spoon yogurt into a bowl. Top with nuts and honey."], tips: [] },
  "snack-3": { name: "Mixed Nuts & Seeds", timing: "4:30 PM", cuisine: "Continental", tags: ["vegetarian", "vegan", "high-protein"], cal: 160, p: 5, c: 6, f: 14, fib: 3, prep: 1, cook: 0, ingredients: [{ name: "Mixed Nuts", qty: 25, unit: "g" }, { name: "Chia Seeds", qty: 5, unit: "g" }], instructions: ["Mix nuts and seeds together. Enjoy as a crunchy snack."], tips: [] },
  "snack-4": { name: "Cucumber & Hummus", timing: "4:30 PM", cuisine: "Mediterranean", tags: ["vegetarian", "vegan", "gluten-free"], cal: 115, p: 4, c: 10, f: 7, fib: 3, prep: 3, cook: 0, ingredients: [{ name: "Cucumber", qty: 1, unit: "unit" }, { name: "Hummus", qty: 50, unit: "g" }], instructions: ["Slice cucumber into sticks. Serve with hummus."], tips: [] },
  "snack-5": { name: "Banana Smoothie", timing: "10:30 AM", cuisine: "Continental", tags: ["vegetarian"], cal: 265, p: 10, c: 48, f: 4, fib: 3, prep: 5, cook: 0, ingredients: [{ name: "Banana", qty: 1, unit: "unit" }, { name: "Greek Yogurt", qty: 100, unit: "g" }, { name: "Milk", qty: 150, unit: "ml" }, { name: "Honey", qty: 10, unit: "ml" }], instructions: ["Blend all ingredients until smooth. Serve immediately."], tips: ["Use frozen banana for a thicker smoothie."] },
  // Lunch (veg)
  "veg-lunch-1": { name: "Dal Tadka with Roti & Salad", timing: "1:00 PM", cuisine: "Indian", tags: ["vegetarian", "high-protein", "high-fiber"], cal: 495, p: 22, c: 72, f: 12, fib: 14, prep: 10, cook: 25, ingredients: [{ name: "Lentils (Masoor Dal)", qty: 60, unit: "g" }, { name: "Whole Wheat Roti Flour", qty: 60, unit: "g" }, { name: "Onion", qty: 0.5, unit: "unit" }, { name: "Tomato", qty: 1, unit: "unit" }, { name: "Cumin Seeds", qty: 5, unit: "g" }, { name: "Butter", qty: 10, unit: "g" }], instructions: ["Cook lentils with turmeric until soft.", "Knead dough, roll rotis, cook on griddle.", "Prepare tadka with cumin, garlic, onion, tomato.", "Pour tadka over dal. Serve with roti and salad."], tips: ["Pressure cook dal for 3-4 whistles to save time."] },
  "veg-lunch-2": { name: "Chickpea & Spinach Curry", timing: "1:00 PM", cuisine: "Indian", tags: ["vegetarian", "vegan", "high-fiber"], cal: 455, p: 18, c: 68, f: 12, fib: 16, prep: 10, cook: 20, ingredients: [{ name: "Chickpeas (canned)", qty: 200, unit: "g" }, { name: "Spinach", qty: 60, unit: "g" }, { name: "Onion", qty: 0.5, unit: "unit" }, { name: "Brown Rice", qty: 60, unit: "g" }], instructions: ["Cook brown rice. Sauté onion, garlic, ginger.", "Add tomato puree and spices, cook 3 min.", "Add chickpeas, simmer 10 min. Add spinach, cook 2 min.", "Serve over rice."], tips: ["Add lemon juice for brightness."] },
  "veg-lunch-3": { name: "Quinoa Buddha Bowl", timing: "1:00 PM", cuisine: "Fusion", tags: ["vegetarian", "vegan-option", "gluten-free", "high-fiber"], cal: 445, p: 16, c: 52, f: 20, fib: 14, prep: 10, cook: 15, ingredients: [{ name: "Quinoa", qty: 60, unit: "g" }, { name: "Chickpeas (canned)", qty: 100, unit: "g" }, { name: "Avocado", qty: 0.5, unit: "unit" }, { name: "Carrot", qty: 1, unit: "unit" }, { name: "Spinach", qty: 40, unit: "g" }], instructions: ["Cook quinoa. Prepare lemon-olive oil dressing.", "Arrange quinoa, chickpeas, avocado, carrot, spinach in bowl.", "Drizzle dressing and serve."], tips: ["Roast chickpeas with spices for extra crunch."] },
  "veg-lunch-4": { name: "Whole Wheat Pasta Primavera", timing: "1:00 PM", cuisine: "Italian", tags: ["vegetarian", "high-fiber"], cal: 430, p: 14, c: 62, f: 16, fib: 10, prep: 10, cook: 15, ingredients: [{ name: "Whole Wheat Pasta", qty: 75, unit: "g" }, { name: "Garlic Cloves", qty: 2, unit: "units" }, { name: "Bell Pepper", qty: 0.5, unit: "unit" }, { name: "Cherry Tomatoes", qty: 6, unit: "units" }, { name: "Spinach", qty: 40, unit: "g" }, { name: "Olive Oil", qty: 15, unit: "ml" }], instructions: ["Cook pasta. Sauté garlic and chili flakes in olive oil.", "Add bell pepper, then tomatoes, then spinach.", "Toss with pasta. Serve with parmesan."], tips: ["Reserve pasta water — it helps sauce cling to pasta."] },
  // Non-veg lunch
  "nv-lunch-1": { name: "Grilled Chicken Salad", timing: "1:00 PM", cuisine: "Mediterranean", tags: ["high-protein", "low-carb"], cal: 420, p: 42, c: 12, f: 24, fib: 7, prep: 15, cook: 12, ingredients: [{ name: "Chicken Breast", qty: 150, unit: "g" }, { name: "Spinach", qty: 60, unit: "g" }, { name: "Avocado", qty: 0.5, unit: "unit" }, { name: "Cucumber", qty: 0.5, unit: "unit" }, { name: "Olive Oil", qty: 15, unit: "ml" }, { name: "Lemon Juice", qty: 15, unit: "ml" }], instructions: ["Season and grill chicken 5-6 min per side.", "Rest, slice, and serve over mixed vegetables with lemon dressing."], tips: ["Marinate chicken in lemon and herbs for 30 min before cooking."] },
  "nv-lunch-2": { name: "Masoor Dal Khichdi with Raita", timing: "1:00 PM", cuisine: "Indian", tags: ["gluten-free", "high-fiber"], cal: 425, p: 18, c: 64, f: 10, fib: 9, prep: 10, cook: 25, ingredients: [{ name: "Lentils", qty: 40, unit: "g" }, { name: "Brown Rice", qty: 40, unit: "g" }, { name: "Butter", qty: 10, unit: "g" }, { name: "Greek Yogurt", qty: 60, unit: "g" }], instructions: ["Cook dal and rice together until soft.", "Prepare tadka with cumin, garlic, onion.", "Serve khichdi with cucumber raita."], tips: ["Khichdi is a complete protein — perfect for recovery!"] },
  // Dinner (veg)
  "veg-dinner-1": { name: "Paneer Bhurji with Quinoa", timing: "7:30 PM", cuisine: "Indian", tags: ["vegetarian", "high-protein", "gluten-free"], cal: 480, p: 28, c: 38, f: 24, fib: 5, prep: 10, cook: 15, ingredients: [{ name: "Paneer", qty: 150, unit: "g" }, { name: "Quinoa", qty: 50, unit: "g" }, { name: "Onion", qty: 0.5, unit: "unit" }, { name: "Bell Pepper", qty: 0.5, unit: "unit" }, { name: "Tomato", qty: 1, unit: "unit" }], instructions: ["Cook quinoa. Sauté cumin, garlic, onion, bell pepper.", "Add crumbled paneer and spices, cook 3-4 min.", "Serve paneer bhurji over quinoa with lemon juice."], tips: ["Toast quinoa for 2 min before adding water for nuttier flavor."] },
  "veg-dinner-2": { name: "Brown Rice Veg Pulao with Salad", timing: "7:30 PM", cuisine: "Indian", tags: ["vegetarian", "vegan", "gluten-free", "high-fiber"], cal: 430, p: 10, c: 74, f: 11, fib: 9, prep: 10, cook: 25, ingredients: [{ name: "Brown Rice", qty: 60, unit: "g" }, { name: "Carrot", qty: 0.5, unit: "unit" }, { name: "Green Peas", qty: 30, unit: "g" }, { name: "Cinnamon Stick", qty: 1, unit: "unit" }, { name: "Cumin Seeds", qty: 3, unit: "g" }], instructions: ["Soak rice. Sauté whole spices, onion, veggies.", "Add rice and water, cover and simmer 18-20 min.", "Serve with fresh salad."], tips: ["Toast whole spices first for maximum flavor."] },
  "veg-dinner-3": { name: "Hearty Lentil Soup with Garlic Bread", timing: "7:30 PM", cuisine: "Mediterranean", tags: ["vegetarian", "vegan", "high-fiber", "high-protein"], cal: 440, p: 20, c: 62, f: 13, fib: 16, prep: 10, cook: 30, ingredients: [{ name: "Lentils", qty: 60, unit: "g" }, { name: "Onion", qty: 0.5, unit: "unit" }, { name: "Carrot", qty: 1, unit: "unit" }, { name: "Garlic Cloves", qty: 3, unit: "units" }, { name: "Tomato", qty: 1, unit: "unit" }, { name: "Whole Wheat Bread", qty: 1, unit: "slice" }], instructions: ["Sauté onion, carrot, garlic. Add tomato and lentils.", "Simmer 20-25 min. Blend partially. Serve with garlic toast."], tips: ["Freezes well — make a double batch."] },
  // Non-veg dinner
  "nv-dinner-1": { name: "Lemon Herb Grilled Fish with Veggies", timing: "7:30 PM", cuisine: "Mediterranean", tags: ["high-protein", "low-carb", "gluten-free"], cal: 380, p: 36, c: 14, f: 20, fib: 5, prep: 10, cook: 15, ingredients: [{ name: "Fish Fillet", qty: 150, unit: "g" }, { name: "Lemon Juice", qty: 15, unit: "ml" }, { name: "Olive Oil", qty: 15, unit: "ml" }, { name: "Bell Pepper", qty: 0.5, unit: "unit" }, { name: "Zucchini", qty: 0.5, unit: "unit" }], instructions: ["Marinate fish with lemon, garlic, herbs.", "Grill vegetables 3-4 min per side.", "Cook fish 3-4 min per side. Serve together."], tips: ["Don't overcook fish — it's done when it flakes easily."] },
  "nv-dinner-2": { name: "Chicken Tikka with Mint Chutney", timing: "7:30 PM", cuisine: "Indian", tags: ["high-protein"], cal: 465, p: 40, c: 42, f: 15, fib: 6, prep: 15, cook: 15, ingredients: [{ name: "Chicken Breast", qty: 150, unit: "g" }, { name: "Greek Yogurt", qty: 30, unit: "g" }, { name: "Whole Wheat Roti Flour", qty: 60, unit: "g" }, { name: "Mint Leaves", qty: 15, unit: "g" }], instructions: ["Marinate chicken in yogurt and spices 30+ min.", "Grill 12-15 min. Make mint chutney.", "Serve with hot rotis."], tips: ["Soak skewers in water 30 min before grilling."] },
}

function generateWeek(dietType: string, goals: string[]): DayPlan[] {
  const isVeg = dietType === "vegetarian" || dietType === "vegan" || dietType === "eggetarian"
  const today = new Date()
  const monday = getMonday(today)
  const days: DayPlan[] = []

  const breakfastKeys = isVeg
    ? ["veg-breakfast-1", "veg-breakfast-2", "veg-breakfast-3", "veg-breakfast-4", "veg-breakfast-5", "veg-breakfast-1", "veg-breakfast-5"]
    : ["nv-breakfast-1", "veg-breakfast-2", "veg-breakfast-3", "veg-breakfast-4", "veg-breakfast-1", "nv-breakfast-1", "veg-breakfast-5"]

  const lunchKeys = isVeg
    ? ["veg-lunch-1", "veg-lunch-2", "veg-lunch-3", "veg-lunch-4", "veg-lunch-1", "veg-lunch-2", "veg-lunch-3"]
    : ["nv-lunch-1", "veg-lunch-2", "nv-lunch-1", "veg-lunch-4", "nv-lunch-2", "veg-lunch-3", "nv-lunch-1"]

  const dinnerKeys = isVeg
    ? ["veg-dinner-1", "veg-dinner-2", "veg-dinner-3", "veg-dinner-1", "veg-dinner-2", "veg-dinner-3", "veg-dinner-1"]
    : ["nv-dinner-1", "nv-dinner-2", "veg-dinner-1", "nv-dinner-1", "veg-dinner-2", "nv-dinner-2", "nv-dinner-1"]

  const snackOpts = ["snack-1", "snack-2", "snack-3", "snack-4", "snack-5"]

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().slice(0, 10)
    const dayName = DAY_NAMES[date.getDay()]

    const amSnack = snackOpts[i % snackOpts.length]
    const pmSnack = snackOpts[(i + 2) % snackOpts.length]
    const prevDinner = i > 0 ? dinnerKeys[i - 1] : dinnerKeys[6]

    const breakfast = MEAL_TEMPLATES[breakfastKeys[i] as keyof typeof MEAL_TEMPLATES]
    const lunch = MEAL_TEMPLATES[lunchKeys[i] as keyof typeof MEAL_TEMPLATES]
    const dinner = MEAL_TEMPLATES[dinnerKeys[i] as keyof typeof MEAL_TEMPLATES]
    const morningSnack = MEAL_TEMPLATES[amSnack as keyof typeof MEAL_TEMPLATES]
    const eveningSnack = MEAL_TEMPLATES[pmSnack as keyof typeof MEAL_TEMPLATES]

    // Avoid repeating dinner from previous day
    const finalDinner = dinnerKeys[i] === prevDinner && i > 0
      ? MEAL_TEMPLATES[dinnerKeys[(i + 2) % 7] as keyof typeof MEAL_TEMPLATES]
      : dinner

    days.push(buildDay(dateStr, dayName, i, breakfast, morningSnack, lunch, eveningSnack, finalDinner))
  }

  return days
}

function buildDay(
  date: string, dayName: string, _idx: number,
  b: any, ms: any, l: any, es: any, d: any
): DayPlan {
  return {
    date,
    dayName,
    meals: {
      breakfast: makeMeal(`b-${date}`, b, b.timing),
      morningSnack: makeMeal(`ms-${date}`, ms, ms.timing),
      lunch: makeMeal(`l-${date}`, l, l.timing),
      eveningSnack: makeMeal(`es-${date}`, es, es.timing),
      dinner: makeMeal(`d-${date}`, d, d.timing.replace("7:", i18nTiming(_idx))),
    },
  }
}

function i18nTiming(idx: number): string {
  // Slightly vary dinner times
  return ["7", "7", "7", "7", "8", "8", "7"][idx] + ":"
}

function makeMeal(id: string, t: any, timing: string): MealSlot {
  return {
    mealId: id,
    name: t.name,
    timing: timing || t.timing,
    recipe: {
      id: `r-${id}`,
      name: t.name,
      prepTime: t.prep,
      cookTime: t.cook,
      servings: 1,
      difficulty: t.cook > 20 ? "medium" : "easy",
      cuisine: t.cuisine,
      dietaryTags: t.tags,
      ingredients: t.ingredients.map((i: any) => ({ name: i.name, quantity: i.qty, unit: i.unit, notes: undefined })),
      instructions: t.instructions,
      tips: t.tips,
      nutritionalInfo: { calories: t.cal, protein: t.p, carbs: t.c, fat: t.f, fiber: t.fib },
    },
  }
}

// ─── Shopping List Generator ─────────────────────────────────────

function generateShoppingList(days: DayPlan[]): ShoppingItem[] {
  const itemMap = new Map<string, { qty: number; unit: string; category: string }>()

  const CATEGORIES: Record<string, string> = {
    oats: "Grains", rice: "Grains", quinoa: "Grains", bread: "Grains", flour: "Grains", pasta: "Grains", roti: "Grains",
    chicken: "Protein", fish: "Protein", eggs: "Protein", lentils: "Protein", chickpeas: "Protein", nuts: "Protein",
    banana: "Produce", apple: "Produce", berries: "Produce", spinach: "Produce", tomato: "Produce", onion: "Produce",
    garlic: "Produce", ginger: "Produce", lemon: "Produce", carrot: "Produce", pepper: "Produce", avocado: "Produce",
    cucumber: "Produce", mango: "Produce", papaya: "Produce", zucchini: "Produce", peas: "Produce", coriander: "Produce", mint: "Produce",
    yogurt: "Dairy", milk: "Dairy", butter: "Dairy", cheese: "Dairy", paneer: "Dairy",
    oil: "Pantry", "olive oil": "Pantry", honey: "Pantry", salt: "Pantry", cumin: "Pantry",
    turmeric: "Pantry", cinnamon: "Pantry", chia: "Pantry", hummus: "Pantry", soy: "Pantry",
  }

  for (const day of days) {
    for (const meal of Object.values(day.meals)) {
      for (const ing of meal.recipe.ingredients) {
        const key = ing.name.toLowerCase()
        const existing = itemMap.get(key)
        if (existing) {
          existing.qty += ing.quantity
        } else {
          const cat = Object.entries(CATEGORIES).find(([k]) => key.includes(k))?.[1] ?? "Other"
          itemMap.set(key, { qty: ing.quantity, unit: ing.unit, category: cat })
        }
      }
    }
  }

  return Array.from(itemMap.entries())
    .filter(([_, v]) => v.qty > 0)
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: Math.round(data.qty * 2) / 2,
      unit: data.unit,
      category: data.category,
      checked: false,
    }))
}

// ─── Helpers ─────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
