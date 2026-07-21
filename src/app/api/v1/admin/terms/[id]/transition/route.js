import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { assertBodySize, assertSameOrigin } from "@/lib/security/request";
import { termTransitionSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

function permissionFor(status) {
  return ["PUBLISHED", "ARCHIVED"].includes(status) ? "terms.publish" : "terms.manage";
}

export const POST = withApiErrors(async (request, { params }) => {
  assertSameOrigin(request);
  assertBodySize(request);
  const input = await readJson(request, termTransitionSchema);
  const principal = await authorizeAdminMutation(
    request,
    permissionFor(input.status),
    "ADMIN_TERM_WORKFLOW",
  );
  const { id } = await params;
  return apiData(
    await adminContent.transitionTerm(
      principal.userId,
      uuidParam.parse(id),
      input.status,
      input.note,
    ),
    { headers: ADMIN_HEADERS },
  );
});
