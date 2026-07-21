import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("stores passwords with Argon2id and verifies only the original value", async () => {
    const digest = await hashPassword("correct horse battery staple");

    expect(digest).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/u);
    await expect(verifyPassword(digest, "correct horse battery staple")).resolves.toBe(true);
    await expect(verifyPassword(digest, "wrong password")).resolves.toBe(false);
  });

  it("fails closed for a malformed stored digest", async () => {
    await expect(verifyPassword("not-an-argon2-digest", "anything")).resolves.toBe(false);
  });
});
