import { z } from "zod";

import { requireApiUser } from "@/app/api/v1/_shared";
import { getSessionPepper } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertBodySize, assertSameOrigin } from "@/lib/security/request";
import { createReportService } from "@/server/services/report-service";

const reportSchema = z
  .object({
    termId: z.uuid(),
    reason: z.enum([
      "INCORRECT_TRANSLATION",
      "INCORRECT_DEFINITION",
      "INCORRECT_AUDIO",
      "BROKEN_SOURCE",
      "OTHER",
    ]),
    details: z.string().trim().min(10).max(2_000),
  })
  .strict();

const formReason = {
  translation: "INCORRECT_TRANSLATION",
  definition: "INCORRECT_DEFINITION",
  audio: "INCORRECT_AUDIO",
  source: "BROKEN_SOURCE",
  other: "OTHER",
};

async function parseReport(request) {
  if (request.headers.get("content-type")?.startsWith("application/json")) {
    return readJson(request, reportSchema, { maxBytes: 16 * 1024 });
  }
  const form = await request.formData();
  return reportSchema.parse({
    termId: form.get("termId"),
    reason: formReason[form.get("reason")] ?? form.get("reason"),
    details: form.get("details"),
  });
}

export const GET = withApiErrors(async (request) => {
  const principal = await requireApiUser(request);
  return apiData(await createReportService(prisma).listOwn(principal.userId), {
    headers: { "Cache-Control": "private, no-store" },
  });
});

export const POST = withApiErrors(async (request) => {
  assertSameOrigin(request);
  assertBodySize(request, { maxBytes: 20 * 1024 });
  const principal = await requireApiUser(request);
  await consumeRateLimit({
    db: prisma,
    action: "TERM_REPORT",
    identity: principal.userId,
    pepper: getSessionPepper(),
    limit: 10,
    windowMs: 60 * 60 * 1_000,
  });
  const input = await parseReport(request);
  return apiData(await createReportService(prisma).create(principal.userId, input), {
    status: 201,
    headers: { "Cache-Control": "private, no-store" },
  });
});
