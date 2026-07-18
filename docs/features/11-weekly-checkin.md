# Feature Spec: Weekly AI Check-in

## 1. Overview
Every 7 days, the system prompts the user to complete a brief check-in. AI generates a summary and automatically updates plans based on progress.

## 2. User Stories
- US-11: As a user, I want a weekly AI check-in so my plan updates based on progress

## 3. Acceptance Criteria
- [ ] Scheduled notification every 7 days from assessment completion
- [ ] Fields: pain scores (per area), energy, sleep hours + quality, mood, weight, water, exercise completion %, walking, diet adherence %
- [ ] AI generates 2-3 sentence summary comparing to last week
- [ ] Plans auto-update based on check-in
- [ ] Streak tracking (consecutive check-ins)
- [ ] Can submit early or late (within 3 day window)
- [ ] In-app notification + optional email reminder

## 4. Data Schema
- Tables: `weekly_checkins`
- Reference: `03-Database-Schema.md` §6.1

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/check-in/current | Get current (or blank) check-in |
| POST | /api/check-in/submit | Submit check-in |

## 6. UI Components
- CheckinForm (sliders, number inputs, single page)
- PainScoreSliders (one per active pain area)
- AISummaryCard (highlighted AI response after submit)
- StreakBadge (flame icon + count)
- ReminderNotification (in-app toast)

## 7. Processing
After submission:
1. Save response
2. Update progress_metrics
3. Generate AI summary via LLM
4. Trigger recommendation re-evaluation
5. Adjust exercise/diet plans if needed
6. Update streak counter

## 8. Edge Cases
- User submits same check-in twice (idempotent)
- User misses 2+ weeks → "Welcome back" message, skip missed weeks
- User has no pain areas → pain score section hidden
- Weekend vs weekday submission (week boundary handling)
