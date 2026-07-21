import { requireAccountActive } from "@/server/policies/auth-policy";
import { DomainError } from "@/server/services/errors";

export function hasRole(principal, roleName) {
  return principal?.roles instanceof Set
    ? principal.roles.has(roleName)
    : principal?.roles?.includes(roleName) === true;
}

export function hasPermission(principal, permissionName) {
  return principal?.permissions instanceof Set
    ? principal.permissions.has(permissionName)
    : principal?.permissions?.includes(permissionName) === true;
}

export function requireRole(principal, roleName) {
  requireAccountActive(principal);

  if (!hasRole(principal, roleName)) {
    throw new DomainError("FORBIDDEN", "Недостатньо прав для цієї дії.", 403);
  }

  return principal;
}

export function requirePermission(principal, permissionName) {
  requireAccountActive(principal);

  if (!hasPermission(principal, permissionName)) {
    throw new DomainError("FORBIDDEN", "Недостатньо прав для цієї дії.", 403);
  }

  return principal;
}

export function requireSelfOrPermission(principal, userId, permissionName) {
  requireAccountActive(principal);

  if (principal.userId !== userId && !hasPermission(principal, permissionName)) {
    throw new DomainError("FORBIDDEN", "Недостатньо прав для цієї дії.", 403);
  }

  return principal;
}
