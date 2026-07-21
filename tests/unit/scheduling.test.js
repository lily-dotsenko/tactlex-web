import { describe, expect, it } from "vitest";

import { SCHEDULER_VERSION, scheduleReview } from "@/lib/scheduling/fsrs";

const now = new Date("2026-07-21T12:00:00.000Z");

describe("FSRS-compatible scheduler", () => {
  it.each([
    ["AGAIN", "LEARNING", 0],
    ["HARD", "LEARNING", 1],
    ["GOOD", "REVIEW", 3],
    ["EASY", "REVIEW", 5],
  ])("schedules a new term with %s", (rating, state, days) => {
    const next = scheduleReview(null, rating, now);
    expect(next.state).toBe(state);
    expect(next.scheduledDays).toBe(days);
    expect(next.schedulerVersion).toBe(SCHEDULER_VERSION);
  });

  it("is deterministic for the same prior state, rating and time", () => {
    const previous = {
      state: "REVIEW",
      difficulty: 5,
      stability: 8,
      dueAt: new Date("2026-07-20T12:00:00Z"),
      lastReviewedAt: new Date("2026-07-10T12:00:00Z"),
      scheduledDays: 8,
      repetitions: 3,
      lapses: 0,
    };
    expect(scheduleReview(previous, "GOOD", now)).toEqual(scheduleReview(previous, "GOOD", now));
  });

  it("records a lapse and relearning state after Again", () => {
    const previous = {
      state: "REVIEW",
      difficulty: 5,
      stability: 10,
      lastReviewedAt: new Date("2026-07-01T12:00:00Z"),
      repetitions: 4,
      lapses: 1,
    };
    const next = scheduleReview(previous, "AGAIN", now);
    expect(next.state).toBe("RELEARNING");
    expect(next.lapses).toBe(2);
    expect(next.dueAt).toEqual(now);
  });
});
