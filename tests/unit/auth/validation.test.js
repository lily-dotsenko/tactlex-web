import { describe, expect, it } from "vitest";

import {
  loginSchema,
  normalizeEmail,
  profileUpdateSchema,
  registerSchema,
} from "@/lib/auth/validation";
import { AVATARS, AVATAR_KEYS } from "@/lib/avatars/catalog";

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

  it("accepts all 48 bundled avatars and rejects arbitrary keys or URLs", () => {
    expect(AVATARS).toHaveLength(48);
    expect(new Set(AVATAR_KEYS)).toHaveProperty("size", 48);
    for (const avatarKey of AVATAR_KEYS) {
      expect(profileUpdateSchema.parse({ avatarKey })).toEqual({ avatarKey });
    }
    expect(() =>
      profileUpdateSchema.parse({ avatarKey: "https://example.test/avatar.png" }),
    ).toThrow();
    expect(() => profileUpdateSchema.parse({ avatarKey: "not-in-the-catalog" })).toThrow();
  });

  it("accepts an allowlisted custom avatar and rejects unknown parts", () => {
    const avatarConfig = {
      gender: "woman",
      skin: "copper",
      head: "round",
      hair: "braid",
      hairColor: "auburn",
      facialHair: "none",
      torso: "cossack-shirt",
      equipment: "scarf",
      accessory: "headset",
    };
    expect(profileUpdateSchema.parse({ avatarConfig })).toEqual({ avatarConfig });
    expect(() =>
      profileUpdateSchema.parse({ avatarConfig: { ...avatarConfig, accessory: "remote-url" } }),
    ).toThrow();
  });

  it("normalizes standalone email input", () => {
    expect(normalizeEmail("ADMIN@EXAMPLE.COM")).toBe("admin@example.com");
  });
});
