# HealthOS — AI-Powered Personal Health Operating System

> Your all-in-one platform for tracking, analyzing, and improving your health with the help of on-device AI and smart recommendations.

[![CI](https://github.com/your-org/healthos/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/healthos/actions/workflows/ci.yml)
[![Security](https://github.com/your-org/healthos/actions/workflows/security.yml/badge.svg)](https://github.com/your-org/healthos/actions/workflows/security.yml)

---

## ✨ Features

- **🧠 AI Health Score** — Get a comprehensive 0-100 health score based on your posture, nutrition, activity, sleep, stress, vision, and lab results
- **🩺 Medical Report Analysis** — Upload blood tests, X-rays, and prescriptions. AI extracts lab values, explains results in plain language, and tracks trends over time
- **🧘 Posture Analysis** — Use your phone camera to analyze forward head, rounded shoulders, pelvic tilt, knee valgus, and flat feet. All processing happens **on-device** — no images leave your browser
- **📸 Vision Analysis** — AI-powered body measurements and posture tracking from photos
- **🥗 Personalized Diet Plans** — 7-day meal plans tailored to your goals, allergies, preferences, and lab results. Modify any meal with AI
- **🏋️ Exercise Plans** — Custom workout plans that target your specific posture issues. Includes video-based squat, gait, and bending analysis
- **📋 Daily Routine** — AI-generated daily schedules that integrate your diet plan, workout times, posture breaks, and eye care reminders
- **📊 Weekly Check-ins** — Track energy, mood, sleep, pain, and adherence. Get AI-powered summaries and progress assessments
- **📈 Health Timeline** — Visualize your entire health journey. Ask natural language questions like "How has my posture changed?" or "Am I eating better?"
- **🔐 Privacy First** — PHI stripping before AI calls, on-device pose analysis, encrypted health data, and GDPR-compliant data deletion
- **💳 Subscription Plans** — Free tier included. Pro ($14.99/mo) for advanced features. Clinic ($299.99/mo) for practitioners

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (strict mode) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) + [Prisma 7](https://www.prisma.io/) ORM |
| **State** | [Zustand](https://github.com/pmndrs/zustand) + [React Query](https://tanstack.com/query) |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation |
| **AI/ML** | [OpenAI GPT-4o](https://openai.com/), [Anthropic Claude](https://www.anthropic.com/), [MediaPipe](https://developers.google.com/mediapipe) |
| **Forecasting** | [date-fns](https://date-fns.org/), [Recharts](https://recharts.org/) |
| **Payments** | [Stripe](https://stripe.com/) |
| **Storage** | [AWS S3](https://aws.amazon.com/s3/) / [Cloudflare R2](https://www.cloudflare.com/products/r2/) |
| **Animation** | [Framer Motion](https://www.framer.com/motion/), [GSAP](https://gsap.com/) |
| **Testing** | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) + [Vercel](https://vercel.com/) |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/healthos.git
cd healthos

# Install dependencies
npm install

# Copy environment variables and fill them in
cp .env.example .env
# Edit .env with your values:
#   DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, etc.
```

### Environment Variables

Create a `.env` file with the following (see `.env.example` for all variables):

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/healthos"
JWT_SECRET="generate-with-openssl-rand-base64-32"

# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Storage (S3-compatible)
S3_BUCKET="healthos-uploads"
S3_REGION="us-east-1"
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."

# Stripe (optional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev

# (Optional) Seed sample data
npx prisma db seed
```

### Development

```bash
# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
healthos/
├── prisma/                  # Database schema & migrations
│   ├── schema.prisma        # 20+ models (User, Profile, LabResult, DietPlan, etc.)
│   ├── seed.ts              # Sample data seeder
│   └── migrations/          # Migration history
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── (auth)/          # Login & register pages
│   │   ├── (dashboard)/     # Dashboard, goals, diet, exercise, routine, etc.
│   │   └── api/             # All API endpoints
│   ├── components/          # React components
│   │   ├── billing/         # PricingPage, UsageMeter
│   │   ├── checkin/         # CheckInForm, CheckInSummary
│   │   ├── dashboard/       # HealthScoreGauge, StatCard, ActivityChart, etc.
│   │   ├── diet/            # DietPlanView, MealCard
│   │   ├── exercise/        # ExercisePlanView, ExerciseCard
│   │   ├── layout/          # Sidebar
│   │   ├── reports/         # ReportUploader, ReportViewer
│   │   ├── routine/         # DailyRoutineView
│   │   ├── sections/        # Landing page sections
│   │   ├── timeline/        # TimelineView, AIQueryBox
│   │   └── ui/              # ScrollReveal, Toast, ErrorBoundary
│   ├── lib/                 # Utilities & business logic
│   │   ├── ai/              # LLM client, prompts, safety engine, OCR, engines
│   │   ├── auth/            # JWT, password, consent
│   │   ├── billing/         # Plans, Stripe client, usage tracker
│   │   ├── integrations/    # Apple Health, Google Fit
│   │   ├── reports/         # Lab parsing, trend computation
│   │   ├── security/        # Encryption, audit trail, input sanitizer
│   │   └── storage/         # S3 client
│   ├── stores/              # Zustand stores (theme, toast)
│   ├── types/               # Zod schemas & TypeScript types
│   └── __tests__/           # Test files
│       ├── api/             # Auth API tests
│       └── lib/             # Unit tests (phii-filter, safety-engine, OCR, pose)
├── docs/                    # Full documentation (13 files)
│   ├── 01-PRD.md            # Product Requirements Document
│   ├── 02-Technical-Architecture.md
│   ├── ...
│   └── decisions/           # Architecture Decision Records (ADRs)
├── vitest.config.ts         # Vitest configuration
├── vercel.json              # Vercel deployment config
├── .github/workflows/       # CI/CD pipelines
│   ├── ci.yml               # Lint → Test → Build
│   └── security.yml         # npm audit + secrets scan
└── package.json
```

## 🧪 Testing

```bash
# Run tests once
npm run test:run

# Run tests in watch mode during development
npm test

# Run with coverage report
npm run test:coverage
```

Test files are located in `src/__tests__/` and cover:

- **PHI Filter** — Email, phone, SSN removal; diagnostic language detection
- **Safety Engine** — Emergency detection, diagnostic rewriting, disclaimer injection
- **OCR Engine** — Lab value parsing, normalization, abnormal flagging
- **Pose Analysis** — Gait, squat, and bending analysis with mock landmark data
- **Auth** — JWT token creation/verification, schema validation, Bearer token extraction

## 📚 Documentation

Full documentation is available in the [`docs/`](./docs/) folder:

- [Product Requirements Document](./docs/01-PRD.md)
- [Technical Architecture](./docs/02-Technical-Architecture.md)
- [Database Schema](./docs/03-Database-Schema.md)
- [API Specification](./docs/04-API-Specification.md)
- [User Flows](./docs/05-User-Flows.md)
- [UI/UX Guidelines](./docs/06-UI-UX-Guidelines.md)
- [AI Architecture](./docs/07-AI-Architecture.md)
- [Security Architecture](./docs/08-Security-Architecture.md)
- [Roadmap](./docs/09-Roadmap.md)
- [Deployment Guide](./docs/12-Deployment.md)

## 🌐 Deployment

The app is configured for deployment on [Vercel](https://vercel.com/):

```bash
# Deploy to Vercel
vercel --prod
```

The `vercel.json` file is pre-configured with the correct build command (`npx prisma generate && npm run build`) and framework setting.

### CI/CD Pipeline

The GitHub Actions CI pipeline (`ci.yml`) runs on every push to `main`/`develop` and on all pull requests:

1. **Lint & TypeScript** — ESLint + `tsc --noEmit`
2. **Tests** — Starts PostgreSQL, runs migrations, then Vitest
3. **Build** — Builds the Next.js app (only if jobs 1 and 2 pass)

The security workflow (`security.yml`) runs `npm audit` and scans for accidentally committed secrets on every PR.

## 🔒 Security

- All API routes require authentication (JWT bearer tokens or httpOnly cookies)
- PHI (Protected Health Information) is stripped before any AI/LLM calls
- Pose analysis runs entirely **on-device** — no images are uploaded
- Lab results and medical conditions are encrypted with AES-256-GCM at rest
- Audit trails are **immutable** (insert-only, no update/delete)
- User data deletion follows GDPR guidelines with soft-delete + 30-day hard deletion
- Rate limiting on all API endpoints (sliding window)

## 📄 License

Private — All rights reserved.

---

<p align="center">Built with ❤️ for better health</p>
