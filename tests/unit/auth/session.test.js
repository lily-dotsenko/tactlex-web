import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  digestSessionToken,
  getSessionExpiry,
  getSessionTokenFromRequest,
  isSessionToken,
} from "@/lib/auth/session";

describe("opaque sessions", () => {
  it("creates 256-bit base64url tokens and stores deterministic SHA-256 digests", () => {
    const token = createSessionToken();
    const digest = digestSessionToken(token, "test-pepper");

    expect(token).toHaveLength(43);
    expect(isSessionToken(token)).toBe(true);
    expect(digest).toMatch(/^[a-f0-9]{64}$/u);
    expect(digestSessionToken(token, "test-pepper")).toBe(digest);
    expect(digestSessionToken(token, "different-pepper")).not.toBe(digest);
    expect(digest).not.toContain(token);
  });

  it("reads only a correctly shaped session cookie", () => {
    const token = createSessionToken();
    const request = new Request("https://tactlex.example/api/v1/profile", {
      headers: { cookie: `theme=dark; tactlex_session=${token}; locale=uk` },
    });

    expect(getSessionTokenFromRequest(request)).toBe(token);
    expect(
      getSessionTokenFromRequest(
        new Request("https://tactlex.example", {
          headers: { cookie: "tactlex_session=attacker-controlled" },
        }),
      ),
    ).toBeNull();
  });

  it("calculates an absolute expiry from the supplied clock", () => {
    const now = new Date("2026-07-21T12:00:00.000Z");
    expect(getSessionExpiry(now).toISOString()).toBe("2026-08-04T12:00:00.000Z");
  });
});
