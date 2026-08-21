import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createCatalogService } from "@/server/services/catalog-service";

const querySchema = z.object({
  locale: z.enum(["uk", "en"]).default("uk"),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  partOfSpeech: z
    .enum(["NOUN", "VERB", "ADJECTIVE", "ADVERB", "PHRASE", "ABBREVIATION", "PROPER_NOUN", "OTHER"])
    .optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(["alphabetical", "difficulty", "recent"]).default("alphabetical"),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = withApiErrors(async (request) => {
  const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const result = await createCatalogService(prisma).listTerms({
    locale: input.locale,
    query: input.q,
    category: input.category,
    partOfSpeech: input.partOfSpeech,
    difficulty: input.difficulty,
    sort: input.sort,
    cursor: input.cursor,
    limit: input.limit,
  });
  return apiData(result.data, {
    page: { cursor: input.cursor ?? null, nextCursor: result.nextCursor, limit: input.limit },
  });
});
