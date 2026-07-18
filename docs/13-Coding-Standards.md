# Coding Standards & Conventions — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. Language & Framework

- **Frontend:** TypeScript (strict mode), React 18+, Next.js 14+
- **Backend:** TypeScript (Next.js API routes) or Python (FastAPI) for AI services
- **Database:** PostgreSQL via Prisma (TS) or SQLAlchemy (Python)
- **Styling:** Tailwind CSS

---

## 2. TypeScript Conventions

### 2.1 Strict Mode
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "exactOptionalPropertyTypes": false
}
```

### 2.2 Naming Conventions
| Entity | Convention | Example |
|--------|-----------|---------|
| Files/folders | kebab-case | `user-profile.tsx` |
| React components | PascalCase | `UserProfile` |
| Functions/variables | camelCase | `getUserProfile()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/interfaces | PascalCase with prefix | `UserProfile`, `ApiResponse` |
| Enums | PascalCase | `PainSeverity` |

### 2.3 File Organization
```
├── One component per file
├── One export per file (default export for pages)
├── Barrel exports via index.ts for related components
├── Test files co-located: Component.tsx + Component.test.tsx
```

### 2.4 Type Definitions
```typescript
// ✅ Good — explicit types
type UserProfile = {
  id: string
  fullName: string
  dateOfBirth: Date
}

// ❌ Bad — using any
const data: any = await fetchUser()

// ✅ Good — discriminated unions for API responses
type ApiResult<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError }
```

---

## 3. React/Next.js Conventions

### 3.1 Component Structure
```typescript
// components/UserProfile.tsx
'use client'

import { useQuery } from '@tanstack/react-query'

type UserProfileProps = {
  userId: string
}

export function UserProfile({ userId }: UserProfileProps) {
  const { data, isPending, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })

  if (isPending) return <Skeleton />
  if (error) return <ErrorMessage error={error} />
  if (!data) return <NotFound />

  return <ProfileDisplay data={data} />
}
```

### 3.2 Server vs Client Components
- Default to server components (RSC)
- Add `'use client'` only when using: state, effects, event handlers, browser APIs
- Fetch data in server components, pass as props

### 3.3 State Management
- **Server state:** React Query (`@tanstack/react-query`)
- **Client state:** Zustand (auth state, UI preferences)
- **Form state:** React Hook Form + Zod
- **URL state:** Next.js search params

### 3.4 API Calls
```typescript
// lib/api.ts — centralized API client
const api = {
  get: <T>(path: string) => fetch(`${BASE_URL}${path}`, { headers: authHeaders() }).then(handleResponse<T>),
  post: <T>(path: string, body: unknown) => fetch(`${BASE_URL}${path}`, { method: 'POST', body: JSON.stringify(body), headers: authHeaders() }).then(handleResponse<T>),
}
```

---

## 4. CSS/Styling Conventions

- Tailwind classes for all styling
- No CSS modules or styled-components
- Extract repeated patterns to Tailwind components via `@apply` or shadcn/ui
- Color variables from `06-UI-UX-Guidelines.md` tokens
- Responsive: mobile-first breakpoints

```tsx
// ✅ Good
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-card">

// ❌ Bad — raw CSS or inline styles
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
```

---

## 5. Database Conventions

- Prisma schema as source of truth
- All tables: `id` (UUID), `created_at`, `updated_at`
- Soft deletes: `deleted_at` (timestamptz, nullable)
- JSONB for flexible/extensible data
- RLS on all user-data tables
- Migrations reviewed before merging

### Prisma Schema Style
```prisma
model User {
  id              String   @id @default(uuid()) @db.Uuid
  email           String   @unique
  passwordHash    String   @map("password_hash")
  isVerified      Boolean  @default(false) @map("is_verified")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  profile         Profile?
  // Relations...

  @@map("users")
}
```

---

## 6. Error Handling Conventions

### 6.1 Frontend
```typescript
// Use React Query error handling
const { error } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  retry: 2,
})

// Component-level error boundaries
export default function ErrorBoundary({ error }: { error: Error }) {
  return <ErrorDisplay message={error.message} onRetry={() => reset()} />
}
```

### 6.2 Backend
```typescript
// API routes return consistent error shape
export async function GET(request: Request) {
  try {
    const user = await getUser(request)
    return Response.json({ data: user })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    }
    // Unexpected errors
    captureException(error)
    return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }, { status: 500 })
  }
}
```

---

## 7. Git Conventions

### 7.1 Branching
```
main         ← Production-ready
staging      ← Pre-production
feat/xxx     ← Feature branches
fix/xxx      ← Bug fixes
chore/xxx    ← Tooling, config, dependencies
```

### 7.2 Commit Messages
```
feat: add posture analysis results view
fix: validate email before registration
chore: update prisma schema for vision tables
docs: add security architecture document
test: add unit tests for health score calculator
refactor: extract assessment form into steps
```

### 7.3 PR Checklist
- [ ] Lint passes
- [ ] TypeScript compiles
- [ ] Tests pass
- [ ] No console.log / debugger
- [ ] New functions documented if non-obvious
- [ ] Screenshot for UI changes
