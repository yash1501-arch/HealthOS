# Feature Spec: Progress Tracking & Health Score

## 1. Overview
Visual dashboard showing user progress over time across all metrics with a composite Health Score.

## 2. User Stories
- As a user, I want to see how my weight and pain have changed over time
- As a user, I want a simple health score to track overall progress

## 3. Acceptance Criteria
- [ ] Time-series chart for each metric
- [ ] Metrics: weight, BMI, waist, pain score (per area + avg), sleep, water, exercise adherence, walking, lab trends, health score
- [ ] Time ranges: 1W, 1M, 3M, 6M, 1Y, All
- [ ] Trend indicators (up/down arrows with % change)
- [ ] Health Score (0-100) with breakdown categories
- [ ] Score calculation based on: nutrition, exercise, sleep, pain, lab values
- [ ] Annotations on chart (events like "Started new exercise plan")
- [ ] Export/screenshot capability (optional MVP)

## 4. Data Schema
- Tables: `progress_metrics`
- Reference: `03-Database-Schema.md` §6.2

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/dashboard/progress/:metric | Time-series data |
| GET | /api/dashboard/stats | Health score + aggregate |

## 6. Health Score Formula (MVP)
```
Nutrition (25%): diet_adherence avg + water_intake vs target
Exercise (25%): exercise_completion avg + walking vs target
Sleep (20%): sleep_hours vs 7h target + sleep_quality avg
Pain (20%): 100 - (avg_pain_score × 10), capped 0-100
Labs (10%): % of lab values in normal range

Final = weighted average
```

## 7. UI Components
- MetricChart (line/area chart with time selector)
- MetricCard (current value, trend arrow, sparkline mini-chart)
- HealthScoreGauge (circular or segmented bar)
- ScoreBreakdown (horizontal stacked bar or radar chart)
- EventAnnotation (vertical line on chart with label)
- RangeSelector (button group)

## 8. Edge Cases
- Single data point → show as dot, not line
- Large gaps in data → dashed line or gap
- Outliers → flag for review
- User wants to compare two metrics (e.g., pain vs exercise)
