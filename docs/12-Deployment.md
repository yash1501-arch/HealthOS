# Deployment & DevOps — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. Infrastructure Overview

```
Stage (Dev/Staging)                    Production
┌──────────────────────┐              ┌──────────────────────┐
│ Vercel (Frontend)    │              │ Vercel (Frontend)    │
│ Railway / Render     │              │ AWS / Railway        │
│  (Backend + DB)     │              │  (Backend + DB)     │
│ MinIO (S3-compat)   │              │ AWS S3 / R2          │
└──────────────────────┘              └──────────────────────┘
```

---

## 2. Environment Configuration

### 2.1 Environment Files
```
.env.local              # Local development (not committed)
.env.staging            # Staging secrets (CI secret)
.env.production         # Production secrets (CI secret)
.env.example            # Documented template (committed)
```

### 2.2 Variables
```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Auth
JWT_SECRET=            # 64-char random string
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:pass@host:5432/healthos

# Redis
REDIS_URL=redis://localhost:6379

# Storage
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=healthos-uploads
S3_ACCESS_KEY=
S3_SECRET_KEY=

# AI
OPENAI_API_KEY=        # or ANTHROPIC_API_KEY
EMBEDDING_MODEL=text-embedding-3-small

# Monitoring
SENTRY_DSN=
LOGTAIL_TOKEN=
```

---

## 3. CI/CD Pipeline (GitHub Actions)

### 3.1 Workflows

```
on: push → PR → main

Jobs:
  1. lint-typecheck (parallel)
     ├── npm run lint
     └── npm run typecheck

  2. unit-test
     └── npm run test:unit

  3. integration-test
     ├── services: postgres, redis
     └── npm run test:integration

  4. build
     └── npm run build

  5. deploy-staging (on push to main)
     └── Vercel + Railway deploy

  6. e2e-test (after deploy-staging)
     └── npx playwright test

  7. deploy-production (manual trigger)
     └── Promote staging → production

  8. db-migrate (on deploy)
     └── npx prisma migrate deploy
```

### 3.2 Docker Compose (Local Dev)
```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: healthos
      POSTGRES_PASSWORD: postgres
    ports: [5432:5432]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: [6379:6379]

  minio:
    image: minio/minio
    ports: [9000:9000, 9001:9001]
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes: [minio:/data]

volumes: { pgdata:, minio: }
```

---

## 4. Deployment Steps

### 4.1 Frontend (Vercel)
1. Push to GitHub
2. Vercel auto-detects Next.js
3. Environment variables set in Vercel dashboard
4. Preview deployments for every PR
5. Production deploys from `main` branch

### 4.2 Backend (Railway / AWS)
1. Dockerize API server
2. Railway auto-deploys from GitHub
3. PostgreSQL + Redis as Railway plugins
4. S3-compatible storage: Cloudflare R2 (cheap, no egress fees)

### 4.3 Database Migrations
```bash
# Local
npx prisma migrate dev --name add_vision_tables

# Staging/Production (CI)
npx prisma migrate deploy
```

---

## 5. Monitoring

| Tool | Purpose | Config |
|------|---------|--------|
| Sentry | Error tracking | `SENTRY_DSN` env var |
| Logtail/Axiom | Structured logging | `LOGTAIL_TOKEN` env var |
| Vercel Analytics | Page views, performance | Built-in |
| Uptime Robot | Uptime monitoring | HTTP check every 5 min |
| GitHub Status | Deploy status | Auto via CI |

---

## 6. Backup Strategy

| Asset | Frequency | Retention | Storage |
|-------|-----------|-----------|---------|
| PostgreSQL | Daily | 30 days | S3 encrypted dump |
| User files (S3) | Continuous (replication) | User-deletion lifecycle | S3 cross-region |
| Audit logs | Real-time | 1 year | Logtail + S3 archive |

---

## 7. Rollback Strategy

| Scenario | Action |
|----------|--------|
| Bad deploy | Vercel: rollback to previous deployment |
| DB migration failure | `prisma migrate resolve --rolled-back` + redeploy |
| AI service broken | Feature flag to disable AI, serve cached data |
| Data corruption | Restore from last verified backup |
