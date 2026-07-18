# Feature Spec: Personalized Diet Plans

## 1. Overview
AI-generated weekly meal plans personalized to the user's medical history, dietary preferences, budget, cooking time, occupation, and goals.

## 2. User Stories
- US-08: As a user, I want a personalized weekly meal plan

## 3. Acceptance Criteria
- [ ] 7-day meal plan: breakfast, lunch, dinner, 2 snacks per day
- [ ] Daily targets: calories, protein (g), water (L)
- [ ] Meal timing based on user's wake/sleep schedule
- [ ] Shopping list (categorized)
- [ ] Simple recipes (5 ingredients max, 20 min prep)
- [ ] Rejects foods user avoids / is allergic to
- [ ] Aligns with diet type (veg/eggetarian/non-veg/vegan)
- [ ] Regenerate plan with optional reason for change
- [ ] Plan versioning (track changes week to week)

## 4. Data Schema
- Tables: `diet_plans`
- Reference: `03-Database-Schema.md` §5.2

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/diet/plan | Get current plan |
| POST | /api/diet/plan/regenerate | Regenerate |

## 6. UI Components
- WeeklyMealPlan (day tabs, each showing 3 meals + 2 snacks)
- MealCard (name, calories, protein, [Recipe] expand)
- RecipeModal (ingredients, instructions)
- DailyTargetsBar (calories + protein progress)
- ShoppingList (grouped by category, checkable)
- MealTimeline (visual time-of-day chart)
- RegenerateButton (with reason textarea)

## 7. Error States
| Scenario | Message |
|----------|---------|
| Too many restrictions | "Could not create varied plan with current restrictions. Loosening some constraints." |
| Generation failed | "Meal plan generation failed. Try again." |

## 8. Edge Cases
- User has dietary restriction + allergy + budget that severely limits options
- User wants to gain weight (calorie surplus) vs lose (deficit)
- Regional food availability (Indian, Western, etc.)
- Plan needs to change mid-week
