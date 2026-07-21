import { NextResponse } from "next/server";

import { clearSessionCookie, getSessionTokenFromRequest } from "@/lib/auth/session";
import { withApiErrors } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/security/request";

import { getAuthRequestContext, PRIVATE_RESPONSE_HEADERS } from "../_shared";

export const runtime = "nodejs";

export const POST = withApiErrors(async (request) => {
  assertSameOrigin(request);

  const { auth, metadata } = getAuthRequestContext(request);
  const token = getSessionTokenFromRequest(request);
  if (token) await auth.logout(token, metadata);

  const response = new NextResponse(null, { status: 204, headers: PRIVATE_RESPONSE_HEADERS });
  return clearSessionCookie(response);
});
