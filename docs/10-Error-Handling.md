# Error Handling & Logging Strategy — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. Error Handling Philosophy

- **User-facing errors** are clear, human-readable, and actionable
- **System errors** are logged with full context for debugging
- **Never expose stack traces or internal details** to users
- **Fail gracefully** — one broken feature shouldn't crash the app
- **Health data errors** are critical — retry with backoff, never silently fail

---

## 2. Error Classification

| Class | HTTP Range | Description | User Shown |
|-------|-----------|-------------|------------|
| Validation | 400-422 | Invalid input | Yes — specific field errors |
| Authentication | 401-403 | Not logged in / no permission | Yes — redirect or message |
| Not Found | 404 | Resource doesn't exist | Yes |
| Rate Limited | 429 | Too many requests | Yes — retry-after header |
| AI Service | 502-503 | External AI unavailable | Yes — "Try again later" |
| Internal | 500 | Unexpected server error | Generic message + log |

---

## 3. Frontend Error Handling

### 3.1 API Error Interceptor
```typescript
// React Query global error handler
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      onError: (error) => {
        if (error.status === 401) redirectToLogin()
        if (error.status === 429) showRateLimitToast()
        if (error.status >= 500) showGenericError()
      }
    },
    mutations: {
      onError: (error) => {
        if (error.status === 422) showFieldErrors(error.details)
        else showErrorToast(error.message)
      }
    }
  }
})
```

### 3.2 Error Boundaries
- Per-page error boundary (Next.js error.tsx)
- Per-widget error boundary (dashboard charts, recommendation cards)
- Global error boundary (app-wide fallback)

### 3.3 Network Handling
- Offline detection: show "You appear to be offline" banner
- Request retry: auto-retry on network error (3 attempts, exponential backoff)
- Request caching: React Query cache serves stale data while revalidating

### 3.4 File Upload Errors
| Scenario | Handling |
|----------|----------|
| Upload timeout | Retry with chunked upload (future) |
| File corrupted | Inform user, delete partial upload |
| Storage full | "Storage limit reached. Delete old files." |
| Virus detected | "File flagged. Try a different file." |

---

## 4. Backend Error Handling

### 4.1 API Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Must be a valid email" },
      { "field": "password", "message": "Minimum 8 characters" }
    ],
    "requestId": "req_abc123"
  }
}
```

### 4.2 Error Middleware Stack
```
1. Validation Error (Zod/Pydantic) → 422
2. Auth Error (JWT expired, invalid) → 401
3. Not Found (DB query returns null) → 404
4. Rate Limit Error → 429
5. AI Service Error (timeout, 5xx) → 502/503
6. Generic Error → 500 + log
```

### 4.3 AI Service Error Handling
```typescript
switch (error.type) {
  case 'TIMEOUT':
    retryWithBackoff(3, { baseDelay: 1000 }) // 1s, 2s, 4s
  case 'RATE_LIMITED':
    waitAndRetry(parseRetryAfter(response.headers))
  case 'CONTENT_FILTER':
    log to audit, return "Could not generate response"
  case 'INVALID_RESPONSE':
    retry once with stricter system prompt
  default:
    queue for manual review, return 503
}
```

### 4.4 Database Error Handling
- Connection failure → immediate retry (3 attempts)
- Constraint violation → interpret and return user-friendly message
- Deadlock → retry transaction
- RLS violation → log as security event

---

## 5. Logging Strategy

### 5.1 Log Levels

| Level | Use Case | Examples |
|-------|----------|---------|
| ERROR | System is broken | DB down, AI API 500, unhandled exception |
| WARN | Something unexpected | Rate limit hit, slow query >1s, retry occurred |
| INFO | Normal operation | User registered, report uploaded, check-in submitted |
| DEBUG | Development only | SQL queries, API payloads (disabled in production) |
| AUDIT | Compliance | AI prompts/responses, consent changes, data deletion |

### 5.2 What to Log
```
Every API request:
  - method, path, status, duration
  - user_id (if authenticated)
  - ip_address
  - user_agent

Every AI interaction:
  - module, action
  - prompt (truncated to 2000 chars)
  - response (truncated)
  - tokens_used, model, latency_ms
  - red_flag_triggered (bool)

Security events:
  - Failed login attempts (count, not password)
  - Consent changes
  - Data deletion requests
  - RLS violations
```

### 5.3 What NOT to Log
- Plain text passwords
- Full PHI (lab values, medical conditions — only anonymized)
- S3 file contents
- JWT secrets or encryption keys

### 5.4 Log Storage
```
Development: Console + file rotation (7 days)
Staging: Axiom / Logtail (30 day retention)
Production: Axiom / Logtail (90 day retention) + S3 archive (1 year)
```

### 5.5 Logging Service
```typescript
const logger = {
  error: (msg, meta) => capture({ level: 'error', msg, meta, trace: new Error().stack }),
  warn: (msg, meta) => capture({ level: 'warn', msg, meta }),
  info: (msg, meta) => capture({ level: 'info', msg, meta }),
  audit: (msg, meta) => capture({ level: 'audit', msg, meta }),
  debug: (msg, meta) => { if (isDev) capture({ level: 'debug', msg, meta }) }
}
```

---

## 6. Monitoring & Alerting

### 6.1 Error Monitoring (Sentry)
- Capture all unhandled exceptions (frontend + backend)
- Capture handled errors with context
- Set up alerts for:
  - Error rate > 1% in 5 minutes
  - Any 500 on auth endpoints
  - AI service failures

### 6.2 Performance Monitoring
- API endpoint latency p50/p95/p99
- AI processing time per module
- File upload speed
- Database query performance (slow query log > 500ms)

### 6.3 Health Checks
```
GET /api/health
  {
    "status": "ok",
    "database": "connected",
    "redis": "connected",
    "s3": "accessible",
    "ai_service": "available",
    "uptime": 3600
  }
```

### 6.4 Alerts
| Trigger | Channel | Response |
|---------|---------|----------|
| Error rate > 5% | Slack + Email | Immediate investigation |
| AI service down > 5 min | Slack + PagerDuty | Failover or degrade |
| Database connection loss | Slack + PagerDuty | Restore connection |
| Unusual traffic spike | Slack | Check for DDoS or viral event |
| Rate limit exceeded by IP | Slack (daily summary) | Ban if malicious |

---

## 7. User-Facing Error UX

| Scenario | UI Pattern | Example |
|----------|-----------|---------|
| Validation error | Inline below field | "Email is required" |
| API failure | Toast notification | "Could not save. Try again." |
| AI service down | Banner + cached data | "AI features temporarily unavailable" |
| Network offline | Persistent banner | "You are offline. Changes saved locally." |
| 404 page | Custom 404 | "Page not found" + Go to Dashboard |
| 500 page | Custom 500 | "Something went wrong" + "Try again" |
| Rate limited | Toast + countdown | "Too many requests. Try again in 30s." |
