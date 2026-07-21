import { describe, expect, it } from "vitest";

import {
  loginSchema,
  normalizeEmail,
  profileUpdateSchema,
  registerSchema,
} from "@/lib/auth/validation";

describe("auth validation", () => {
  it("normalizes email while leaving password bytes unchanged", () => {
    const result = registerSchema.parse({
      email: "  USER@Example.COM ",
      password: "   passphrase with spaces   ",
      nickname: "Курсант",
      audienceType: "cadet",
    });

    expect(result.email).toBe("user@example.com");
    expect(result.password).toBe("   passphrase with spaces   ");
    expect(result.locale).toBe("uk");
  });

  it("rejects short passwords and unknown client-controlled fields", () => {
    expect(() =>
      registerSchema.parse({
        email: "user@example.com",
        password: "too-short",
        role: "ADMIN",
      }),
    ).toThrow();
    expect(() =>
      loginSchema.parse({ email: "user@example.com", password: "x", admin: true }),
    ).toThrow();
    expect(() =>
      registerSchema.parse({
        email: "user@example.com",
        password: "                ",
        nickname: "Курсант",
      }),
    ).toThrow();
  });

  it("requires a real profile change and accepts the private audience option", () => {
    expect(() => profileUpdateSchema.parse({})).toThrow();
    expect(profileUpdateSchema.parse({ audienceType: "prefer_not_to_say" })).toEqual({
      audienceType: "prefer_not_to_say",
    });
    expect(profileUpdateSchema.parse({ timezone: "Europe/Kyiv" })).toEqual({
      timezone: "Europe/Kyiv",
    });
    expect(() => profileUpdateSchema.parse({ timezone: "Ukraine/Nowhere" })).toThrow();
  });

  it("normalizes standalone email input", () => {
    expect(normalizeEmail("ADMIN@EXAMPLE.COM")).toBe("admin@example.com");
  });
});
