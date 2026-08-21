import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/security/request";
import { createGameService } from "@/server/services/game-service";

const schema = z.object({ patchIds: z.array(z.uuid()).max(3) }).strict();

export const PATCH = withApiErrors(async (request) => {
  assertSameOrigin(request);
  const principal = await requireApiUser(request);
  const { patchIds } = await readJson(request, schema);
  return apiData(await createGameService(prisma).setFeaturedPatches(principal.userId, patchIds));
});
