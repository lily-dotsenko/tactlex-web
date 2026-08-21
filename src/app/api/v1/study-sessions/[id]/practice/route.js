import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/security/request";
import { createStudyService } from "@/server/services/study-service";

export const runtime = "nodejs";

export const POST = withApiErrors(async (request, { params }) => {
  assertSameOrigin(request);
  const principal = await requireApiUser(request);
  const { id } = await params;
  const sessionId = z.uuid().parse(id);
  return apiData(await createStudyService(prisma).beginPractice(principal.userId, sessionId), {
    headers: { "Cache-Control": "private, no-store" },
  });
});
