# ADR-001: Initial Tech Stack Selection

## Status
Accepted

## Context
HealthOS needs a stack that allows rapid prototyping while being production-viable for PHI-handling healthcare software. Key considerations: time to MVP, AI integration ease, type safety, and deployment simplicity.

## Decision
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 14+ (React, TypeScript) | SSR, API routes, Vercel deploy, large ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI, accessible, customizable |
| State | Zustand + React Query | Minimal boilerplate, server-state caching |
| Forms | React Hook Form + Zod | Performant, type-safe validation |
| Backend | Next.js API Routes (co-located) | No separate server for MVP; Python FastAPI for AI services if needed |
| Database | PostgreSQL + Prisma | Type-safe ORM, migrations, pgvector |
| Queue | BullMQ + Redis | Async AI job processing |
| Storage | S3-compatible (MinIO dev, R2/S3 prod) | File uploads, cost-effective |
| AI | Claude API / GPT-4o + MediaPipe | Best-in-class LLM + pose estimation |
| Auth | NextAuth.js / Lucia | Battle-tested, OAuth-ready |

## Consequences
- TypeScript everywhere reduces type-related bugs
- Next.js API routes may need extraction to separate service if load grows
- Prisma + pgvector eliminates need for separate vector DB
- AI API costs scale with usage (consider caching + model tiering)

## Alternatives Considered
- **FastAPI backend**: Better Python AI integration, but adds deployment complexity with separate server
- **MongoDB**: Better for flexible schemas, but lacks pgvector and ACID for health data
- **tRPC**: Type-safe RPC, but adds learning curve and lock-in
