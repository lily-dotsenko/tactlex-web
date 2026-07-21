import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createReviewService } from "@/server/services/review-service";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const runtime = "nodejs";

export const GET = withApiErrors(async (request) => {
  const principal = await requireApiUser(request);
  const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return apiData(await createReviewService(prisma).listDue(principal.userId, input.limit), {
    headers: { "Cache-Control": "private, no-store" },
  });
});
