import { describe, expect, it } from "vitest";

import {
  hasPermission,
  hasRole,
  requirePermission,
  requireRole,
  requireSelfOrPermission,
} from "@/server/policies/rbac-policy";

const user = {
  userId: "user-1",
  sessionId: "session-1",
  status: "ACTIVE",
  roles: ["USER"],
  permissions: ["profile:update:self"],
};

describe("RBAC policies", () => {
  it("recognizes data-backed roles and permissions", () => {
    expect(hasRole(user, "USER")).toBe(true);
    expect(hasRole(user, "ADMIN")).toBe(false);
    expect(hasPermission(user, "profile:update:self")).toBe(true);
  });

  it("denies USER access to an ADMIN policy", () => {
    expect(() => requireRole(user, "ADMIN")).toThrow();
    expect(() => requirePermission(user, "content:publish")).toThrow();
  });

  it("permits self access and explicit cross-account permission", () => {
    expect(requireSelfOrPermission(user, "user-1", "users:read")).toBe(user);
    expect(() => requireSelfOrPermission(user, "user-2", "users:read")).toThrow();
    expect(
      requireSelfOrPermission({ ...user, permissions: ["users:read"] }, "user-2", "users:read"),
    ).toEqual({ ...user, permissions: ["users:read"] });
  });
});
