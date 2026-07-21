import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { getSessionPepper } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertBodySize, assertSameOrigin } from "@/lib/security/request";
import { requireIdempotencyKey } from "@/server/services/idempotency-service";
import { createReviewService } from "@/server/services/review-service";

const reviewSchema = z
  .object({
    answer: z.string().trim().min(1).max(200),
    rating: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
    responseTimeMs: z.number().int().min(0).max(600_000).optional(),
  })
  .strict();

export const runtime = "nodejs";

export const POST = withApiErrors(async (request, { params }) => {
  assertSameOrigin(request);
  assertBodySize(request, { maxBytes: 8 * 1_024 });
  const principal = await requireApiUser(request);
  await consumeRateLimit({
    db: prisma,
    action: "SCHEDULED_REVIEW",
    identity: principal.userId,
    pepper: getSessionPepper(),
    limit: 90,
    windowMs: 60 * 60 * 1_000,
  });
  const idempotencyKey = requireIdempotencyKey(request);
  const { termId: rawTermId } = await params;
  const termId = z.uuid().parse(rawTermId);
  const input = await readJson(request, reviewSchema, { maxBytes: 8 * 1_024 });
  return apiData(
    await createReviewService(prisma).submit(principal.userId, termId, input, idempotencyKey),
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
