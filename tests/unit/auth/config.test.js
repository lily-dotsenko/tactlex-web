import { describe, expect, it } from "vitest";

import { getSessionCookieOptions, getSessionPepper } from "@/lib/auth/config";

describe("session configuration", () => {
  it("uses httpOnly same-site host cookies and enables Secure in production", () => {
    expect(getSessionCookieOptions({ secure: true })).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  });

  it("fails closed when the production pepper is absent, short or still a placeholder", () => {
    expect(() => getSessionPepper({ NODE_ENV: "production" })).toThrow();
    expect(() =>
      getSessionPepper({ NODE_ENV: "production", SESSION_PEPPER: "too-short" }),
    ).toThrow();
    expect(() =>
      getSessionPepper({
        NODE_ENV: "production",
        SESSION_PEPPER: "replace-with-a-random-production-secret",
      }),
    ).toThrow();
  });
});
