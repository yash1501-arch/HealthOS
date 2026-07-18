# Database Schema Design — HealthOS

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-17 | AI | Initial draft |

---

## 1. Conventions

- All tables have: `id` (UUID, PK), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ)
- Soft delete: `deleted_at` (TIMESTAMPTZ, nullable)
- All timestamps in UTC
- JSONB used for flexible/extensible fields
- RLS enabled on all tables (users see only their own data)

---

## 2. Core Tables

### 2.1 users
```sql
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255) UNIQUE NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    is_verified       BOOLEAN DEFAULT FALSE,
    consent_privacy   BOOLEAN NOT NULL DEFAULT FALSE,
    consent_disclaimer BOOLEAN NOT NULL DEFAULT FALSE,
    consent_vision    BOOLEAN DEFAULT FALSE,       -- separate consent for photo/video
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
```

### 2.2 sessions
```sql
CREATE TABLE sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token     VARCHAR(255) UNIQUE NOT NULL,
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_refresh ON sessions(refresh_token);
```

### 2.3 profiles
```sql
CREATE TABLE profiles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name         VARCHAR(255) NOT NULL,
    date_of_birth     DATE NOT NULL,
    biological_sex    VARCHAR(20),                 -- 'male', 'female', 'other'
    height_cm         DECIMAL(5,1),
    weight_kg         DECIMAL(5,1),
    waist_cm          DECIMAL(5,1),
    blood_group       VARCHAR(5),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 occupations
```sql
CREATE TABLE occupations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_title         VARCHAR(255),
    industry          VARCHAR(255),
    working_hours     INTEGER,                     -- per week
    shift_schedule    VARCHAR(50),                 -- 'day', 'night', 'rotating', 'flexible'
    work_type         VARCHAR(50),                 -- 'remote', 'office', 'field', 'hybrid'
    sitting_hours     DECIMAL(4,1),                -- per day
    standing_hours    DECIMAL(4,1),
    driving_hours     DECIMAL(4,1),
    daily_activity    VARCHAR(50),                 -- 'sedentary', 'light', 'moderate', 'heavy'
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_occupations_user ON occupations(user_id);
```

### 2.5 lifestyle
```sql
CREATE TABLE lifestyle (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wake_up_time      TIME,
    bed_time          TIME,
    avg_sleep_hours   DECIMAL(3,1),
    sleep_quality     VARCHAR(20),                 -- 'poor', 'fair', 'good', 'excellent'
    water_intake_l    DECIMAL(3,1),
    sunlight_minutes  INTEGER,
    screen_time_hours DECIMAL(4,1),
    walking_steps     INTEGER,                     -- daily average
    exercise_freq     VARCHAR(50),                 -- 'never', 'rarely', '1-2x', '3-4x', '5+x' per week
    stress_level      INTEGER CHECK (stress_level BETWEEN 1 AND 10),
    smoking           VARCHAR(20),                 -- 'never', 'former', 'occasional', 'daily'
    alcohol           VARCHAR(20),                 -- 'never', 'occasional', 'weekly', 'daily'
    caffeine_intake   INTEGER,                     -- cups per day
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.6 nutrition_profile
```sql
CREATE TABLE nutrition_profile (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    diet_type         VARCHAR(30),                 -- 'vegetarian', 'eggetarian', 'non-vegetarian', 'vegan'
    food_allergies    TEXT[],                      -- array of allergies
    dietary_restrictions TEXT[],
    religious_preferences TEXT[],
    cooking_time_min  INTEGER,                     -- available per day
    monthly_budget    DECIMAL(10,2),               -- food budget in local currency
    favorite_foods    TEXT[],
    foods_to_avoid    TEXT[],
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.7 medical_history
```sql
CREATE TABLE medical_history (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_conditions TEXT[],                     -- array of current medical conditions
    past_illnesses     TEXT[],
    past_surgeries     TEXT[],
    current_medications TEXT[],
    medication_details JSONB,                      -- [{name, dosage, frequency, since}]
    allergies          TEXT[],
    family_history     JSONB,                      -- [{condition, relation}]
    pregnancy_status  VARCHAR(30),                 -- 'not_applicable', 'trying', 'pregnant', 'postpartum'
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.8 pain_assessments
```sql
CREATE TABLE pain_assessments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body_area         VARCHAR(50) NOT NULL,        -- 'neck', 'back', 'knee', 'shoulder', 'hip', 'foot', 'wrist', 'elbow'
    severity          INTEGER CHECK (severity BETWEEN 1 AND 10),
    duration          VARCHAR(50),                 -- 'days', 'weeks', 'months', 'years'
    frequency         VARCHAR(50),                 -- 'constant', 'daily', 'several_times_week', 'weekly', 'occasional'
    pain_type         VARCHAR(100),                -- 'sharp', 'dull', 'burning', 'tingling', 'stabbing', 'aching'
    triggering_activities TEXT[],
    relieving_factors TEXT[],
    morning_stiffness BOOLEAN,
    mobility_limitation VARCHAR(100),
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pain_user ON pain_assessments(user_id);
CREATE INDEX idx_pain_active ON pain_assessments(user_id, is_active);
```

### 2.9 goals
```sql
CREATE TABLE goals (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal              VARCHAR(100) NOT NULL,       -- e.g., 'reduce_neck_pain', 'lose_weight', 'improve_posture'
    priority          INTEGER DEFAULT 0,
    target_date       DATE,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_goals_active ON goals(user_id, is_active);
```

---

## 3. Computer Vision Tables

### 3.1 vision_media
```sql
CREATE TABLE vision_media (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_type        VARCHAR(10) NOT NULL,        -- 'photo' or 'video'
    angle             VARCHAR(20),                 -- 'front', 'side', 'back' (for photos)
    movement_type     VARCHAR(20),                 -- 'walking', 'squatting', 'bending' (for videos)
    file_key          VARCHAR(500) NOT NULL,       -- S3 object key
    file_size_bytes   BIGINT,
    mime_type         VARCHAR(50),
    status            VARCHAR(30) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_vision_user ON vision_media(user_id);
CREATE INDEX idx_vision_status ON vision_media(status);
```

### 3.2 vision_analyses
```sql
CREATE TABLE vision_analyses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_id          UUID NOT NULL REFERENCES vision_media(id) ON DELETE CASCADE,
    analysis_type     VARCHAR(20),                 -- 'posture', 'movement'
    landmarks         JSONB,                       -- raw landmark coordinates [{x, y, z, visibility}]
    angles            JSONB,                       -- calculated angles {neck_angle, shoulder_angle, pelvic_tilt, knee_valgus}
    findings          JSONB,                       -- [{finding, confidence, detail}]
    summary           TEXT,                        -- plain-language summary
    confidence_score  DECIMAL(4,3),                -- overall confidence 0-1
    processing_time_ms INTEGER,
    model_version     VARCHAR(50),
    status            VARCHAR(30) DEFAULT 'completed',
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vision_analysis_user ON vision_analyses(user_id);
CREATE INDEX idx_vision_analysis_media ON vision_analyses(media_id);
```

### 3.3 posture_characteristics
```sql
CREATE TABLE posture_characteristics (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_id       UUID NOT NULL REFERENCES vision_analyses(id) ON DELETE CASCADE,
    characteristic    VARCHAR(100) NOT NULL,       -- 'forward_head', 'rounded_shoulders', 'anterior_pelvic_tilt', 'knee_valgus', 'flat_feet'
    severity          VARCHAR(20),                 -- 'none', 'mild', 'moderate', 'severe'
    confidence        DECIMAL(4,3),
    description       TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posture_analysis ON posture_characteristics(analysis_id);
CREATE INDEX idx_posture_user_active ON posture_characteristics(user_id, is_active);
```

---

## 4. Medical Report Tables

### 4.1 medical_reports
```sql
CREATE TABLE medical_reports (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type       VARCHAR(50),                 -- 'blood_report', 'mri', 'xray', 'ct', 'dexa', 'other'
    title             VARCHAR(255),
    file_key          VARCHAR(500) NOT NULL,
    file_size_bytes   BIGINT,
    mime_type         VARCHAR(50),
    report_date       DATE,
    institution_name  VARCHAR(255),
    status            VARCHAR(30) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_reports_user ON medical_reports(user_id);
CREATE INDEX idx_reports_date ON medical_reports(report_date);
```

### 4.2 report_analyses
```sql
CREATE TABLE report_analyses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id         UUID UNIQUE NOT NULL REFERENCES medical_reports(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_text          TEXT,                        -- extracted OCR text
    parsed_data       JSONB,                       -- structured key-value pairs
    patient_summary   TEXT,                        -- plain-language explanation
    doctor_summary    TEXT,                         -- clinical summary
    confidence_score  DECIMAL(4,3),
    processing_time_ms INTEGER,
    model_version     VARCHAR(50),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_analyses_user ON report_analyses(user_id);
```

### 4.3 lab_results
```sql
CREATE TABLE lab_results (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id         UUID NOT NULL REFERENCES medical_reports(id) ON DELETE CASCADE,
    test_name         VARCHAR(255) NOT NULL,       -- e.g., 'Vitamin D', 'HbA1c'
    test_category     VARCHAR(100),                -- 'vitamins', 'lipid_profile', 'liver_function', etc.
    value             DECIMAL(15,4),
    unit              VARCHAR(50),
    reference_range   VARCHAR(100),                -- e.g., '30-100 ng/mL'
    is_abnormal       BOOLEAN,
    flag              VARCHAR(10),                 -- 'low', 'normal', 'high', 'critical'
    test_date         DATE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lab_user ON lab_results(user_id);
CREATE INDEX idx_lab_test ON lab_results(test_name);
CREATE INDEX idx_lab_date ON lab_results(test_date);
```

---

## 5. AI Output Tables

### 5.1 recommendations
```sql
CREATE TABLE recommendations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version           INTEGER NOT NULL DEFAULT 1,
    summary           TEXT NOT NULL,
    suggestions       JSONB,                       -- [{suggestion, category, confidence, evidence}]
    confidence_level  VARCHAR(20),                 -- 'high', 'medium', 'low'
    evidence_summary  TEXT,
    doctor_topics     TEXT[],                      -- things to discuss with doctor
    suggested_tests   JSONB,                       -- [{test_name, reason}]
    red_flags         TEXT[],                      -- detected red-flag symptoms
    prompt_tokens     INTEGER,
    completion_tokens INTEGER,
    model_version     VARCHAR(50),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_user ON recommendations(user_id, version);
```

### 5.2 diet_plans
```sql
CREATE TABLE diet_plans (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start        DATE NOT NULL,
    week_end          DATE NOT NULL,
    meals             JSONB NOT NULL,              -- [{day, breakfast, lunch, dinner, snacks}]
    daily_targets     JSONB,                       -- {calories, protein_g, water_l}
    shopping_list     JSONB,                       -- [{item, category, quantity}]
    recipes           JSONB,                       -- [{name, ingredients, instructions, prep_time}]
    meal_timing       JSONB,                       -- recommended meal times
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diet_user ON diet_plans(user_id, week_start);
```

### 5.3 exercise_plans
```sql
CREATE TABLE exercise_plans (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phase             VARCHAR(50),                 -- 'acute', 'sub_acute', 'chronic', 'maintenance'
    week_start        DATE NOT NULL,
    week_end          DATE NOT NULL,
    warm_up           JSONB,
    stretching        JSONB,
    strength          JSONB,                       -- [{exercise, sets, reps, rest, notes}]
    walking           JSONB,                       -- {target_steps, target_minutes, frequency}
    yoga              JSONB,
    progression       JSONB,                       -- next week adjustments
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercise_user ON exercise_plans(user_id, week_start);
```

### 5.4 routines
```sql
CREATE TABLE routines (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week       INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    schedule          JSONB NOT NULL,              -- [{time, activity, duration_min, notes}]
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routines_user ON routines(user_id);
```

---

## 6. Tracking Tables

### 6.1 weekly_checkins
```sql
CREATE TABLE weekly_checkins (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start        DATE NOT NULL,
    pain_scores       JSONB,                       -- {neck: 3, back: 5, ...}
    energy_level      INTEGER CHECK (energy_level BETWEEN 1 AND 10),
    sleep_hours       DECIMAL(3,1),
    sleep_quality     INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
    mood              INTEGER CHECK (mood BETWEEN 1 AND 10),
    weight_kg         DECIMAL(5,1),
    water_intake_l    DECIMAL(3,1),
    exercise_completion INTEGER CHECK (exercise_completion BETWEEN 0 AND 100),
    walking_steps     INTEGER,
    diet_adherence    INTEGER CHECK (diet_adherence BETWEEN 0 AND 100),
    notes             TEXT,
    ai_summary        TEXT,                        -- AI-generated weekly summary
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_checkin_user_week ON weekly_checkins(user_id, week_start);
```

### 6.2 progress_metrics
```sql
CREATE TABLE progress_metrics (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_date       DATE NOT NULL,
    metric_type       VARCHAR(50) NOT NULL,        -- 'weight', 'bmi', 'waist', 'pain_score', 'sleep', 'water', 'health_score'
    value             DECIMAL(10,4) NOT NULL,
    source            VARCHAR(50),                 -- 'manual', 'checkin', 'ai_estimate'
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_progress_user ON progress_metrics(user_id, metric_type, metric_date);
```

### 6.3 health_timeline
```sql
CREATE TABLE health_timeline (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type        VARCHAR(50) NOT NULL,        -- 'lab_result', 'assessment', 'pain_update', 'medication', 'recommendation', 'checkin'
    reference_id      UUID,                        -- FK to source table
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    event_date        TIMESTAMPTZ NOT NULL,
    embedding         vector(1536),                 -- pgvector for semantic search
    metadata          JSONB,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_user ON health_timeline(user_id, event_date);
CREATE INDEX idx_timeline_type ON health_timeline(event_type);
-- CREATE INDEX idx_timeline_embedding ON health_timeline USING ivfflat (embedding vector_cosine_ops);
```

---

## 7. Audit & System Tables

### 7.1 ai_audit_logs
```sql
CREATE TABLE ai_audit_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module            VARCHAR(50) NOT NULL,        -- 'recommendation', 'report_analysis', 'vision', 'diet', 'exercise'
    action            VARCHAR(100) NOT NULL,
    prompt            TEXT,
    response          TEXT,
    tokens_used       INTEGER,
    model             VARCHAR(100),
    latency_ms        INTEGER,
    ip_address        INET,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON ai_audit_logs(user_id);
CREATE INDEX idx_audit_module ON ai_audit_logs(module);
CREATE INDEX idx_audit_created ON ai_audit_logs(created_at);
```

### 7.2 consent_logs
```sql
CREATE TABLE consent_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type      VARCHAR(50) NOT NULL,        -- 'privacy', 'disclaimer', 'vision_analysis', 'data_deletion'
    action            VARCHAR(20) NOT NULL,        -- 'granted', 'revoked'
    ip_address        INET,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_user ON consent_logs(user_id);
```

---

## 8. RLS Policies

```sql
-- All tables follow the same pattern:
-- Users can only access rows where user_id = auth.uid()

-- Example for medical_reports:
CREATE POLICY user_isolation ON medical_reports
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Vision media: same pattern
CREATE POLICY user_isolation ON vision_media
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Audit logs: user can read own logs
CREATE POLICY user_read_audit ON ai_audit_logs
    FOR SELECT
    USING (user_id = auth.uid());
```

---

## 9. Indexing Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| users | email | Login lookup |
| lab_results | (user_id, test_name, test_date) | Trend queries |
| progress_metrics | (user_id, metric_type, metric_date) | Dashboard charts |
| health_timeline | (user_id, event_date) | Timeline feed |
| health_timeline | embedding (ivfflat) | Semantic search |
| vision_analyses | (user_id, created_at) | Latest analysis lookup |
| weekly_checkins | (user_id, week_start) | Unique per user per week |
| ai_audit_logs | (user_id, created_at) | Audit trail queries |
