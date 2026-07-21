import { describe, expect, it, vi } from "vitest";

import { consumeRateLimit } from "@/lib/security/rate-limit";

describe("PostgreSQL-backed rate limiting", () => {
  it("uses a privacy-preserving fixed-window bucket", async () => {
    const upsert = vi.fn().mockResolvedValue({ count: 2 });
    const now = new Date("2026-07-21T12:07:30.000Z");
    const result = await consumeRateLimit({
      db: { rateLimitBucket: { upsert } },
      action: "AUTH_LOGIN",
      identity: "203.0.113.10",
      pepper: "test-pepper",
      limit: 10,
      windowMs: 15 * 60 * 1_000,
      now,
    });

    const argument = upsert.mock.calls[0][0];
    expect(argument.create.bucketKey).toMatch(/^[a-f0-9]{64}$/u);
    expect(argument.create.bucketKey).not.toContain("203.0.113.10");
    expect(argument.create.windowStartedAt.toISOString()).toBe("2026-07-21T12:00:00.000Z");
    expect(result.remaining).toBe(8);
  });

  it("rejects an attempt after the configured limit", async () => {
    const db = { rateLimitBucket: { upsert: vi.fn().mockResolvedValue({ count: 11 }) } };

    await expect(
      consumeRateLimit({
        db,
        action: "AUTH_LOGIN",
        identity: "unknown",
        pepper: "test-pepper",
        limit: 10,
        windowMs: 60_000,
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
  });
});
