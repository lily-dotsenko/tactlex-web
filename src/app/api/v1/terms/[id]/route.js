import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createCatalogService } from "@/server/services/catalog-service";

export const GET = withApiErrors(async (request, { params }) => {
  const { id } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "uk";
  return apiData(await createCatalogService(prisma).getTerm(id, { locale }));
});
