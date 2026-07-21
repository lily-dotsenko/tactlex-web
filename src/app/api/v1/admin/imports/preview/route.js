import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { importPreviewSchema } from "@/server/services/admin-content-validation";
import { ADMIN_HEADERS, adminContent, authorizeAdminMutation } from "@/app/api/v1/admin/_shared";

const MAX_IMPORT_BYTES = 1_024 * 1_024;

export const POST = withApiErrors(async (request) => {
  await authorizeAdminMutation(request, "imports.create", "ADMIN_IMPORT_PREVIEW", {
    maxBytes: MAX_IMPORT_BYTES,
  });
  const input = await readJson(request, importPreviewSchema, { maxBytes: MAX_IMPORT_BYTES });
  return apiData(adminContent.previewImport(input.format, input.content), {
    headers: ADMIN_HEADERS,
  });
});
