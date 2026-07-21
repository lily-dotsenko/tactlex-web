import { apiData, withApiErrors } from "@/lib/http/api-response";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  pageOptions,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request) => {
  await authorizeAdmin(request, "audit.read");
  const { cursor, limit, url } = pageOptions(request, { max: 100, defaultLimit: 100 });
  const actorUserId = url.searchParams.get("actorUserId");
  const result = await adminContent.listAuditLogs({
    cursor,
    limit,
    actorUserId: actorUserId ? uuidParam.parse(actorUserId) : undefined,
    action: url.searchParams.get("action")?.slice(0, 120) || undefined,
    targetType: url.searchParams.get("targetType")?.slice(0, 80) || undefined,
  });
  return apiData(result.data, {
    page: { nextCursor: result.nextCursor },
    headers: ADMIN_HEADERS,
  });
});
