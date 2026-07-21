import { createHash } from "node:crypto";

import { conflict, DomainError } from "@/server/services/errors";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1_000;

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function isUniqueConstraintError(error) {
  return error?.code === "P2002";
}

export function hashIdempotencyPayload(payload) {
  return digest(stableJson(payload));
}

export function requireIdempotencyKey(request) {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    throw new DomainError(
      "IDEMPOTENCY_KEY_REQUIRED",
      "Для цього запиту потрібен заголовок Idempotency-Key.",
      400,
    );
  }
  if (key.length < 8 || key.length > 120 || !/^[A-Za-z0-9._:-]+$/u.test(key)) {
    throw new DomainError(
      "INVALID_IDEMPOTENCY_KEY",
      "Заголовок Idempotency-Key має некоректний формат.",
      400,
    );
  }
  return key;
}

export function createIdempotencyService(
  db,
  { clock = () => new Date(), ttlMs = DEFAULT_TTL_MS } = {},
) {
  if (!db) throw new TypeError("A database client is required.");

  async function find(principalKey, scope, key) {
    return db.idempotencyRequest.findUnique({
      where: { principalKey_scope_key: { principalKey, scope, key } },
    });
  }

  async function reserve({ userId, scope, key, payload }) {
    const now = clock();
    const principalKey = digest(`user:${userId}`);
    const requestHash = hashIdempotencyPayload(payload);
    const identity = { principalKey, scope, key };
    let existing = await find(principalKey, scope, key);

    if (!existing) {
      try {
        const created = await db.idempotencyRequest.create({
          data: {
            userId,
            ...identity,
            requestHash,
            status: "IN_PROGRESS",
            expiresAt: new Date(now.getTime() + ttlMs),
          },
        });
        return { record: created, replay: null };
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        existing = await find(principalKey, scope, key);
      }
    }

    if (!existing || existing.requestHash !== requestHash) {
      throw conflict(
        "IDEMPOTENCY_KEY_REUSED",
        "Цей ключ ідемпотентності вже використано для іншого запиту.",
      );
    }

    if (existing.status === "COMPLETED") {
      return { record: existing, replay: existing.responseBody };
    }

    if (existing.status === "IN_PROGRESS" && existing.expiresAt > now) {
      throw conflict(
        "REQUEST_IN_PROGRESS",
        "Запит із цим ключем уже виконується. Повторіть спробу трохи пізніше.",
      );
    }

    const claimed = await db.idempotencyRequest.updateMany({
      where: {
        id: existing.id,
        requestHash,
        OR: [{ status: "FAILED" }, { expiresAt: { lte: now } }],
      },
      data: {
        status: "IN_PROGRESS",
        responseStatus: null,
        responseBody: undefined,
        expiresAt: new Date(now.getTime() + ttlMs),
      },
    });
    if (claimed.count !== 1) {
      throw conflict(
        "REQUEST_IN_PROGRESS",
        "Запит із цим ключем уже виконується. Повторіть спробу трохи пізніше.",
      );
    }

    return { record: { ...existing, status: "IN_PROGRESS" }, replay: null };
  }

  async function execute(input, operation) {
    const reservation = await reserve(input);
    if (reservation.replay !== null) {
      return { data: reservation.replay, replayed: true };
    }

    try {
      const data = await operation();
      const stored = jsonSafe(data);
      await db.idempotencyRequest.update({
        where: { id: reservation.record.id },
        data: {
          status: "COMPLETED",
          responseStatus: 200,
          responseBody: stored,
          expiresAt: new Date(clock().getTime() + ttlMs),
        },
      });
      return { data, replayed: false };
    } catch (error) {
      await db.idempotencyRequest
        .updateMany({
          where: { id: reservation.record.id, status: "IN_PROGRESS" },
          data: { status: "FAILED", responseStatus: null },
        })
        .catch(() => undefined);
      throw error;
    }
  }

  return { execute };
}
