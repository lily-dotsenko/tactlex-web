import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { lessonUpdateSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request, { params }) => {
  await authorizeAdmin(request, "lessons.manage");
  const { id } = await params;
  return apiData(await adminContent.getLesson(uuidParam.parse(id)), { headers: ADMIN_HEADERS });
});

export const PATCH = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "lessons.manage", "ADMIN_LESSON");
  const input = await readJson(request, lessonUpdateSchema);
  const { id } = await params;
  return apiData(await adminContent.updateLesson(principal.userId, uuidParam.parse(id), input), {
    headers: ADMIN_HEADERS,
  });
});
