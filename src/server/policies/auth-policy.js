import { DomainError } from "@/server/services/errors";

export function requireAuthenticated(principal) {
  if (!principal?.userId || !principal?.sessionId) {
    throw new DomainError("AUTHENTICATION_REQUIRED", "Потрібно увійти в обліковий запис.", 401);
  }

  return principal;
}

export function requireAccountActive(principal) {
  requireAuthenticated(principal);

  if (principal.status !== "ACTIVE") {
    throw new DomainError("ACCOUNT_UNAVAILABLE", "Обліковий запис недоступний.", 403);
  }

  return principal;
}
