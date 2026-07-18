# Feature Spec: Health Assessment (Onboarding)

## 1. Overview
Multi-step onboarding form collecting personal info, occupation, lifestyle, nutrition, medical history, pain assessment, and goals. This is the foundation for all AI personalization.

## 2. User Stories
- US-02: As a new user, I want to complete a health assessment so the AI can personalize recommendations
- As a user, I want to save progress and continue later
- As a user, I want to edit my assessment after completion

## 3. Acceptance Criteria
- [ ] 7-step wizard with progress indicator
- [ ] Step 1: Personal Information (name, DOB, sex, height, weight, waist, blood group)
- [ ] Step 2: Occupation (title, industry, hours, shift, type, sitting/standing/driving hours)
- [ ] Step 3: Lifestyle (wake/sleep, sleep hours/quality, water, sunlight, screen, walking, exercise, stress, smoking, alcohol, caffeine)
- [ ] Step 4: Nutrition (diet type, allergies, restrictions, religious preferences, cooking time, budget, favorites, avoid)
- [ ] Step 5: Medical History (conditions, past illnesses, surgeries, medications, allergies, family history, pregnancy)
- [ ] Step 6: Pain Assessment (body map selection → severity, duration, frequency, type, triggers, relief, stiffness, mobility)
- [ ] Step 7: Goals (multi-select + priority + custom goal)
- [ ] Save draft to localStorage
- [ ] All fields validated client + server side
- [ ] Back navigation preserves previous answers
- [ ] Completion triggers AI recommendation generation

## 4. Data Schema
- Tables: `profiles`, `occupations`, `lifestyle`, `nutrition_profile`, `medical_history`, `pain_assessments`, `goals`
- Reference: `03-Database-Schema.md` §2

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/assessment | Get full assessment |
| POST | /api/assessment | Create/update assessment (partial accepted) |

## 6. UI Components
- AssessmentWizard (multi-step container with progress bar)
- PersonalInfoStep (date picker, number inputs)
- OccupationStep (text inputs, dropdowns, number inputs)
- LifestyleStep (time pickers, sliders, dropdowns)
- NutritionStep (radio group, tag input, sliders)
- MedicalHistoryStep (tag inputs, JSON builder for family history)
- PainAssessmentStep (clickable body SVG/illustration, sliders, dropdowns)
- GoalsStep (multi-select grid, drag-to-reorder priority)
- AssessmentSummary (read-only review before finalizing)

## 7. Error States
| Scenario | Message |
|----------|---------|
| Required field missing | "Please fill in all required fields" |
| Invalid value range | "Value must be between X and Y" |
| Draft load failure | "Could not restore draft. Starting fresh." |

## 8. Edge Cases
- User closes browser mid-assessment → draft restored on return
- User weight changes → edit vs new assessment versioning
- Pain area added then removed during same session
- User has no medical conditions or medications
