import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { getSessionPepper } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertBodySize, assertSameOrigin } from "@/lib/security/request";
import { requireIdempotencyKey } from "@/server/services/idempotency-service";
import { createStudyService } from "@/server/services/study-service";

const answerSchema = z
  .object({
    sessionItemId: z.uuid(),
    answer: z.string().trim().min(1).max(200),
    responseTimeMs: z.number().int().min(0).max(600_000).optional(),
    rating: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]).optional(),
  })
  .strict();

export const runtime = "nodejs";

export const POST = withApiErrors(async (request, { params }) => {
  assertSameOrigin(request);
  assertBodySize(request, { maxBytes: 8 * 1_024 });
  const principal = await requireApiUser(request);
  await consumeRateLimit({
    db: prisma,
    action: "STUDY_ANSWER",
    identity: principal.userId,
    pepper: getSessionPepper(),
    limit: 120,
    windowMs: 60 * 1_000,
  });
  const idempotencyKey = requireIdempotencyKey(request);
  const { id } = await params;
  const sessionId = z.uuid().parse(id);
  const input = await readJson(request, answerSchema, { maxBytes: 8 * 1_024 });
  return apiData(
    await createStudyService(prisma).submitAnswer(
      principal.userId,
      sessionId,
      input,
      idempotencyKey,
    ),
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
