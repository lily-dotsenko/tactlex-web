import { describe, expect, it } from "vitest";

import { calculateLessonAwards, levelFromXp, updateStreak } from "@/server/services/gamification";

describe("gamification rules", () => {
  it("awards only server-defined lesson entries", () => {
    expect(
      calculateLessonAwards({ correctFirstAttempts: 10, totalItems: 10, isFirstCompletion: true }),
    ).toEqual([
      expect.objectContaining({ reason: "FIRST_ATTEMPT_CORRECT", amount: 100 }),
      expect.objectContaining({ reason: "LESSON_COMPLETED", amount: 20 }),
      expect.objectContaining({ reason: "PERFECT_LESSON", amount: 15 }),
    ]);
  });

  it("derives levels from total XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(800)).toBe(5);
  });

  it("increments or resets a calendar-day streak", () => {
    expect(
      updateStreak({
        previousActivityDate: "2026-07-20",
        currentActivityDate: "2026-07-21",
        previousCurrentStreak: 6,
        previousLongestStreak: 8,
      }),
    ).toEqual({ currentStreak: 7, longestStreak: 8 });
    expect(
      updateStreak({
        previousActivityDate: "2026-07-18",
        currentActivityDate: "2026-07-21",
        previousCurrentStreak: 6,
        previousLongestStreak: 8,
      }).currentStreak,
    ).toBe(1);
  });
});
