import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { getSessionPepper } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertBodySize, assertSameOrigin } from "@/lib/security/request";
import { requireIdempotencyKey } from "@/server/services/idempotency-service";
import { createStudyService } from "@/server/services/study-service";

const createSessionSchema = z
  .object({
    lessonId: z.uuid().optional(),
    categoryId: z.uuid().optional(),
    mode: z.enum(["LESSON", "PRACTICE", "EN_TO_UA", "UA_TO_EN", "EN_TO_UK", "UK_TO_EN"]).optional(),
    direction: z.enum(["EN_TO_UA", "UA_TO_EN", "EN_TO_UK", "UK_TO_EN", "MIXED"]).optional(),
  })
  .strict()
  .refine((value) => !(value.lessonId && value.categoryId), {
    message: "Оберіть урок або категорію, але не обидва одночасно.",
    path: ["categoryId"],
  });

export const runtime = "nodejs";

export const POST = withApiErrors(async (request) => {
  assertSameOrigin(request);
  assertBodySize(request, { maxBytes: 8 * 1_024 });
  const principal = await requireApiUser(request);
  await consumeRateLimit({
    db: prisma,
    action: "STUDY_SESSION_CREATE",
    identity: principal.userId,
    pepper: getSessionPepper(),
    limit: 20,
    windowMs: 10 * 60 * 1_000,
  });
  const input = await readJson(request, createSessionSchema, { maxBytes: 8 * 1_024 });
  const requestKey = request.headers.has("idempotency-key")
    ? requireIdempotencyKey(request)
    : undefined;
  return apiData(
    await createStudyService(prisma).createSession(principal.userId, input, requestKey),
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
});
