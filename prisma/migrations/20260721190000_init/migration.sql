-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- PostgreSQL capabilities used by UUIDs, case-insensitive identifiers and
-- glossary discovery.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('UK', 'EN');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('MILITARY', 'CIVILIAN', 'CADET', 'VOLUNTEER', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentOrigin" AS ENUM ('HUMAN', 'AI_ASSISTED', 'CSV_IMPORT', 'SEED_DEMO');

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PHRASE', 'ABBREVIATION', 'PROPER_NOUN', 'OTHER');

-- CreateEnum
CREATE TYPE "VariantKind" AS ENUM ('PRIMARY', 'SYNONYM', 'ABBREVIATION', 'INFLECTION', 'HYPHEN_VARIANT');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL_UKRAINIAN', 'NATO', 'DOD', 'DOCTRINE', 'DICTIONARY', 'MEDICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AudioProvider" AS ENUM ('LOCAL', 'S3_COMPATIBLE');

-- CreateEnum
CREATE TYPE "AudioKind" AS ENUM ('HUMAN_RECORDING', 'SYNTHETIC');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('EN_TO_UK', 'UK_TO_EN');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('MULTIPLE_CHOICE', 'UA_TO_EN', 'EN_TO_UA', 'MATCH_PAIRS', 'TYPE_ANSWER', 'ABBREVIATION', 'CONTEXT_SENTENCE', 'AUDIO', 'PREVIOUSLY_MISSED');

-- CreateEnum
CREATE TYPE "StudySessionKind" AS ENUM ('LESSON', 'REVIEW', 'PRACTICE');

-- CreateEnum
CREATE TYPE "StudySessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StudyStage" AS ENUM ('INTRODUCTION', 'PRACTICE', 'AFTER_ACTION_REVIEW');

-- CreateEnum
CREATE TYPE "SessionItemStatus" AS ENUM ('PENDING', 'ANSWERED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ProgressState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');

-- CreateEnum
CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateEnum
CREATE TYPE "AchievementMetric" AS ENUM ('LESSONS_COMPLETED', 'CONSECUTIVE_CORRECT', 'PERFECT_LESSONS', 'MASTERED_TERMS', 'MASTERED_TERMS_IN_CATEGORY', 'CURRENT_STREAK', 'PREVIOUSLY_MISSED_CORRECT', 'ALL_CATEGORIES_LEVEL');

-- CreateEnum
CREATE TYPE "ComparisonOperator" AS ENUM ('EQUALS', 'GREATER_THAN_OR_EQUAL');

-- CreateEnum
CREATE TYPE "AchievementWindow" AS ENUM ('ALL_TIME', 'CURRENT_STREAK', 'SINGLE_SESSION');

-- CreateEnum
CREATE TYPE "XpReason" AS ENUM ('CORRECT_ANSWER', 'SCHEDULED_REVIEW', 'FIRST_LESSON_COMPLETION', 'PERFECT_LESSON', 'ACHIEVEMENT', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LeaderboardPeriodType" AS ENUM ('WEEKLY', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('INCORRECT_TRANSLATION', 'INCORRECT_DEFINITION', 'INCORRECT_AUDIO', 'BROKEN_SOURCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'VALIDATING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('PENDING', 'IMPORTED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "nickname" CITEXT NOT NULL,
    "audience_type" "AudienceType",
    "preferred_locale" "Locale" NOT NULL DEFAULT 'UK',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Kyiv',
    "daily_goal_xp" INTEGER NOT NULL DEFAULT 20,
    "leaderboard_visible" BOOLEAN NOT NULL DEFAULT false,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name_uk" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(120) NOT NULL,
    "name_uk" VARCHAR(160) NOT NULL,
    "name_en" VARCHAR(160) NOT NULL,
    "description_uk" TEXT,
    "description_en" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by_id" UUID,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "csrf_token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "idle_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" VARCHAR(120),
    "ip_digest" CHAR(64),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" VARCHAR(80) NOT NULL,
    "bucket_key" CHAR(64) NOT NULL,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,
    "window_ends_at" TIMESTAMPTZ(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "principal_key" CHAR(64) NOT NULL,
    "scope" VARCHAR(120) NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "response_status" INTEGER,
    "response_body" JSONB,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "idempotency_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(80) NOT NULL,
    "name_uk" VARCHAR(160) NOT NULL,
    "name_en" VARCHAR(160) NOT NULL,
    "description_uk" TEXT,
    "description_en" TEXT,
    "target_term_count" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(120) NOT NULL,
    "part_of_speech" "PartOfSpeech" NOT NULL,
    "difficulty" SMALLINT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "origin" "ContentOrigin" NOT NULL DEFAULT 'HUMAN',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "current_revision" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "published_by_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_categories" (
    "term_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_categories_pkey" PRIMARY KEY ("term_id","category_id")
);

-- CreateTable
CREATE TABLE "term_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "kind" "VariantKind" NOT NULL,
    "value" VARCHAR(200) NOT NULL,
    "normalized_value" VARCHAR(200) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_accepted_answer" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "term_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "short_definition" TEXT,
    "example" TEXT,
    "context_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "term_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exact_url" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "publisher" VARCHAR(200),
    "source_type" "SourceType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "checked_at" TIMESTAMPTZ(3),
    "checked_by_id" UUID,
    "citation_note" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "term_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "status" "ContentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" UUID NOT NULL,
    "assigned_to_id" UUID,
    "decided_by_id" UUID,
    "note" TEXT,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),

    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "author_user_id" UUID NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'EN',
    "provider" "AudioProvider" NOT NULL,
    "kind" "AudioKind" NOT NULL DEFAULT 'HUMAN_RECORDING',
    "object_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "duration_ms" INTEGER,
    "attribution" VARCHAR(300),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by_id" UUID NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_distractors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "distractor_term_id" UUID NOT NULL,
    "direction" "Direction" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_distractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_imports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "imported_by_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "rejected_rows" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_import_rows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "import_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "error" JSONB,
    "term_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(120) NOT NULL,
    "category_id" UUID,
    "title_uk" VARCHAR(200) NOT NULL,
    "title_en" VARCHAR(200) NOT NULL,
    "description_uk" TEXT,
    "description_en" TEXT,
    "difficulty" SMALLINT NOT NULL,
    "estimated_minutes" SMALLINT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_terms" (
    "lesson_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_terms_pkey" PRIMARY KEY ("lesson_id","term_id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID,
    "kind" "StudySessionKind" NOT NULL,
    "direction" "Direction" NOT NULL,
    "status" "StudySessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_stage" "StudyStage" NOT NULL DEFAULT 'INTRODUCTION',
    "idempotency_key" VARCHAR(120) NOT NULL,
    "xp_policy_version" VARCHAR(40) NOT NULL,
    "scheduler_version" VARCHAR(40) NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "max_score" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "abandoned_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_session_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "study_session_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "prompt_variant_id" UUID,
    "content_revision_number" INTEGER NOT NULL,
    "position" SMALLINT NOT NULL,
    "stage" "StudyStage" NOT NULL,
    "exercise_type" "ExerciseType" NOT NULL,
    "status" "SessionItemStatus" NOT NULL DEFAULT 'PENDING',
    "options_snapshot" JSONB,
    "max_attempts" SMALLINT NOT NULL DEFAULT 1,
    "served_at" TIMESTAMPTZ(3),
    "answered_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_session_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "study_session_id" UUID NOT NULL,
    "session_item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "accepted_variant_id" UUID,
    "client_answer_id" VARCHAR(120) NOT NULL,
    "attempt_number" SMALLINT NOT NULL,
    "submitted_answer" TEXT,
    "normalized_answer" VARCHAR(200),
    "is_correct" BOOLEAN NOT NULL,
    "rating" "ReviewRating",
    "response_time_ms" INTEGER NOT NULL,
    "awarded_xp" INTEGER NOT NULL DEFAULT 0,
    "normalization_version" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_term_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "state" "ProgressState" NOT NULL DEFAULT 'NEW',
    "difficulty" DECIMAL(8,5) NOT NULL DEFAULT 0,
    "stability" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "due_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_reviewed_at" TIMESTAMPTZ(3),
    "scheduled_days" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "average_response_time_ms" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_term_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_term_progress_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "session_answer_id" UUID,
    "rating" "ReviewRating" NOT NULL,
    "was_correct" BOOLEAN NOT NULL,
    "previous_state" "ProgressState" NOT NULL,
    "previous_difficulty" DECIMAL(8,5) NOT NULL,
    "previous_stability" DECIMAL(12,6) NOT NULL,
    "previous_due_at" TIMESTAMPTZ(3),
    "new_state" "ProgressState" NOT NULL,
    "new_difficulty" DECIMAL(8,5) NOT NULL,
    "new_stability" DECIMAL(12,6) NOT NULL,
    "new_due_at" TIMESTAMPTZ(3) NOT NULL,
    "scheduled_days" INTEGER NOT NULL,
    "scheduler_version" VARCHAR(40) NOT NULL,
    "reviewed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_activity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "activity_date" DATE NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "xp_earned" INTEGER NOT NULL DEFAULT 0,
    "answers_submitted" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "lessons_completed" INTEGER NOT NULL DEFAULT 0,
    "reviews_completed" INTEGER NOT NULL DEFAULT 0,
    "goal_met_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_daily_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lesson_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "first_completed_at" TIMESTAMPTZ(3),
    "last_completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(100) NOT NULL,
    "name_uk" VARCHAR(160) NOT NULL,
    "name_en" VARCHAR(160) NOT NULL,
    "description_uk" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "icon_key" VARCHAR(80) NOT NULL,
    "reward_xp" INTEGER NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "achievement_id" UUID NOT NULL,
    "metric" "AchievementMetric" NOT NULL,
    "operator" "ComparisonOperator" NOT NULL DEFAULT 'GREATER_THAN_OR_EQUAL',
    "threshold" INTEGER NOT NULL,
    "category_id" UUID,
    "window" "AchievementWindow" NOT NULL DEFAULT 'ALL_TIME',
    "group_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "trigger_type" VARCHAR(80) NOT NULL,
    "trigger_id" VARCHAR(120),
    "awarded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "XpReason" NOT NULL,
    "source_type" VARCHAR(80) NOT NULL,
    "source_id" VARCHAR(120) NOT NULL,
    "dedupe_key" VARCHAR(240) NOT NULL,
    "policy_version" VARCHAR(40) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(80) NOT NULL,
    "type" "LeaderboardPeriodType" NOT NULL,
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "finalized_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" UUID,
    "resolution_note" TEXT,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "term_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "target_type" VARCHAR(80) NOT NULL,
    "target_id" VARCHAR(120),
    "request_id" VARCHAR(120),
    "ip_digest" CHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_nickname_key" ON "user_profiles"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_expires_at_idx" ON "auth_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_expires_at_idx" ON "verification_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_action_bucket_key_idx" ON "rate_limit_buckets"("action", "bucket_key");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_window_ends_at_idx" ON "rate_limit_buckets"("window_ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_buckets_action_bucket_key_window_started_at_key" ON "rate_limit_buckets"("action", "bucket_key", "window_started_at");

-- CreateIndex
CREATE INDEX "idempotency_requests_expires_at_idx" ON "idempotency_requests"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_requests_principal_key_scope_key_key" ON "idempotency_requests"("principal_key", "scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_archived_at_display_order_idx" ON "categories"("archived_at", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "terms_slug_key" ON "terms"("slug");

-- CreateIndex
CREATE INDEX "terms_status_published_at_idx" ON "terms"("status", "published_at");

-- CreateIndex
CREATE INDEX "terms_created_by_id_created_at_idx" ON "terms"("created_by_id", "created_at");

-- CreateIndex
CREATE INDEX "term_categories_category_id_is_primary_idx" ON "term_categories"("category_id", "is_primary");

-- CreateIndex
CREATE INDEX "term_variants_locale_normalized_value_idx" ON "term_variants"("locale", "normalized_value");

-- CreateIndex
CREATE UNIQUE INDEX "term_variants_term_id_locale_normalized_value_key" ON "term_variants"("term_id", "locale", "normalized_value");

-- CreateIndex
CREATE UNIQUE INDEX "term_definitions_term_id_locale_key" ON "term_definitions"("term_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "sources_exact_url_key" ON "sources"("exact_url");

-- CreateIndex
CREATE INDEX "term_sources_source_id_idx" ON "term_sources"("source_id");

-- CreateIndex
CREATE INDEX "term_sources_term_id_verification_status_idx" ON "term_sources"("term_id", "verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "term_sources_term_id_source_id_key" ON "term_sources"("term_id", "source_id");

-- CreateIndex
CREATE INDEX "content_reviews_term_id_status_idx" ON "content_reviews"("term_id", "status");

-- CreateIndex
CREATE INDEX "content_reviews_assigned_to_id_status_idx" ON "content_reviews"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "content_revisions_author_user_id_created_at_idx" ON "content_revisions"("author_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_revisions_term_id_revision_number_key" ON "content_revisions"("term_id", "revision_number");

-- CreateIndex
CREATE INDEX "audio_assets_term_id_locale_archived_at_idx" ON "audio_assets"("term_id", "locale", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "audio_assets_provider_object_key_key" ON "audio_assets"("provider", "object_key");

-- CreateIndex
CREATE INDEX "term_distractors_distractor_term_id_idx" ON "term_distractors"("distractor_term_id");

-- CreateIndex
CREATE UNIQUE INDEX "term_distractors_term_id_distractor_term_id_direction_key" ON "term_distractors"("term_id", "distractor_term_id", "direction");

-- CreateIndex
CREATE INDEX "content_imports_status_created_at_idx" ON "content_imports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_imports_imported_by_id_checksum_key" ON "content_imports"("imported_by_id", "checksum");

-- CreateIndex
CREATE INDEX "content_import_rows_term_id_idx" ON "content_import_rows"("term_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_import_rows_import_id_row_number_key" ON "content_import_rows"("import_id", "row_number");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_slug_key" ON "lessons"("slug");

-- CreateIndex
CREATE INDEX "lessons_category_id_status_idx" ON "lessons"("category_id", "status");

-- CreateIndex
CREATE INDEX "lessons_status_published_at_idx" ON "lessons"("status", "published_at");

-- CreateIndex
CREATE INDEX "lesson_terms_term_id_idx" ON "lesson_terms"("term_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_terms_lesson_id_position_key" ON "lesson_terms"("lesson_id", "position");

-- CreateIndex
CREATE INDEX "study_sessions_user_id_started_at_idx" ON "study_sessions"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "study_sessions_status_expires_at_idx" ON "study_sessions"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "study_sessions_user_id_idempotency_key_key" ON "study_sessions"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "study_session_items_term_id_idx" ON "study_session_items"("term_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_session_items_study_session_id_position_key" ON "study_session_items"("study_session_id", "position");

-- CreateIndex
CREATE INDEX "session_answers_user_id_created_at_idx" ON "session_answers"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "session_answers_term_id_created_at_idx" ON "session_answers"("term_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "session_answers_study_session_id_client_answer_id_key" ON "session_answers"("study_session_id", "client_answer_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_answers_session_item_id_attempt_number_key" ON "session_answers"("session_item_id", "attempt_number");

-- CreateIndex
CREATE INDEX "user_term_progress_user_id_due_at_idx" ON "user_term_progress"("user_id", "due_at");

-- CreateIndex
CREATE INDEX "user_term_progress_term_id_idx" ON "user_term_progress"("term_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_term_progress_user_id_term_id_key" ON "user_term_progress"("user_id", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_logs_session_answer_id_key" ON "review_logs"("session_answer_id");

-- CreateIndex
CREATE INDEX "review_logs_user_id_term_id_created_at_idx" ON "review_logs"("user_id", "term_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "review_logs_user_term_progress_id_created_at_idx" ON "review_logs"("user_term_progress_id", "created_at");

-- CreateIndex
CREATE INDEX "user_daily_activity_activity_date_idx" ON "user_daily_activity"("activity_date");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_activity_user_id_activity_date_key" ON "user_daily_activity"("user_id", "activity_date");

-- CreateIndex
CREATE INDEX "user_lesson_progress_lesson_id_idx" ON "user_lesson_progress"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_lesson_progress_user_id_lesson_id_key" ON "user_lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE INDEX "achievements_is_active_display_order_idx" ON "achievements"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "achievement_rules_achievement_id_group_number_idx" ON "achievement_rules"("achievement_id", "group_number");

-- CreateIndex
CREATE INDEX "achievement_rules_category_id_idx" ON "achievement_rules"("category_id");

-- CreateIndex
CREATE INDEX "user_achievements_achievement_id_awarded_at_idx" ON "user_achievements"("achievement_id", "awarded_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_dedupe_key_key" ON "xp_transactions"("dedupe_key");

-- CreateIndex
CREATE INDEX "xp_transactions_user_id_created_at_idx" ON "xp_transactions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_user_id_source_type_source_id_key" ON "xp_transactions"("user_id", "source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_periods_slug_key" ON "leaderboard_periods"("slug");

-- CreateIndex
CREATE INDEX "leaderboard_periods_type_starts_at_idx" ON "leaderboard_periods"("type", "starts_at");

-- CreateIndex
CREATE INDEX "leaderboard_entries_period_id_xp_idx" ON "leaderboard_entries"("period_id", "xp" DESC);

-- CreateIndex
CREATE INDEX "leaderboard_entries_user_id_idx" ON "leaderboard_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entries_period_id_user_id_key" ON "leaderboard_entries"("period_id", "user_id");

-- CreateIndex
CREATE INDEX "term_reports_status_created_at_idx" ON "term_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "term_reports_submitted_by_id_created_at_idx" ON "term_reports"("submitted_by_id", "created_at");

-- CreateIndex
CREATE INDEX "term_reports_term_id_status_idx" ON "term_reports"("term_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_requests" ADD CONSTRAINT "idempotency_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_categories" ADD CONSTRAINT "term_categories_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_categories" ADD CONSTRAINT "term_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_variants" ADD CONSTRAINT "term_variants_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_definitions" ADD CONSTRAINT "term_definitions_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_sources" ADD CONSTRAINT "term_sources_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_sources" ADD CONSTRAINT "term_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_sources" ADD CONSTRAINT "term_sources_checked_by_id_fkey" FOREIGN KEY ("checked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_distractors" ADD CONSTRAINT "term_distractors_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_distractors" ADD CONSTRAINT "term_distractors_distractor_term_id_fkey" FOREIGN KEY ("distractor_term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_imports" ADD CONSTRAINT "content_imports_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_import_rows" ADD CONSTRAINT "content_import_rows_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "content_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_import_rows" ADD CONSTRAINT "content_import_rows_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_terms" ADD CONSTRAINT "lesson_terms_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_terms" ADD CONSTRAINT "lesson_terms_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_session_items" ADD CONSTRAINT "study_session_items_study_session_id_fkey" FOREIGN KEY ("study_session_id") REFERENCES "study_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_session_items" ADD CONSTRAINT "study_session_items_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_session_items" ADD CONSTRAINT "study_session_items_prompt_variant_id_fkey" FOREIGN KEY ("prompt_variant_id") REFERENCES "term_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_study_session_id_fkey" FOREIGN KEY ("study_session_id") REFERENCES "study_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_session_item_id_fkey" FOREIGN KEY ("session_item_id") REFERENCES "study_session_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_accepted_variant_id_fkey" FOREIGN KEY ("accepted_variant_id") REFERENCES "term_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_term_progress" ADD CONSTRAINT "user_term_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_term_progress" ADD CONSTRAINT "user_term_progress_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_term_progress_id_fkey" FOREIGN KEY ("user_term_progress_id") REFERENCES "user_term_progress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_session_answer_id_fkey" FOREIGN KEY ("session_answer_id") REFERENCES "session_answers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_activity" ADD CONSTRAINT "user_daily_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_rules" ADD CONSTRAINT "achievement_rules_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_rules" ADD CONSTRAINT "achievement_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "leaderboard_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_reports" ADD CONSTRAINT "term_reports_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_reports" ADD CONSTRAINT "term_reports_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_reports" ADD CONSTRAINT "term_reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain checks kept in SQL because Prisma does not express them.
ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_daily_goal_xp_check" CHECK ("daily_goal_xp" BETWEEN 5 AND 500),
  ADD CONSTRAINT "user_profiles_totals_check" CHECK (
    "total_xp" >= 0 AND "level" >= 1 AND "current_streak" >= 0 AND
    "longest_streak" >= "current_streak"
  );

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_expiry_order_check" CHECK (
    "idle_expires_at" <= "expires_at" AND "last_seen_at" <= "expires_at"
  );

ALTER TABLE "rate_limit_buckets"
  ADD CONSTRAINT "rate_limit_buckets_window_check" CHECK (
    "count" > 0 AND "window_ends_at" > "window_started_at"
  );

ALTER TABLE "idempotency_requests"
  ADD CONSTRAINT "idempotency_requests_expiry_check" CHECK ("expires_at" > "created_at"),
  ADD CONSTRAINT "idempotency_requests_completion_check" CHECK (
    "status" <> 'COMPLETED' OR
    ("response_status" IS NOT NULL AND "response_body" IS NOT NULL)
  );

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_target_count_check" CHECK ("target_term_count" > 0);

ALTER TABLE "terms"
  ADD CONSTRAINT "terms_difficulty_check" CHECK ("difficulty" BETWEEN 1 AND 5),
  ADD CONSTRAINT "terms_revision_check" CHECK ("current_revision" > 0),
  ADD CONSTRAINT "terms_publication_check" CHECK (
    "status" <> 'PUBLISHED' OR "published_at" IS NOT NULL
  ),
  ADD CONSTRAINT "terms_archive_check" CHECK (
    "status" <> 'ARCHIVED' OR "archived_at" IS NOT NULL
  );

ALTER TABLE "term_sources"
  ADD CONSTRAINT "term_sources_verification_check" CHECK (
    "verification_status" <> 'VERIFIED' OR
    ("checked_at" IS NOT NULL AND "checked_by_id" IS NOT NULL)
  );

ALTER TABLE "audio_assets"
  ADD CONSTRAINT "audio_assets_size_check" CHECK ("byte_size" > 0),
  ADD CONSTRAINT "audio_assets_duration_check" CHECK (
    "duration_ms" IS NULL OR "duration_ms" > 0
  );

ALTER TABLE "content_imports"
  ADD CONSTRAINT "content_imports_counts_check" CHECK (
    "total_rows" >= 0 AND "imported_rows" >= 0 AND "rejected_rows" >= 0 AND
    "imported_rows" + "rejected_rows" <= "total_rows"
  );

ALTER TABLE "content_reviews"
  ADD CONSTRAINT "content_reviews_decision_check" CHECK (
    "status" = 'PENDING' OR
    ("decided_at" IS NOT NULL AND "decided_by_id" IS NOT NULL)
  );

ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_difficulty_check" CHECK ("difficulty" BETWEEN 1 AND 5),
  ADD CONSTRAINT "lessons_duration_check" CHECK ("estimated_minutes" BETWEEN 1 AND 120),
  ADD CONSTRAINT "lessons_publication_check" CHECK (
    "status" <> 'PUBLISHED' OR "published_at" IS NOT NULL
  ),
  ADD CONSTRAINT "lessons_archive_check" CHECK (
    "status" <> 'ARCHIVED' OR "archived_at" IS NOT NULL
  );

ALTER TABLE "lesson_terms"
  ADD CONSTRAINT "lesson_terms_position_check" CHECK ("position" > 0);

ALTER TABLE "study_sessions"
  ADD CONSTRAINT "study_sessions_score_check" CHECK (
    "score" >= 0 AND "max_score" >= 0 AND "score" <= "max_score"
  ),
  ADD CONSTRAINT "study_sessions_expiry_check" CHECK ("expires_at" > "started_at"),
  ADD CONSTRAINT "study_sessions_completion_check" CHECK (
    "status" <> 'COMPLETED' OR "completed_at" IS NOT NULL
  );

ALTER TABLE "study_session_items"
  ADD CONSTRAINT "study_session_items_position_check" CHECK ("position" > 0),
  ADD CONSTRAINT "study_session_items_attempts_check" CHECK ("max_attempts" BETWEEN 1 AND 5),
  ADD CONSTRAINT "study_session_items_revision_check" CHECK ("content_revision_number" > 0);

ALTER TABLE "session_answers"
  ADD CONSTRAINT "session_answers_attempt_check" CHECK ("attempt_number" > 0),
  ADD CONSTRAINT "session_answers_response_time_check" CHECK ("response_time_ms" >= 0),
  ADD CONSTRAINT "session_answers_xp_check" CHECK ("awarded_xp" >= 0);

ALTER TABLE "user_term_progress"
  ADD CONSTRAINT "user_term_progress_scheduler_check" CHECK (
    "difficulty" BETWEEN 0 AND 10 AND "stability" >= 0 AND "scheduled_days" >= 0 AND
    "repetitions" >= 0 AND "lapses" >= 0
  ),
  ADD CONSTRAINT "user_term_progress_counts_check" CHECK (
    "correct_count" >= 0 AND "incorrect_count" >= 0 AND
    "average_response_time_ms" >= 0 AND "version" >= 0
  );

ALTER TABLE "review_logs"
  ADD CONSTRAINT "review_logs_scheduler_check" CHECK (
    "previous_difficulty" BETWEEN 0 AND 10 AND "new_difficulty" BETWEEN 0 AND 10 AND
    "previous_stability" >= 0 AND "new_stability" >= 0 AND "scheduled_days" >= 0
  );

ALTER TABLE "user_daily_activity"
  ADD CONSTRAINT "user_daily_activity_counts_check" CHECK (
    "xp_earned" >= 0 AND "answers_submitted" >= 0 AND
    "correct_answers" BETWEEN 0 AND "answers_submitted" AND
    "lessons_completed" >= 0 AND "reviews_completed" >= 0
  );

ALTER TABLE "user_lesson_progress"
  ADD CONSTRAINT "user_lesson_progress_counts_check" CHECK (
    "completions" >= 0 AND "best_score" BETWEEN 0 AND 100
  );

ALTER TABLE "achievements"
  ADD CONSTRAINT "achievements_reward_check" CHECK ("reward_xp" >= 0);

ALTER TABLE "achievement_rules"
  ADD CONSTRAINT "achievement_rules_threshold_check" CHECK ("threshold" > 0);

ALTER TABLE "xp_transactions"
  ADD CONSTRAINT "xp_transactions_nonzero_check" CHECK ("amount" <> 0);

ALTER TABLE "leaderboard_entries"
  ADD CONSTRAINT "leaderboard_entries_xp_check" CHECK ("xp" >= 0);

ALTER TABLE "leaderboard_periods"
  ADD CONSTRAINT "leaderboard_periods_bounds_check" CHECK (
    ("type" = 'ALL_TIME' AND "starts_at" IS NULL AND "ends_at" IS NULL) OR
    ("type" = 'WEEKLY' AND "starts_at" IS NOT NULL AND
      "ends_at" IS NOT NULL AND "ends_at" > "starts_at")
  );

ALTER TABLE "term_reports"
  ADD CONSTRAINT "term_reports_resolution_check" CHECK (
    "status" IN ('OPEN', 'IN_REVIEW') OR
    ("resolved_at" IS NOT NULL AND "resolved_by_id" IS NOT NULL)
  );

-- Partial uniqueness covers business rules the Prisma schema cannot express.
CREATE UNIQUE INDEX "term_variants_one_primary_per_locale_idx"
  ON "term_variants" ("term_id", "locale") WHERE "is_primary" = true;
CREATE UNIQUE INDEX "term_categories_one_primary_idx"
  ON "term_categories" ("term_id") WHERE "is_primary" = true;
CREATE UNIQUE INDEX "audio_assets_one_primary_per_locale_idx"
  ON "audio_assets" ("term_id", "locale")
  WHERE "is_primary" = true AND "archived_at" IS NULL;
CREATE UNIQUE INDEX "content_reviews_one_pending_per_term_idx"
  ON "content_reviews" ("term_id") WHERE "status" = 'PENDING';

-- Fuzzy matching is restricted to glossary discovery; answer grading remains exact.
CREATE INDEX "term_variants_normalized_value_trgm_idx"
  ON "term_variants" USING GIN ("normalized_value" gin_trgm_ops);

-- Sequential workflow and current-revision publication integrity.
CREATE OR REPLACE FUNCTION enforce_term_workflow() RETURNS trigger AS $$
DECLARE
  transition_allowed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'new terms must start as drafts';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  transition_allowed := CASE OLD.status
    WHEN 'DRAFT' THEN NEW.status = 'IN_REVIEW'
    WHEN 'IN_REVIEW' THEN NEW.status IN ('DRAFT', 'APPROVED')
    WHEN 'APPROVED' THEN NEW.status IN ('DRAFT', 'PUBLISHED')
    WHEN 'PUBLISHED' THEN NEW.status IN ('DRAFT', 'ARCHIVED')
    ELSE false
  END;
  IF NOT transition_allowed THEN
    RAISE EXCEPTION 'invalid content transition from % to %', OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'PUBLISHED' THEN
    IF NEW."is_demo" = true
      OR NOT EXISTS (
        SELECT 1 FROM "term_variants" v
        WHERE v."term_id" = NEW.id AND v.locale = 'EN' AND v."is_primary" = true
      )
      OR NOT EXISTS (
        SELECT 1 FROM "term_variants" v
        WHERE v."term_id" = NEW.id AND v.locale = 'UK' AND v."is_primary" = true
      )
      OR NOT EXISTS (
        SELECT 1 FROM "term_definitions" d
        WHERE d."term_id" = NEW.id AND d.locale = 'EN' AND d."short_definition" IS NOT NULL
      )
      OR NOT EXISTS (
        SELECT 1 FROM "term_definitions" d
        WHERE d."term_id" = NEW.id AND d.locale = 'UK' AND d."short_definition" IS NOT NULL
      )
      OR NOT EXISTS (SELECT 1 FROM "term_categories" c WHERE c."term_id" = NEW.id)
      OR NOT EXISTS (
        SELECT 1 FROM "term_sources" ts
        JOIN "sources" source ON source.id = ts."source_id"
        WHERE ts."term_id" = NEW.id AND ts."verification_status" = 'VERIFIED'
          AND ts."checked_at" IS NOT NULL AND ts."checked_by_id" IS NOT NULL
          AND source."exact_url" ~ '^https?://'
      )
      OR NOT EXISTS (
        SELECT 1 FROM "content_reviews" r
        WHERE r."term_id" = NEW.id AND r."revision_number" = NEW."current_revision"
          AND r.status = 'APPROVED'
      )
    THEN
      RAISE EXCEPTION 'term is not eligible for publication';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "terms_workflow_guard"
  BEFORE INSERT OR UPDATE OF "status" ON "terms"
  FOR EACH ROW EXECUTE FUNCTION enforce_term_workflow();

CREATE OR REPLACE FUNCTION enforce_lesson_publication() RETURNS trigger AS $$
DECLARE
  term_count integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'new lessons must start as drafts';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'PUBLISHED' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT count(*) INTO term_count FROM "lesson_terms" WHERE "lesson_id" = NEW.id;
    IF term_count < 8 OR term_count > 12 THEN
      RAISE EXCEPTION 'published lesson must contain 8 to 12 terms';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "lesson_terms" lt JOIN "terms" t ON t.id = lt."term_id"
      WHERE lt."lesson_id" = NEW.id AND t.status <> 'PUBLISHED'
    ) THEN
      RAISE EXCEPTION 'published lesson may contain only published terms';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "lessons_publication_guard"
  BEFORE INSERT OR UPDATE OF "status" ON "lessons"
  FOR EACH ROW EXECUTE FUNCTION enforce_lesson_publication();

-- Learning, reward and administration records are append-only.
CREATE OR REPLACE FUNCTION reject_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "review_logs_immutable" BEFORE UPDATE OR DELETE ON "review_logs"
  FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
CREATE TRIGGER "session_answers_immutable" BEFORE UPDATE OR DELETE ON "session_answers"
  FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
CREATE TRIGGER "xp_transactions_immutable" BEFORE UPDATE OR DELETE ON "xp_transactions"
  FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
CREATE TRIGGER "audit_logs_immutable" BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
CREATE TRIGGER "content_revisions_immutable" BEFORE UPDATE OR DELETE ON "content_revisions"
  FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
