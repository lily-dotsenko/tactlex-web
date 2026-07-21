import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { getSessionPepper } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertBodySize, assertSameOrigin } from "@/lib/security/request";
import { requireIdempotencyKey } from "@/server/services/idempotency-service";
import { createStudyService } from "@/server/services/study-service";

const completeSchema = z.object({}).strict();

export const runtime = "nodejs";

export const POST = withApiErrors(async (request, { params }) => {
  assertSameOrigin(request);
  assertBodySize(request, { maxBytes: 1_024 });
  const principal = await requireApiUser(request);
  await consumeRateLimit({
    db: prisma,
    action: "STUDY_COMPLETE",
    identity: principal.userId,
    pepper: getSessionPepper(),
    limit: 30,
    windowMs: 10 * 60 * 1_000,
  });
  const idempotencyKey = requireIdempotencyKey(request);
  const { id } = await params;
  const sessionId = z.uuid().parse(id);
  await readJson(request, completeSchema, { maxBytes: 1_024 });
  return apiData(
    await createStudyService(prisma).completeSession(principal.userId, sessionId, idempotencyKey),
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
