import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { achievementCreateSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request) => {
  await authorizeAdmin(request, "achievements.manage");
  return apiData(await adminContent.listAchievements(), { headers: ADMIN_HEADERS });
});

export const POST = withApiErrors(async (request) => {
  const principal = await authorizeAdminMutation(
    request,
    "achievements.manage",
    "ADMIN_ACHIEVEMENT",
  );
  const input = await readJson(request, achievementCreateSchema);
  return apiData(await adminContent.createAchievement(principal.userId, input), {
    status: 201,
    headers: ADMIN_HEADERS,
  });
});
