# Testing Strategy — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. Testing Philosophy

- **Health data is critical** — test rigorously where data integrity matters
- **AI output is probabilistic** — test for structure and safety, not exact content
- **Move fast but don't break** — CI catches regressions automatically
- **Manual testing** for UX flows, AI quality, and visual polish

---

## 2. Test Pyramid

```
        ╱╲
       ╱ E2E ╲
      ╱────────╲
     ╱Integration╲
    ╱──────────────╲
   ╱   Unit Tests   ╲
  ╱────────────────────╲
 ╱   Static Analysis    ╲
╱──────────────────────────╲
     (TypeScript, ESLint)
```

| Layer | Coverage Target | Speed |
|-------|----------------|-------|
| Static Analysis | 100% files | Real-time |
| Unit Tests | 80%+ logic coverage | < 1s per test |
| Integration | 70%+ API coverage | < 5s per test |
| E2E | Critical user flows | < 30s per flow |

---

## 3. Static Analysis

### 3.1 TypeScript
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```
- `tsc --noEmit` in CI
- No `any` types in production code (allow in tests if needed)

### 3.2 ESLint
- `@typescript-eslint/strict` config
- React hooks rules
- Import ordering
- No unused variables

### 3.3 Prettier
- Single config for entire project
- Format check in CI

---

## 4. Unit Tests

### 4.1 Framework
- **Frontend:** Vitest + React Testing Library
- **Backend:** Vitest (TS) or Pytest (Python)
- **AI/LLM:** Custom assertion library for structured output

### 4.2 What to Unit Test

| Module | Priority | Examples |
|--------|----------|----------|
| Validation schemas | High | Zod schemas for assessment, check-in |
| Health score formula | High | Edge cases, null handling |
| Angle calculations | High | Posture angle math |
| Data normalization | High | Unit conversion, date parsing |
| Safety checks | High | Red-flag detection regex |
| UI components | Medium | Form inputs, error states |
| API client | Medium | Request building, error handling |
| State management | Medium | Zustand store logic |
| Store actions | Medium | Auth store, assessment draft |

### 4.3 Testing Patterns
```typescript
// Schema validation
describe('Assessment Schema', () => {
  it('rejects weight below 20kg', () => {
    const result = assessmentSchema.safeParse({ weightKg: 10 })
    expect(result.success).toBe(false)
  })
})

// Health score
describe('Health Score Calculation', () => {
  it('returns 0 when no data', () => {
    expect(calculateHealthScore({})).toBe(0)
  })
  it('returns correct weighted score', () => {
    const score = calculateHealthScore({ nutrition: 80, exercise: 70, sleep: 90, pain: 85, labs: 100 })
    expect(score).toBe(82.5) // (80*0.25 + 70*0.25 + 90*0.2 + 85*0.2 + 100*0.1)
  })
})

// AI output validation
describe('AI Output Validator', () => {
  it('blocks diagnostic language', () => {
    expect(validateOutput('You have diabetes')).toBe(false)
  })
  it('allows safe language', () => {
    expect(validateOutput('Your blood sugar is elevated. Discuss with your doctor.')).toBe(true)
  })
})
```

---

## 5. Integration Tests

### 5.1 API Integration Tests
```typescript
describe('POST /api/auth/register', () => {
  it('creates user and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'Pass1234', consentPrivacy: true, consentDisclaimer: true })
    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toBeDefined()
  })

  it('rejects duplicate email', async () => {
    // Register same email twice
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'Pass1234', consentPrivacy: true, consentDisclaimer: true })
    expect(res.status).toBe(409)
  })
})
```

### 5.2 Database Integration
- Test RLS policies (user A cannot access user B's data)
- Test cascade deletes
- Test unique constraints

### 5.3 AI Service Integration
- Mock LLM API responses
- Test that prompts are constructed correctly
- Test that output validator catches bad responses
- Test retry logic with simulated failures

---

## 6. E2E Tests (Playwright)

### 6.1 Critical User Flows
| Flow | Description |
|------|-------------|
| Registration + Login | New user signs up, accepts consent, logs in |
| Complete Assessment | Full 7-step assessment with all data types |
| Upload Blood Report | Upload PDF, wait for analysis, view results |
| Vision Upload & Results | Upload 3 photos, view posture analysis |
| View Recommendations | See AI recommendations after data is available |
| Weekly Check-in | Submit check-in, see AI summary |
| Timeline Query | Ask question, get AI answer with citations |

### 6.2 Test Setup
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'e2e/.auth/user.json', // authenticated state
  },
  projects: [
    { name: 'setup', testMatch: 'auth.setup.ts' },
    { name: 'chromium', dependencies: ['setup'] },
    { name: 'mobile-chrome', dependencies: ['setup'], use: { viewport: { width: 375, height: 812 } } },
  ]
})
```

### 6.3 Visual Regression
- Snapshot key screens (dashboard, assessment, vision results)
- Run on PRs to detect unintended visual changes
- Use percy or Chromatic (future)

---

## 7. AI-Specific Testing

### 7.1 Prompt Testing
- **Precision:** Does the AI respond in the required format?
- **Safety:** Does the AI avoid diagnostic language?
- **Consistency:** Same input → structurally similar output
- **Edge cases:** Handle missing data, contradictory data, extreme values

### 7.2 Test Suite for Prompts
```typescript
describe('Recommendation Prompt', () => {
  it('returns valid JSON structure', async () => {
    const result = await generateRecommendations(mockUserData)
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('never includes diagnostic phrases', async () => {
    const result = await generateRecommendations(mockUserData)
    const parsed = JSON.parse(result)
    expect(parsed.suggestions.every(s => !hasDiagnosticLanguage(s.suggestion))).toBe(true)
  })

  it('includes confidence levels', async () => {
    const result = await generateRecommendations(mockUserData)
    const parsed = JSON.parse(result)
    expect(parsed.suggestions.every(s => ['high','medium','low'].includes(s.confidence))).toBe(true)
  })
})
```

### 7.3 Red Team Testing
- Attempt to get the AI to diagnose
- Upload intentionally blurry/unreadable reports
- Input contradictory data (e.g., smoke daily + intense exercise goals)
- Submit extreme values (weight 500kg, pain 10 everywhere)

---

## 8. Performance Testing (Post-MVP)

| Test | Tool | Threshold |
|------|------|-----------|
| Page load | Lighthouse | < 3s on 3G |
| API latency | k6 | p95 < 500ms |
| AI processing | Custom | Report: < 30s, Vision: < 60s |
| Concurrent users | k6 | Handle 100 simultaneous uploads |
| DB query perf | EXPLAIN ANALYZE | All queries < 200ms |

---

## 9. CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - run: npm ci
      - run: npx prisma migrate dev
      - run: npm run test:unit

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
      redis:
        image: redis:7
    steps:
      - run: npm ci
      - run: npx prisma migrate dev
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
    steps:
      - run: npm ci
      - run: npx playwright install
      - run: npm run build
      - run: npm run test:e2e
```

---

## 10. Test Data Strategy

- **Seed data**: 3-5 realistic user profiles with varying data
  - User A: Healthy, no pain, good labs
  - User B: Back pain, Vitamin D deficient, sedentary
  - User C: Multiple pain areas, diabetic, athlete goals
- **Fake PHI generator** for seeding
- **Isolated test DB** — Wiped and re-seeded per test run
- **Factory functions** for quick test data creation
