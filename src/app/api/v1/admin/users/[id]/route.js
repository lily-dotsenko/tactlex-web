import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { userAdminUpdateSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request, { params }) => {
  await authorizeAdmin(request, "users.read");
  const { id } = await params;
  return apiData(await adminContent.getAdminUser(uuidParam.parse(id)), { headers: ADMIN_HEADERS });
});

export const PATCH = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "users.update", "ADMIN_USER");
  const input = await readJson(request, userAdminUpdateSchema);
  if (input.roleCodes) await authorizeAdmin(request, "roles.assign");
  const { id } = await params;
  return apiData(await adminContent.updateUser(principal.userId, uuidParam.parse(id), input), {
    headers: ADMIN_HEADERS,
  });
});
