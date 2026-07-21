import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { categoryReorderSchema } from "@/server/services/admin-content-validation";
import { ADMIN_HEADERS, adminContent, authorizeAdminMutation } from "@/app/api/v1/admin/_shared";

export const PATCH = withApiErrors(async (request) => {
  const principal = await authorizeAdminMutation(request, "categories.manage", "ADMIN_CATEGORY");
  const { items } = await readJson(request, categoryReorderSchema);
  return apiData(await adminContent.reorderCategories(principal.userId, items), {
    headers: ADMIN_HEADERS,
  });
});
