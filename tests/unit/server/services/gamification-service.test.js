import { describe, expect, it, vi } from "vitest";

import {
  createGamificationService,
  getIsoWeek,
  getLocalActivityDate,
} from "@/server/services/gamification-service";

describe("transactional gamification dates", () => {
  it("uses the profile timezone for the daily activity key", () => {
    expect(getLocalActivityDate(new Date("2026-07-20T21:30:00.000Z"), "Europe/Kyiv")).toEqual(
      new Date("2026-07-21T00:00:00.000Z"),
    );
  });

  it("uses an ISO Monday-to-Monday UTC leaderboard period", () => {
    expect(getIsoWeek(new Date("2026-07-21T12:00:00.000Z"))).toEqual({
      slug: "2026-W30",
      startsAt: new Date("2026-07-20T00:00:00.000Z"),
      endsAt: new Date("2026-07-27T00:00:00.000Z"),
    });
  });

  it("evaluates a category mastery rule without fabricating an empty UUID", async () => {
    const categoryFindMany = vi.fn(async () => [
      {
        terms: [
          { term: { userProgress: [{ id: "progress-1" }] } },
          { term: { userProgress: [{ id: "progress-2" }] } },
        ],
      },
      { terms: [{ term: { userProgress: [{ id: "progress-3" }] } }] },
    ]);
    const transaction = {
      achievement: {
        findMany: vi.fn(async () => [
          {
            id: "achievement-1",
            code: "category-master-2",
            nameUk: "Знавець категорії",
            nameEn: "Category master",
            rewardXp: 0,
            rules: [
              {
                metric: "MASTERED_TERMS_IN_CATEGORY",
                operator: "GREATER_THAN_OR_EQUAL",
                threshold: 2,
                categoryId: null,
                groupNumber: 1,
              },
            ],
          },
        ]),
      },
      category: { findMany: categoryFindMany },
      userAchievement: {
        create: vi.fn(async ({ data }) => ({ ...data, awardedAt: new Date("2026-07-21") })),
      },
    };

    const awards = await createGamificationService(transaction).evaluateAchievements({
      userId: "00000000-0000-4000-8000-000000000001",
      triggerType: "SESSION_ANSWER",
      triggerId: "00000000-0000-4000-8000-000000000002",
    });

    expect(awards).toHaveLength(1);
    expect(categoryFindMany).toHaveBeenCalledOnce();
    expect(JSON.stringify(categoryFindMany.mock.calls)).not.toContain('"categoryId":""');
  });
});
