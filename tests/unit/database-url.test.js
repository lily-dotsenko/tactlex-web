import { describe, expect, it } from "vitest";

import { configureDatabaseUrl, isPostgresUrl } from "@/lib/db/database-url";

describe("database URL configuration", () => {
  it("accepts PostgreSQL connection URLs", () => {
    expect(isPostgresUrl("postgresql://user:password@example.test/database")).toBe(true);
    expect(isPostgresUrl(" postgres://user:password@example.test/database ")).toBe(true);
    expect(isPostgresUrl("[SENSITIVE]")).toBe(false);
  });

  it("preserves a valid DATABASE_URL", () => {
    const env = {
      DATABASE_URL: " postgresql://primary.example.test/database ",
      NEON_POSTGRES_PRISMA_URL: "postgresql://neon.example.test/database",
    };

    expect(configureDatabaseUrl(env)).toBe("postgresql://primary.example.test/database");
  });

  it("falls back to the managed Neon Prisma URL when DATABASE_URL is invalid", () => {
    const env = {
      DATABASE_URL: "[SENSITIVE]",
      NEON_POSTGRES_PRISMA_URL: " postgresql://neon.example.test/database ",
    };

    expect(configureDatabaseUrl(env)).toBe("postgresql://neon.example.test/database");
    expect(env.DATABASE_URL).toBe("postgresql://neon.example.test/database");
  });
});
