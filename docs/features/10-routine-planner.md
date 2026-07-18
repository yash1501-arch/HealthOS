# Feature Spec: Daily Routine Planner

## 1. Overview
AI-generated daily schedules optimized for the user's occupation, lifestyle, pain management, and goals. Integrates hydration breaks, stretch breaks, exercise, meals, and sleep.

## 2. User Stories
- US-09: As a user, I want a daily routine that adapts to my occupation and goals

## 3. Acceptance Criteria
- [ ] Timeline view: wake-up to sleep
- [ ] Includes: wake, hydrate, sunlight, meals, stretch breaks, work blocks, exercise, wind-down, sleep
- [ ] Adapts to occupation type (desk job → more stretch breaks, driving → neck exercises)
- [ ] Aligns with user's existing wake/sleep times
- [ ] Regenerate with reason

## 4. Data Schema
- Tables: `routines`
- Reference: `03-Database-Schema.md` §5.4

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/routine | Get today's routine |
| GET | /api/routine?day=monday | Get specific day |
| POST | /api/routine/regenerate | Regenerate |

## 6. UI Components
- RoutineTimeline (vertical timeline, time on left, activity on right)
- ActivityCard (time, icon, activity name, duration, notes)
- DaySelector (Mon-Sun tabs)
- RegenerateButton

## 7. Edge Cases
- Night shift worker (sleep during day, work at night)
- User with variable schedule (no fixed time)
- User already has a routine they don't want changed
- Multiple stretch breaks needed for high-sitting occupations
