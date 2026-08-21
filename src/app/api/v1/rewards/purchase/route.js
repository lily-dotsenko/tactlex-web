import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/security/request";
import { requireIdempotencyKey } from "@/server/services/idempotency-service";
import { createGameService } from "@/server/services/game-service";

const schema = z.object({ productCode: z.string().trim().min(1).max(100) }).strict();

export const POST = withApiErrors(async (request) => {
  assertSameOrigin(request);
  const principal = await requireApiUser(request);
  const { productCode } = await readJson(request, schema);
  return apiData(
    await createGameService(prisma).purchaseReward(
      principal.userId,
      productCode,
      requireIdempotencyKey(request),
    ),
  );
});
