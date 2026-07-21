import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { lessonStatusSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const POST = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "lessons.manage", "ADMIN_LESSON");
  const { status } = await readJson(request, lessonStatusSchema);
  const { id } = await params;
  return apiData(
    await adminContent.setLessonStatus(principal.userId, uuidParam.parse(id), status),
    {
      headers: ADMIN_HEADERS,
    },
  );
});
