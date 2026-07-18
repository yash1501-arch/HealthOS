# User Flows & Journey Maps — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. Onboarding Flow

```
Landing Page
    │
    ▼
[Sign Up] ─────────────────────────────────────────────── [Login]
    │                                                         │
    ▼                                                         ▼
Email + Password                                         Email + Password
    │                                                         │
    ▼                                                         ▼
Privacy Consent ◄────── Read Privacy Policy              Authenticate
    │                                                         │
    ▼                                                         ▼
Medical Disclaimer ◄──── Read Disclaimer            ┌── Has Profile? ──┐
    │                                                │                  │
    ▼                                               Yes                No
Email Verification                                     │                  │
    │                                                  ▼                  ▼
    ▼                                            Dashboard        Onboarding
Welcome Screen
    │
    ▼
[Start Health Assessment]
```

---

## 2. Health Assessment Flow

```
Assessment Start
    │
    ├──► Step 1: Personal Information
    │       ├── Name, DOB, Age (auto-calc), Biological Sex
    │       ├── Height, Weight, Waist (optional), Blood Group (optional)
    │       └── [Continue]
    │
    ├──► Step 2: Occupation
    │       ├── Job Title, Industry
    │       ├── Working Hours, Shift Schedule
    │       ├── Remote/Office/Field
    │       ├── Sitting/Standing/Driving Hours
    │       └── [Continue]
    │
    ├──► Step 3: Lifestyle
    │       ├── Wake-up/Bedtime, Sleep Hours, Sleep Quality
    │       ├── Water Intake, Sunlight Exposure, Screen Time
    │       ├── Walking, Exercise Frequency
    │       ├── Stress Level (1-10)
    │       ├── Smoking, Alcohol, Caffeine
    │       └── [Continue]
    │
    ├──► Step 4: Nutrition
    │       ├── Diet Type (Veg/Eggetarian/Non-Veg/Vegan)
    │       ├── Food Allergies, Dietary Restrictions
    │       ├── Religious Preferences
    │       ├── Cooking Time, Monthly Budget
    │       ├── Favorite Foods, Foods to Avoid
    │       └── [Continue]
    │
    ├──► Step 5: Medical History
    │       ├── Current Conditions (multi-select + free text)
    │       ├── Past Illnesses, Surgeries
    │       ├── Current Medications
    │       ├── Allergies
    │       ├── Family History
    │       └── [Continue]
    │
    ├──► Step 6: Pain Assessment
    │       ├── Select body area(s) from visual body map
    │       │   └── For each area:
    │       │       ├── Severity (1-10 slider)
    │       │       ├── Duration (dropdown)
    │       │       ├── Frequency (dropdown)
    │       │       ├── Pain Type (multi-select)
    │       │       ├── Triggering Activities
    │       │       ├── Relieving Factors
    │       │       ├── Morning Stiffness (yes/no)
    │       │       └── Mobility Limitations
    │       ├── [Add Another Area] / [Continue]
    │       └── Supported: Neck, Back, Knee, Shoulder, Hip, Foot, Wrist, Elbow
    │
    ├──► Step 7: Goals
    │       ├── Multi-select from predefined goals
    │       ├── Custom goal (text input)
    │       ├── Priority ordering
    │       └── [Complete Assessment]
    │
    ▼
Assessment Complete Screen
    │
    ├──► [Upload Medical Reports]  ─────  Go to Reports Flow
    ├──► [Upload Posture Photos]   ─────  Go to Vision Flow
    └──► [Go to Dashboard]         ─────  Dashboard
```

---

## 3. Vision Analysis Flow

```
Vision Section
    │
    ▼
Privacy Notice
    "We analyze your photos/videos to estimate posture and movement
     characteristics. These are observations, not medical diagnoses.
     Your media is encrypted and you can delete it anytime."
    │
    ├── [I Consent, Continue]
    └── [Not Now] ───► Dashboard
    │
    ▼
Upload Photos (Step 1)
    ├── Front Body Photo ──── [Upload / Take Photo]
    ├── Side Body Photo  ──── [Upload / Take Photo]
    └── Back Body Photo  ──── [Upload / Take Photo]
    │
    ├── [Next: Upload Videos (Optional)]
    └── [Skip Videos]
    │
    ▼
Upload Videos (Optional Step 2)
    ├── Walking Video  ──── [Upload / Record]
    ├── Squatting Video ──── [Upload / Record]
    └── Bending Video  ──── [Upload / Record]
    │
    ├── [Submit for Analysis]
    └── [Skip All Videos]
    │
    ▼
Processing Screen
    ├── Progress bar
    ├── "Analyzing your posture..."
    └── ETA: ~30-60 seconds
    │
    ▼
Results Screen
    ├── Posture Summary (text)
    │
    ├── Body Visualization
    │   ├── Overlay showing detected posture characteristics
    │   └── Color-coded: Green (no issue) / Yellow (mild) / Red (moderate-severe)
    │
    ├── Key Findings
    │   ├── Forward Head: Moderate ──── [What does this mean?]
    │   ├── Rounded Shoulders: Mild ──── [What does this mean?]
    │   └── Pelvic Tilt: None
    │
    ├── [What These Findings Mean]
    │       ├── Explanation for each finding
    │       ├── Possible contributing factors
    │       └── Note: "These are observations, not diagnoses"
    │
    ├── [How This Affects My Recommendations]
    │       └── Vision data integrated into recommendation engine
    │
    ├── [Delete My Photos/Videos]
    └── [Done — Go to Recommendations]
```

---

## 4. Medical Report Upload Flow

```
Reports Section
    │
    ▼
[Upload Report]
    │
    ▼
Upload Screen
    ├── [Choose File] (PDF / JPEG / PNG)
    ├── Report Type (dropdown): Blood Report, MRI, X-Ray, CT, DEXA, Other
    ├── Report Date (date picker)
    └── Title (optional)
    │
    ▼
Uploading... (Progress bar)
    │
    ▼
Processing Screen
    ├── "Extracting data from your report..."
    └── ETA: ~15-30 seconds
    │
    ▼
Results Screen
    ├── Report Summary
    │   ├── Patient-Friendly Explanation
    │   └── Doctor-Friendly Summary (expandable)
    │
    ├── Extracted Values (table)
    │   ├── Test Name | Your Value | Range | Flag
    │   ├─────
    │   ├── Vitamin D | 22 ng/mL | 30-100 | 🔴 Low
    │   └── HbA1c | 5.4% | 4.0-5.6 | 🟢 Normal
    │
    ├── Trend (if multiple reports exist)
    │   ├── Vitamin D: 18 (Jan) → 22 (Jul) — Improving 📈
    │   └── [View Trend Chart]
    │
    ├── [Edit Values] (manual correction)
    ├── [Delete Report]
    └── [Done — Updates applied to recommendations]
```

---

## 5. AI Recommendation Flow

```
Recommendations Section
    │
    ▼
Current Recommendations
    ├── Last Updated: [date]
    ├── Data Sources Used:
    │   ├── ✅ Lifestyle Assessment
    │   ├── ✅ Medical Reports (2)
    │   ├── ✅ Posture Analysis
    │   └── ✅ Past Check-ins (3 weeks)
    │
    ├── Summary Paragraph
    │
    ├── Suggestion Cards
    │   ├── [Category Tag] [Confidence Badge]
    │   ├── Suggestion text
    │   ├── Why this?
    │   │   └── Evidence explanation
    │   └── [Apply to Plan] (link to relevant section)
    │
    ├── Topics for Your Doctor
    │   └── Checklist items
    │
    ├── Suggested Tests (if any)
    │   └── "These are tests you may wish to discuss with your healthcare provider."
    │
    └── [Refresh Recommendations] ─── Confirmation → Processing → Updated
```

---

## 6. Diet Plan Flow

```
Diet Section
    │
    ▼
Weekly Meal Plan
    ├── Week: July 14 - July 20
    ├── Daily Targets: 2100 cal | 75g protein | 2.5L water
    │
    ├── Day Selector (Mon / Tue / Wed / ...)
    │   └── Selected Day View
    │       ├── Breakfast ──── [View Recipe]
    │       ├── Lunch ──────── [View Recipe]
    │       ├── Dinner ─────── [View Recipe]
    │       ├── Snacks ────── [View Recipe]
    │       └── Total: 1850 cal | 65g protein
    │
    ├── Shopping List ──── [Export / Print]
    │
    ├── Meal Timing ──── Visual timeline
    │
    └── [Regenerate Plan]
        ├── Reason for change (optional)
        └── Confirm → Processing → New Plan
```

---

## 7. Exercise Plan Flow

```
Exercise Section
    │
    ▼
Exercise Plan
    ├── Phase: Sub-acute Recovery
    ├── Week: July 14 - July 20
    │
    ├── Day Selector
    │   └── Selected Day View
    │       ├── Warm-up (5 min) ──── [View Exercises]
    │       │   └── Exercise list with reps/duration
    │       ├── Main Workout (20 min) ──── [View]
    │       ├── Cool-down (5 min) ──── [View]
    │       └── Completed? [✅ Mark Done]
    │
    ├── Weekly Progression
    │   ├── This Week: 3 sessions, Level 2
    │   └── Next Week: 3 sessions, Level 3 (if completed)
    │
    └── [Regenerate Plan]
```

---

## 8. Weekly Check-in Flow

```
Notification or Dashboard Reminder
    │
    ▼
Weekly Check-in (Week of July 14)
    │
    ├── Question 1: Pain Scores
    │   ├── Neck: [1-10 slider]
    │   ├── Back: [1-10 slider]
    │   └── Knee: [1-10 slider]
    │
    ├── Question 2: Energy Level [1-10 slider]
    ├── Question 3: Sleep [hours] + Quality [1-10]
    ├── Question 4: Mood [1-10 slider]
    ├── Question 5: Weight [kg input]
    ├── Question 6: Water Intake [L input]
    ├── Question 7: Exercise Completion [0-100% slider]
    ├── Question 8: Walking [steps or minutes]
    ├── Question 9: Diet Adherence [0-100% slider]
    └── Question 10: Notes (optional text)
    │
    ▼
Review & Submit
    │
    ▼
AI Summary Generated
    ├── "Good progress! Back pain reduced from 6 → 5."
    ├── "Sleep is stable at 7h."
    └── "Try increasing walking to 8000 steps."
    │
    ▼
Plans Updated Accordingly
    └── [View Updated Recommendations]
```

---

## 9. Dashboard Flow

```
Dashboard (Home Screen)
    │
    ├── Health Score: 72/100 ───── [What is this?]
    │   └── Breakdown: Nutrition 70 | Exercise 65 | Sleep 75 | Pain 80
    │
    ├── Quick Stats Row
    │   ├── Weight: 77.5 kg ▼ 2.5 kg
    │   ├── Avg Pain: 4/10 ▼ 1
    │   ├── Sleep: 7h ▲ 0.5h
    │   └── Streak: 3 weeks 🔥
    │
    ├── Chart: Select Metric ──── [Weight / Pain / Sleep / ...]
    │   └── Time Range: [1W / 1M / 3M / 6M / 1Y / All]
    │
    ├── Recent Activity (mini timeline)
    │   ├── Today — Weekly check-in submitted
    │   ├── Yesterday — Blood report analyzed
    │   └── 3 days ago — Posture analysis completed
    │
    └── Quick Actions
        ├── [Weekly Check-in]
        ├── [Upload Report]
        ├── [Vision Analysis]
        └── [Refresh Recommendations]
```

---

## 10. Health Timeline Flow

```
Timeline Section
    │
    ├── Search / Natural Language Query
    │   └── "How has my Vitamin D changed?"
    │       └── Shows answer + relevant timeline entries
    │
    ├── Filter Bar
    │   ├── All Events │ Lab Reports │ Assessments │ Pain Changes │ Recommendations
    │   └── Date Range: [From] — [To]
    │
    └── Timeline Feed (chronological)
        │
        ├── [Jul 15] — 📋 Blood Report Uploaded
        │   ├── Vitamin D: 22 ng/mL (Low)
        │   └── [View Full Report]
        │
        ├── [Jul 14] — 📝 Health Assessment Completed
        │   └── [View Assessment]
        │
        ├── [Jul 14] — 🤖 AI Recommendations Updated
        │   ├── Based on: new blood report + posture analysis
        │   └── [View Recommendations]
        │
        └── [Jul 12] — 📸 Posture Analysis Completed
            ├── Forward Head: Moderate
            ├── Rounded Shoulders: Mild
            └── [View Analysis]
```

---

## 11. Error & Edge Case Flows

### 11.1 Upload Failure
```
User uploads file
    │
    ▼
Validation fails
    │
    ├── [File too large]   → "Max file size is X MB. Your file is Y MB."
    ├── [Wrong format]     → "Supported formats: PDF, JPEG, PNG"
    ├── [Corrupted file]   → "File appears corrupted. Please try again."
    └── [Upload timeout]   → "Upload timed out. Check connection and try again."
```

### 11.2 AI Processing Failure
```
AI analysis fails
    │
    ├── [OCR failed]       → "Could not extract text. Try a clearer image."
    ├── [Vision failed]    → "Could not detect pose. Ensure full body is visible."
    └── [Service down]     → "AI service temporarily unavailable. Try again later."
```

### 11.3 First-Time User with No Data
```
Dashboard (empty state)
    ├── "Welcome to HealthOS!"
    ├── "Start by completing your health assessment so we can personalize your experience."
    └── [Start Assessment] ──── CTA button
```

### 11.4 Red Flag Detection
```
AI detects potential red-flag symptom
    │
    ▼
Red Flag Warning Overlay
    ├── "⚠️ Some of the symptoms you reported may require medical attention."
    ├── "Please consult a healthcare professional as soon as possible."
    ├── "This is not an emergency diagnosis."
    └── [I Understand] ─── Can't dismiss without acknowledgment
```
