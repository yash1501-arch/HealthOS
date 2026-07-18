# Feature Spec: Progressive Dashboard

## 1. Overview
The home screen showing health score, quick stats, progress charts, and quick actions. Adapts based on how much data the user has provided.

## 2. User Stories
- US-12: As a user, I want a dashboard showing my health progress

## 3. Acceptance Criteria
- [ ] Health Score (0-100 composite) with trend indicator
- [ ] Quick stats row: weight, avg pain, sleep avg, water intake
- [ ] Progress chart (time-series, selectable metric)
- [ ] Time range selector (1W, 1M, 3M, 6M, 1Y)
- [ ] Recent activity mini-feed (last 5 events)
- [ ] Quick action buttons (check-in, upload report, vision, refresh)
- [ ] Streak display (consecutive check-in weeks)
- [ ] Empty state for new users with CTA to start assessment
- [ ] Metric tooltips explaining what and why

## 4. Data Schema
- Tables: `progress_metrics`, `weekly_checkins`, `health_timeline`
- Reference: `03-Database-Schema.md` §6

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/dashboard/stats | Aggregate stats |
| GET | /api/dashboard/progress/:metric | Time-series data |

## 6. UI Components
- HealthScoreGauge (circular or horizontal bar)
- StatsRow (4 metric cards with trend arrows)
- ProgressChart (Recharts/visx line chart)
- TimeRangeSelector (button group)
- ActivityFeed (vertical timeline list)
- QuickActions (icon + label grid)
- EmptyState (illustration + CTA)
- MetricTooltip (popover on hover/click)

## 7. Error States
| Scenario | Message |
|----------|---------|
| No data at all | Empty state → "Start your health assessment" |
| Missing specific metric | "No data yet for this metric" |
| API fails | "Could not load dashboard data" + retry button |

## 8. Edge Cases
- Brand new user with no data → show empty state only
- User with assessment but no AI data → show profile summary
- User with full data → show all sections
- Very large dataset → aggregate to weekly/monthly averages
