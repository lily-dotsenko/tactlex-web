import { apiData, withApiErrors } from "@/lib/http/api-response";
import { requireAccountActive } from "@/server/policies/auth-policy";

import {
  getAuthRequestContext,
  getRequestPrincipal,
  PRIVATE_RESPONSE_HEADERS,
  toSessionUser,
} from "../_shared";

export const runtime = "nodejs";

export const GET = withApiErrors(async (request) => {
  const { auth } = getAuthRequestContext(request);
  const principal = await getRequestPrincipal(request, auth);
  return apiData(
    { user: principal ? toSessionUser(requireAccountActive(principal)) : null },
    { headers: PRIVATE_RESPONSE_HEADERS },
  );
});
