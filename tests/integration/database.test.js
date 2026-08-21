import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/server/policies/rbac-policy";
import { createAuthService } from "@/server/services/auth-service";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const databaseSuite = testDatabaseUrl ? describe : describe.skip;

function assertDisposableDatabase(url) {
  let databaseName;
  try {
    databaseName = decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (!databaseName.endsWith("_test")) {
    throw new Error("Integration tests only run against a database ending in _test.");
  }
  return databaseName;
}

databaseSuite("PostgreSQL integration", () => {
  const expectedDatabase = testDatabaseUrl ? assertDisposableDatabase(testDatabaseUrl) : null;

  beforeAll(async () => {
    const [{ database }] = await prisma.$queryRaw`SELECT current_database() AS database`;
    expect(database).toBe(expectedDatabase);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("deploys required extensions, indexes and immutable triggers", async () => {
    const extensions = await prisma.$queryRaw`
      SELECT extname FROM pg_extension
      WHERE extname IN ('citext', 'pg_trgm', 'pgcrypto')
      ORDER BY extname
    `;
    expect(extensions.map(({ extname }) => extname)).toEqual(["citext", "pg_trgm", "pgcrypto"]);

    const indexes = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'term_variants_one_primary_per_locale_idx',
          'term_variants_normalized_value_trgm_idx',
          'leaderboard_entries_period_id_xp_idx'
        )
    `;
    expect(indexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        "term_variants_one_primary_per_locale_idx",
        "term_variants_normalized_value_trgm_idx",
        "leaderboard_entries_period_id_xp_idx",
      ]),
    );

    const triggers = await prisma.$queryRaw`
      SELECT tgname FROM pg_trigger
      WHERE NOT tgisinternal
        AND tgname IN (
          'terms_workflow_guard',
          'lessons_publication_guard',
          'review_logs_immutable',
          'session_answers_immutable',
          'xp_transactions_immutable',
          'audit_logs_immutable'
        )
    `;
    expect(triggers).toHaveLength(6);
  });

  test("keeps the structural seed stable after repeated runs", async () => {
    const [roles, categories, achievements, allTimePeriods] = await Promise.all([
      prisma.role.count(),
      prisma.category.count({ where: { archivedAt: null } }),
      prisma.achievement.count({ where: { isActive: true } }),
      prisma.leaderboardPeriod.count({ where: { slug: "all-time" } }),
    ]);

    expect(roles).toBe(2);
    expect(categories).toBe(5);
    expect(achievements).toBe(9);
    expect(allTimePeriods).toBe(1);
  });

  test("registers, authenticates and revokes an opaque database session", async () => {
    const suffix = randomUUID();
    const auth = createAuthService({
      db: prisma,
      pepper: "integration-test-session-pepper-with-32-bytes",
    });
    const registration = await auth.register({
      email: `integration-${suffix}@example.test`,
      password: "A-secure-integration-password-42!",
      nickname: `it-${suffix.slice(0, 12)}`,
      locale: "uk",
      audienceType: "prefer_not_to_say",
    });

    expect(registration.user.roles).toContain("USER");
    expect(registration.session.token).toHaveLength(43);

    const principal = await auth.authenticateToken(registration.session.token);
    expect(principal.userId).toBe(registration.user.id);
    let authorizationError;
    try {
      requirePermission(principal, "terms.manage");
    } catch (error) {
      authorizationError = error;
    }
    expect(authorizationError).toMatchObject({ code: "FORBIDDEN", status: 403 });

    const login = await auth.login({
      email: registration.user.email,
      password: "A-secure-integration-password-42!",
    });
    expect(login.session.token).not.toBe(registration.session.token);

    await auth.logout(login.session.token);
    expect(await auth.authenticateToken(login.session.token)).toBeNull();
  });

  test("rejects mutation of append-only audit records", async () => {
    const record = await prisma.auditLog.create({
      data: { action: "INTEGRATION_CHECK", targetType: "DATABASE" },
    });

    await expect(
      prisma.auditLog.update({
        where: { id: record.id },
        data: { action: "MUTATED" },
      }),
    ).rejects.toThrow(/append-only/iu);
  });
});
