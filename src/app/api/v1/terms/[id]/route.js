import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createCatalogService } from "@/server/services/catalog-service";

export const GET = withApiErrors(async (request, { params }) => {
  const { id } = await params;
  const query = z
    .object({
      locale: z.enum(["uk", "en"]).default("uk"),
      q: z.string().trim().max(100).optional(),
      category: z.string().trim().max(80).optional(),
      partOfSpeech: z
        .enum([
          "NOUN",
          "VERB",
          "ADJECTIVE",
          "ADVERB",
          "PHRASE",
          "ABBREVIATION",
          "PROPER_NOUN",
          "OTHER",
        ])
        .optional(),
      difficulty: z.coerce.number().int().min(1).max(5).optional(),
      sort: z.enum(["alphabetical", "difficulty", "recent"]).default("alphabetical"),
    })
    .parse(Object.fromEntries(new URL(request.url).searchParams));
  return apiData(
    await createCatalogService(prisma).getTerm(id, {
      locale: query.locale,
      query: query.q,
      category: query.category,
      partOfSpeech: query.partOfSpeech,
      difficulty: query.difficulty,
      sort: query.sort,
    }),
  );
});
