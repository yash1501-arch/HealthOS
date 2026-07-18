# AI Architecture — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. AI Module Overview

HealthOS uses multiple specialized AI engines, each responsible for a domain. They share infrastructure (LLM access, embedding model, vector DB) but operate as independent pipelines.

```
┌──────────────────────────────────────────────────────────────────┐
│                     AI Orchestrator Layer                         │
│  Routes requests to appropriate engine, manages context, logs    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ OCR Engine  │  │ CV/ Pose │  │  LLM     │  │ Embedding    │  │
│  │ Tesseract / │  │ MediaPipe│  │ Claude / │  │ text-embed-  │  │
│  │ Textract    │  │ MoveNet  │  │ GPT-4    │  │ ding-3       │  │
│  └─────────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ Report       │  │ Vision     │  │ Recommen-  │               │
│  │ Engine       │  │ Engine     │  │ dation     │               │
│  └──────────────┘  └────────────┘  └────────────┘               │
│                                                                   │
│  ┌──────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ Nutrition    │  │ Exercise   │  │ Routine    │               │
│  │ Engine       │  │ Engine     │  │ Engine     │               │
│  └──────────────┘  └────────────┘  └────────────┘               │
│                                                                   │
│  ┌──────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ Check-in     │  │ Timeline   │  │ Safety     │               │
│  │ Engine       │  │ Engine     │  │ Engine     │               │
│  └──────────────┘  └────────────┘  └────────────┘               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Engine Specifications

### 2.1 OCR Engine
**Purpose:** Extract text from uploaded medical reports (PDF, JPEG, PNG)

| Setting | Value |
|---------|-------|
| Primary | Tesseract.js (client-side preview) + AWS Textract or Azure Document Intelligence (server-side) |
| Fallback | Tesseract CLI |
| Languages | English |
| Preprocessing | Contrast enhancement, deskew, DPI normalization |
| Output | Raw text → structured key-value pairs via LLM parsing |

### 2.2 Computer Vision / Pose Engine
**Purpose:** Estimate posture and movement from photos/videos

| Setting | Value |
|---------|-------|
| Model | MediaPipe Pose (Landmarker) |
| Landmarks | 33 body landmarks per frame |
| Photos | Single-frame inference → angle calculation |
| Videos | Keyframe extraction every 15 frames → per-frame inference → movement tracking |
| Angles Calculated | Neck flexion, shoulder protraction, pelvic tilt, knee valgus, ankle dorsiflexion |
| Classification | Rule-based thresholding on angles → mild/moderate/severe |
| Video Analysis | Gait symmetry, squat depth, bend mechanics |
| Deployment | WebAssembly (client) or Python service (server) |
| Privacy Option | On-device processing via WebAssembly for photos |

### 2.3 LLM Engine
**Purpose:** Generate human-readable explanations, recommendations, plans

| Setting | Value |
|---------|-------|
| Primary Model | Claude (Anthropic) or GPT-4o (OpenAI) |
| Fallback | GPT-4o-mini or Claude Haiku for cost-sensitive tasks |
| Max Tokens | 4096 (reports), 2048 (recommendations), 1024 (check-in summary) |
| Temperature | 0.3 (factual tasks), 0.7 (creative plans like diet) |
| Structured Output | JSON mode / tool use for parseable responses |

### 2.4 Embedding Engine
**Purpose:** Enable semantic search on health timeline

| Setting | Value |
|---------|-------|
| Model | text-embedding-3-small (1536 dims) |
| Storage | pgvector (PostgreSQL) |
| Index | IVFFLAT with cosine similarity |
| Use Cases | Natural language query on timeline, similar report retrieval |

### 2.5 Safety Engine
**Purpose:** Detect red-flag symptoms and ensure safe output

| Check | Logic |
|-------|-------|
| Red-flag symptoms | Keyword + severity matching against predefined list (chest pain, sudden vision loss, etc.) |
| Disclaimer injection | Append medical disclaimer to all AI outputs |
| Confidence threshold | If confidence < 0.4, mark as "low confidence — consult your doctor" |
| PHI leakage | Strip all PII from prompts sent to external LLM APIs |
| Output validation | Ensure AI never uses diagnostic language ("you have X disease") |

---

## 3. AI Agent Workflow

### 3.1 Report Analysis Workflow

```
User uploads report (PDF/Image)
       │
       ▼
┌─────────────────────────────────────┐
│ Step 1: File Validation             │
│ - MIME type check                   │
│ - Size check (max 20MB)             │
│ - Virus scan                        │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 2: OCR Extraction              │
│ - PDF: Extract all pages as images  │
│ - Run Tesseract/Textract            │
│ - Return raw text                   │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 3: Structured Parsing (LLM)    │
│ Prompt: "Extract lab test values    │
│ from this report. Return as JSON    │
│ with test_name, value, unit,        │
│ reference_range."                   │
│                                     │
│ Output: [{test_name, value, unit,   │
│   reference_range, flag}]           │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 4: Trend Analysis              │
│ - Compare with historical results   │
│ - Direction: improving/worsening/   │
│   stable/new                        │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 5: Explanation Generation      │
│ Prompt: "Explain these lab results  │
│ to a patient in simple language.    │
│ Then provide a brief clinical       │
│ summary."                           │
│                                     │
│ Output: patient_summary +           │
│   doctor_summary                    │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 6: Store & Index               │
│ - Save to PostgreSQL                │
│ - Create timeline entry             │
│ - Generate embedding for search     │
│ - Queue recommendation re-gen       │
└─────────────────────────────────────┘
```

### 3.2 Vision Analysis Workflow

```
User uploads photos / videos
       │
       ▼
┌─────────────────────────────────────┐
│ Step 1: Validation                  │
│ - File type, size, privacy consent  │
│ - Check: full body visible (basic)  │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 2: Media Processing            │
│ Photos: Decode, normalize           │
│ Videos: Extract keyframes (every    │
│   15 frames), skip blurry frames    │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 3: Pose Estimation             │
│ - Run MediaPipe Pose per frame      │
│ - Extract 33 landmarks              │
│ - Filter low-confidence detections  │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 4: Angle Calculation           │
│ - Neck angle: ear-shoulder-hip      │
│ - Shoulder: acromion markers        │
│ - Pelvic tilt: ASIS-PSIS            │
│ - Knee valgus: hip-knee-ankle       │
│ - Ankle: knee-ankle-foot            │
│                                     │
│ Videos: Track angle over frames     │
│   → ROM, symmetry, stability        │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 5: Classification              │
│ Threshold-based rules:              │
│ Forward head: neck angle > 20°      │
│ Rounded shoulders: shoulder angle   │
│   > 30° from neutral                │
│ Pelvic tilt: angle > 10°            │
│ Knee valgus: Q-angle > 15°          │
│                                     │
│ Each: none / mild / moderate /      │
│   severe                            │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 6: Summary Generation (LLM)    │
│ Prompt: "Generate a plain-language  │
│ summary of these posture findings.  │
│ The user is not a medical           │
│ professional. State observations    │
│ only, not diagnoses."              │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 7: Store & Index               │
│ - Save findings to PostgreSQL       │
│ - Create timeline entry             │
│ - Queue recommendation re-gen       │
└─────────────────────────────────────┘
```

### 3.3 Recommendation Generation Workflow

```
Trigger: New data / weekly check-in / manual refresh
       │
       ▼
┌─────────────────────────────────────┐
│ Step 1: Context Assembly            │
│ Collect from DB:                    │
│ ├─ Profile + Assessment             │
│ ├─ Latest lab results + trends      │
│ ├─ Active posture characteristics   │
│ ├─ Current goals + priorities       │
│ ├─ Recent check-in data             │
│ ├─ Current plan adherence stats     │
│ └─ Previous recommendations (v-N)   │
│                                     │
│ Bundle into structured context      │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 2: Safety Check                │
│ Scan context for red-flag symptoms  │
│ If FOUND: skip generation, return   │
│   emergency care recommendation     │
│ If CLEAR: proceed                   │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 3: LLM Generation              │
│                                     │
│ System Prompt:                       │
│ "You are a preventive health        │
│ assistant. You never diagnose.      │
│ You provide evidence-informed       │
│ suggestions. Always explain WHY.    │
│ Suggest topics for doctor           │
│ discussion. Confidence: high if     │
│ backed by guideline, medium if      │
│ circumstantial, low if uncertain."  │
│                                     │
│ Output format (JSON):               │
│ {                                   │
│   summary,                          │
│   suggestions: [{                   │
│     category,                       │
│     suggestion,                     │
│     confidence,                     │
│     evidence                        │
│   }],                               │
│   confidence_level,                 │
│   evidence_summary,                 │
│   doctor_topics,                    │
│   suggested_tests: [{               │
│     test_name, reason               │
│   }],                               │
│   red_flags                         │
│ }                                   │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 4: Output Validation           │
│ - Parse JSON                        │
│ - Check for diagnostic language     │
│ - Ensure disclaimer present         │
│ - Validate confidence levels        │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 5: Store & Notify              │
│ - Save as new version               │
│ - Create timeline entry             │
│ - Push in-app notification          │
│ - Log to ai_audit_logs              │
└─────────────────────────────────────┘
```

### 3.4 Weekly Check-in Workflow

```
Scheduled trigger (every 7 days)
       │
       ▼
┌─────────────────────────────────────┐
│ Step 1: Check-in Form Delivery      │
│ - Create blank check-in for week    │
│ - Notify user (push/email)          │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 2: User Submits Responses      │
│ - Validate all fields               │
│ - Save to weekly_checkins           │
│ - Update progress_metrics           │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 3: AI Summary & Plan Update    │
│ Prompt: "Compare this week's data   │
│ to last week. Highlight changes.    │
│ Update recovery plans accordingly." │
│                                     │
│ Output: ai_summary + plan_revision  │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 4: Auto-update Plans           │
│ - Adjust exercise plan (progression │
│   if adherent, regress if not)      │
│ - Adjust diet plan if weight        │
│   goal off-track                    │
│ - Regenerate recommendations        │
└─────────────────────────────────────┘
```

### 3.5 Timeline NLQ Workflow

```
User asks: "How has my Vitamin D changed over the last year?"
       │
       ▼
┌─────────────────────────────────────┐
│ Step 1: Embed Query                 │
│ "How has my Vitamin D changed over  │
│  the last year?"                    │
│  → embedding vector                 │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 2: Vector Search               │
│ SELECT * FROM health_timeline       │
│ WHERE user_id = :uid                │
│ ORDER BY embedding <=> :query_emb   │
│ LIMIT 10                            │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 3: Relevant Data Retrieval     │
│ - Fetch matching timeline entries   │
│ - Fetch detailed lab_results        │
│ - Fetch report_analyses             │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 4: LLM Answer Generation       │
│ Prompt: "The user asks about their  │
│ health data. Answer using ONLY the  │
│ provided timeline entries. Cite     │
│ specific dates and values."         │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Step 5: Return Answer + Sources     │
│ answer: "Your Vitamin D has         │
│   improved from 18 (Jan) to 22      │
│   (Jul). Still below normal."       │
│ sources: [{date, value}]            │
└─────────────────────────────────────┘
```

---

## 4. Prompt Library

### 4.1 System Prompt — Recommendation Engine

```text
You are a preventive health assistant called HealthOS.
You NEVER diagnose diseases or replace doctors.
You provide evidence-informed, personalized wellness suggestions.

Rules:
1. Always explain WHY each suggestion was made.
2. Reference specific user data (lab values, pain scores, lifestyle).
3. Use confidence levels: HIGH (guideline-backed), MEDIUM (circumstantial), LOW (uncertain).
4. Suggest topics the user should discuss with their healthcare provider.
5. If you recommend tests, use the phrase: "These are tests you may wish to discuss with your healthcare provider."
6. Never say "you have [disease]". Say "your [value] is [low/high] relative to the reference range."
7. Detect red-flag symptoms (chest pain, sudden severe headache, vision loss, etc.) and flag them for immediate medical attention.
8. Output in JSON format as specified.
```

### 4.2 System Prompt — Report Explanation

```text
You are a medical report translator for patients.
You receive raw lab values and create two outputs:

1. Patient-friendly explanation (8th grade reading level):
   - Explain what each test measures
   - Tell them their value relative to normal range
   - Use plain language, not jargon
   - Be reassuring but honest
   - Never say "you have [condition]"

2. Doctor-friendly summary:
   - Concise clinical summary
   - Key abnormalities
   - Trends from previous reports
   - Brief enough for a physician to read in 10 seconds
```

### 4.3 System Prompt — Diet Plan

```text
You are a nutrition planner for HealthOS.
Create a 7-day meal plan based on the user's profile.

Constraints:
- Diet type: {diet_type}
- Allergies: {allergies}
- Restrictions: {restrictions}
- Medical: {conditions} (e.g., diabetes, high cholesterol)
- Goals: {goals} (e.g., lose weight, gain muscle)
- Budget: {budget}
- Cooking time available: {minutes} min/day
- Region: {region} (for food availability)

Output:
- 3 meals + 2 snacks per day
- Calories and protein for each meal
- Daily totals
- Shopping list (categorized)
- Simple recipes (5 ingredients max, 20 min prep)
- Meal timing aligned with user's wake/sleep schedule
```

### 4.4 System Prompt — Exercise Plan

```text
You are an exercise planner for HealthOS.
Create a 7-day exercise plan based on the user's profile.

Constraints:
- Pain areas: {pain_areas} with severity
- Posture findings: {posture_findings}
- Mobility limitations: {limitations}
- Recovery stage: {stage} (acute / sub-acute / chronic / maintenance)
- Goals: {goals}
- Available equipment: {equipment}
- Exercise history: {frequency}

Output per day:
- Warm-up (5 min)
- Main exercises (name, sets, reps, rest, modifications)
- Cool-down / stretching

Rules:
- Never prescribe exercises that could aggravate reported pain
- Include modifications for all levels
- Progressive overload week over week
- Include [STOP] indicators (stop if pain increases)
```

### 4.5 System Prompt — Check-in Summary

```text
You are a health coach reviewing a user's weekly check-in.
Compare this week to last week's data.

Highlight:
1. What improved (celebrate)
2. What declined (encourage)
3. What stayed the same
4. One specific suggestion for next week

Tone: Encouraging but honest. Short (2-3 sentences).
```

### 4.6 System Prompt — Timeline QA

```text
You are a health data analyst.
The user has asked a question about their health history.

You have access to their timeline entries and detailed records.
Answer using ONLY the provided data. Cite specific dates and values.
If the data does not contain the answer, say so.

Format:
- Answer in plain language
- Include relevant sources with dates and values
- Do not interpret beyond what the data shows
```

---

## 5. RAG Architecture

### 5.1 Overview
The timeline uses a simple RAG pipeline for natural language queries:

```
User Query
    │
    ▼
Embedding Model (text-embedding-3-small)
    │
    ▼
Vector Search (pgvector, cosine similarity, top 10)
    │
    ▼
Retrieve timeline entries + linked records (lab_results, report_analyses, recommendations)
    │
    ▼
LLM Generates Answer (grounded in retrieved context)
    │
    ▼
Return Answer + Cited Sources
```

### 5.2 What Gets Embedded

| Table | Embedded Content | Priority |
|-------|-----------------|----------|
| health_timeline | title + description | High — main search target |
| lab_results | test_name + value + unit + trend | High — lab queries |
| report_analyses | patient_summary | Medium — report queries |
| recommendations | summary + suggestions | Medium — plan queries |
| weekly_checkins | ai_summary | Low |

### 5.3 Embedding Strategy
- Embed on write (when new data is created)
- Batch process for backfill
- Update embedding when source content changes
- Store embedding dimension: 1536 (text-embedding-3-small)

---

## 6. AI Infrastructure

### 6.1 Model Deployment

| Model | Hosting | Fallback |
|-------|---------|----------|
| LLM (Claude/GPT-4) | API call | GPT-4o-mini / Claude Haiku |
| Embeddings | API call | — |
| OCR (Textract) | AWS service | Tesseract (self-hosted) |
| Pose Estimation | WebAssembly (client) or Python (server) | MoveNet (TensorFlow.js) |
| Media Processing | FFmpeg (server) | — |

### 6.2 Queue Architecture

```
API Request → BullMQ Queue → Worker Process → Callback / Polling

Queues:
1. report-processing
2. vision-analysis
3. recommendation-gen
4. diet-plan-gen
5. exercise-plan-gen
6. routine-gen
7. check-in-processing
8. timeline-indexing

Each queue has:
- Concurrency: 2-5 workers
- Retry: 3 attempts with exponential backoff
- Dead letter: after 3 failures
- TTL: 5 minutes
```

### 6.3 Cost Optimization

| Strategy | Detail |
|----------|--------|
| Caching | Cache diet/exercise plans for same profile config |
| Model Tiering | GPT-4o for complex tasks, GPT-4o-mini for simple ones |
| Batch Embeddings | Batch timeline entries every hour |
| On-device Pose | WebAssembly for photo analysis (free) |
| Prompt Compression | Strip irrelevant fields from context |
| Result Caching | Don't regenerate if inputs haven't changed |

---

## 7. MCP / Tool Calling

### 7.1 LLM Tool Definitions

The recommendation engine uses tool calling for structured outputs:

```json
{
  "name": "generate_recommendations",
  "description": "Generate personalized health recommendations",
  "parameters": {
    "type": "object",
    "properties": {
      "summary": { "type": "string" },
      "suggestions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "category": { "type": "string", "enum": ["exercise", "nutrition", "ergonomics", "lifestyle", "sleep", "stress"] },
            "suggestion": { "type": "string" },
            "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
            "evidence": { "type": "string" }
          }
        }
      },
      "doctor_topics": { "type": "array", "items": { "type": "string" } },
      "suggested_tests": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "test_name": { "type": "string" },
            "reason": { "type": "string" }
          }
        }
      },
      "red_flags": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["summary", "suggestions", "confidence_level"]
  }
}
```

### 7.2 Agent Routing Logic

```
Incoming Request
    │
    ▼
┌─────────────────────────────────────┐
│ Route by action type:               │
│                                     │
│ report.analyze    → Report Engine   │
│ vision.analyze    → Vision Engine   │
│ recommend.generate→ Recommend Engine│
│ diet.generate     → Nutrition Engine│
│ exercise.generate → Exercise Engine │
│ routine.generate  → Routine Engine  │
│ checkin.process   → Check-in Engine │
│ timeline.query    → Timeline Engine │
└─────────────────────────────────────┘
```
