import { apiData, readJson, withApiErrors } from "@/lib/http/api-response";
import { termCreateSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
  enumQuery,
  pageOptions,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

const statuses = ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"];

export const runtime = "nodejs";

export const GET = withApiErrors(async (request) => {
  await authorizeAdmin(request, "terms.manage");
  const { cursor, limit, url } = pageOptions(request);
  const categoryId = url.searchParams.get("categoryId");
  const result = await adminContent.listTerms({
    cursor,
    limit,
    status: enumQuery(url.searchParams.get("status"), statuses, "status"),
    query: url.searchParams.get("q")?.trim().slice(0, 100) || undefined,
    categoryId: categoryId ? uuidParam.parse(categoryId) : undefined,
  });
  return apiData(result.data, {
    page: { nextCursor: result.nextCursor },
    headers: ADMIN_HEADERS,
  });
});

export const POST = withApiErrors(async (request) => {
  const principal = await authorizeAdminMutation(request, "terms.manage", "ADMIN_TERM", {
    maxBytes: 512 * 1_024,
  });
  const input = await readJson(request, termCreateSchema, { maxBytes: 512 * 1_024 });
  if (input.sources.some(({ verificationStatus }) => verificationStatus !== "UNVERIFIED")) {
    await authorizeAdmin(request, "terms.review");
  }
  return apiData(await adminContent.createTerm(principal.userId, input), {
    status: 201,
    headers: ADMIN_HEADERS,
  });
});
