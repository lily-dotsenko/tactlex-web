import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { categoryCreateSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
} from "@/app/api/v1/admin/_shared";

export const runtime = "nodejs";

export const GET = withApiErrors(async (request) => {
  await authorizeAdmin(request, "categories.manage");
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  return apiData(await adminContent.listCategories({ includeArchived }), {
    headers: ADMIN_HEADERS,
  });
});

export const POST = withApiErrors(async (request) => {
  const principal = await authorizeAdminMutation(request, "categories.manage", "ADMIN_CATEGORY");
  const input = await readJson(request, categoryCreateSchema);
  return apiData(await adminContent.createCategory(principal.userId, input), {
    status: 201,
    headers: ADMIN_HEADERS,
  });
});
