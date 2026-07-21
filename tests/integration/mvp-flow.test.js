import { randomUUID } from "node:crypto";

import { describe, expect, test } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/server/policies/rbac-policy";
import { createAdminContentService } from "@/server/services/admin-content-service";
import { createAuthService } from "@/server/services/auth-service";
import { createCatalogService } from "@/server/services/catalog-service";
import { createProgressService } from "@/server/services/progress-service";
import { createReportService } from "@/server/services/report-service";
import { createStudyService } from "@/server/services/study-service";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const databaseSuite = testDatabaseUrl ? describe : describe.skip;

function assertDisposableDatabase(url) {
  const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!databaseName.endsWith("_test")) {
    throw new Error("MVP integration tests require a database ending in _test.");
  }
  return databaseName;
}

databaseSuite("complete PostgreSQL MVP flow", () => {
  const expectedDatabase = testDatabaseUrl ? assertDisposableDatabase(testDatabaseUrl) : null;

  test("reviews content, publishes a lesson, evaluates answers and records rewards", async () => {
    const [{ database }] = await prisma.$queryRaw`SELECT current_database() AS database`;
    expect(database).toBe(expectedDatabase);
    const suffix = randomUUID().slice(0, 8);
    const password = "A-secure-MVP-integration-password-42!";
    const auth = createAuthService({
      db: prisma,
      pepper: "mvp-integration-session-pepper-with-32-bytes",
    });
    const registration = await auth.register({
      email: `mvp-${suffix}@example.test`,
      password,
      nickname: `mvp-${suffix}`,
      locale: "uk",
    });
    const userId = registration.user.id;
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: "ADMIN" } });
    await prisma.userRole.create({
      data: { userId, roleId: adminRole.id, assignedById: null },
    });
    await auth.updateProfile(userId, { leaderboardVisible: true, dailyGoalXp: 20 });

    const principal = await auth.authenticateToken(registration.session.token);
    expect(principal.roles).toEqual(expect.arrayContaining(["USER", "ADMIN"]));
    expect(requirePermission(principal, "terms.publish")).toBe(principal);

    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: "general-tactical-english" },
    });
    const admin = createAdminContentService(prisma);
    const acceptedAnswers = new Map();
    const termIds = [];

    for (let index = 1; index <= 8; index += 1) {
      const english = `integration term ${suffix} ${index}`;
      const ukrainian = `інтеграційний термін ${suffix} ${index}`;
      const draft = await admin.createTerm(userId, {
        slug: `integration-${suffix}-${index}`,
        partOfSpeech: "NOUN",
        difficulty: 1,
        origin: "HUMAN",
        isDemo: false,
        variants: [
          {
            locale: "EN",
            kind: "PRIMARY",
            value: english,
            isPrimary: true,
            isAcceptedAnswer: true,
          },
          {
            locale: "UK",
            kind: "PRIMARY",
            value: ukrainian,
            isPrimary: true,
            isAcceptedAnswer: true,
          },
        ],
        definitions: [
          {
            locale: "EN",
            shortDefinition: `Integration-only definition ${index}.`,
            example: null,
            contextNote: "Disposable test content.",
          },
          {
            locale: "UK",
            shortDefinition: `Визначення лише для integration test ${index}.`,
            example: null,
            contextNote: "Одноразовий тестовий контент.",
          },
        ],
        categories: [{ categoryId: category.id, isPrimary: true }],
        sources: [
          {
            exactUrl: `https://example.test/tactlex/${suffix}/${index}`,
            title: `Disposable integration source ${index}`,
            publisher: "TactLex test suite",
            sourceType: "OTHER",
            verificationStatus: "VERIFIED",
            citationNote: "Synthetic data in a disposable test database.",
            isPrimary: true,
          },
        ],
        changeNote: "Create disposable integration fixture",
      });
      const inReview = await admin.transitionTerm(
        userId,
        draft.id,
        "IN_REVIEW",
        "Integration review",
      );
      const pendingReview = inReview.reviews.find(({ status }) => status === "PENDING");
      expect(pendingReview).toBeTruthy();
      const approved = await admin.decideReview(
        userId,
        pendingReview.id,
        "APPROVED",
        "Verified integration fixture",
      );
      expect(approved.status).toBe("APPROVED");
      expect((await admin.getTerm(draft.id)).status).toBe("APPROVED");
      const published = await admin.transitionTerm(userId, draft.id, "PUBLISHED");
      expect(published.status).toBe("PUBLISHED");
      termIds.push(draft.id);
      acceptedAnswers.set(draft.id, ukrainian);
    }

    const lesson = await admin.createLesson(userId, {
      slug: `integration-lesson-${suffix}`,
      categoryId: category.id,
      titleUk: "Інтеграційний урок",
      titleEn: "Integration lesson",
      descriptionUk: "Одноразовий тестовий урок.",
      descriptionEn: "A disposable test lesson.",
      difficulty: 1,
      estimatedMinutes: 5,
      termIds,
    });
    const publishedLesson = await admin.setLessonStatus(userId, lesson.id, "PUBLISHED");
    expect(publishedLesson.status).toBe("PUBLISHED");

    const study = createStudyService(prisma);
    const session = await study.createSession(
      userId,
      { lessonId: lesson.id, direction: "EN_TO_UA" },
      randomUUID(),
    );
    expect(session.items).toHaveLength(8);
    expect(session.items.every(({ result }) => result === null)).toBe(true);

    for (const item of session.items) {
      const result = await study.submitAnswer(
        userId,
        session.id,
        {
          sessionItemId: item.id,
          answer: acceptedAnswers.get(item.termId),
          rating: "GOOD",
          responseTimeMs: 500,
        },
        randomUUID(),
      );
      expect(result.correct).toBe(true);
    }

    const completionKey = randomUUID();
    const completion = await study.completeSession(userId, session.id, completionKey);
    expect(completion.status).toBe("COMPLETED");
    expect(completion.summary).toMatchObject({
      correctItems: 8,
      totalItems: 8,
      accuracy: 100,
    });
    expect(completion.summary.xpAwarded).toBeGreaterThan(0);

    const replay = await study.completeSession(userId, session.id, completionKey);
    expect(replay.replayed).toBe(true);
    expect(replay.summary).toEqual(completion.summary);

    const [progressCount, reviewLogCount, answerCount, xpSources] = await Promise.all([
      prisma.userTermProgress.count({ where: { userId } }),
      prisma.reviewLog.count({ where: { userId } }),
      prisma.sessionAnswer.count({ where: { userId } }),
      prisma.xpTransaction.findMany({
        where: { userId },
        select: { sourceType: true, sourceId: true },
      }),
    ]);
    expect(progressCount).toBe(8);
    expect(reviewLogCount).toBe(8);
    expect(answerCount).toBe(8);
    const sourceKeys = xpSources.map(({ sourceType, sourceId }) => `${sourceType}:${sourceId}`);
    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);

    const completedSession = await study.getSession(userId, session.id);
    expect(completedSession.summary).toMatchObject({ accuracy: 100, totalItems: 8 });

    const progress = await createProgressService(prisma).summary(userId);
    expect(progress.totalXp).toBeGreaterThan(0);
    expect(
      progress.categories.find(({ id }) => id === category.id)?.published,
    ).toBeGreaterThanOrEqual(8);
    const leaderboard = await createProgressService(prisma).leaderboard("all-time", 50, userId);
    expect(leaderboard.entries.some(({ isCurrentUser }) => isCurrentUser)).toBe(true);

    const publicTerm = await createCatalogService(prisma).getTerm(termIds[0], {
      locale: "uk",
    });
    expect(publicTerm.status).toBe("PUBLISHED");
    expect(publicTerm.sources).toHaveLength(1);
    const report = await createReportService(prisma).create(userId, {
      termId: termIds[0],
      reason: "OTHER",
      details: "Disposable integration report for moderation coverage.",
    });
    expect(report.status).toBe("OPEN");
    expect(await prisma.auditLog.count({ where: { actorUserId: userId } })).toBeGreaterThan(0);
  }, 60_000);
});
