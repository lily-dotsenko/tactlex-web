import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { lessonCreateSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
  enumQuery,
  pageOptions,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request) => {
  await authorizeAdmin(request, "lessons.manage");
  const { cursor, limit, url } = pageOptions(request);
  const result = await adminContent.listLessons({
    cursor,
    limit,
    status: enumQuery(url.searchParams.get("status"), ["DRAFT", "PUBLISHED", "ARCHIVED"], "status"),
  });
  return apiData(result.data, {
    page: { nextCursor: result.nextCursor },
    headers: ADMIN_HEADERS,
  });
});

export const POST = withApiErrors(async (request) => {
  const principal = await authorizeAdminMutation(request, "lessons.manage", "ADMIN_LESSON");
  const input = await readJson(request, lessonCreateSchema);
  return apiData(await adminContent.createLesson(principal.userId, input), {
    status: 201,
    headers: ADMIN_HEADERS,
  });
});
