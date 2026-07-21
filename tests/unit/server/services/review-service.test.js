import { describe, expect, it, vi } from "vitest";

import { createReviewService } from "@/server/services/review-service";

describe("review queue", () => {
  it("returns due prompts without accepted target-language variants", async () => {
    const now = new Date("2026-07-21T12:00:00.000Z");
    const db = {
      userTermProgress: {
        findMany: vi.fn(async () => [
          {
            id: "progress-1",
            termId: "00000000-0000-4000-8000-000000000012",
            state: "REVIEW",
            repetitions: 2,
            dueAt: new Date("2026-07-21T11:00:00.000Z"),
            term: {
              variants: [
                { id: "en", locale: "EN", value: "evacuation", isPrimary: true },
                { id: "uk", locale: "UK", value: "евакуація", isPrimary: true },
              ],
              definitions: [],
              audioAssets: [
                {
                  id: "00000000-0000-4000-8000-000000000099",
                  kind: "HUMAN_RECORDING",
                  provider: "LOCAL",
                },
              ],
            },
          },
        ]),
        findFirst: vi.fn(async () => ({ dueAt: new Date("2026-07-23T12:00:00.000Z") })),
      },
      idempotencyRequest: {},
    };

    const result = await createReviewService(db, { clock: () => now }).listDue("user-1", 20);

    expect(result).toMatchObject({
      items: [
        {
          direction: "EN_TO_UA",
          prompt: "evacuation",
          stage: "SCHEDULED_REVIEW",
          audio: {
            id: "00000000-0000-4000-8000-000000000099",
            url: "/api/v1/audio/00000000-0000-4000-8000-000000000099",
          },
        },
      ],
      nextDueAt: new Date("2026-07-23T12:00:00.000Z"),
    });
    expect(JSON.stringify(result.items)).not.toContain("евакуація");
  });
});
