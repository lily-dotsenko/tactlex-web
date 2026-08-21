import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: { $queryRawUnsafe: queryRaw },
}));

describe("health route", () => {
  beforeEach(() => queryRaw.mockReset());

  it("reports a ready database without caching", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns 503 without exposing database errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    queryRaw.mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error("secret connection string"), { code: "P1001" })),
    );
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable" });
    consoleError.mockRestore();
  });
});
