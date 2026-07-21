import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { achievementUpdateSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request, { params }) => {
  await authorizeAdmin(request, "achievements.manage");
  const { id } = await params;
  return apiData(await adminContent.getAchievement(uuidParam.parse(id)), {
    headers: ADMIN_HEADERS,
  });
});

export const PATCH = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(
    request,
    "achievements.manage",
    "ADMIN_ACHIEVEMENT",
  );
  const input = await readJson(request, achievementUpdateSchema);
  const { id } = await params;
  return apiData(
    await adminContent.updateAchievement(principal.userId, uuidParam.parse(id), input),
    {
      headers: ADMIN_HEADERS,
    },
  );
});
