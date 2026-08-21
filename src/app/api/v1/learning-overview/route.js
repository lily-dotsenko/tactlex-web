import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createLearningOverviewService } from "@/server/services/learning-overview-service";

const querySchema = z.object({ locale: z.enum(["uk", "en"]).default("uk") });

export const GET = withApiErrors(async (request) => {
  const principal = await requireApiUser(request);
  const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return apiData(await createLearningOverviewService(prisma).getOverview(principal.userId, input), {
    headers: { "Cache-Control": "private, no-store" },
  });
});
