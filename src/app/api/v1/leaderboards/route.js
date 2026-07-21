import { z } from "zod";

import { optionalApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createProgressService } from "@/server/services/progress-service";

const querySchema = z.object({
  period: z.enum(["weekly", "all-time"]).default("weekly"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = withApiErrors(async (request) => {
  const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const principal = await optionalApiUser(request);
  return apiData(
    await createProgressService(prisma).leaderboard(input.period, input.limit, principal?.userId),
  );
});
