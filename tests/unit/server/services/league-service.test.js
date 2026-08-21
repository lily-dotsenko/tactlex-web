import { describe, expect, it, vi } from "vitest";

import { createLeagueService } from "@/server/services/league-service";

describe("league service", () => {
  it("keeps league data private until the learner opts in", async () => {
    const db = {
      leagueSeason: { findMany: vi.fn(async () => []) },
      userProfile: {
        findUnique: vi.fn(async () => ({
          leagueDivision: "BRONZE",
          leaderboardVisible: false,
        })),
      },
    };

    await expect(createLeagueService(db).getCurrent("user-1")).resolves.toEqual({
      division: "BRONZE",
      optedIn: false,
      entries: [],
      promotionCount: 0,
      relegationCount: 0,
    });
  });

  it("promotes the top seven, relegates the last five, and pays only promotion places", async () => {
    const members = Array.from({ length: 12 }, (_, index) => ({
      id: `membership-${index + 1}`,
      userId: `user-${index + 1}`,
      weeklyXp: 1_200 - index * 100,
      reachedAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`),
    }));
    const profileUpdate = vi.fn(async () => ({}));
    const coinCreate = vi.fn(async () => ({}));
    const patchUpsert = vi.fn(async () => ({}));
    const db = {
      leagueSeason: {
        findMany: vi.fn(async () => [
          {
            id: "season-1",
            slug: "2026-W33",
            groups: [{ id: "group-1", division: "STEEL", members }],
          },
        ]),
        update: vi.fn(async () => ({})),
      },
      leaderboardPeriod: { findUnique: vi.fn(async () => null) },
      leaderboardEntry: { findMany: vi.fn(async () => []) },
      userProfile: { update: profileUpdate },
      leagueMembership: { update: vi.fn(async () => ({})) },
      coinTransaction: { findUnique: vi.fn(async () => null), create: coinCreate },
      userWallet: { upsert: vi.fn(async () => ({})) },
      patchDefinition: {
        findUnique: vi.fn(async ({ where }) => ({ id: where.code, code: where.code })),
      },
      userPatch: { upsert: patchUpsert },
    };
    db.$transaction = vi.fn((callback) => callback(db));

    await createLeagueService(db, {
      clock: () => new Date("2026-08-24T00:00:00.000Z"),
    }).finalizeExpiredSeasons();

    expect(profileUpdate.mock.calls.slice(0, 7).map(([{ data }]) => data.leagueDivision)).toEqual(
      Array(7).fill("GOLD"),
    );
    expect(profileUpdate.mock.calls.slice(7).map(([{ data }]) => data.leagueDivision)).toEqual(
      Array(5).fill("BRONZE"),
    );
    expect(coinCreate).toHaveBeenCalledTimes(7);
    expect(patchUpsert).toHaveBeenCalledTimes(12);
  });
});
