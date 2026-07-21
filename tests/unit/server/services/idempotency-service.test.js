import { describe, expect, it, vi } from "vitest";

import {
  createIdempotencyService,
  hashIdempotencyPayload,
  requireIdempotencyKey,
} from "@/server/services/idempotency-service";

function fakeDatabase() {
  let row = null;
  return {
    idempotencyRequest: {
      findUnique: vi.fn(async () => row),
      create: vi.fn(async ({ data }) => {
        row = { id: "request-1", ...data, responseBody: null };
        return row;
      }),
      update: vi.fn(async ({ data }) => {
        row = { ...row, ...data };
        return row;
      }),
      updateMany: vi.fn(async ({ data }) => {
        row = { ...row, ...data };
        return { count: 1 };
      }),
    },
  };
}

describe("idempotency service", () => {
  it("returns the stored response without executing the operation twice", async () => {
    const db = fakeDatabase();
    const service = createIdempotencyService(db, {
      clock: () => new Date("2026-07-21T12:00:00.000Z"),
    });
    const operation = vi.fn(async () => ({ accepted: true, dueAt: new Date("2026-07-22") }));
    const input = {
      userId: "00000000-0000-4000-8000-000000000001",
      scope: "answer:one",
      key: "4f0d2f9f-8ed1-4de8-b8e1-a11323f14c51",
      payload: { answer: "evacuation", rating: "GOOD" },
    };

    const first = await service.execute(input, operation);
    const replay = await service.execute(input, operation);

    expect(first.replayed).toBe(false);
    expect(replay).toMatchObject({ replayed: true, data: { accepted: true } });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("rejects reuse of a key with a different canonical payload", async () => {
    const db = fakeDatabase();
    const service = createIdempotencyService(db);
    const base = {
      userId: "00000000-0000-4000-8000-000000000001",
      scope: "review:one",
      key: "review-key-1234",
    };
    await service.execute({ ...base, payload: { answer: "one" } }, async () => ({ ok: true }));

    await expect(
      service.execute({ ...base, payload: { answer: "two" } }, async () => ({ ok: true })),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", status: 409 });
  });

  it("hashes objects independently of key order and validates the header", () => {
    expect(hashIdempotencyPayload({ b: 2, a: 1 })).toBe(hashIdempotencyPayload({ a: 1, b: 2 }));
    expect(
      requireIdempotencyKey(
        new Request("https://example.test", {
          headers: { "Idempotency-Key": "answer-key-1234" },
        }),
      ),
    ).toBe("answer-key-1234");
    expect(() => requireIdempotencyKey(new Request("https://example.test"))).toThrowError(
      expect.objectContaining({ code: "IDEMPOTENCY_KEY_REQUIRED" }),
    );
  });
});
