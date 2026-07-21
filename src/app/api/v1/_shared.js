import { getAuthRequestContext, requireRequestPrincipal } from "@/app/api/v1/auth/_shared";
import { getSessionTokenFromRequest } from "@/lib/auth/session";
import { requirePermission } from "@/server/policies/rbac-policy";

export async function requireApiUser(request) {
  const { auth } = getAuthRequestContext(request);
  return requireRequestPrincipal(request, auth);
}

export async function optionalApiUser(request) {
  const { auth } = getAuthRequestContext(request);
  const token = getSessionTokenFromRequest(request);
  return token ? auth.authenticateToken(token) : null;
}

export async function requireApiPermission(request, permission) {
  const principal = await requireApiUser(request);
  return requirePermission(principal, permission);
}
