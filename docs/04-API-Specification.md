# API Specification — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. Base URL

```
Development:  http://localhost:3000/api
Production:   https://api.healthos.app/api
```

## 2. Authentication

All authenticated endpoints require:
- Header: `Authorization: Bearer <jwt_token>`
- JWT expires in 15 minutes
- Refresh token available via `/api/auth/refresh`

## 3. Common Responses

### Success
```json
{
  "data": { ... },
  "message": "Success"
}
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [ ... ]
  }
}
```

### Pagination
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 4. Authentication Endpoints

### 4.1 POST /api/auth/register
Creates a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "fullName": "John Doe",
  "consentPrivacy": true,
  "consentDisclaimer": true
}
```

**Response (201):**
```json
{
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "accessToken": "jwt...",
    "refreshToken": "token..."
  }
}
```

### 4.2 POST /api/auth/login
Authenticates an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response (200):**
```json
{
  "data": {
    "userId": "uuid",
    "accessToken": "jwt...",
    "refreshToken": "token...",
    "profileComplete": false
  }
}
```

### 4.3 POST /api/auth/refresh
Refreshes an expired access token.

**Request:**
```json
{
  "refreshToken": "token..."
}
```

**Response (200):**
```json
{
  "data": {
    "accessToken": "new_jwt...",
    "refreshToken": "new_refresh..."
  }
}
```

### 4.4 POST /api/auth/logout
Invalidates the current session.

**Headers:** Authorization: Bearer \<token\>

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 5. Profile & Assessment Endpoints

### 5.1 GET /api/profile
Get user profile summary.

**Response (200):**
```json
{
  "data": {
    "userId": "uuid",
    "fullName": "John Doe",
    "email": "user@example.com",
    "profile": { ... },
    "occupation": { ... },
    "lifestyle": { ... },
    "nutrition": { ... },
    "medicalHistory": { ... },
    "goals": [ ... ],
    "painAreas": [ ... ],
    "onboardingComplete": true
  }
}
```

### 5.2 PUT /api/profile
Update basic profile information.

**Request:**
```json
{
  "fullName": "John Doe",
  "dateOfBirth": "1990-01-15",
  "biologicalSex": "male",
  "heightCm": 175,
  "weightKg": 78,
  "waistCm": 88,
  "bloodGroup": "O+"
}
```

### 5.3 GET /api/assessment
Get the complete health assessment.

### 5.4 POST /api/assessment
Create or update the full health assessment. Accepts partial updates.

**Request:**
```json
{
  "occupation": {
    "jobTitle": "Software Engineer",
    "industry": "Technology",
    "workingHours": 45,
    "workType": "remote",
    "sittingHours": 10,
    "standingHours": 1
  },
  "lifestyle": {
    "wakeUpTime": "07:00",
    "bedTime": "23:00",
    "avgSleepHours": 6.5,
    "sleepQuality": "fair",
    "waterIntakeL": 1.5,
    "stressLevel": 7,
    "smoking": "never",
    "alcohol": "occasional",
    "caffeineIntake": 3
  },
  "nutrition": {
    "dietType": "non-vegetarian",
    "foodAllergies": ["peanuts"],
    "cookingTimeMin": 30,
    "monthlyBudget": 5000
  },
  "medicalHistory": {
    "currentConditions": ["lower_back_pain"],
    "currentMedications": ["vitamin_d_1000"],
    "familyHistory": [
      { "condition": "diabetes_type_2", "relation": "father" }
    ]
  },
  "painAssessments": [
    {
      "bodyArea": "back",
      "severity": 6,
      "duration": "months",
      "frequency": "daily",
      "painType": "dull",
      "triggeringActivities": ["sitting_long", "bending"],
      "relievingFactors": ["stretching", "walking"],
      "morningStiffness": true
    }
  ],
  "goals": [
    { "goal": "reduce_back_pain", "priority": 1 },
    { "goal": "improve_posture", "priority": 2 }
  ]
}
```

---

## 6. Computer Vision Endpoints

### 6.1 POST /api/vision/photos
Upload posture photos. Accept up to 3 files (front, side, back).

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| front | File | Yes | Front body photo (JPEG/PNG, max 10MB) |
| side | File | Yes | Side body photo |
| back | File | Yes | Back body photo |

**Response (202) — Accepted:**
```json
{
  "data": {
    "jobId": "uuid",
    "status": "processing",
    "mediaIds": ["uuid1", "uuid2", "uuid3"],
    "estimatedTime": 30
  }
}
```

### 6.2 POST /api/vision/videos
Upload movement videos. Accept up to 3 videos (walking, squatting, bending).

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| walking | File | No | Walking video (MP4/MOV, max 50MB) |
| squatting | File | No | Squatting video |
| bending | File | No | Bending video |

**Response (202):**
```json
{
  "data": {
    "jobId": "uuid",
    "status": "processing",
    "mediaIds": ["uuid4", "uuid5"],
    "estimatedTime": 60
  }
}
```

### 6.3 GET /api/vision/results
Get all vision analyses for the user.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| limit | int | Default 10 |
| offset | int | Default 0 |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "mediaType": "photo",
      "angles": {
        "neckAngle": 45.2,
        "shoulderAngle": 12.8,
        "pelvicTilt": 8.5,
        "kneeValgus": 3.1
      },
      "findings": [
        {
          "characteristic": "forward_head",
          "severity": "moderate",
          "confidence": 0.87,
          "description": "Head is positioned forward relative to shoulders"
        },
        {
          "characteristic": "rounded_shoulders",
          "severity": "mild",
          "confidence": 0.72,
          "description": "Shoulders are rolled forward"
        }
      ],
      "confidenceScore": 0.85,
      "createdAt": "2026-07-17T04:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1 }
}
```

### 6.4 GET /api/vision/results/latest
Get the most recent vision analysis.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "mediaType": "photo",
    "angles": { ... },
    "findings": [ ... ],
    "summary": "Your posture analysis shows moderate forward head posture and mild rounded shoulders. These findings may contribute to your neck and upper back discomfort.",
    "confidenceScore": 0.85,
    "createdAt": "2026-07-17T04:00:00Z"
  }
}
```

### 6.5 DELETE /api/vision/media/:mediaId
Delete specific uploaded media and its analysis.

**Response (200):**
```json
{
  "message": "Media deleted successfully"
}
```

---

## 7. Medical Report Endpoints

### 7.1 POST /api/reports/upload
Upload a medical report.

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Report file (PDF/JPEG/PNG, max 20MB) |
| reportType | string | Yes | 'blood_report', 'mri', 'xray', 'ct', 'dexa', 'other' |
| reportDate | string | No | Date of the report (YYYY-MM-DD) |
| title | string | No | Custom title |

**Response (202):**
```json
{
  "data": {
    "reportId": "uuid",
    "status": "processing",
    "estimatedTime": 20
  }
}
```

### 7.2 GET /api/reports
List all uploaded reports.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "reportType": "blood_report",
      "title": "Blood Test - Jul 2026",
      "reportDate": "2026-07-15",
      "status": "completed",
      "hasAnalysis": true,
      "createdAt": "2026-07-17T04:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 7.3 GET /api/reports/:reportId
Get report details and analysis.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "reportType": "blood_report",
    "title": "Blood Test - Jul 2026",
    "reportDate": "2026-07-15",
    "fileUrl": "https://s3...",
    "analysis": {
      "patientSummary": "Your Vitamin D level is 22 ng/mL, which is below the normal range of 30-100 ng/mL. This is quite common and may contribute to fatigue and bone discomfort. Your HbA1c is 5.4%, which is within the normal range.",
      "doctorSummary": "Vitamin D deficiency (22 ng/mL). HbA1c 5.4% — normal. LDL cholesterol mildly elevated at 130 mg/dL.",
      "labResults": [
        {
          "testName": "Vitamin D (25-OH)",
          "value": 22,
          "unit": "ng/mL",
          "referenceRange": "30-100",
          "flag": "low"
        },
        {
          "testName": "HbA1c",
          "value": 5.4,
          "unit": "%",
          "referenceRange": "4.0-5.6",
          "flag": "normal"
        }
      ],
      "trends": [
        {
          "testName": "Vitamin D",
          "previousValue": 18,
          "currentValue": 22,
          "previousDate": "2026-01-10",
          "trend": "improving"
        }
      ]
    },
    "createdAt": "2026-07-17T04:00:00Z"
  }
}
```

### 7.4 DELETE /api/reports/:reportId
Delete a report and its analysis.

---

## 8. AI Recommendation Endpoints

### 8.1 GET /api/recommendations
Get current recommendations.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "version": 3,
    "summary": "Based on your complete profile, here are personalized recommendations to help reduce your back pain and improve posture.",
    "suggestions": [
      {
        "category": "exercise",
        "suggestion": "Include cat-cow stretches 2x daily to improve spine mobility",
        "confidence": "high",
        "evidence": "Clinical guidelines recommend spinal mobilization for non-specific low back pain"
      },
      {
        "category": "ergonomics",
        "suggestion": "Adjust your workstation — monitor at eye level, chair lumbar support",
        "confidence": "high",
        "evidence": "Your occupation profile shows 10 hours/day sitting"
      },
      {
        "category": "nutrition",
        "suggestion": "Increase Vitamin D intake — consider supplementation after consulting your doctor",
        "confidence": "high",
        "evidence": "Your blood report shows Vitamin D at 22 ng/mL (below normal)"
      }
    ],
    "confidenceLevel": "high",
    "evidenceSummary": "Recommendations are based on your lifestyle assessment, blood reports, posture analysis, and reported symptoms.",
    "doctorTopics": [
      "Vitamin D deficiency and supplementation",
      "Mildly elevated LDL cholesterol"
    ],
    "suggestedTests": [
      {
        "testName": "Vitamin D",
        "reason": "To monitor if supplementation is working"
      }
    ],
    "redFlags": [],
    "createdAt": "2026-07-17T04:00:00Z"
  }
}
```

### 8.2 POST /api/recommendations/refresh
Trigger AI re-evaluation of recommendations.

**Response (202):**
```json
{
  "data": {
    "jobId": "uuid",
    "status": "processing",
    "estimatedTime": 30
  }
}
```

---

## 9. Diet Plan Endpoints

### 9.1 GET /api/diet/plan
Get current active meal plan.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "weekStart": "2026-07-14",
    "weekEnd": "2026-07-20",
    "dailyTargets": {
      "calories": 2100,
      "proteinG": 75,
      "waterL": 2.5
    },
    "meals": [
      {
        "day": "monday",
        "breakfast": { "name": "Oatmeal with nuts and berries", "calories": 350, "protein": 12 },
        "lunch": { "name": "Grilled chicken salad with quinoa", "calories": 520, "protein": 35 },
        "dinner": { "name": "Dal rice with vegetables", "calories": 580, "protein": 18 },
        "snacks": [
          { "name": "Greek yogurt", "calories": 120, "protein": 15 },
          { "name": "Mixed nuts", "calories": 180, "protein": 6 }
        ]
      }
    ],
    "shoppingList": [
      { "item": "Oats", "category": "grains", "quantity": "500g" },
      { "item": "Chicken breast", "category": "protein", "quantity": "500g" }
    ],
    "mealTiming": {
      "breakfast": "07:30-08:00",
      "lunch": "12:30-13:00",
      "dinner": "19:00-19:30"
    }
  }
}
```

### 9.2 POST /api/diet/plan/regenerate
Request a new meal plan.

**Response (202):**
```json
{
  "data": {
    "jobId": "uuid",
    "status": "processing",
    "estimatedTime": 40
  }
}
```

---

## 10. Exercise Plan Endpoints

### 10.1 GET /api/exercise/plan
Get current active exercise plan.

### 10.2 POST /api/exercise/plan/regenerate
Request a new exercise plan.

---

## 11. Routine Endpoints

### 11.1 GET /api/routine
Get daily routine for current day.

**Response (200):**
```json
{
  "data": {
    "dayOfWeek": 1,
    "schedule": [
      { "time": "06:30", "activity": "Wake up", "durationMin": 5, "notes": "No snooze" },
      { "time": "06:35", "activity": "Hydrate", "durationMin": 5, "notes": "Drink 500ml water" },
      { "time": "06:45", "activity": "Sunlight exposure", "durationMin": 10, "notes": "Morning walk" },
      { "time": "07:00", "activity": "Stretching", "durationMin": 10, "notes": "Neck and back stretches" },
      { "time": "08:00", "activity": "Breakfast", "durationMin": 20, "notes": "" },
      { "time": "09:00", "activity": "Work block", "durationMin": 120, "notes": "" },
      { "time": "11:00", "activity": "Stretch break", "durationMin": 5, "notes": "" },
      { "time": "13:00", "activity": "Lunch + walk", "durationMin": 30, "notes": "15 min walk after" },
      { "time": "18:00", "activity": "Exercise", "durationMin": 30, "notes": "As per plan" },
      { "time": "22:30", "activity": "Wind down", "durationMin": 30, "notes": "No screens" },
      { "time": "23:00", "activity": "Sleep", "durationMin": 0, "notes": "Target 7.5 hours" }
    ]
  }
}
```

### 11.2 POST /api/routine/regenerate
Request a new daily routine.

---

## 12. Weekly Check-in Endpoints

### 12.1 GET /api/check-in/current
Get the current week's check-in (if exists) or the blank form.

**Response (200):**
```json
{
  "data": {
    "weekStart": "2026-07-14",
    "alreadySubmitted": false,
    "form": {
      "painScores": { "neck": null, "back": null },
      "energyLevel": null,
      "sleepHours": null,
      "sleepQuality": null,
      "mood": null,
      "weightKg": null,
      "waterIntakeL": null,
      "exerciseCompletion": null,
      "walkingSteps": null,
      "dietAdherence": null,
      "notes": null
    }
  }
}
```

### 12.2 POST /api/check-in/submit
Submit this week's check-in.

**Request:**
```json
{
  "painScores": { "neck": 3, "back": 5 },
  "energyLevel": 6,
  "sleepHours": 7.0,
  "sleepQuality": 7,
  "mood": 7,
  "weightKg": 77.5,
  "waterIntakeL": 2.0,
  "exerciseCompletion": 70,
  "walkingSteps": 6000,
  "dietAdherence": 80,
  "notes": "Felt better this week. Back pain slightly reduced."
}
```

**Response (200):**
```json
{
  "data": {
    "checkinId": "uuid",
    "aiSummary": "Good progress this week! Your back pain improved from 6 to 5. Sleep is stable at 7 hours. Diet adherence at 80% is solid. Try to increase walking to 8000 steps daily.",
    "planUpdated": true
  }
}
```

---

## 13. Dashboard Endpoints

### 13.1 GET /api/dashboard/stats
Get aggregate dashboard statistics.

**Response (200):**
```json
{
  "data": {
    "current": {
      "weightKg": 77.5,
      "bmi": 25.3,
      "waistCm": 87,
      "avgPainScore": 4,
      "avgSleepHours": 7.0,
      "healthScore": 72
    },
    "trends": {
      "weightKg": { "change": -2.5, "period": "1month" },
      "avgPainScore": { "change": -1, "period": "1month" },
      "healthScore": { "change": 5, "period": "1month" }
    },
    "streak": {
      "checkinStreak": 3,
      "longestStreak": 8
    }
  }
}
```

### 13.2 GET /api/dashboard/progress/:metric
Get time-series data for a specific metric.

**Parameters:**
- `metric`: weight, bmi, waist, pain_score, sleep, water, exercise_adherence, health_score

**Query:**
- `range`: 1w, 1m, 3m, 6m, 1y, all

**Response (200):**
```json
{
  "data": [
    { "date": "2026-06-17", "value": 80.0, "source": "checkin" },
    { "date": "2026-06-24", "value": 79.2, "source": "checkin" },
    { "date": "2026-07-01", "value": 78.5, "source": "checkin" },
    { "date": "2026-07-08", "value": 78.0, "source": "checkin" },
    { "date": "2026-07-15", "value": 77.5, "source": "checkin" }
  ]
}
```

---

## 14. Health Timeline Endpoints

### 14.1 GET /api/timeline
Get the health timeline feed.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| eventType | string | Filter by type |
| limit | int | Default 20 |
| offset | int | Default 0 |
| fromDate | date | Start date |
| toDate | date | End date |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "eventType": "lab_result",
      "title": "Blood Report Uploaded",
      "description": "Vitamin D: 22 ng/mL (low)",
      "eventDate": "2026-07-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "eventType": "assessment",
      "title": "Health Assessment Completed",
      "description": "Profile, lifestyle, and pain assessment submitted",
      "eventDate": "2026-07-14T08:00:00Z"
    },
    {
      "id": "uuid",
      "eventType": "recommendation",
      "title": "AI Recommendations Updated",
      "description": "New recommendations based on blood report and posture analysis",
      "eventDate": "2026-07-14T08:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 12 }
}
```

### 14.2 POST /api/timeline/query
Natural language query against the health timeline.

**Request:**
```json
{
  "query": "How has my Vitamin D changed over the last year?"
}
```

**Response (200):**
```json
{
  "data": {
    "query": "How has my Vitamin D changed over the last year?",
    "answer": "Your Vitamin D levels have shown improvement over the last year. In January 2026, it was 18 ng/mL (deficient). Your latest reading in July 2026 is 22 ng/mL (still below normal range of 30-100). That's a 22% increase, suggesting your supplementation is helping, but you need to continue.",
    "sources": [
      { "eventType": "lab_result", "date": "2026-01-10", "value": "18 ng/mL" },
      { "eventType": "lab_result", "date": "2026-07-15", "value": "22 ng/mL" }
    ]
  }
}
```

---

## 15. Webhook / Job Status Endpoints

### 15.1 GET /api/jobs/:jobId
Check the status of an async job (vision analysis, report processing, recommendation generation).

**Response (200):**
```json
{
  "data": {
    "jobId": "uuid",
    "type": "vision_analysis",
    "status": "completed",
    "progress": 100,
    "resultId": "uuid",
    "error": null,
    "createdAt": "2026-07-17T04:00:00Z",
    "completedAt": "2026-07-17T04:00:30Z"
  }
}
```

---

## 16. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or expired token |
| FORBIDDEN | 403 | No permission to access resource |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Invalid request data |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected server error |
| AI_SERVICE_DOWN | 503 | AI service temporarily unavailable |
| FILE_TOO_LARGE | 413 | Uploaded file exceeds size limit |
| UNSUPPORTED_FILE_TYPE | 415 | Unsupported file format |
| ANALYSIS_FAILED | 422 | AI analysis could not be completed |
