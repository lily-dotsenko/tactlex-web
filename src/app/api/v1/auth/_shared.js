import { getSessionPepper } from "@/lib/auth/config";
import { getSessionTokenFromRequest } from "@/lib/auth/session";
import { getRequestClientMetadata } from "@/lib/security/client-metadata";
import { prisma } from "@/lib/db/prisma";
import { requireAccountActive } from "@/server/policies/auth-policy";
import { createAuthService } from "@/server/services/auth-service";

export const PRIVATE_RESPONSE_HEADERS = { "Cache-Control": "private, no-store" };

export function getAuthRequestContext(request) {
  const pepper = getSessionPepper();
  return {
    auth: createAuthService({ db: prisma, pepper }),
    metadata: getRequestClientMetadata(request, pepper),
    pepper,
  };
}

export async function requireRequestPrincipal(request, auth) {
  const principal = await getRequestPrincipal(request, auth);
  return requireAccountActive(principal);
}

export async function getRequestPrincipal(request, auth) {
  const token = getSessionTokenFromRequest(request);
  return token ? auth.authenticateToken(token) : null;
}

export function toSessionUser(principal) {
  return {
    id: principal.userId,
    email: principal.email,
    status: principal.status,
    emailVerifiedAt: principal.emailVerifiedAt,
    profile: principal.profile,
    roles: principal.roles,
    permissions: principal.permissions,
  };
}
