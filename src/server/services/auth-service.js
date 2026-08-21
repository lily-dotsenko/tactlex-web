import { getSessionPepper, SESSION_IDLE_TTL_SECONDS } from "@/lib/auth/config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  digestSessionToken,
  getSessionExpiry,
  isSessionToken,
} from "@/lib/auth/session";
import { loginSchema, profileUpdateSchema, registerSchema } from "@/lib/auth/validation";
import { DomainError } from "@/server/services/errors";

const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1_000;

function isUniqueConstraintError(error) {
  return error?.code === "P2002";
}

function toDatabaseAudience(value) {
  return value ? value.toUpperCase() : null;
}

function toDatabaseLocale(value) {
  return value.toUpperCase();
}

function fromDatabaseEnum(value) {
  return value?.toLocaleLowerCase("en-US") ?? null;
}

function earliestDate(left, right) {
  return left.getTime() < right.getTime() ? left : right;
}

function makeSessionData({ userId, token, pepper, now, metadata }) {
  const expiresAt = getSessionExpiry(now);
  const idleExpiresAt = earliestDate(
    new Date(now.getTime() + SESSION_IDLE_TTL_SECONDS * 1_000),
    expiresAt,
  );

  return {
    token,
    expiresAt,
    data: {
      userId,
      tokenHash: digestSessionToken(token, pepper),
      csrfTokenHash: digestSessionToken(token, `${pepper}\0csrf`),
      expiresAt,
      idleExpiresAt,
      lastSeenAt: now,
      ipDigest: metadata?.ipDigest ?? null,
      userAgent: metadata?.userAgent ?? null,
    },
  };
}

function mapProfile(profile) {
  if (!profile) return null;

  return {
    nickname: profile.nickname,
    audienceType: fromDatabaseEnum(profile.audienceType),
    locale: fromDatabaseEnum(profile.preferredLocale),
    timezone: profile.timezone,
    dailyGoalXp: profile.dailyGoalXp,
    leaderboardVisible: profile.leaderboardVisible,
    avatarKey: profile.avatarKey,
    avatarConfig: profile.avatarConfig,
    totalXp: profile.totalXp,
    level: profile.level,
    currentStreak: profile.currentStreak,
    longestStreak: profile.longestStreak,
  };
}

async function loadAuthorization(db, userId, now) {
  const assignments = await db.userRole.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { roleId: true },
  });
  const roleIds = assignments.map(({ roleId }) => roleId);
  if (roleIds.length === 0) return { roles: [], permissions: [] };

  const [roles, rolePermissions] = await Promise.all([
    db.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, code: true },
    }),
    db.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      select: { permissionId: true },
    }),
  ]);
  const permissionIds = [...new Set(rolePermissions.map(({ permissionId }) => permissionId))];
  const permissions = permissionIds.length
    ? await db.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { code: true },
      })
    : [];

  return {
    roles: roles.map(({ code }) => code),
    permissions: permissions.map(({ code }) => code),
  };
}

function mapUser(user, profile, authorization) {
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    profile: mapProfile(profile),
    roles: authorization.roles,
  };
}

async function writeAudit(db, { actorUserId, action, targetType, targetId, metadata }) {
  return db.auditLog.create({
    data: {
      actorUserId: actorUserId ?? null,
      action,
      targetType,
      targetId: targetId ?? null,
      ipDigest: metadata?.ipDigest ?? null,
      metadata: {},
    },
  });
}

export function createAuthService({
  db,
  pepper = getSessionPepper(),
  clock = () => new Date(),
  passwordHasher = hashPassword,
  passwordVerifier = verifyPassword,
}) {
  if (!db) throw new TypeError("A database client is required.");

  async function buildPrincipal(user, session) {
    const now = clock();
    const [profile, authorization] = await Promise.all([
      db.userProfile.findUnique({ where: { userId: user.id } }),
      loadAuthorization(db, user.id, now),
    ]);

    return {
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      profile: mapProfile(profile),
      roles: authorization.roles,
      permissions: authorization.permissions,
    };
  }

  async function register(rawInput, metadata) {
    const input = registerSchema.parse(rawInput);
    const passwordHash = await passwordHasher(input.password);
    const now = clock();
    const token = createSessionToken();

    try {
      const result = await db.$transaction(async (transaction) => {
        const userRole = await transaction.role.findUnique({ where: { code: "USER" } });
        if (!userRole) {
          throw new DomainError(
            "AUTH_CONFIGURATION_ERROR",
            "Не вдалося створити обліковий запис.",
            500,
          );
        }

        const user = await transaction.user.create({
          data: {
            email: input.email,
            passwordHash,
          },
        });
        const profile = await transaction.userProfile.create({
          data: {
            userId: user.id,
            nickname: input.nickname,
            audienceType: toDatabaseAudience(input.audienceType),
            preferredLocale: toDatabaseLocale(input.locale),
          },
        });
        await transaction.userRole.create({
          data: { userId: user.id, roleId: userRole.id },
        });
        const sessionData = makeSessionData({ userId: user.id, token, pepper, now, metadata });
        const session = await transaction.authSession.create({ data: sessionData.data });
        await writeAudit(transaction, {
          actorUserId: user.id,
          action: "AUTH_REGISTERED",
          targetType: "USER",
          targetId: user.id,
          metadata,
        });

        return { user, profile, session, expiresAt: sessionData.expiresAt };
      });
      const authorization = await loadAuthorization(db, result.user.id, now);

      return {
        user: mapUser(result.user, result.profile, authorization),
        session: { token, expiresAt: result.expiresAt },
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new DomainError(
          "ACCOUNT_ALREADY_EXISTS",
          "Обліковий запис або псевдонім уже використовується.",
          409,
        );
      }
      throw error;
    }
  }

  async function login(rawInput, metadata) {
    const input = loginSchema.parse(rawInput);
    const user = await db.user.findUnique({ where: { email: input.email } });

    if (!user) {
      await passwordHasher(input.password);
      await writeAudit(db, {
        action: "AUTH_LOGIN_FAILED",
        targetType: "AUTHENTICATION",
        metadata,
      });
      throw new DomainError("INVALID_CREDENTIALS", "Неправильна адреса або пароль.", 401);
    }

    const passwordValid = await passwordVerifier(user.passwordHash, input.password);
    if (!passwordValid) {
      await writeAudit(db, {
        actorUserId: user.id,
        action: "AUTH_LOGIN_FAILED",
        targetType: "USER",
        targetId: user.id,
        metadata,
      });
      throw new DomainError("INVALID_CREDENTIALS", "Неправильна адреса або пароль.", 401);
    }

    if (user.status !== "ACTIVE") {
      await writeAudit(db, {
        actorUserId: user.id,
        action: "AUTH_LOGIN_BLOCKED",
        targetType: "USER",
        targetId: user.id,
        metadata,
      });
      throw new DomainError("ACCOUNT_UNAVAILABLE", "Обліковий запис недоступний.", 403);
    }

    const now = clock();
    const token = createSessionToken();
    const sessionData = makeSessionData({ userId: user.id, token, pepper, now, metadata });
    const session = await db.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      });
      const created = await transaction.authSession.create({ data: sessionData.data });
      await writeAudit(transaction, {
        actorUserId: user.id,
        action: "AUTH_LOGIN_SUCCEEDED",
        targetType: "USER",
        targetId: user.id,
        metadata,
      });
      return created;
    });
    const principal = await buildPrincipal(user, session);

    return {
      user: {
        id: principal.userId,
        email: principal.email,
        status: principal.status,
        emailVerifiedAt: principal.emailVerifiedAt,
        profile: principal.profile,
        roles: principal.roles,
      },
      session: { token, expiresAt: sessionData.expiresAt },
    };
  }

  async function authenticateToken(token) {
    if (!isSessionToken(token)) return null;

    const tokenHash = digestSessionToken(token, pepper);
    const session = await db.authSession.findUnique({ where: { tokenHash } });
    if (!session) return null;

    const now = clock();
    if (
      session.revokedAt ||
      session.expiresAt.getTime() <= now.getTime() ||
      session.idleExpiresAt.getTime() <= now.getTime()
    ) {
      if (!session.revokedAt) {
        await db.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now, revocationReason: "EXPIRED" },
        });
      }
      return null;
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) return null;

    if (now.getTime() - session.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
      const idleExpiresAt = earliestDate(
        new Date(now.getTime() + SESSION_IDLE_TTL_SECONDS * 1_000),
        session.expiresAt,
      );
      await db.authSession.updateMany({
        where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
        data: { lastSeenAt: now, idleExpiresAt },
      });
    }

    return buildPrincipal(user, session);
  }

  async function logout(token, metadata) {
    if (!isSessionToken(token)) return;

    const tokenHash = digestSessionToken(token, pepper);
    const existing = await db.authSession.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (!existing || existing.revokedAt) return;

    const now = clock();
    await db.$transaction(async (transaction) => {
      const result = await transaction.authSession.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: now, revocationReason: "LOGOUT" },
      });
      if (result.count === 1) {
        await writeAudit(transaction, {
          actorUserId: existing.userId,
          action: "AUTH_LOGOUT",
          targetType: "USER",
          targetId: existing.userId,
          metadata,
        });
      }
    });
  }

  async function updateProfile(userId, rawInput) {
    const input = profileUpdateSchema.parse(rawInput);
    const data = {
      ...(Object.hasOwn(input, "nickname") ? { nickname: input.nickname } : {}),
      ...(Object.hasOwn(input, "audienceType")
        ? { audienceType: toDatabaseAudience(input.audienceType) }
        : {}),
      ...(input.locale ? { preferredLocale: toDatabaseLocale(input.locale) } : {}),
      ...(Object.hasOwn(input, "leaderboardVisible")
        ? { leaderboardVisible: input.leaderboardVisible }
        : {}),
      ...(input.avatarKey ? { avatarKey: input.avatarKey } : {}),
      ...(Object.hasOwn(input, "avatarConfig") ? { avatarConfig: input.avatarConfig } : {}),
      ...(input.dailyGoalXp ? { dailyGoalXp: input.dailyGoalXp } : {}),
      ...(input.timezone ? { timezone: input.timezone } : {}),
    };

    try {
      const profile = await db.$transaction(async (transaction) => {
        const updated = await transaction.userProfile.update({ where: { userId }, data });
        await writeAudit(transaction, {
          actorUserId: userId,
          action: "PROFILE_UPDATED",
          targetType: "USER_PROFILE",
          targetId: userId,
        });
        return updated;
      });
      return mapProfile(profile);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new DomainError("NICKNAME_IN_USE", "Цей псевдонім уже використовується.", 409);
      }
      throw error;
    }
  }

  return { register, login, authenticateToken, logout, updateProfile };
}
