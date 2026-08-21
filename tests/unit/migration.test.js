import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260721190000_init",
  "migration.sql",
);

describe("initial migration", () => {
  test("contains the required PostgreSQL safeguards", async () => {
    const sql = await readFile(migrationPath, "utf8");

    for (const statement of [
      'CREATE EXTENSION IF NOT EXISTS "citext"',
      'CREATE EXTENSION IF NOT EXISTS "pg_trgm"',
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
      'CREATE UNIQUE INDEX "term_variants_one_primary_per_locale_idx"',
      'CREATE INDEX "term_variants_normalized_value_trgm_idx"',
      'CREATE TRIGGER "terms_workflow_guard"',
      'CREATE TRIGGER "lessons_publication_guard"',
      'CREATE TRIGGER "review_logs_immutable"',
      'CREATE TRIGGER "session_answers_immutable"',
      'CREATE TRIGGER "xp_transactions_immutable"',
      'CREATE TRIGGER "audit_logs_immutable"',
    ]) {
      expect(sql).toContain(statement);
    }
  });
});

describe("contextual learning migration", () => {
  test("adds contextual definitions and interaction groups without replacing global content", async () => {
    const sql = await readFile(
      path.join(
        process.cwd(),
        "prisma",
        "migrations",
        "20260822000000_contextual_learning_interactions",
        "migration.sql",
      ),
      "utf8",
    );

    expect(sql).toContain('CREATE TABLE "term_context_definitions"');
    expect(sql).toContain('ADD COLUMN "interaction_group_id" UUID');
    expect(sql).toContain('INSERT INTO "term_context_definitions"');
    expect(sql).not.toMatch(/DROP TABLE|DROP COLUMN/iu);
  });
});
