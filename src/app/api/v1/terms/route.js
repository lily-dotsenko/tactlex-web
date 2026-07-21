import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createCatalogService } from "@/server/services/catalog-service";

const querySchema = z.object({
  locale: z.enum(["uk", "en"]).default("uk"),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = withApiErrors(async (request) => {
  const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const result = await createCatalogService(prisma).listTerms({
    locale: input.locale,
    query: input.q,
    category: input.category,
    cursor: input.cursor,
    limit: input.limit,
  });
  return apiData(result.data, {
    page: { cursor: input.cursor ?? null, nextCursor: result.nextCursor, limit: input.limit },
  });
});
