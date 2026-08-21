import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createGameService } from "@/server/services/game-service";

export const GET = withApiErrors(async (request) => {
  const principal = await requireApiUser(request);
  return apiData(await createGameService(prisma).getStatus(principal.userId), {
    headers: { "Cache-Control": "private, no-store" },
  });
});
