# Feature Spec: User Registration & Authentication

## 1. Overview
Users create accounts and authenticate to access the platform. Privacy consent and medical disclaimer must be accepted during registration.

## 2. User Stories
- US-01: As a new user, I want to create an account so I can access the platform
- As a returning user, I want to log in so I can continue my health journey
- As a user, I want to reset my password if I forget it

## 3. Acceptance Criteria
- [ ] Registration with email + password
- [ ] Password requirements: min 8 chars, 1 uppercase, 1 number
- [ ] Email verification (optional MVP — can be skipped for speed)
- [ ] Privacy consent checkbox (required)
- [ ] Medical disclaimer acceptance (required)
- [ ] Login with email + password
- [ ] JWT access token (15 min) + refresh token (7 day)
- [ ] Password reset via email link
- [ ] Logout invalidates session
- [ ] Rate limiting: 5 failed login attempts → 15 min lockout

## 4. Data Schema
- Tables: `users`, `sessions`, `consent_logs`
- Reference: `03-Database-Schema.md` §2.1, §2.2, §7.2

## 5. API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/reset-password | Request reset |
| POST | /api/auth/reset-password/confirm | Set new password |

## 6. UI Components
- RegisterPage (email, password, consent checkboxes)
- LoginPage (email, password, forgot password link)
- ForgotPasswordPage (email input)
- ResetPasswordPage (new password + confirm)
- AuthGuard (HOC that redirects unauthenticated users)

## 7. Error States
| Scenario | Message |
|----------|---------|
| Email already registered | "An account with this email already exists" |
| Invalid credentials | "Invalid email or password" |
| Expired reset link | "This link has expired. Request a new one." |
| Rate limited | "Too many attempts. Try again in 15 minutes." |

## 8. Edge Cases
- User registers but doesn't verify email (if verification enabled)
- User tries to register with same email after soft-delete
- Token expiry during long assessment form fill (auto-refresh)
