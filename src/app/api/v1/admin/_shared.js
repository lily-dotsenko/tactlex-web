import { z } from "zod";

import { requireApiPermission } from "@/app/api/v1/_shared";
import { getSessionPepper } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertBodySize, assertSameOrigin } from "@/lib/security/request";
import { createAdminContentService } from "@/server/services/admin-content-service";
import { DomainError } from "@/server/services/errors";

export const adminContent = createAdminContentService(prisma);
export const ADMIN_HEADERS = { "Cache-Control": "private, no-store" };
export const uuidParam = z.uuid();

export async function authorizeAdmin(request, permission) {
  return requireApiPermission(request, permission);
}

export async function authorizeAdminMutation(
  request,
  permission,
  action,
  { maxBytes = 256 * 1_024 } = {},
) {
  assertSameOrigin(request);
  assertBodySize(request, { maxBytes });
  const principal = await authorizeAdmin(request, permission);
  await consumeRateLimit({
    db: prisma,
    action,
    identity: principal.userId,
    pepper: getSessionPepper(),
    limit: 180,
    windowMs: 60 * 1_000,
  });
  return principal;
}

export function pageOptions(request, { max = 100, defaultLimit = 50 } = {}) {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get("limit") ?? defaultLimit);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new DomainError("INVALID_PAGE_SIZE", `limit має бути від 1 до ${max}.`, 422);
  }
  return { cursor: url.searchParams.get("cursor") || undefined, limit: parsed, url };
}

export function enumQuery(value, allowed, name) {
  if (!value) return undefined;
  if (!allowed.includes(value)) {
    throw new DomainError("INVALID_QUERY", `Некоректне значення ${name}.`, 422);
  }
  return value;
}
