import { setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/db/prisma";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
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
    action: "AUTH_REGISTER",
    identity: metadata.rateLimitIdentity,
    pepper,
    limit: 5,
    windowMs: 60 * 60 * 1_000,
  });
  const input = await readJson(request, registerSchema, { maxBytes: 32 * 1_024 });
  const result = await auth.register(input, metadata);
  const response = apiData(
    { user: result.user },
    { status: 201, headers: PRIVATE_RESPONSE_HEADERS },
  );
  return setSessionCookie(response, result.session.token);
});
