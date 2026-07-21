import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { reviewDecisionSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const POST = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "terms.review", "ADMIN_TERM_REVIEW");
  const input = await readJson(request, reviewDecisionSchema);
  const { id } = await params;
  return apiData(
    await adminContent.decideReview(
      principal.userId,
      uuidParam.parse(id),
      input.decision,
      input.note,
    ),
    { headers: ADMIN_HEADERS },
  );
});
