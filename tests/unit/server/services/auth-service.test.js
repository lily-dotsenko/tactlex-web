import { describe, expect, it, vi } from "vitest";

import { createAuthService } from "@/server/services/auth-service";

const now = new Date("2026-07-21T12:00:00.000Z");

function makeDb() {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "user@example.com",
    passwordHash: "encoded-password-hash",
    status: "ACTIVE",
    emailVerifiedAt: null,
  };
  const profile = {
    userId: user.id,
    nickname: "Курсант",
    audienceType: "CADET",
    preferredLocale: "UK",
    timezone: "Europe/Kyiv",
    dailyGoalXp: 20,
    leaderboardVisible: false,
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
  };
  const db = {
    role: {
      findUnique: vi.fn().mockResolvedValue({ id: "role-user", code: "USER" }),
      findMany: vi.fn().mockResolvedValue([{ id: "role-user", code: "USER" }]),
    },
    permission: { findMany: vi.fn().mockResolvedValue([{ code: "profile:update:self" }]) },
    rolePermission: { findMany: vi.fn().mockResolvedValue([{ permissionId: "permission-1" }]) },
    userRole: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([{ roleId: "role-user" }]),
    },
    user: {
      create: vi.fn().mockResolvedValue(user),
      findUnique: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
    },
    userProfile: {
      create: vi.fn().mockResolvedValue(profile),
      findUnique: vi.fn().mockResolvedValue(profile),
      update: vi.fn().mockResolvedValue(profile),
    },
    authSession: {
      create: vi.fn().mockImplementation(({ data }) => ({ id: "session-1", ...data })),
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  db.$transaction = vi.fn((callback) => callback(db));
  return { db, profile, user };
}

describe("auth service", () => {
  it("registers with USER role and stores only session digests", async () => {
    const { db } = makeDb();
    const service = createAuthService({
      db,
      pepper: "test-session-pepper",
      clock: () => now,
      passwordHasher: vi.fn().mockResolvedValue("encoded-password-hash"),
    });

    const result = await service.register(
      {
        email: "USER@example.com",
        password: "a secure passphrase",
        nickname: "Курсант",
        audienceType: "cadet",
      },
      { ipDigest: "a".repeat(64), userAgent: "Vitest" },
    );

    const sessionData = db.authSession.create.mock.calls[0][0].data;
    expect(result.user).toMatchObject({ email: "user@example.com", roles: ["USER"] });
    expect(result.session.token).toHaveLength(43);
    expect(sessionData.tokenHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(sessionData.csrfTokenHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(sessionData.tokenHash).not.toBe(sessionData.csrfTokenHash);
    expect(sessionData).not.toHaveProperty("token");
    expect(db.userRole.create).toHaveBeenCalledWith({
      data: { userId: expect.any(String), roleId: "role-user" },
    });
  });

  it("uses a generic failure and performs password work for an unknown account", async () => {
    const { db } = makeDb();
    db.user.findUnique.mockResolvedValue(null);
    const passwordHasher = vi.fn().mockResolvedValue("unused-digest");
    const service = createAuthService({
      db,
      pepper: "test-session-pepper",
      clock: () => now,
      passwordHasher,
    });

    await expect(
      service.login({ email: "missing@example.com", password: "not the password" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
    expect(passwordHasher).toHaveBeenCalledWith("not the password");
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ actorUserId: null }) }),
    );
  });

  it("does not create a session for a suspended account", async () => {
    const { db, user } = makeDb();
    db.user.findUnique.mockResolvedValue({ ...user, status: "SUSPENDED" });
    const service = createAuthService({
      db,
      pepper: "test-session-pepper",
      clock: () => now,
      passwordVerifier: vi.fn().mockResolvedValue(true),
    });

    await expect(
      service.login({ email: "user@example.com", password: "correct passphrase" }),
    ).rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE", status: 403 });
    expect(db.authSession.create).not.toHaveBeenCalled();
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "AUTH_LOGIN_BLOCKED" }),
      }),
    );
  });

  it("loads active session identity and RBAC exclusively from the database", async () => {
    const { db, user } = makeDb();
    db.authSession.findUnique.mockResolvedValue({
      id: "session-1",
      userId: user.id,
      revokedAt: null,
      expiresAt: new Date("2026-08-01T12:00:00.000Z"),
      idleExpiresAt: new Date("2026-07-25T12:00:00.000Z"),
      lastSeenAt: now,
    });
    const service = createAuthService({
      db,
      pepper: "test-session-pepper",
      clock: () => now,
    });
    const { createSessionToken } = await import("@/lib/auth/session");
    const token = createSessionToken();

    const principal = await service.authenticateToken(token);

    expect(principal).toMatchObject({
      userId: user.id,
      sessionId: "session-1",
      roles: ["USER"],
      permissions: ["profile:update:self"],
    });
    expect(db.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: user.id }) }),
    );
    expect(db.authSession.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/u) },
    });
    expect(db.authSession.findUnique.mock.calls[0][0].where.tokenHash).not.toBe(token);
  });

  it("rejects and revokes an expired session", async () => {
    const { db, user } = makeDb();
    db.authSession.findUnique.mockResolvedValue({
      id: "session-1",
      userId: user.id,
      revokedAt: null,
      expiresAt: new Date("2026-07-20T12:00:00.000Z"),
      idleExpiresAt: new Date("2026-07-20T12:00:00.000Z"),
      lastSeenAt: new Date("2026-07-19T12:00:00.000Z"),
    });
    const service = createAuthService({
      db,
      pepper: "test-session-pepper",
      clock: () => now,
    });
    const { createSessionToken } = await import("@/lib/auth/session");

    await expect(service.authenticateToken(createSessionToken())).resolves.toBeNull();
    expect(db.authSession.updateMany).toHaveBeenCalledWith({
      where: { id: "session-1", revokedAt: null },
      data: { revokedAt: now, revocationReason: "EXPIRED" },
    });
  });
});
