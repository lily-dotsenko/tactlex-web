import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createGameService } from "@/server/services/game-service";

export const GET = withApiErrors(async (request) => {
  const principal = await requireApiUser(request);
  const locale = z
    .enum(["uk", "en"])
    .catch("uk")
    .parse(new URL(request.url).searchParams.get("locale"));
  return apiData(await createGameService(prisma).getQuests(principal.userId, { locale }), {
    headers: { "Cache-Control": "private, no-store" },
  });
});
