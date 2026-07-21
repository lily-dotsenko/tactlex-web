import { describe, expect, it } from "vitest";
import { z } from "zod";

import { readJson } from "@/lib/http/api-response";

describe("API request parsing", () => {
  it("parses strict JSON with Zod", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "TactLex" }),
    });
    await expect(readJson(request, z.object({ name: z.string() }).strict())).resolves.toEqual({
      name: "TactLex",
    });
  });

  it("rejects non-JSON mutation bodies", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "name=TactLex",
    });
    await expect(readJson(request, z.object({ name: z.string() }))).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
      status: 415,
    });
  });

  it("enforces the byte limit after reading a chunked body", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "too long" }),
    });
    await expect(
      readJson(request, z.object({ name: z.string() }), { maxBytes: 8 }),
    ).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE", status: 413 });
  });
});
