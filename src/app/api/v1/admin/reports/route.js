import { apiData, withApiErrors } from "@/lib/http/api-response";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  enumQuery,
  pageOptions,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request) => {
  await authorizeAdmin(request, "reports.manage");
  const { cursor, limit, url } = pageOptions(request);
  const result = await adminContent.listReports({
    cursor,
    limit,
    status: enumQuery(
      url.searchParams.get("status"),
      ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"],
      "status",
    ),
  });
  return apiData(result.data, {
    page: { nextCursor: result.nextCursor },
    headers: ADMIN_HEADERS,
  });
});
