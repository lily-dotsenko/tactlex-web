import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createLearningPathService } from "@/server/services/learning-path-service";

export const GET = withApiErrors(async (request, context) => {
  const principal = await requireApiUser(request);
  const { slug } = await context.params;
  const locale = z
    .enum(["uk", "en"])
    .catch("uk")
    .parse(new URL(request.url).searchParams.get("locale"));
  return apiData(
    await createLearningPathService(prisma).getPath(principal.userId, slug, { locale }),
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
});
