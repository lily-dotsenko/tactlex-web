import { apiData, withApiErrors } from "@/lib/http/api-response";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  enumQuery,
  pageOptions,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request) => {
  await authorizeAdmin(request, "users.read");
  const { cursor, limit, url } = pageOptions(request);
  const result = await adminContent.listUsers({
    cursor,
    limit,
    status: enumQuery(
      url.searchParams.get("status"),
      ["ACTIVE", "SUSPENDED", "ANONYMIZED"],
      "status",
    ),
    query: url.searchParams.get("q")?.trim().slice(0, 100) || undefined,
  });
  return apiData(result.data, {
    page: { nextCursor: result.nextCursor },
    headers: ADMIN_HEADERS,
  });
});
