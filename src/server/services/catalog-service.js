import { notFound } from "@/server/services/errors";
import { normalizeAnswer } from "@/lib/validation/answer";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function identifierWhere(identifier) {
  return UUID_PATTERN.test(identifier) ? { id: identifier } : { slug: identifier };
}

function localize(record, locale, field) {
  const suffix = locale === "en" ? "En" : "Uk";
  return record[`${field}${suffix}`] ?? null;
}

function mapCategory(category, locale) {
  return {
    id: category.id,
    slug: category.slug,
    name: localize(category, locale, "name"),
    description: localize(category, locale, "description"),
    targetTermCount: category.targetTermCount,
    publishedTermCount: category._count?.terms ?? 0,
    publishedLessonCount: category._count?.lessons ?? 0,
  };
}

function mapTerm(term, locale) {
  const ownLocale = locale === "en" ? "EN" : "UK";
  const otherLocale = ownLocale === "EN" ? "UK" : "EN";
  const primary = (targetLocale) =>
    term.variants.find((variant) => variant.locale === targetLocale && variant.isPrimary)?.value ??
    null;
  const definition = (targetLocale) =>
    term.definitions.find((item) => item.locale === targetLocale) ?? null;

  return {
    id: term.id,
    slug: term.slug,
    primary: primary(ownLocale),
    translation: primary(otherLocale),
    english: primary("EN"),
    ukrainian: primary("UK"),
    partOfSpeech: term.partOfSpeech.toLocaleLowerCase("en-US"),
    difficulty: term.difficulty,
    origin: term.origin,
    isBeta: term.isBeta,
    status: term.status,
    publishedAt: term.publishedAt,
    variants: term.variants.map((variant) => ({
      id: variant.id,
      locale: variant.locale.toLocaleLowerCase("en-US"),
      kind: variant.kind,
      value: variant.value,
      isPrimary: variant.isPrimary,
    })),
    definition: definition(ownLocale),
    definitions: term.definitions,
    categories: term.categories.map(({ category, isPrimary }) => ({
      id: category.id,
      slug: category.slug,
      name: localize(category, locale, "name"),
      isPrimary,
    })),
    sources: term.sources.map(({ source, verificationStatus, checkedAt }) => ({
      id: source.id,
      url: source.exactUrl,
      title: source.title,
      publisher: source.publisher,
      verificationStatus,
      checkedAt,
    })),
    audio: term.audioAssets.map((asset) => ({
      id: asset.id,
      url: `/api/v1/audio/${asset.id}`,
      locale: asset.locale.toLocaleLowerCase("en-US"),
      kind: asset.kind,
      provider: asset.provider,
      durationMs: asset.durationMs,
    })),
  };
}

const termInclude = {
  variants: { orderBy: [{ locale: "asc" }, { isPrimary: "desc" }, { value: "asc" }] },
  definitions: true,
  categories: { include: { category: true }, orderBy: { isPrimary: "desc" } },
  sources: {
    include: { source: true },
    orderBy: { isPrimary: "desc" },
  },
  audioAssets: { where: { archivedAt: null, isPrimary: true } },
};

function termOrderBy(sort) {
  return sort === "difficulty"
    ? [{ difficulty: "asc" }, { slug: "asc" }, { id: "asc" }]
    : sort === "recent"
      ? [{ publishedAt: "desc" }, { id: "asc" }]
      : [{ slug: "asc" }, { id: "asc" }];
}

function publishedTermWhere({ locale = "uk", query, category, partOfSpeech, difficulty } = {}) {
  return {
    status: "PUBLISHED",
    archivedAt: null,
    ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
    ...(partOfSpeech ? { partOfSpeech } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(query
      ? {
          variants: {
            some: {
              normalizedValue: {
                contains: normalizeAnswer(query, locale),
                mode: "insensitive",
              },
            },
          },
        }
      : {}),
  };
}

export function createCatalogService(db) {
  async function listCategories({ locale = "uk" } = {}) {
    const categories = await db.category.findMany({
      where: { archivedAt: null },
      orderBy: [{ displayOrder: "asc" }, { slug: "asc" }],
      include: {
        _count: {
          select: {
            terms: { where: { term: { status: "PUBLISHED", archivedAt: null } } },
            lessons: { where: { status: "PUBLISHED", archivedAt: null } },
          },
        },
      },
    });
    return categories.map((category) => mapCategory(category, locale));
  }

  async function getCategory(slug, { locale = "uk" } = {}) {
    const category = await db.category.findFirst({
      where: { slug, archivedAt: null },
      include: {
        _count: {
          select: {
            terms: { where: { term: { status: "PUBLISHED", archivedAt: null } } },
            lessons: { where: { status: "PUBLISHED", archivedAt: null } },
          },
        },
        lessons: {
          where: { status: "PUBLISHED", archivedAt: null },
          orderBy: [{ difficulty: "asc" }, { publishedAt: "asc" }],
          include: { _count: { select: { terms: true } } },
        },
      },
    });
    if (!category) throw notFound("Категорію не знайдено.");
    return {
      ...mapCategory(category, locale),
      lessons: category.lessons.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: localize(lesson, locale, "title"),
        description: localize(lesson, locale, "description"),
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        termCount: lesson._count.terms,
      })),
    };
  }

  async function listTerms({
    locale = "uk",
    query,
    category,
    partOfSpeech,
    difficulty,
    sort = "alphabetical",
    cursor,
    limit = 20,
  } = {}) {
    const terms = await db.term.findMany({
      where: publishedTermWhere({ locale, query, category, partOfSpeech, difficulty }),
      orderBy: termOrderBy(sort),
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: termInclude,
    });
    const hasMore = terms.length > limit;
    const page = hasMore ? terms.slice(0, limit) : terms;
    return {
      data: page.map((term) => mapTerm(term, locale)),
      nextCursor: hasMore ? page.at(-1).id : null,
    };
  }

  async function getTerm(identifier, options = {}) {
    const { locale = "uk", sort = "alphabetical" } = options;
    const term = await db.term.findFirst({
      where: {
        status: "PUBLISHED",
        archivedAt: null,
        ...identifierWhere(identifier),
      },
      include: termInclude,
    });
    if (!term) throw notFound("Термін не знайдено.");
    const context = await db.term.findMany({
      where: publishedTermWhere(options),
      orderBy: termOrderBy(sort),
      select: { id: true },
    });
    const position = context.findIndex(({ id }) => id === term.id);
    return {
      ...mapTerm(term, locale),
      neighbors:
        position === -1
          ? { previous: null, next: null }
          : {
              previous: context[position - 1]?.id ?? null,
              next: context[position + 1]?.id ?? null,
            },
    };
  }

  async function listLessons({ locale = "uk", category } = {}) {
    const lessons = await db.lesson.findMany({
      where: {
        status: "PUBLISHED",
        archivedAt: null,
        ...(category ? { category: { slug: category } } : {}),
      },
      orderBy: [{ difficulty: "asc" }, { publishedAt: "asc" }],
      include: { category: true, _count: { select: { terms: true } } },
    });
    return lessons.map((lesson) => ({
      id: lesson.id,
      slug: lesson.slug,
      title: localize(lesson, locale, "title"),
      description: localize(lesson, locale, "description"),
      category: lesson.category ? mapCategory(lesson.category, locale) : null,
      difficulty: lesson.difficulty,
      estimatedMinutes: lesson.estimatedMinutes,
      termCount: lesson._count.terms,
    }));
  }

  async function getLesson(identifier, { locale = "uk" } = {}) {
    const lesson = await db.lesson.findFirst({
      where: {
        status: "PUBLISHED",
        archivedAt: null,
        ...identifierWhere(identifier),
      },
      include: {
        category: true,
        _count: { select: { terms: true } },
        terms: {
          orderBy: { position: "asc" },
          include: { term: { include: termInclude } },
        },
      },
    });
    if (!lesson) throw notFound("Урок не знайдено.");
    return {
      id: lesson.id,
      slug: lesson.slug,
      title: localize(lesson, locale, "title"),
      description: localize(lesson, locale, "description"),
      category: lesson.category ? mapCategory(lesson.category, locale) : null,
      difficulty: lesson.difficulty,
      estimatedMinutes: lesson.estimatedMinutes,
      termCount: lesson._count.terms,
      terms: lesson.terms
        .filter(({ term }) => term.status === "PUBLISHED" && !term.archivedAt)
        .map(({ term }) => mapTerm(term, locale)),
    };
  }

  return { listCategories, getCategory, listTerms, getTerm, listLessons, getLesson };
}
