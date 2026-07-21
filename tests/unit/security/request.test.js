import { describe, expect, it } from "vitest";

import { assertBodySize, assertSameOrigin, getAllowedOrigins } from "@/lib/security/request";

const production = {
  NODE_ENV: "production",
  ALLOWED_ORIGINS: "https://tactlex.example,https://admin.tactlex.example",
};

describe("request security", () => {
  it("accepts an exact configured mutation origin", () => {
    const request = new Request("https://tactlex.example/api/v1/profile", {
      method: "PATCH",
      headers: { origin: "https://tactlex.example" },
    });

    expect(() => assertSameOrigin(request, { environment: production })).not.toThrow();
  });

  it("rejects foreign, missing and null origins in production", () => {
    for (const origin of ["https://evil.example", "null", null]) {
      const headers = origin ? { origin } : {};
      const request = new Request("https://tactlex.example/api/v1/profile", {
        method: "PATCH",
        headers,
      });
      expect(() => assertSameOrigin(request, { environment: production })).toThrow();
    }
  });

  it("rejects a request host outside the configured application origins", () => {
    const request = new Request("https://internal-proxy.example/api/v1/profile", {
      method: "PATCH",
      headers: { origin: "https://tactlex.example" },
    });

    expect(() => assertSameOrigin(request, { environment: production })).toThrow();
  });

  it("allows a same-origin Referer fallback only in local development", () => {
    const request = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { referer: "http://localhost:3000/uk/login" },
    });

    expect(() =>
      assertSameOrigin(request, {
        environment: { NODE_ENV: "development", ALLOWED_ORIGINS: "http://localhost:3000" },
      }),
    ).not.toThrow();
    expect(() => assertSameOrigin(request, { environment: production })).toThrow();
  });

  it("ignores malformed configured origins and rejects oversized declared bodies", () => {
    expect(
      getAllowedOrigins({ ALLOWED_ORIGINS: "javascript:alert(1),https://ok.example/path" }),
    ).toEqual(new Set());
    const request = new Request("https://tactlex.example/api/v1/auth/login", {
      method: "POST",
      headers: { "content-length": "40000" },
    });
    expect(() => assertBodySize(request, { maxBytes: 32_768 })).toThrow();
  });
});
