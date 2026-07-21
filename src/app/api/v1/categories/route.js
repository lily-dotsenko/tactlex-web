import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createCatalogService } from "@/server/services/catalog-service";

const querySchema = z.object({ locale: z.enum(["uk", "en"]).default("uk") });

export const GET = withApiErrors(async (request) => {
  const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return apiData(await createCatalogService(prisma).listCategories(input));
});
