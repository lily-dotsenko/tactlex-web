import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/security/request";
import { createLearningPathService } from "@/server/services/learning-path-service";

export const POST = withApiErrors(async (request, context) => {
  assertSameOrigin(request);
  const principal = await requireApiUser(request);
  const { id } = await context.params;
  return apiData(await createLearningPathService(prisma).completeNode(principal.userId, id));
});
