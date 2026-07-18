# Feature Spec: AI Recommendation Engine

## 1. Overview
The AI combines all user data (assessment, lab results, posture analysis, check-in history) to generate personalized, evidence-informed wellness recommendations with explanations, confidence levels, and doctor discussion topics.

## 2. User Stories
- US-06: As a user, I want personalized recommendations based on my complete profile
- US-07: As a user, I want suggested tests to discuss with my doctor

## 3. Acceptance Criteria
- [ ] Data fusion: combines all available user data sources
- [ ] Suggestion cards with categories (exercise, nutrition, ergonomics, lifestyle, sleep, stress)
- [ ] Confidence badge on each suggestion (high/medium/low)
- [ ] "Why this?" explanation panel for every suggestion
- [ ] Evidence references (clinical guidelines where applicable)
- [ ] Topics for doctor discussion (checklist)
- [ ] Suggested tests section with "discuss with your healthcare provider" verbiage
- [ ] Red-flag detection (warnings shown before recommendations)
- [ ] Versioning (track changes over time)
- [ ] Manual refresh trigger
- [ ] Auto-refresh when new data arrives
- [ ] Medical disclaimer always visible

## 4. Data Schema
- Tables: `recommendations`
- Reference: `03-Database-Schema.md` §5.1

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/recommendations | Get latest recommendations |
| POST | /api/recommendations/refresh | Trigger re-evaluation |

## 6. UI Components
- RecommendationSummary (intro paragraph)
- SuggestionCard (category icon, title, description, confidence badge, [Why?] button)
- WhyThisPanel (slide-in drawer with evidence, sources, references)
- ConfidenceBadge (High=green, Medium=amber, Low=gray)
- DoctorTopicsList (checkable items — print or show to doctor)
- SuggestedTestsList (test name + reason)
- LastUpdatedBadge (relative time)
- RefreshButton (with confirmation)
- DataSourcesUsed (checklist: which data contributed)

## 7. Confidence Levels
| Level | Meaning | Color |
|-------|---------|-------|
| High | Backed by clinical guideline + user's data matches | Green |
| Medium | Circumstantial evidence or partial data match | Amber |
| Low | General suggestion, weak user data | Gray |

## 8. Red Flag Handling
If any of these are detected, show full-screen warning before recommendations:
- Chest pain or pressure
- Sudden severe headache
- Sudden vision loss
- Shortness of breath at rest
- Unexplained weight loss
- Blood in stool/urine
- Suicidal thoughts

## 9. Error States
| Scenario | Message |
|----------|---------|
| AI service unavailable | "Recommendations temporarily unavailable. Try again later." |
| Insufficient data | "Complete your health assessment to get personalized recommendations." |
| Generation timeout | "Took longer than expected. Please try refreshing." |

## 10. Edge Cases
- User with no lab data → recommendations based on lifestyle + pain only
- Conflicting data (e.g., user says no pain but posture analysis shows issues)
- All AI suggestions are "low confidence" → show with appropriate messaging
- Recommendations unchanged after refresh (cached, no new data)
