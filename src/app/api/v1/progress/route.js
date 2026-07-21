import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createProgressService } from "@/server/services/progress-service";

export const GET = withApiErrors(async (request) => {
  const principal = await requireApiUser(request);
  return apiData(await createProgressService(prisma).summary(principal.userId), {
    headers: { "Cache-Control": "private, no-store" },
  });
});
