# Feature Spec: Health Timeline

## 1. Overview
A chronological, searchable timeline of all health events. Supports natural language queries via RAG.

## 2. User Stories
- US-13: As a user, I want an AI-powered timeline to ask questions about my health history

## 3. Acceptance Criteria
- [ ] Chronological feed of all health events
- [ ] Event types: lab reports, assessments, pain changes, medications, recommendations, check-ins
- [ ] Filter by event type
- [ ] Filter by date range
- [ ] Natural language query input
- [ ] AI answers with citations (dates + values)
- [ ] Timeline entries link to source detail pages
- [ ] Infinite scroll (load more)
- [ ] New events appear in real-time

## 4. Data Schema
- Tables: `health_timeline`
- Reference: `03-Database-Schema.md` §6.3

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/timeline | Get timeline feed |
| GET | /api/timeline?eventType=lab_result | Filtered |
| POST | /api/timeline/query | NLQ query |

## 6. UI Components
- TimelineFeed (vertical timeline with icon-per-event-type)
- EventCard (icon, title, description, date, [View] link)
- FilterBar (event type chips + date range picker)
- SearchInput (NLQ box with microphone icon for future voice)
- AIAnswerCard (answer text + source citations)
- LoadMoreButton (infinite scroll trigger)

## 7. Event Types
| Type | Icon | Source |
|------|------|--------|
| lab_result | 📋 | medical_reports |
| assessment | 📝 | assessments |
| pain_update | 🤕 | pain_assessments |
| medication | 💊 | medical_history |
| recommendation | 🤖 | recommendations |
| checkin | ✅ | weekly_checkins |
| vision | 📸 | vision_analyses |

## 8. RAG Query Pipeline
```
1. User types: "Show all reports related to my knee pain"
2. Embed query (text-embedding-3-small)
3. Vector search on health_timeline.embedding
4. Retrieve top 10 matching entries
5. Fetch details (linked records)
6. LLM generates answer with citations
7. Display answer + source links
```

## 9. Error States
| Scenario | Message |
|----------|---------|
| No results | "No events found matching your query." |
| Query ambiguous | "Could you be more specific? Try adding a date or event type." |
| Embedding/LLM fails | "Search temporarily unavailable. Try again." |

## 10. Edge Cases
- Huge timeline (years of data) → pagination + search optimization
- User asks about data that doesn't exist yet → "No data found for that question"
- Multiple events on same day → ordered by created_at within day
- Deleted events → removed from timeline
