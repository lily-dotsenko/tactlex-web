import { digestPrivateValue } from "@/lib/security/client-metadata";
import { DomainError } from "@/server/services/errors";

function getWindow(now, windowMs) {
  const start = Math.floor(now.getTime() / windowMs) * windowMs;
  return {
    windowStartedAt: new Date(start),
    windowEndsAt: new Date(start + windowMs),
  };
}

export async function consumeRateLimit({
  db,
  action,
  identity,
  pepper,
  limit,
  windowMs,
  now = new Date(),
}) {
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("Rate limit must be positive.");
  if (!Number.isInteger(windowMs) || windowMs < 1_000) {
    throw new TypeError("Rate-limit window must be at least one second.");
  }

  const bucketKey = digestPrivateValue(identity, pepper, `rate-limit:${action}`);
  const { windowStartedAt, windowEndsAt } = getWindow(now, windowMs);
  const bucket = await db.rateLimitBucket.upsert({
    where: {
      action_bucketKey_windowStartedAt: {
        action,
        bucketKey,
        windowStartedAt,
      },
    },
    create: {
      action,
      bucketKey,
      windowStartedAt,
      windowEndsAt,
      count: 1,
    },
    update: {
      count: { increment: 1 },
      windowEndsAt,
    },
    select: { count: true },
  });

  if (bucket.count > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowEndsAt.getTime() - now.getTime()) / 1_000),
    );
    throw new DomainError("RATE_LIMITED", "Забагато запитів. Спробуйте пізніше.", 429, {
      retryAfterSeconds,
    });
  }

  return {
    remaining: Math.max(0, limit - bucket.count),
    resetAt: windowEndsAt,
  };
}
