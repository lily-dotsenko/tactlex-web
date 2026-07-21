import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { termUpdateSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request, { params }) => {
  await authorizeAdmin(request, "terms.manage");
  const { id } = await params;
  return apiData(await adminContent.getTerm(uuidParam.parse(id)), { headers: ADMIN_HEADERS });
});

export const PATCH = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "terms.manage", "ADMIN_TERM", {
    maxBytes: 512 * 1_024,
  });
  const { id } = await params;
  const input = await readJson(request, termUpdateSchema, { maxBytes: 512 * 1_024 });
  if (input.sources?.some(({ verificationStatus }) => verificationStatus !== "UNVERIFIED")) {
    await authorizeAdmin(request, "terms.review");
  }
  return apiData(await adminContent.updateTerm(principal.userId, uuidParam.parse(id), input), {
    headers: ADMIN_HEADERS,
  });
});
