# Security Architecture — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. Security Principles

| Principle | Implementation |
|-----------|---------------|
| Least Privilege | Users access only their own data. RLS enforced at DB level. |
| Defense in Depth | Encryption at rest + transit, input validation, rate limiting, audit logs |
| Privacy by Design | Minimize data collection, explicit consent, right to deletion |
| Secure by Default | All endpoints authenticated unless explicitly public |
| No Trust in Input | Validate, sanitize, and rate-limit all user inputs |
| Audit Everything | Every access to PHI and every AI interaction logged |

---

## 2. Data Classification

| Level | Examples | Protection |
|-------|----------|------------|
| PHI (Protected Health Info) | Lab results, medical reports, photos/videos | AES-256 at rest, TLS 1.3 in transit, column-level encryption |
| PII (Personal Identifiable Info) | Name, email, DOB, occupation | Encrypted at rest, masked in logs |
| Sensitive User Data | Lifestyle, nutrition, goals, pain scores | Encrypted at rest |
| Session Data | Tokens, refresh tokens | Hashed in DB, short expiry |
| Analytics / Non-PII | Feature usage, page views, error counts | Standard storage, no PII linkage |

---

## 3. Authentication & Authorization

### 3.1 Authentication Flow
```
1. User registers with email + password
2. Password hashed with bcrypt (cost factor 12)
3. JWT access token (15 min expiry) + refresh token (7 day expiry)
4. Refresh token stored hashed in DB
5. On expiry: refresh endpoint validates + issues new pair
6. On logout: refresh token deleted from DB
```

### 3.2 Token Structure
```
Access Token (JWT):
{
  "sub": "user_uuid",
  "iat": 1712345678,
  "exp": 1712346578,
  "type": "access"
}

Refresh Token (opaque):
- 32-byte random string
- Stored as SHA-256 hash in sessions table
```

### 3.3 Authorization Model
- Single-user per account (MVP)
- RLS (Row-Level Security) on all tables
- API middleware validates JWT + attaches user context
- No admin roles or elevated permissions in MVP

---

## 4. Encryption Strategy

### 4.1 Data at Rest
| Layer | Mechanism |
|-------|-----------|
| Database | PostgreSQL TDE or column-level encryption with pgcrypto |
| Sensitive columns (condition names, medication names) | AES-256-CBC encryption |
| File Storage (S3) | Server-side encryption (AES-256) |
| Backups | Encrypted with separate key |

### 4.2 Data in Transit
| Layer | Mechanism |
|-------|-----------|
| Client → Server | TLS 1.3 (HTTPS) |
| Server → AI APIs | TLS 1.3 + API key header |
| Server → DB | TLS (enforced, verify-full) |
| Server → S3 | HTTPS + signed URLs |

### 4.3 Key Management
- Encryption keys stored in environment variables (MVP)
- Future: AWS KMS or HashiCorp Vault
- Keys rotated quarterly
- Separate key for DB encryption vs file encryption

---

## 5. PHI Handling

### 5.1 Photo/Video Upload
```
1. User gives explicit consent (checkbox, logged to consent_logs)
2. File uploaded directly to S3 with pre-signed URL
3. Server never holds file buffer
4. S3 bucket: private, no public access
5. File URLs: signed, time-limited (1 hour)
6. On analysis complete: store only landmarks + angles (not the image itself in AI results)
7. User can delete original media at any time
8. Deletion: soft-delete (recoverable) + hard-delete after 30 days
```

### 5.2 Medical Reports
```
1. File uploaded → stored to S3 (encrypted)
2. Text extracted → raw text in report_analyses (encrypted column)
3. LLM API receives extracted text (no PII in prompt if possible)
4. Original file deletable by user
5. Reports section clearly shows: "Your reports are encrypted"
```

### 5.3 PHI in AI Prompts
- Strip name, email, exact DOB from context sent to LLM APIs
- Use pseudonyms: "user" instead of name
- Lab values sent as numbers only (no patient identifiers)
- LLM providers selected with data privacy guarantees (API, not training data)

---

## 6. API Security

| Layer | Measure |
|-------|---------|
| Rate Limiting | 100 req/min per user, 1000 req/min per IP |
| CORS | Whitelist only production domain + localhost dev |
| Input Validation | Zod/Pydantic schemas on all endpoints |
| SQL Injection | ORM parameterized queries (Prisma/SQLAlchemy) |
| XSS | Content-Security-Policy headers, React auto-escaping |
| CSRF | SameSite cookies, CSRF tokens for state-changing endpoints |
| Request Size | Max 1MB (non-file), 50MB (file upload) |

---

## 7. Database Security

| Measure | Implementation |
|---------|---------------|
| RLS | All tables: user_id = auth.uid() |
| Connection Pool | PgBouncer with prepared statements |
| Network Isolation | DB in private VPC, no public endpoint |
| Least Privilege DB User | App role: SELECT/INSERT/UPDATE on own schema, no DELETE on core tables |
| Audit Trail | ai_audit_logs + consent_logs append-only |

---

## 8. File Upload Security

| Check | Photo/Video | Medical Report |
|-------|-------------|----------------|
| MIME type | image/jpeg, image/png, video/mp4, video/quicktime | application/pdf, image/jpeg, image/png |
| Size limit | 10MB (photo), 50MB (video) | 20MB |
| Content scan | ClamAV or similar | Same |
| Filename sanitization | Strip path, random UUID rename | Same |
| Exif stripping | Remove all metadata | N/A |

---

## 9. Emergency & Incident Response

| Scenario | Response |
|----------|----------|
| Breach detected | Rotate all keys, invalidate all sessions, notify affected users within 72h |
| AI service compromise | Revoke API keys, pause AI features |
| DDoS | Cloudflare WAF + rate limiting |
| Unauthorized access | Review audit logs, force password reset, revoke sessions |
| Data loss | Restore from encrypted backup (24h RPO, 4h RTO) |

---

## 10. Compliance Markers

### 10.1 Medical Disclaimer
Displayed on:
1. Registration (must accept before proceeding)
2. Every AI recommendation page
3. Every medical report analysis
4. Every vision analysis result

Text: "HealthOS is not a medical device and does not diagnose diseases. The information provided is for informational purposes only and should not replace professional medical advice. Always consult a qualified healthcare provider for medical concerns."

### 10.2 Red Flag Acknowledgement
If AI detects red-flag symptoms:
- Full-screen warning before any recommendations
- User must acknowledge before proceeding
- "Some of the symptoms you reported may require urgent medical attention. Please consult a healthcare professional immediately."
- Logged to ai_audit_logs

### 10.3 Data Retention
- Active user data: retained until account deletion
- Deleted media: hard deleted after 30 days
- Audit logs: retained 1 year
- Consent logs: retained permanently (regulatory)
- Account deletion: all PHI deleted within 30 days
