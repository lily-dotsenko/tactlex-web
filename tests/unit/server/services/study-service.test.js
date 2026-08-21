import { describe, expect, it, vi } from "vitest";

import {
  applyProgressReview,
  createStudyService,
  deriveEffectiveRating,
  exercisePatternForItem,
} from "@/server/services/study-service";

const now = new Date("2026-07-21T12:00:00.000Z");

describe("study service", () => {
  it("maps database directions to the product vocabulary without exposing answers", async () => {
    const db = {
      studySession: {
        findFirst: vi.fn(async () => ({
          id: "00000000-0000-4000-8000-000000000010",
          kind: "LESSON",
          direction: "UK_TO_EN",
          status: "ACTIVE",
          currentStage: "PRACTICE",
          score: 0,
          maxScore: 1,
          startedAt: now,
          expiresAt: new Date("2026-07-21T14:00:00.000Z"),
          completedAt: null,
          lesson: null,
          items: [
            {
              id: "00000000-0000-4000-8000-000000000011",
              termId: "00000000-0000-4000-8000-000000000012",
              position: 1,
              stage: "PRACTICE",
              exerciseType: "UA_TO_EN",
              status: "PENDING",
              promptVariant: { id: "variant-uk", locale: "UK", value: "евакуація" },
              term: {
                id: "00000000-0000-4000-8000-000000000012",
                variants: [
                  {
                    id: "variant-uk",
                    locale: "UK",
                    value: "евакуація",
                    isPrimary: true,
                  },
                  {
                    id: "variant-en",
                    locale: "EN",
                    value: "evacuation",
                    isPrimary: true,
                  },
                ],
                definitions: [],
              },
              answers: [],
            },
          ],
        })),
      },
      idempotencyRequest: {},
    };

    const session = await createStudyService(db, { clock: () => now }).getSession(
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000010",
    );

    expect(session).toMatchObject({
      direction: "UA_TO_EN",
      answeredItems: 0,
      totalItems: 1,
      items: [{ prompt: "евакуація", result: null }],
    });
    expect(JSON.stringify(session)).not.toContain("evacuation");
  });

  it("forces Again for wrong answers and prevents correct Again from changing scheduling", () => {
    expect(deriveEffectiveRating(false, "EASY")).toBe("AGAIN");
    expect(deriveEffectiveRating(true, "AGAIN")).toBe("GOOD");
    expect(deriveEffectiveRating(true, "HARD")).toBe("HARD");
    expect(deriveEffectiveRating(true)).toBe("GOOD");
  });

  it("uses choice-only onboarding lessons and introduces typing from lesson three", () => {
    const firstLesson = Array.from({ length: 10 }, (_, index) =>
      exercisePatternForItem({ kind: "LESSON", direction: "MIXED", index, lessonOrdinal: 1 }),
    );
    const thirdLesson = Array.from({ length: 10 }, (_, index) =>
      exercisePatternForItem({ kind: "LESSON", direction: "MIXED", index, lessonOrdinal: 3 }),
    );

    expect(firstLesson.every(({ type }) => type === "MULTIPLE_CHOICE")).toBe(true);
    expect(thirdLesson.filter(({ type }) => type === "MULTIPLE_CHOICE")).toHaveLength(6);
    expect(thirdLesson.filter(({ type }) => type === "TYPE_ANSWER")).toHaveLength(2);
    expect(thirdLesson.filter(({ type }) => type === "AUDIO")).toHaveLength(2);
  });

  it("derives a completed AAR from immutable answer and XP records", async () => {
    const xpFindMany = vi.fn(async () => [
      { reason: "FIRST_LESSON_COMPLETION", amount: 20 },
      { reason: "PERFECT_LESSON", amount: 15 },
    ]);
    const db = {
      studySession: {
        findFirst: vi.fn(async () => ({
          id: "00000000-0000-4000-8000-000000000020",
          userId: "00000000-0000-4000-8000-000000000001",
          lessonId: "00000000-0000-4000-8000-000000000021",
          kind: "LESSON",
          direction: "EN_TO_UK",
          status: "COMPLETED",
          currentStage: "AFTER_ACTION_REVIEW",
          score: 2,
          maxScore: 2,
          startedAt: now,
          expiresAt: new Date("2026-07-21T14:00:00.000Z"),
          completedAt: new Date("2026-07-21T12:05:00.000Z"),
          lesson: null,
          items: [1, 2].map((position) => ({
            id: `item-${position}`,
            termId: `term-${position}`,
            position,
            stage: "PRACTICE",
            exerciseType: "EN_TO_UA",
            status: "ANSWERED",
            promptVariant: { id: `en-${position}`, locale: "EN", value: `prompt-${position}` },
            term: {
              variants: [
                {
                  id: `uk-${position}`,
                  locale: "UK",
                  value: `answer-${position}`,
                  isPrimary: true,
                },
              ],
              definitions: [],
              audioAssets: [],
            },
            answers: [
              {
                id: `answer-${position}`,
                submittedAnswer: `answer-${position}`,
                normalizedAnswer: `answer-${position}`,
                isCorrect: true,
                rating: "GOOD",
                responseTimeMs: 1_000,
                awardedXp: 10,
                createdAt: now,
              },
            ],
          })),
        })),
      },
      xpTransaction: { findMany: xpFindMany },
      idempotencyRequest: {},
    };

    const session = await createStudyService(db, { clock: () => now }).getSession(
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000020",
    );

    expect(session.summary).toEqual({
      correctItems: 2,
      totalItems: 2,
      accuracy: 100,
      xpAwarded: 55,
      awards: [
        { reason: "CORRECT_ANSWERS", amount: 20 },
        { reason: "FIRST_LESSON_COMPLETION", amount: 20 },
        { reason: "PERFECT_LESSON", amount: 15 },
      ],
    });
    expect(xpFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          metadata: {
            path: ["sessionId"],
            equals: "00000000-0000-4000-8000-000000000020",
          },
        }),
      }),
    );
  });

  it("writes the full previous and next scheduling snapshot", async () => {
    const reviewLog = { create: vi.fn(async ({ data }) => data) };
    const transaction = {
      userTermProgress: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }) => ({
          id: "progress-1",
          ...data,
          averageResponseTimeMs: data.averageResponseTimeMs,
        })),
      },
      reviewLog,
    };
    const progress = await applyProgressReview(transaction, {
      userId: "00000000-0000-4000-8000-000000000001",
      termId: "00000000-0000-4000-8000-000000000012",
      sessionAnswerId: "00000000-0000-4000-8000-000000000013",
      rating: "GOOD",
      isCorrect: true,
      responseTimeMs: 1_200,
      now,
    });

    expect(progress).toMatchObject({ state: "REVIEW", scheduledDays: 3, correctCount: 1 });
    expect(reviewLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        previousState: "NEW",
        newState: "REVIEW",
        newDueAt: new Date("2026-07-24T12:00:00.000Z"),
        schedulerVersion: "tactlex-fsrs-compatible-v1",
        sessionAnswerId: "00000000-0000-4000-8000-000000000013",
      }),
    });
  });
});
