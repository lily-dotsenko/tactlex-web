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
