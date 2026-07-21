import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { reportDecisionSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const PATCH = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "reports.manage", "ADMIN_REPORT");
  const input = await readJson(request, reportDecisionSchema);
  const { id } = await params;
  return apiData(
    await adminContent.moderateReport(
      principal.userId,
      uuidParam.parse(id),
      input.status,
      input.resolutionNote,
    ),
    { headers: ADMIN_HEADERS },
  );
});
