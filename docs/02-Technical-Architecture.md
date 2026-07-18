# Technical Architecture Document — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. System Overview

HealthOS follows a modular, service-oriented architecture. Each AI capability is isolated into an independent engine, communicating through a central API layer. The frontend is a single-page application communicating with a backend API server.

---

## 2. Tech Stack Recommendations

### 2.1 Frontend
| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | Next.js 14+ (React) | SSR, file-based routing, API routes, Vercel deployment |
| Language | TypeScript | Type safety across frontend |
| Styling | Tailwind CSS | Rapid prototyping, utility-first |
| State Management | Zustand + React Query | Lightweight state + server state caching |
| UI Components | shadcn/ui + Radix | Accessible, customizable primitives |
| Forms | React Hook Form + Zod | Performant forms with schema validation |
| Charts | Recharts or visx | Health data visualizations |

### 2.2 Backend
| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | Next.js API Routes (or FastAPI if decoupled) | Co-located with frontend; FastAPI if Python ML integration needed |
| Language | TypeScript (Next.js) / Python (FastAPI) | AI modules benefit from Python ecosystem |
| ORM | Prisma (TS) / SQLAlchemy (Python) | Type-safe DB access |
| Validation | Zod (TS) / Pydantic (Python) | Schema validation |
| Auth | NextAuth.js / Lucia | Session management, OAuth |
| Background Jobs | BullMQ + Redis | Queue AI inference tasks |

### 2.3 Database
| Component | Technology | Justification |
|-----------|-----------|---------------|
| Primary DB | PostgreSQL | Relational data, JSONB support, ACID compliance |
| Vector Search | pgvector extension | AI embedding similarity search |
| Caching | Redis | Session cache, job queue, rate limiting |
| File Storage | S3-compatible (AWS S3 / Cloudflare R2 / MinIO) | Medical reports, photos, videos |

### 2.4 AI/ML
| Module | Technology | Justification |
|--------|-----------|---------------|
| OCR | Tesseract.js / AWS Textract / Azure Document Intelligence | Text extraction from report PDFs/images |
| LLM | Claude API / OpenAI GPT-4 | Report explanation, recommendations, diet plans |
| Pose Estimation | MediaPipe Pose / MoveNet / OpenPose | Body landmark detection from photos/videos |
| Embeddings | text-embedding-3-small / ada-002 | Health timeline semantic search |
| Vector DB | pgvector | Store and query embeddings |

### 2.5 Infrastructure
| Component | Technology | Justification |
|-----------|-----------|---------------|
| Hosting | Vercel (frontend) + Railway/Render (backend) or AWS | Rapid deployment |
| Docker | Docker + docker-compose | Local development consistency |
| CI/CD | GitHub Actions | Automate tests and deployment |
| Monitoring | Sentry (errors) + Logtail/Axiom (logs) | Error tracking and observability |

---

## 3. Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│               Next.js SPA + SSR Pages                    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│              API Gateway (Next.js API Routes)             │
│         Authentication · Rate Limiting · Validation       │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│  User    │ │ Medical  │ │  Vision  │ │  Recommendation  │
│ Service  │ │ Report   │ │  Engine  │ │  Service         │
│          │ │ Service  │ │          │ │                  │
│ Auth     │ │ OCR      │ │ Pose     │ │ Fusion Layer     │
│ Profile  │ │ Extract  │ │ Estimate │ │ Generator        │
│ Assess-  │ │ Explain  │ │ Analysis │ │ Safety Check     │
│ ment     │ │ Trend    │ │          │ │                  │
└──────────┘ └──────────┘ └──────────┘ └──────────────────┘
       │          │          │              │
       └──────────┴──────────┴──────────────┘
                         │
                         ▼
          ┌─────────────────────────────┐
          │     PostgreSQL + pgvector    │
          │   + Redis + S3 File Store    │
          └─────────────────────────────┘
```

---

## 4. Module Architecture

### 4.1 Frontend Modules

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, Register, Reset Password
│   ├── (dashboard)/        # Main app (authenticated)
│   │   ├── assessment/     # Health assessment form
│   │   ├── reports/        # Medical report upload & view
│   │   ├── vision/         # Photo/video upload & results
│   │   ├── diet/           # Meal plans
│   │   ├── exercise/       # Exercise plans
│   │   ├── routine/        # Daily routine
│   │   ├── dashboard/      # Progress dashboard
│   │   └── timeline/       # Health timeline
│   └── api/                # API routes
├── components/             # Shared components
├── lib/                    # Utility functions, API client
├── stores/                 # Zustand stores
└── types/                  # TypeScript type definitions
```

### 4.2 Backend Module Interaction

```
[Mobile/Web Client]
       │
       ▼
[Next.js API Routes / FastAPI]
       │
       ├──► [Auth Module] ──────► PostgreSQL (users, sessions)
       │
       ├──► [Assessment Module] ──► PostgreSQL (assessments)
       │
       ├──► [Medical Report Module]
       │       ├──► OCR Service ───► Extracted Text
       │       ├──► LLM Service ───► Explanation + Trends
       │       └──► File Storage ───► S3 (PDFs, images)
       │
       ├──► [Vision Module]
       │       ├──► Pose Estimation ──► Landmarks + Analysis
       │       ├──► Video Processing ──► Frame Extraction
       │       └──► File Storage ──► S3 (photos, videos)
       │
       ├──► [Recommendation Module]
       │       ├──► Data Fusion ──► Combine all user data
       │       ├──► LLM Service ──► Generate recommendations
       │       └──► Safety Check ──► Red-flag detection
       │
       ├──► [Nutrition Module]
       │       └──► LLM Service ──► Meal plan generation
       │
       ├──► [Exercise Module]
       │       └──► LLM/Rules ──► Exercise plan generation
       │
       ├──► [Routine Module]
       │       └──► Template + AI ──► Daily schedule
       │
       ├──► [Progress Module]
       │       ├──► Check-in Service ──► Weekly questionnaire
       │       └──► Analytics ──► Trends + Health Score
       │
       └──► [Timeline Module]
               └──► Embeddings + Search ──► Vector similarity
```

---

## 5. Data Flow — Key User Journeys

### 5.1 Computer Vision Analysis Flow

```
User uploads photo/video
       │
       ▼
File validation (size, type, virus scan)
       │
       ▼
Upload to S3 → Return signed URL
       │
       ▼
Queue vision analysis job (BullMQ + Redis)
       │
       ▼
Worker picks up job:
  ┌── Photos → Run pose estimation (MediaPipe)
  │              → Extract body landmarks
  │              → Calculate angles (neck, shoulder, pelvis, knee)
  │              → Classify posture characteristics
  │
  └── Videos → Extract keyframes (every N frames)
               → Run pose estimation per frame
               → Track movement patterns
               → Classify mobility limitations
       │
       ▼
Store results in PostgreSQL
       │
       ▼
Trigger recommendation engine re-evaluation
       │
       ▼
Notify user (in-app notification)
```

### 5.2 Medical Report Analysis Flow

```
User uploads PDF/image
       │
       ▼
OCR pipeline extracts text
       │
       ▼
Parsing pipeline identifies key-value pairs
       │
       ▼
Standardization (unit conversion, reference range mapping)
       │
       ▼
Compare with previous reports → trend analysis
       │
       ▼
LLM generates:
  - Patient-friendly explanation
  - Doctor-friendly summary
       │
       ▼
Store in PostgreSQL
       │
       ▼
Update health timeline
```

### 5.3 Recommendation Generation Flow

```
Trigger (new data / weekly check-in / manual refresh)
       │
       ▼
Fusion layer collects:
  - Profile + Assessment data
  - Latest lab results + trends
  - Vision analysis results
  - Current exercise/routine adherence
  - Historical progress
       │
       ▼
Construct prompt with all context
       │
       ▼
LLM generates structured output:
  - Plain-language explanation
  - Personalized suggestions
  - Confidence levels
  - Evidence summary
  - Topics for doctor discussion
       │
       ▼
Safety module checks for red-flag content
       │
       ▼
Store + display to user
```

---

## 6. API Design

### 6.1 Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/reset-password | Password reset |

### 6.2 User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/profile | Get user profile |
| PUT | /api/profile | Update user profile |
| GET | /api/assessment | Get health assessment |
| POST | /api/assessment | Create/update health assessment |

### 6.3 Medical Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reports/upload | Upload report |
| GET | /api/reports | List all reports |
| GET | /api/reports/:id | Get report + analysis |
| DELETE | /api/reports/:id | Delete report |

### 6.4 Vision Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/vision/photos | Upload posture photos |
| POST | /api/vision/videos | Upload movement videos |
| GET | /api/vision/results | Get latest analysis |
| GET | /api/vision/results/:id | Get specific analysis |
| DELETE | /api/vision/media/:id | Delete uploaded media |

### 6.5 Recommendations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/recommendations | Get current recommendations |
| POST | /api/recommendations/refresh | Trigger re-evaluation |

### 6.6 Nutrition
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/diet/plan | Get current meal plan |
| POST | /api/diet/plan/regenerate | Regenerate meal plan |

### 6.7 Exercise
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/exercise/plan | Get current exercise plan |
| POST | /api/exercise/plan/regenerate | Regenerate exercise plan |

### 6.8 Routine
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/routine | Get daily routine |
| POST | /api/routine/regenerate | Regenerate routine |

### 6.9 Check-in
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/check-in/current | Get current week's check-in |
| POST | /api/check-in/submit | Submit weekly check-in |

### 6.10 Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Get aggregate stats |
| GET | /api/dashboard/progress/:metric | Get specific metric data |

### 6.11 Timeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/timeline | Get timeline events |
| POST | /api/timeline/query | Natural language query |

---

## 7. Security Architecture

### 7.1 Data Encryption
- At rest: AES-256 encryption for PHI in database
- In transit: TLS 1.3
- File storage: Server-side encryption (S3 SSE-S3 or SSE-KMS)
- Sensitive fields: Column-level encryption in PostgreSQL

### 7.2 Authentication & Authorization
- JWT with short expiry (15 min) + refresh token (7 days)
- Row-Level Security (RLS) on PostgreSQL — users see only their own data
- API rate limiting: 100 req/min per user
- File upload validation: MIME type, size limit (10MB photos, 50MB videos)

### 7.3 AI Safety
- Red-flag symptom detection before delivering recommendations
- Medical disclaimer appended to all AI outputs
- Confidence level shown for every recommendation
- Audit log for every AI interaction (prompt + response)
- Human review flag for high-uncertainty cases

---

## 8. Database Overview (High-Level)

### 8.1 Core Tables
- `users` — Account + auth
- `profiles` — Personal info, demographics
- `assessments` — Health assessment data (JSONB for flexibility)
- `occupations` — Occupation details (normalized for occupation-specific content)

### 8.2 Medical Data
- `medical_reports` — Uploaded files metadata
- `report_analyses` — OCR + parsed values
- `report_explanations` — AI-generated explanations
- `lab_results` — Standardized lab values over time

### 8.3 Vision Data
- `vision_media` — Photo/video metadata and file references
- `vision_analyses` — Pose estimation results
- `posture_characteristics` — Classified posture findings

### 8.4 AI Outputs
- `recommendations` — Generated recommendations (versioned)
- `diet_plans` — Weekly meal plans
- `exercise_plans` — Exercise routines
- `routines` — Daily schedules
- `weekly_checkins` — Check-in responses

### 8.5 Tracking
- `progress_metrics` — Time-series health data
- `health_timeline` — Chronological events
- `ai_audit_logs` — All AI interaction logs

---

## 9. Development & Deployment

### 9.1 Local Development
```
docker-compose up          # PostgreSQL + Redis + S3-compatible
npm run dev                # Next.js dev server
python -m venv; pip install -r requirements.txt  # AI services
```

### 9.2 CI/CD Pipeline (GitHub Actions)
1. Lint + Type check
2. Unit tests + Integration tests
3. Build Docker images
4. Deploy to staging
5. E2E tests on staging
6. Deploy to production

### 9.3 Environment Configuration
```
DATABASE_URL=
REDIS_URL=
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
JWT_SECRET=
ENCRYPTION_KEY=
OPENAI_API_KEY=          # or Anthropic
NEXT_PUBLIC_APP_URL=
```
