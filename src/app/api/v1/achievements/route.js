import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createProgressService } from "@/server/services/progress-service";

export const GET = withApiErrors(async (request) => {
  const principal = await requireApiUser(request);
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "uk";
  return apiData(await createProgressService(prisma).achievements(principal.userId, locale), {
    headers: { "Cache-Control": "private, no-store" },
  });
});
