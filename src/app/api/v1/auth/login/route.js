import { setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { prisma } from "@/lib/db/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertBodySize, assertSameOrigin } from "@/lib/security/request";

import { getAuthRequestContext, PRIVATE_RESPONSE_HEADERS } from "../_shared";

export const runtime = "nodejs";

export const POST = withApiErrors(async (request) => {
  assertSameOrigin(request);
  assertBodySize(request);

  const { auth, metadata, pepper } = getAuthRequestContext(request);
  await consumeRateLimit({
    db: prisma,
    action: "AUTH_LOGIN",
    identity: metadata.rateLimitIdentity,
    pepper,
    limit: 10,
    windowMs: 15 * 60 * 1_000,
  });
  const input = await readJson(request, loginSchema, { maxBytes: 32 * 1_024 });
  const result = await auth.login(input, metadata);
  const response = apiData({ user: result.user }, { headers: PRIVATE_RESPONSE_HEADERS });
  return setSessionCookie(response, result.session.token);
});
