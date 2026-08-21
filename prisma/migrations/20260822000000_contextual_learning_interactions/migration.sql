-- Add category-specific, bilingual definitions without removing the existing
-- global definition fallback.
CREATE TABLE "term_context_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "short_definition" TEXT,
    "example" TEXT,
    "context_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "term_context_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "term_context_definitions_term_id_category_id_locale_key"
ON "term_context_definitions"("term_id", "category_id", "locale");

CREATE INDEX "term_context_definitions_category_id_locale_idx"
ON "term_context_definitions"("category_id", "locale");

ALTER TABLE "term_context_definitions"
ADD CONSTRAINT "term_context_definitions_term_id_fkey"
FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "term_context_definitions"
ADD CONSTRAINT "term_context_definitions_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve current published content by seeding only the primary category.
INSERT INTO "term_context_definitions" (
    "term_id", "category_id", "locale", "short_definition", "example", "context_note"
)
SELECT
    tc."term_id", tc."category_id", td."locale", td."short_definition", td."example", td."context_note"
FROM "term_categories" tc
JOIN "term_definitions" td ON td."term_id" = tc."term_id"
WHERE tc."is_primary" = TRUE
ON CONFLICT ("term_id", "category_id", "locale") DO NOTHING;

ALTER TABLE "study_session_items" ADD COLUMN "interaction_group_id" UUID;

CREATE INDEX "study_session_items_study_session_id_interaction_group_id_idx"
ON "study_session_items"("study_session_id", "interaction_group_id");
