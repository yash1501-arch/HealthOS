# UI/UX Design Guidelines — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. Design Philosophy

### 1.1 Principles
- **Calm & Trustworthy** — Health data is sensitive. The UI should feel safe, professional, and reassuring. No aggressive colors, no gimmicks.
- **Progressive Disclosure** — Show essential information first. Let users drill deeper for details. Never overwhelm.
- **Explainability** — Every AI output must have an accessible "Why?" mechanism.
- **Mobile-First** — Core flows (check-ins, quick views) should work on mobile. Complex input (assessment forms) should be comfortable on both mobile and desktop.
- **Accessibility** — WCAG 2.1 AA minimum. High contrast, readable fonts, proper focus states, screen reader support.

### 1.2 Tone of Voice
- Clear and simple — 8th-grade reading level for patient-facing content
- Professional but warm — not clinical, not casual
- Never alarmist — even for abnormal results
- Always direct users to consult healthcare professionals when appropriate

---

## 2. Design Tokens

### 2.1 Color Palette

```
Primary:        #0F6CBF (Calm Blue)         — Trust, health, action
Primary Dark:   #0A4F8A
Primary Light:  #E8F2FB

Secondary:      #2E7D6F (Teal)              — Wellness, growth, balance
Secondary Dark: #1E5A4F

Accent:         #F59E0B (Warm Amber)        — Warnings, attention (use sparingly)

Semantic:
  Success:      #10B981 (Green)
  Warning:      #F59E0B (Amber)
  Error:        #EF4444 (Red)
  Info:         #3B82F6 (Blue)

Neutrals:
  Background:   #F9FAFB (Off-white)
  Surface:      #FFFFFF (White)
  Border:       #E5E7EB
  Text Primary: #111827 (Near-black)
  Text Secondary:#6B7280 (Gray)
  Text Muted:   #9CA3AF

Status Flags:
  Normal:       #10B981
  Low:          #F59E0B
  High:         #EF4444
  Critical:     #DC2626
```

### 2.2 Typography

```
Font Family:
  Headings:     Inter (sans-serif)     — Clean, modern, excellent readability
  Body:         Inter (sans-serif)

Font Sizes:
  Display:       2.25rem  (36px)   — Page titles
  Heading 1:     1.875rem (30px)   — Section headers
  Heading 2:     1.5rem   (24px)   — Card titles
  Heading 3:     1.25rem  (20px)   — Sub-section headers
  Body Large:    1.125rem (18px)   — Lead text
  Body:          1rem     (16px)   — Default
  Body Small:    0.875rem (14px)   — Secondary text, labels
  Caption:       0.75rem  (12px)   — Timestamps, footnotes
  Tiny:          0.625rem (10px)   — Badges, flags (use sparingly)

Font Weights:
  Regular:    400
  Medium:     500
  Semibold:   600
  Bold:       700

Line Heights:
  Headings:   1.2
  Body:       1.6
```

### 2.3 Spacing

```
Base unit: 4px

Spacing Scale:
  xs:   4px
  sm:   8px
  md:   16px
  lg:   24px
  xl:   32px
  2xl:  48px
  3xl:  64px

Container Max Width: 1200px
Content Max Width: 720px (for reading / text-heavy sections)
```

### 2.4 Border Radius

```
  sm:    4px    — Inputs, badges
  md:    8px    — Cards, modals
  lg:    12px   — Large containers
  xl:    16px   — App shell
  full:  9999px — Pill badges, avatars
```

### 2.5 Shadows

```
  Card Shadow:      0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)
  Elevated:         0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
  Modal Overlay:    0 10px 25px rgba(0,0,0,0.15)
```

---

## 3. Component Design Patterns

### 3.1 Input System

```
Forms follow a consistent pattern:

┌──────────────────────────────────┐
│ Label                            │
│ ┌──────────────────────────────┐ │
│ │ Input field / select         │ │
│ └──────────────────────────────┘ │
│ Helper text (optional)           │
│ Error message (if invalid)       │
└──────────────────────────────────┘
```

- Labels always above inputs (not placeholder-based)
- Inputs: height 44px (touch target), border 1px solid border color
- Focus: 2px primary ring
- Error: red border + error text below
- All forms support keyboard navigation (tab order)
- Multi-step forms show progress indicator

### 3.2 Pain Assessment Input

```
Visual body map (front + back views)
  ┌─────────┐     ┌─────────┐
  │ Neck    │     │ Neck    │
  │ Shoulder│     │  Back   │
  │         │     │         │
  │  Torso  │     │ L Spine │
  │         │     │         │
  │  Hip    │     │  Hip    │
  │  Knee   │     │  Knee   │
  │  Foot   │     │  Foot   │
  └─────────┘     └─────────┘

Click on a body area → opens pain detail form for that area
```

### 3.3 Health Score

```
Circular gauge or horizontal bar:

   72/100
   ╭─────╮
   │ ◉   │   Health Score
   │     │   ▲ 5 pts from last month
   ╰─────╯

Breakdown (expandable):
  Nutrition   70%  ██████████░░
  Exercise    65%  █████████░░░
  Sleep       75%  ███████████░
  Pain        80%  ████████████
```

### 3.4 Suggestion Cards

```
┌──────────────────────────────────────────────────────┐
│ 🏋️  Exercise                          High Confidence │
│                                                      │
│ Include cat-cow stretches 2x daily to improve spine  │
│ mobility.                                            │
│                                                      │
│ [Why this?]  [View in Exercise Plan]                 │
└──────────────────────────────────────────────────────┘
```

### 3.5 Lab Results Table

```
┌──────────────┬────────┬────────────┬────────┐
│ Test         │ You    │ Range      │ Flag   │
├──────────────┼────────┼────────────┼────────┤
│ Vitamin D    │ 22     │ 30-100     │ 🔴 Low │
│ HbA1c        │ 5.4    │ 4.0-5.6    │ 🟢 Normal│
│ Cholesterol  │ 130    │ <200       │ 🟢 Normal│
└──────────────┴────────┴────────────┴────────┘

Color coding:
  🟢 Normal → green text
  🟡 Borderline → amber
  🔴 Abnormal → red
```

### 3.6 AI Explanation Button

```
[Why this?] — triggers a slide-in panel or modal:

┌─────────────────────────────────────────────┐
│ Why this recommendation?                     │
│                                             │
│ Your blood report shows Vitamin D at         │
│ 22 ng/mL (below normal). Your posture        │
│ analysis shows forward head, which can be    │
│ worsened by muscle weakness.                 │
│                                             │
│ Confidence: High                             │
│ Sources: Blood Report (Jul 15),              │
│          Posture Analysis (Jul 12)           │
│                                             │
│ Clinical references:                         │
│ • WHO guidelines on Vitamin D               │
│ • Journal of Orthopaedic & Sports Physical  │
│   Therapy, 2023                             │
│                                             │
│ [Discuss with your doctor if concerned]      │
└─────────────────────────────────────────────┘
```

### 3.7 Empty States

```
┌────────────────────────────────────┐
│                                    │
│        📊  No data yet             │
│                                    │
│  Complete your health assessment   │
│  to see progress tracked here.     │
│                                    │
│  [Start Assessment]                │
│                                    │
└────────────────────────────────────┘
```

### 3.8 Loading Skeletons

```
Use shimmer skeleton loading for:
- Dashboard charts
- Report analysis results
- Vision analysis results
- Recommendation cards

Example skeleton for suggestion card:
┌──────────────────────────────┐
│ ████████░░░░░░░░  ████░░     │  ← shimmer
│ ████████████████████████░░   │
│ ████████████████████░░░░░░   │
│                               │
│ [████]  [████████]            │
└──────────────────────────────┘
```

---

## 4. Page Layout

### 4.1 Authenticated App Shell

```
┌─────────────────────────────────────────────────────┐
│ Top Nav: Logo  │  Search  │  Notification  │ Avatar  │
├──────┬──────────────────────────────────────────────┤
│      │                                              │
│ Side │           Main Content Area                   │
│ Bar  │                                              │
│      │                                              │
│ Home │                                              │
│ Dash │                                              │
│ Rep. │                                              │
│ Vis. │                                              │
│ Diet │                                              │
│ Exer │                                              │
│ Rout │                                              │
│ Time │                                              │
│      │                                              │
│      │                                              │
├──────┴──────────────────────────────────────────────┤
│ Footer: Disclaimer | Privacy | Terms                │
└─────────────────────────────────────────────────────┘
```

### 4.2 Sidebar Navigation

```
🏠 Home
📊 Dashboard
📋 Reports
📸 Vision
🥗 Diet
🏋️  Exercise
📅 Routine
⏱️  Timeline
```

Mobile: Bottom tab bar instead of sidebar

---

## 5. Key Screen Wireframes (Text)

### 5.1 Dashboard (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│ 🏥 HealthOS                         🔔  👤 John         │
├────────┬────────────────────────────────────────────────┤
│ Home   │ [Health Score: 72 ▲5]   [Streak: 3 weeks 🔥]   │
│ Dash   │ ┌──────┬──────┬──────┬──────┐                  │
│ Reports│ │Wt:77.5│Pain:4│Sleep:7│Water:2L│              │
│ Vision │ │▼2.5kg │▼1    │▲0.5h │       │              │
│ Diet   │ └──────┴──────┴──────┴──────┘                  │
│ Exer   │                                                │
│ Rout   │ ┌──────────────────────────────────────┐       │
│        │ │ Weight Trend (1M)                     │       │
│ Time   │ │  ┌────────────────────────────────┐  │       │
│        │ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │       │
│        │ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │       │
│        │ │  └────────────────────────────────┘  │       │
│        │ └──────────────────────────────────────┘       │
│        │                                                │
│        │ ┌──────────────┬──────────────────────┐       │
│        │ │ Recent Activity│ Quick Actions       │       │
│        │ │ • Check-in sub│ [Check-in] [Report]  │       │
│        │ │ • Report read│ [Vision] [Refresh]   │       │
│        │ └──────────────┴──────────────────────┘       │
├────────┴────────────────────────────────────────────────┤
│ ⚕️  HealthOS is not a medical device. Consult your       │
│ physician for medical advice.                            │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Assessment Progress

```
┌─────────────────────────────────────────────┐
│ Complete Your Health Profile                 │
│                                             │
│ ████████████░░░░░░░░░░  60%                 │
│                                             │
│ Step 4 of 7: Nutrition                      │
│ ─────────────────────────────────────        │
│                                             │
│ Diet Type:                                  │
│ ○ Vegetarian  ○ Eggetarian                   │
│ ● Non-Vegetarian  ○ Vegan                   │
│                                             │
│ Food Allergies:                              │
│ [Peanuts] [Shellfish] [+ Add]               │
│                                             │
│ Cooking Time Available:                      │
│ ────●───────────────────  30 min             │
│                                             │
│ Monthly Food Budget:                         │
│ [₹   5000  ]                                 │
│                                             │
│ Favorite Foods:                              │
│ [Grilled Chicken] [Salads] [Rice] [+ Add]   │
│                                             │
│                    [Back] [Continue →]       │
└─────────────────────────────────────────────┘
```

### 5.3 Vision Results

```
┌─────────────────────────────────────────────┐
│ 📸 Posture Analysis — July 12, 2026         │
│                                             │
│ Summary: Your analysis shows moderate        │
│ forward head and mild rounded shoulders.     │
│ These may be related to your neck pain.      │
│                                             │
│ Body Visualization:                          │
│ ┌──────────────────────────────────────┐    │
│ │       🟢 Neck                         │    │
│ │       🟡 Shoulders (mild)             │    │
│ │       🟢 Upper Back                   │    │
│ │       🟢 Lower Back                   │    │
│ │       🟢 Pelvis                       │    │
│ │       🟢 Knees                        │    │
│ └──────────────────────────────────────┘    │
│                                             │
│ Key Findings:                                │
│ ┌──────────────────────────────────────┐    │
│ │ Forward Head     Moderate ●●●○○  87% │    │
│ │ Rounded Shoulders Mild    ●●○○○  72% │    │
│ │ Pelvic Tilt      None     ○○○○○  —   │    │
│ └──────────────────────────────────────┘    │
│                                             │
│ [What do these mean?] [Delete my photos]    │
└─────────────────────────────────────────────┘
```

---

## 6. Responsive Behavior

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 640px | Single column, bottom tab nav |
| Tablet | 640-1024px | Two column, collapsible sidebar |
| Desktop | > 1024px | Full sidebar + multi-column content |

### Mobile Adjustments:
- Sidebar → Bottom tab bar (5 icons + "More")
- Multi-column → Single column stacked
- Tables → Card list with horizontal scroll
- Charts → Full width, simplified
- Multi-step forms → Single full-screen steps
- Vision results → Simplified list view

---

## 7. Accessibility Requirements

- All interactive elements focusable and activatable via keyboard
- Visible focus indicator (2px outline, offset 2px)
- Color is never the sole indicator of meaning
- All images have alt text
- Forms have associated labels
- Error messages announced by screen readers
- Touch targets minimum 44x44px
- Motion preferences respected (`prefers-reduced-motion`)
- Contrast ratio: 4.5:1 normal text, 3:1 large text
- Semantic HTML structure (h1-h6, nav, main, aside)

---

## 8. AI Output Design Principles

| Principle | Implementation |
|-----------|---------------|
| Show confidence | Badge: High/Medium/Low on every suggestion |
| Show sources | "Based on your blood report, lifestyle assessment..." |
| Explain uncertainty | "This is a general suggestion. Your specific needs may vary." |
| Doctor disclaimer | Footer on every AI recommendation section |
| Never diagnose | "Your Vitamin D level is below the normal range" vs "You have Vitamin D deficiency" |
| Red flags | Bold warning banner for emergency symptoms |
| Editable inputs | Users can correct extracted lab values, override AI suggestions |

---

## 9. Micro-interactions & Animations

- Page transitions: 200ms ease-out fade + slight slide
- Card hover: Subtle shadow elevation increase
- Button press: Scale 0.97
- Form validation: Inline, on blur, no page reloads
- Processing states: Pulsing dots / skeleton screens (not spinners)
- Success: Brief green checkmark animation
- Error: Gentle red shake on invalid fields
- Respect `prefers-reduced-motion`: Disable all animations
