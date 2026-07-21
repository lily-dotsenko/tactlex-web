import { apiData, withApiErrors } from "@/lib/http/api-response";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  enumQuery,
  pageOptions,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

const statuses = ["PENDING", "APPROVED", "CHANGES_REQUESTED", "REJECTED", "SUPERSEDED"];

export const GET = withApiErrors(async (request) => {
  await authorizeAdmin(request, "terms.review");
  const { cursor, limit, url } = pageOptions(request);
  const assignedToId = url.searchParams.get("assignedToId");
  const result = await adminContent.listReviews({
    cursor,
    limit,
    status: enumQuery(url.searchParams.get("status") ?? "PENDING", statuses, "status"),
    assignedToId: assignedToId ? uuidParam.parse(assignedToId) : undefined,
  });
  return apiData(result.data, {
    page: { nextCursor: result.nextCursor },
    headers: ADMIN_HEADERS,
  });
});
