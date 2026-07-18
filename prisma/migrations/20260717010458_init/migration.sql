-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "consent_privacy" BOOLEAN NOT NULL DEFAULT false,
    "consent_disclaimer" BOOLEAN NOT NULL DEFAULT false,
    "consent_vision" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "biological_sex" TEXT,
    "height_cm" DECIMAL(65,30),
    "weight_kg" DECIMAL(65,30),
    "waist_cm" DECIMAL(65,30),
    "blood_group" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_title" TEXT,
    "industry" TEXT,
    "working_hours" INTEGER,
    "shift_schedule" TEXT,
    "work_type" TEXT,
    "sitting_hours" DECIMAL(65,30),
    "standing_hours" DECIMAL(65,30),
    "driving_hours" DECIMAL(65,30),
    "daily_activity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "occupations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifestyles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wake_up_time" TEXT,
    "bed_time" TEXT,
    "avg_sleep_hours" DECIMAL(65,30),
    "sleep_quality" TEXT,
    "water_intake_l" DECIMAL(65,30),
    "sunlight_minutes" INTEGER,
    "screen_time_hours" DECIMAL(65,30),
    "walkingSteps" INTEGER,
    "exercise_freq" TEXT,
    "stress_level" INTEGER,
    "smoking" TEXT,
    "alcohol" TEXT,
    "caffeine_intake" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lifestyles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "diet_type" TEXT,
    "food_allergies" TEXT[],
    "dietary_restrictions" TEXT[],
    "religious_preferences" TEXT[],
    "cooking_time_min" INTEGER,
    "monthly_budget" DECIMAL(65,30),
    "favorite_foods" TEXT[],
    "foods_to_avoid" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_conditions" TEXT[],
    "past_illnesses" TEXT[],
    "past_surgeries" TEXT[],
    "current_medications" TEXT[],
    "medication_details" JSONB,
    "allergies" TEXT[],
    "family_history" JSONB,
    "pregnancy_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pain_assessments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body_area" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "duration" TEXT,
    "frequency" TEXT,
    "pain_type" TEXT,
    "triggering_activities" TEXT[],
    "relieving_factors" TEXT[],
    "morning_stiffness" BOOLEAN,
    "mobility_limitation" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pain_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "target_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vision_media" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "angle" TEXT,
    "movement_type" TEXT,
    "file_key" TEXT NOT NULL,
    "file_size_bytes" BIGINT,
    "mime_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vision_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vision_analyses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "analysis_type" TEXT,
    "landmarks" JSONB,
    "angles" JSONB,
    "findings" JSONB,
    "summary" TEXT,
    "confidence_score" DECIMAL(65,30),
    "processing_time_ms" INTEGER,
    "model_version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vision_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posture_characteristics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "characteristic" TEXT NOT NULL,
    "severity" TEXT,
    "confidence" DECIMAL(65,30),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posture_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_type" TEXT,
    "title" TEXT,
    "file_key" TEXT NOT NULL,
    "file_size_bytes" BIGINT,
    "mime_type" TEXT,
    "report_date" TIMESTAMP(3),
    "institution_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "medical_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_analyses" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "raw_text" TEXT,
    "parsed_data" JSONB,
    "patient_summary" TEXT,
    "doctor_summary" TEXT,
    "confidence_score" DECIMAL(65,30),
    "processing_time_ms" INTEGER,
    "model_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "test_category" TEXT,
    "value" DECIMAL(65,30),
    "unit" TEXT,
    "reference_range" TEXT,
    "is_abnormal" BOOLEAN,
    "flag" TEXT,
    "test_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "summary" TEXT NOT NULL,
    "suggestions" JSONB,
    "confidence_level" TEXT,
    "evidence_summary" TEXT,
    "doctor_topics" TEXT[],
    "suggested_tests" JSONB,
    "red_flags" TEXT[],
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "model_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "week_end" TIMESTAMP(3) NOT NULL,
    "meals" JSONB,
    "daily_targets" JSONB,
    "shopping_list" JSONB,
    "recipes" JSONB,
    "meal_timing" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diet_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phase" TEXT,
    "week_start" TIMESTAMP(3) NOT NULL,
    "week_end" TIMESTAMP(3) NOT NULL,
    "warm_up" JSONB,
    "stretching" JSONB,
    "strength" JSONB,
    "walking" JSONB,
    "yoga" JSONB,
    "progression" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "schedule" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_checkins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "pain_scores" JSONB,
    "energy_level" INTEGER,
    "sleep_hours" DECIMAL(65,30),
    "sleep_quality" INTEGER,
    "mood" INTEGER,
    "weight_kg" DECIMAL(65,30),
    "water_intake_l" DECIMAL(65,30),
    "exercise_completion" INTEGER,
    "walking_steps" INTEGER,
    "diet_adherence" INTEGER,
    "notes" TEXT,
    "ai_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_metrics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "metric_date" TIMESTAMP(3) NOT NULL,
    "metric_type" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_timeline" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "reference_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "prompt" TEXT,
    "response" TEXT,
    "tokens_used" INTEGER,
    "model" TEXT,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "occupations_user_id_key" ON "occupations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lifestyles_user_id_key" ON "lifestyles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_profiles_user_id_key" ON "nutrition_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "medical_histories_user_id_key" ON "medical_histories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_analyses_report_id_key" ON "report_analyses"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_checkins_user_id_week_start_key" ON "weekly_checkins"("user_id", "week_start");

-- CreateIndex
CREATE INDEX "progress_metrics_user_id_metric_type_metric_date_idx" ON "progress_metrics"("user_id", "metric_type", "metric_date");

-- CreateIndex
CREATE INDEX "health_timeline_user_id_event_date_idx" ON "health_timeline"("user_id", "event_date");

-- CreateIndex
CREATE INDEX "ai_audit_logs_user_id_created_at_idx" ON "ai_audit_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupations" ADD CONSTRAINT "occupations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifestyles" ADD CONSTRAINT "lifestyles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_profiles" ADD CONSTRAINT "nutrition_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_histories" ADD CONSTRAINT "medical_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pain_assessments" ADD CONSTRAINT "pain_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vision_media" ADD CONSTRAINT "vision_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vision_analyses" ADD CONSTRAINT "vision_analyses_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "vision_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vision_analyses" ADD CONSTRAINT "vision_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posture_characteristics" ADD CONSTRAINT "posture_characteristics_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "vision_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posture_characteristics" ADD CONSTRAINT "posture_characteristics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_analyses" ADD CONSTRAINT "report_analyses_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "medical_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_analyses" ADD CONSTRAINT "report_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "medical_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_plans" ADD CONSTRAINT "exercise_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_checkins" ADD CONSTRAINT "weekly_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_metrics" ADD CONSTRAINT "progress_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_timeline" ADD CONSTRAINT "health_timeline_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
