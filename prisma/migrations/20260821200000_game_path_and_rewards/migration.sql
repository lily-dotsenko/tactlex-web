CREATE TYPE "LearningNodeType" AS ENUM ('LESSON', 'QUIZ', 'FACT', 'REWARD', 'CHECKPOINT', 'PATCH');
CREATE TYPE "PatchRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');
CREATE TYPE "QuestPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "QuestMetric" AS ENUM ('XP_EARNED', 'CORRECT_ANSWERS', 'NODES_COMPLETED', 'QUIZZES_COMPLETED', 'REVIEWS_COMPLETED', 'ACTIVE_DAYS');
CREATE TYPE "QuestProgressStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CLAIMED', 'EXPIRED');
CREATE TYPE "BonusType" AS ENUM ('DOUBLE_XP_15M', 'STREAK_FREEZE');
CREATE TYPE "LeagueDivision" AS ENUM ('BRONZE', 'STEEL', 'GOLD', 'SAPPHIRE', 'DIAMOND');

ALTER TYPE "StudySessionKind" ADD VALUE 'QUIZ';
ALTER TYPE "StudySessionKind" ADD VALUE 'CHECKPOINT';
ALTER TYPE "XpReason" ADD VALUE 'FACT_COMPLETION';
ALTER TYPE "XpReason" ADD VALUE 'QUEST_REWARD';

ALTER TABLE "user_profiles" ADD COLUMN "league_division" "LeagueDivision" NOT NULL DEFAULT 'BRONZE';
ALTER TABLE "study_sessions" ADD COLUMN "node_id" UUID;

CREATE TABLE "lesson_facts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "lesson_id" UUID NOT NULL,
  "title_uk" VARCHAR(220) NOT NULL, "title_en" VARCHAR(220) NOT NULL,
  "body_uk" TEXT NOT NULL, "body_en" TEXT NOT NULL,
  "source_title" VARCHAR(300) NOT NULL, "source_url" TEXT NOT NULL,
  "is_beta" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "lesson_facts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lesson_facts_lesson_id_key" ON "lesson_facts"("lesson_id");

CREATE TABLE "patch_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "code" VARCHAR(100) NOT NULL,
  "title_uk" VARCHAR(180) NOT NULL, "title_en" VARCHAR(180) NOT NULL,
  "description_uk" TEXT NOT NULL, "description_en" TEXT NOT NULL,
  "rarity" "PatchRarity" NOT NULL DEFAULT 'COMMON', "icon_key" VARCHAR(80) NOT NULL,
  "category" VARCHAR(60) NOT NULL, "requirement" JSONB, "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "patch_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "patch_definitions_code_key" ON "patch_definitions"("code");
CREATE INDEX "patch_definitions_category_display_order_idx" ON "patch_definitions"("category", "display_order");

CREATE TABLE "learning_nodes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "category_id" UUID NOT NULL,
  "lesson_id" UUID, "fact_id" UUID, "patch_id" UUID, "type" "LearningNodeType" NOT NULL,
  "slug" VARCHAR(160) NOT NULL, "position" INTEGER NOT NULL,
  "title_uk" VARCHAR(220) NOT NULL, "title_en" VARCHAR(220) NOT NULL,
  "reward_coins" INTEGER NOT NULL DEFAULT 0, "reward_xp" INTEGER NOT NULL DEFAULT 0,
  "display_metadata" JSONB, "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "learning_nodes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "learning_nodes_slug_key" ON "learning_nodes"("slug");
CREATE UNIQUE INDEX "learning_nodes_category_id_position_key" ON "learning_nodes"("category_id", "position");
CREATE INDEX "learning_nodes_category_id_active_position_idx" ON "learning_nodes"("category_id", "active", "position");
CREATE INDEX "learning_nodes_lesson_id_idx" ON "learning_nodes"("lesson_id");

CREATE TABLE "user_learning_node_progress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "node_id" UUID NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0, "completions" INTEGER NOT NULL DEFAULT 0,
  "best_score" INTEGER NOT NULL DEFAULT 0, "stars" SMALLINT NOT NULL DEFAULT 0,
  "first_completed_at" TIMESTAMPTZ(3), "last_completed_at" TIMESTAMPTZ(3), "claimed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "user_learning_node_progress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_learning_node_progress_user_id_node_id_key" ON "user_learning_node_progress"("user_id", "node_id");
CREATE INDEX "user_learning_node_progress_node_id_idx" ON "user_learning_node_progress"("node_id");

CREATE TABLE "user_wallets" (
  "user_id" UUID NOT NULL, "coins" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("user_id")
);
CREATE TABLE "coin_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "amount" INTEGER NOT NULL,
  "reason" VARCHAR(100) NOT NULL, "source_type" VARCHAR(80) NOT NULL, "source_id" VARCHAR(160) NOT NULL,
  "dedupe_key" VARCHAR(240) NOT NULL, "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "coin_transactions_dedupe_key_key" ON "coin_transactions"("dedupe_key");
CREATE INDEX "coin_transactions_user_id_created_at_idx" ON "coin_transactions"("user_id", "created_at");

CREATE TABLE "quest_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "code" VARCHAR(100) NOT NULL,
  "title_uk" VARCHAR(200) NOT NULL, "title_en" VARCHAR(200) NOT NULL,
  "description_uk" TEXT NOT NULL, "description_en" TEXT NOT NULL,
  "period" "QuestPeriod" NOT NULL, "metric" "QuestMetric" NOT NULL, "threshold" INTEGER NOT NULL,
  "reward_coins" INTEGER NOT NULL, "reward_bonus" "BonusType", "is_active" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "quest_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quest_definitions_code_key" ON "quest_definitions"("code");
CREATE INDEX "quest_definitions_period_is_active_display_order_idx" ON "quest_definitions"("period", "is_active", "display_order");

CREATE TABLE "user_quest_progress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "quest_id" UUID NOT NULL,
  "period_key" VARCHAR(40) NOT NULL, "current" INTEGER NOT NULL DEFAULT 0,
  "status" "QuestProgressStatus" NOT NULL DEFAULT 'ACTIVE', "completed_at" TIMESTAMPTZ(3), "claimed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "user_quest_progress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_quest_progress_user_id_quest_id_period_key_key" ON "user_quest_progress"("user_id", "quest_id", "period_key");
CREATE INDEX "user_quest_progress_user_id_status_idx" ON "user_quest_progress"("user_id", "status");

CREATE TABLE "user_bonuses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "type" "BonusType" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0, "active_until" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "user_bonuses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_bonuses_user_id_type_key" ON "user_bonuses"("user_id", "type");

CREATE TABLE "user_patches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "patch_id" UUID NOT NULL,
  "trigger_type" VARCHAR(80) NOT NULL, "trigger_id" VARCHAR(160),
  "awarded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_patches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_patches_user_id_patch_id_key" ON "user_patches"("user_id", "patch_id");
CREATE INDEX "user_patches_patch_id_awarded_at_idx" ON "user_patches"("patch_id", "awarded_at");

CREATE TABLE "user_featured_patches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "patch_id" UUID NOT NULL, "slot" SMALLINT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "user_featured_patches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_featured_patches_user_id_slot_key" ON "user_featured_patches"("user_id", "slot");
CREATE UNIQUE INDEX "user_featured_patches_user_id_patch_id_key" ON "user_featured_patches"("user_id", "patch_id");
CREATE INDEX "user_featured_patches_patch_id_idx" ON "user_featured_patches"("patch_id");

ALTER TABLE "lesson_facts" ADD CONSTRAINT "lesson_facts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "lesson_facts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patch_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_learning_node_progress" ADD CONSTRAINT "user_learning_node_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_learning_node_progress" ADD CONSTRAINT "user_learning_node_progress_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "learning_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "learning_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_quest_progress" ADD CONSTRAINT "user_quest_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_quest_progress" ADD CONSTRAINT "user_quest_progress_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quest_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_bonuses" ADD CONSTRAINT "user_bonuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_patches" ADD CONSTRAINT "user_patches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_patches" ADD CONSTRAINT "user_patches_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patch_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_featured_patches" ADD CONSTRAINT "user_featured_patches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_featured_patches" ADD CONSTRAINT "user_featured_patches_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patch_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
