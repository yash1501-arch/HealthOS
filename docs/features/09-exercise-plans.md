# Feature Spec: Exercise Plans

## 1. Overview
AI-generated weekly exercise plans based on pain areas, posture findings, mobility, goals, and recovery stage.

## 2. User Stories
- US-10: As a user, I want a personalized exercise plan

## 3. Acceptance Criteria
- [ ] 7-day plan with warm-up, main workout, cool-down
- [ ] Exercises named with sets, reps, rest intervals
- [ ] Modifications for different fitness levels
- [ ] Never prescribes exercises that could aggravate reported pain
- [ ] [STOP] indicators: "Stop if pain increases"
- [ ] Mark exercises as complete
- [ ] Weekly progression logic (increase difficulty if adherent)
- [ ] Regenerate with reason

## 4. Data Schema
- Tables: `exercise_plans`
- Reference: `03-Database-Schema.md` §5.3

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/exercise/plan | Get current plan |
| POST | /api/exercise/plan/regenerate | Regenerate |

## 6. UI Components
- ExercisePlanView (day tabs)
- ExerciseCard (name, sets x reps, rest, modification, [Demo] if available)
- WarmupSection (5 min dynamic stretching)
- CooldownSection (5 min static stretching)
- CompleteButton (checkmark to track adherence)
- ProgressionIndicator (this week vs next week)
- StopWarningBadge (highlighted for exercises with caution notes)

## 7. Error States
| Scenario | Message |
|----------|---------|
| Too many pain areas | "Limited exercise options due to multiple pain areas. Focus on gentle mobility work." |
| Generation failed | "Exercise plan generation failed. Try again." |

## 8. Edge Cases
- User has no equipment (bodyweight only)
- User with acute pain → only gentle ROM exercises
- Post-surgery recovery phase
- User completed all exercises → auto-progression next week
- User skipped most exercises → regression instead of progression
