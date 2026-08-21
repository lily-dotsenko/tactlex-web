import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const title = z.string().trim().min(1).max(300);
const optionalText = (max) => z.string().trim().max(max).nullable().optional();

export const categoryCreateSchema = z
  .object({
    slug: slug.max(80),
    nameUk: z.string().trim().min(1).max(160),
    nameEn: z.string().trim().min(1).max(160),
    descriptionUk: optionalText(2_000),
    descriptionEn: optionalText(2_000),
    targetTermCount: z.number().int().min(1).max(10_000),
    displayOrder: z.number().int().min(0).max(10_000).default(0),
  })
  .strict();

export const categoryUpdateSchema = categoryCreateSchema
  .omit({ slug: true })
  .partial()
  .extend({ archived: z.boolean().optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const categoryReorderSchema = z
  .object({
    items: z
      .array(z.object({ id: z.uuid(), displayOrder: z.number().int().min(0).max(10_000) }).strict())
      .min(1)
      .max(500),
  })
  .strict()
  .refine(({ items }) => new Set(items.map(({ id }) => id)).size === items.length, {
    message: "Category identifiers must be unique.",
    path: ["items"],
  });

const variantSchema = z
  .object({
    locale: z.enum(["UK", "EN"]),
    kind: z.enum(["PRIMARY", "SYNONYM", "ABBREVIATION", "INFLECTION", "HYPHEN_VARIANT"]),
    value: z.string().trim().min(1).max(200),
    isPrimary: z.boolean().default(false),
    isAcceptedAnswer: z.boolean().default(true),
  })
  .strict();

const definitionSchema = z
  .object({
    locale: z.enum(["UK", "EN"]),
    shortDefinition: optionalText(2_000),
    example: optionalText(2_000),
    contextNote: optionalText(2_000),
  })
  .strict();

const termCategorySchema = z
  .object({ categoryId: z.uuid(), isPrimary: z.boolean().default(false) })
  .strict();

const contextDefinitionSchema = definitionSchema.extend({ categoryId: z.uuid() }).strict();

const termSourceSchema = z
  .object({
    sourceId: z.uuid().optional(),
    exactUrl: z.url().max(2_000).optional(),
    title: title.optional(),
    publisher: optionalText(200),
    sourceType: z
      .enum(["OFFICIAL_UKRAINIAN", "NATO", "DOD", "DOCTRINE", "DICTIONARY", "MEDICAL", "OTHER"])
      .optional(),
    verificationStatus: z.enum(["UNVERIFIED", "VERIFIED", "REJECTED"]).default("UNVERIFIED"),
    citationNote: optionalText(2_000),
    isPrimary: z.boolean().default(false),
  })
  .strict()
  .refine((value) => value.sourceId || (value.exactUrl && value.title && value.sourceType), {
    message: "An existing sourceId or complete source metadata is required.",
  });

const termCollections = {
  variants: z.array(variantSchema).max(100),
  definitions: z.array(definitionSchema).max(2),
  contextDefinitions: z.array(contextDefinitionSchema).max(40),
  categories: z.array(termCategorySchema).max(20),
  sources: z.array(termSourceSchema).max(30),
};

export const termCreateSchema = z
  .object({
    slug,
    partOfSpeech: z.enum([
      "NOUN",
      "VERB",
      "ADJECTIVE",
      "ADVERB",
      "PHRASE",
      "ABBREVIATION",
      "PROPER_NOUN",
      "OTHER",
    ]),
    difficulty: z.number().int().min(1).max(5),
    origin: z.enum(["HUMAN", "AI_ASSISTED", "CSV_IMPORT", "SEED_DEMO"]).default("HUMAN"),
    isDemo: z.boolean().default(false),
    variants: termCollections.variants.default([]),
    definitions: termCollections.definitions.default([]),
    contextDefinitions: termCollections.contextDefinitions.default([]),
    categories: termCollections.categories.default([]),
    sources: termCollections.sources.default([]),
    changeNote: optionalText(1_000),
  })
  .strict();

export const termUpdateSchema = z
  .object({
    slug: slug.optional(),
    partOfSpeech: termCreateSchema.shape.partOfSpeech.optional(),
    difficulty: z.number().int().min(1).max(5).optional(),
    origin: z.enum(["HUMAN", "AI_ASSISTED", "CSV_IMPORT", "SEED_DEMO"]).optional(),
    isDemo: z.boolean().optional(),
    variants: termCollections.variants.optional(),
    definitions: termCollections.definitions.optional(),
    contextDefinitions: termCollections.contextDefinitions.optional(),
    categories: termCollections.categories.optional(),
    sources: termCollections.sources.optional(),
    changeNote: z.string().trim().min(1).max(1_000),
  })
  .strict();

export const termTransitionSchema = z
  .object({
    status: z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]),
    note: optionalText(2_000),
  })
  .strict();

export const reviewDecisionSchema = z
  .object({
    decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
    note: optionalText(2_000),
  })
  .strict()
  .refine((value) => value.decision === "APPROVED" || Boolean(value.note), {
    message: "A note is required when content is not approved.",
    path: ["note"],
  });

const lessonFields = {
  slug,
  categoryId: z.uuid().nullable().optional(),
  titleUk: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  descriptionUk: optionalText(2_000),
  descriptionEn: optionalText(2_000),
  difficulty: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().min(1).max(120),
  termIds: z.array(z.uuid()).max(12).default([]),
};

export const lessonCreateSchema = z.object(lessonFields).strict();
export const lessonUpdateSchema = z
  .object({
    slug: slug.optional(),
    categoryId: lessonFields.categoryId,
    titleUk: lessonFields.titleUk.optional(),
    titleEn: lessonFields.titleEn.optional(),
    descriptionUk: optionalText(2_000),
    descriptionEn: optionalText(2_000),
    difficulty: lessonFields.difficulty.optional(),
    estimatedMinutes: lessonFields.estimatedMinutes.optional(),
    termIds: z.array(z.uuid()).max(12).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const lessonStatusSchema = z
  .object({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) })
  .strict();

const importJsonRow = z.record(z.string(), z.unknown());
export const importPreviewSchema = z
  .object({
    format: z.enum(["csv", "json"]),
    fileName: z.string().trim().min(1).max(255),
    content: z.union([z.string(), z.array(importJsonRow).max(500)]),
  })
  .strict()
  .refine(
    ({ format, content }) =>
      (format === "csv" && typeof content === "string") ||
      (format === "json" && Array.isArray(content)),
    { message: "Import content does not match its declared format.", path: ["content"] },
  );

export const importCommitSchema = importPreviewSchema.safeExtend({
  expectedChecksum: z.string().regex(/^[a-f0-9]{64}$/u),
});

export const userAdminUpdateSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    roleCodes: z
      .array(z.enum(["USER", "ADMIN"]))
      .min(1)
      .max(2)
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0)
  .refine((value) => !value.roleCodes || value.roleCodes.includes("USER"), {
    message: "Every account must retain the USER role.",
    path: ["roleCodes"],
  });

export const reportDecisionSchema = z
  .object({
    status: z.enum(["IN_REVIEW", "RESOLVED", "DISMISSED"]),
    resolutionNote: optionalText(2_000),
  })
  .strict()
  .refine((value) => value.status === "IN_REVIEW" || Boolean(value.resolutionNote), {
    message: "A resolution note is required.",
    path: ["resolutionNote"],
  });

const achievementRuleSchema = z
  .object({
    metric: z.enum([
      "LESSONS_COMPLETED",
      "CONSECUTIVE_CORRECT",
      "PERFECT_LESSONS",
      "MASTERED_TERMS",
      "MASTERED_TERMS_IN_CATEGORY",
      "CURRENT_STREAK",
      "PREVIOUSLY_MISSED_CORRECT",
      "ALL_CATEGORIES_LEVEL",
    ]),
    operator: z.enum(["EQUALS", "GREATER_THAN_OR_EQUAL"]).default("GREATER_THAN_OR_EQUAL"),
    threshold: z.number().int().min(1).max(1_000_000),
    categoryId: z.uuid().nullable().optional(),
    window: z.enum(["ALL_TIME", "CURRENT_STREAK", "SINGLE_SESSION"]).default("ALL_TIME"),
    groupNumber: z.number().int().min(1).max(100).default(1),
  })
  .strict();

const achievementFields = {
  code: slug.max(100),
  nameUk: z.string().trim().min(1).max(160),
  nameEn: z.string().trim().min(1).max(160),
  descriptionUk: z.string().trim().min(1).max(2_000),
  descriptionEn: z.string().trim().min(1).max(2_000),
  iconKey: z.string().trim().min(1).max(80),
  rewardXp: z.number().int().min(0).max(10_000).default(0),
  displayOrder: z.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
  rules: z.array(achievementRuleSchema).min(1).max(20),
};

export const achievementCreateSchema = z.object(achievementFields).strict();
export const achievementUpdateSchema = z
  .object({
    nameUk: achievementFields.nameUk.optional(),
    nameEn: achievementFields.nameEn.optional(),
    descriptionUk: achievementFields.descriptionUk.optional(),
    descriptionEn: achievementFields.descriptionEn.optional(),
    iconKey: achievementFields.iconKey.optional(),
    rewardXp: z.number().int().min(0).max(10_000).optional(),
    displayOrder: z.number().int().min(0).max(10_000).optional(),
    isActive: z.boolean().optional(),
    rules: z.array(achievementRuleSchema).min(1).max(20).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const audioMetadataSchema = z
  .object({
    locale: z.enum(["UK", "EN"]).default("EN"),
    kind: z.enum(["HUMAN_RECORDING", "SYNTHETIC"]).default("HUMAN_RECORDING"),
    attribution: optionalText(300),
    isPrimary: z.boolean().default(false),
  })
  .strict();
