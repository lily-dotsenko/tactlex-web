import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { categoryUpdateSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const GET = withApiErrors(async (request, { params }) => {
  await authorizeAdmin(request, "categories.manage");
  const { id } = await params;
  return apiData(await adminContent.getCategory(uuidParam.parse(id)), { headers: ADMIN_HEADERS });
});

export const PATCH = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "categories.manage", "ADMIN_CATEGORY");
  const { id } = await params;
  const input = await readJson(request, categoryUpdateSchema);
  return apiData(await adminContent.updateCategory(principal.userId, uuidParam.parse(id), input), {
    headers: ADMIN_HEADERS,
  });
});

export const DELETE = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "categories.manage", "ADMIN_CATEGORY");
  const { id } = await params;
  return apiData(
    await adminContent.updateCategory(principal.userId, uuidParam.parse(id), { archived: true }),
    { headers: ADMIN_HEADERS },
  );
});
