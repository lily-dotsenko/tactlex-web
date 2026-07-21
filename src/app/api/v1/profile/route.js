import { profileUpdateSchema } from "@/lib/auth/validation";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { assertBodySize, assertSameOrigin } from "@/lib/security/request";
import {
  getAuthRequestContext,
  PRIVATE_RESPONSE_HEADERS,
  requireRequestPrincipal,
  toSessionUser,
} from "@/app/api/v1/auth/_shared";

export const runtime = "nodejs";

export const GET = withApiErrors(async (request) => {
  const { auth } = getAuthRequestContext(request);
  const principal = await requireRequestPrincipal(request, auth);
  return apiData({ user: toSessionUser(principal) }, { headers: PRIVATE_RESPONSE_HEADERS });
});

export const PATCH = withApiErrors(async (request) => {
  assertSameOrigin(request);
  assertBodySize(request);

  const { auth } = getAuthRequestContext(request);
  const principal = await requireRequestPrincipal(request, auth);
  const input = await readJson(request, profileUpdateSchema, { maxBytes: 32 * 1_024 });
  const profile = await auth.updateProfile(principal.userId, input);
  return apiData({ profile }, { headers: PRIVATE_RESPONSE_HEADERS });
});
