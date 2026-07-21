import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { importCommitSchema } from "@/server/services/admin-content-validation";
import { ADMIN_HEADERS, adminContent, authorizeAdminMutation } from "@/app/api/v1/admin/_shared";

const MAX_IMPORT_BYTES = 1_024 * 1_024;

export const POST = withApiErrors(async (request) => {
  const principal = await authorizeAdminMutation(request, "imports.create", "ADMIN_IMPORT_COMMIT", {
    maxBytes: MAX_IMPORT_BYTES,
  });
  const input = await readJson(request, importCommitSchema, { maxBytes: MAX_IMPORT_BYTES });
  return apiData(await adminContent.commitImport(principal.userId, input), {
    status: 201,
    headers: ADMIN_HEADERS,
  });
});
