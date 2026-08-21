import { createHash } from "node:crypto";

import { normalizeAnswer } from "@/lib/validation/answer";
import { parseTermCsv, parseTermRows } from "@/server/services/content-import";
import { ContentWorkflowError, assertContentTransition } from "@/server/services/content-workflow";
import { DomainError, notFound } from "@/server/services/errors";

const TERM_INCLUDE = {
  variants: { orderBy: [{ locale: "asc" }, { isPrimary: "desc" }, { value: "asc" }] },
  definitions: { orderBy: { locale: "asc" } },
  categories: {
    include: { category: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  },
  sources: {
    include: { source: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  },
  reviews: { orderBy: { submittedAt: "desc" } },
  revisions: { orderBy: { revisionNumber: "desc" }, take: 20 },
  audioAssets: { where: { archivedAt: null }, orderBy: { createdAt: "desc" } },
};

function isUniqueError(error) {
  return error?.code === "P2002";
}

function audit(db, actorUserId, action, targetType, targetId, metadata = {}) {
  const safeMetadata = JSON.parse(JSON.stringify(metadata));
  return db.auditLog.create({
    data: { actorUserId, action, targetType, targetId, metadata: safeMetadata },
  });
}

function assertUniqueCollection(items, getKey, label) {
  const keys = items.map(getKey);
  if (new Set(keys).size !== keys.length) {
    throw new DomainError("DUPLICATE_CONTENT_FIELD", `${label} містить повтори.`, 422);
  }
}

function validateTermCollections(input) {
  if (input.variants) {
    assertUniqueCollection(
      input.variants,
      (variant) =>
        `${variant.locale}:${normalizeAnswer(variant.value, variant.locale === "EN" ? "en" : "uk")}`,
      "Варіанти терміна",
    );
    for (const locale of ["UK", "EN"]) {
      const primary = input.variants.filter(
        (variant) => variant.locale === locale && variant.isPrimary,
      );
      if (primary.length > 1) {
        throw new DomainError(
          "MULTIPLE_PRIMARY_VARIANTS",
          `Для локалі ${locale} дозволено лише один основний варіант.`,
          422,
        );
      }
      if (primary.some((variant) => variant.kind !== "PRIMARY")) {
        throw new DomainError(
          "INVALID_PRIMARY_VARIANT",
          "Основний варіант повинен мати kind PRIMARY.",
          422,
        );
      }
    }
  }
  if (input.definitions) {
    assertUniqueCollection(input.definitions, ({ locale }) => locale, "Визначення");
  }
  if (input.categories) {
    assertUniqueCollection(input.categories, ({ categoryId }) => categoryId, "Категорії");
    if (input.categories.filter(({ isPrimary }) => isPrimary).length > 1) {
      throw new DomainError(
        "MULTIPLE_PRIMARY_CATEGORIES",
        "Термін може мати лише одну основну категорію.",
        422,
      );
    }
  }
  if (input.sources) {
    assertUniqueCollection(
      input.sources,
      (source) => source.sourceId ?? source.exactUrl,
      "Джерела",
    );
    if (input.sources.filter(({ isPrimary }) => isPrimary).length > 1) {
      throw new DomainError(
        "MULTIPLE_PRIMARY_SOURCES",
        "Термін може мати лише одне основне джерело.",
        422,
      );
    }
  }
}

async function assertCategoriesExist(db, categoryIds) {
  if (!categoryIds.length) return;
  const count = await db.category.count({
    where: { id: { in: [...new Set(categoryIds)] }, archivedAt: null },
  });
  if (count !== new Set(categoryIds).size) {
    throw new DomainError("INVALID_CATEGORY", "Одну або кілька категорій не знайдено.", 422);
  }
}

async function replaceTermCollections(db, termId, input, actorUserId, now) {
  validateTermCollections(input);

  if (input.variants) {
    const existingVariants = await db.termVariant.findMany({ where: { termId } });
    const existingByKey = new Map(
      existingVariants.map((variant) => [`${variant.locale}:${variant.normalizedValue}`, variant]),
    );
    const retainedIds = [];

    // Remove primary/accepted flags first so changing the primary variant cannot
    // violate the partial unique index. Historical session rows keep their IDs.
    await db.termVariant.updateMany({
      where: { termId },
      data: { isPrimary: false, isAcceptedAnswer: false },
    });

    for (const variant of input.variants) {
      const normalizedValue = normalizeAnswer(variant.value, variant.locale === "EN" ? "en" : "uk");
      const existing = existingByKey.get(`${variant.locale}:${normalizedValue}`);
      if (existing) {
        retainedIds.push(existing.id);
        await db.termVariant.update({
          where: { id: existing.id },
          data: { ...variant, normalizedValue },
        });
      } else {
        const created = await db.termVariant.create({
          data: { termId, ...variant, normalizedValue },
        });
        retainedIds.push(created.id);
      }
    }

    const obsoleteIds = existingVariants
      .filter(({ id }) => !retainedIds.includes(id))
      .map(({ id }) => id);
    if (obsoleteIds.length) {
      await db.termVariant.deleteMany({
        where: {
          id: { in: obsoleteIds },
          acceptedAnswers: { none: {} },
          promptItems: { none: {} },
        },
      });
    }
  }

  if (input.definitions) {
    await db.termDefinition.deleteMany({ where: { termId } });
    if (input.definitions.length) {
      await db.termDefinition.createMany({
        data: input.definitions.map((definition) => ({ termId, ...definition })),
      });
    }
  }

  if (input.categories) {
    await assertCategoriesExist(
      db,
      input.categories.map(({ categoryId }) => categoryId),
    );
    await db.termCategory.deleteMany({ where: { termId } });
    if (input.categories.length) {
      await db.termCategory.createMany({
        data: input.categories.map((category) => ({ termId, ...category })),
      });
    }
  }

  if (input.sources) {
    await db.termSource.deleteMany({ where: { termId } });
    for (const sourceInput of input.sources) {
      let source;
      if (sourceInput.sourceId) {
        source = await db.source.findUnique({ where: { id: sourceInput.sourceId } });
        if (!source) throw notFound("Джерело не знайдено.");
      } else {
        source = await db.source.upsert({
          where: { exactUrl: sourceInput.exactUrl },
          update: {
            title: sourceInput.title,
            publisher: sourceInput.publisher ?? null,
            sourceType: sourceInput.sourceType,
          },
          create: {
            exactUrl: sourceInput.exactUrl,
            title: sourceInput.title,
            publisher: sourceInput.publisher ?? null,
            sourceType: sourceInput.sourceType,
          },
        });
      }
      const checked = sourceInput.verificationStatus !== "UNVERIFIED";
      await db.termSource.create({
        data: {
          termId,
          sourceId: source.id,
          verificationStatus: sourceInput.verificationStatus,
          checkedAt: checked ? now : null,
          checkedById: checked ? actorUserId : null,
          citationNote: sourceInput.citationNote ?? null,
          isPrimary: sourceInput.isPrimary,
        },
      });
    }
  }
}

function revisionSnapshot(term) {
  return {
    slug: term.slug,
    partOfSpeech: term.partOfSpeech,
    difficulty: term.difficulty,
    origin: term.origin,
    isDemo: term.isDemo,
    variants: term.variants.map(
      ({ locale, kind, value, normalizedValue, isPrimary, isAcceptedAnswer }) => ({
        locale,
        kind,
        value,
        normalizedValue,
        isPrimary,
        isAcceptedAnswer,
      }),
    ),
    definitions: term.definitions.map(({ locale, shortDefinition, example, contextNote }) => ({
      locale,
      shortDefinition,
      example,
      contextNote,
    })),
    categories: term.categories.map(({ categoryId, isPrimary }) => ({ categoryId, isPrimary })),
    sources: term.sources.map(
      ({
        sourceId,
        verificationStatus,
        checkedAt,
        checkedById,
        citationNote,
        isPrimary,
        source,
      }) => ({
        sourceId,
        exactUrl: source.exactUrl,
        verificationStatus,
        checkedAt: checkedAt?.toISOString() ?? null,
        checkedById,
        citationNote,
        isPrimary,
      }),
    ),
  };
}

async function createRevision(db, term, actorUserId, changeNote) {
  const snapshot = revisionSnapshot(term);
  const checksum = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  return db.contentRevision.create({
    data: {
      termId: term.id,
      revisionNumber: term.currentRevision,
      authorUserId: actorUserId,
      checksum,
      snapshot,
      changeNote: changeNote ?? null,
    },
  });
}

async function findTerm(db, id) {
  const term = await db.term.findUnique({ where: { id }, include: TERM_INCLUDE });
  if (!term) throw notFound("Термін не знайдено.");
  return term;
}

function mapWorkflowError(error) {
  if (!(error instanceof ContentWorkflowError)) throw error;
  throw new DomainError(error.code, error.message, 409, error.details);
}

function importChecksum(format, content) {
  const normalized = format === "csv" ? content : JSON.stringify(content);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

function importPreview(format, content) {
  const parsed = format === "csv" ? parseTermCsv(content) : parseTermRows(content);
  return { ...parsed, checksum: importChecksum(format, content) };
}

export function createAdminContentService(db, { clock = () => new Date() } = {}) {
  async function listCategories({ includeArchived = false } = {}) {
    return db.category.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: [{ displayOrder: "asc" }, { slug: "asc" }],
      include: { _count: { select: { terms: true, lessons: true } } },
    });
  }

  async function getCategory(id) {
    const category = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { terms: true, lessons: true } } },
    });
    if (!category) throw notFound("Категорію не знайдено.");
    return category;
  }

  async function createCategory(actorUserId, input) {
    try {
      return await db.$transaction(async (transaction) => {
        const category = await transaction.category.create({ data: input });
        await audit(transaction, actorUserId, "CATEGORY_CREATED", "CATEGORY", category.id);
        return category;
      });
    } catch (error) {
      if (isUniqueError(error)) {
        throw new DomainError("CATEGORY_SLUG_IN_USE", "Такий slug категорії вже існує.", 409);
      }
      throw error;
    }
  }

  async function updateCategory(actorUserId, id, input) {
    await getCategory(id);
    const { archived, ...data } = input;
    if (archived === true) {
      const linkedPublished = await db.termCategory.count({
        where: { categoryId: id, term: { status: "PUBLISHED", archivedAt: null } },
      });
      const publishedLessons = await db.lesson.count({
        where: { categoryId: id, status: "PUBLISHED", archivedAt: null },
      });
      if (linkedPublished || publishedLessons) {
        throw new DomainError(
          "CATEGORY_IN_USE",
          "Спочатку архівуйте опублікований контент цієї категорії.",
          409,
        );
      }
    }
    if (archived !== undefined) data.archivedAt = archived ? clock() : null;
    return db.$transaction(async (transaction) => {
      const category = await transaction.category.update({ where: { id }, data });
      await audit(transaction, actorUserId, "CATEGORY_UPDATED", "CATEGORY", id, {
        archived: archived ?? undefined,
      });
      return category;
    });
  }

  async function reorderCategories(actorUserId, items) {
    return db.$transaction(async (transaction) => {
      const count = await transaction.category.count({
        where: { id: { in: items.map(({ id }) => id) } },
      });
      if (count !== items.length) throw notFound("Одну або кілька категорій не знайдено.");
      await Promise.all(
        items.map(({ id, displayOrder }) =>
          transaction.category.update({ where: { id }, data: { displayOrder } }),
        ),
      );
      await audit(transaction, actorUserId, "CATEGORIES_REORDERED", "CATEGORY", null, {
        count: items.length,
      });
      return transaction.category.findMany({ orderBy: [{ displayOrder: "asc" }, { slug: "asc" }] });
    });
  }

  async function listTerms({ status, query, categoryId, cursor, limit = 50 } = {}) {
    const terms = await db.term.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(categoryId ? { categories: { some: { categoryId } } } : {}),
        ...(query
          ? {
              OR: [
                { slug: { contains: query, mode: "insensitive" } },
                { variants: { some: { value: { contains: query, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: TERM_INCLUDE,
    });
    const hasMore = terms.length > limit;
    const page = hasMore ? terms.slice(0, limit) : terms;
    return { data: page, nextCursor: hasMore ? page.at(-1).id : null };
  }

  async function getTerm(id) {
    return findTerm(db, id);
  }

  async function createTerm(actorUserId, input) {
    const { variants, definitions, categories, sources, changeNote, ...termData } = input;
    try {
      return await db.$transaction(async (transaction) => {
        const term = await transaction.term.create({
          data: {
            ...termData,
            status: "DRAFT",
            createdById: actorUserId,
            updatedById: actorUserId,
          },
        });
        await replaceTermCollections(
          transaction,
          term.id,
          { variants, definitions, categories, sources },
          actorUserId,
          clock(),
        );
        const complete = await findTerm(transaction, term.id);
        await createRevision(transaction, complete, actorUserId, changeNote ?? "Initial draft");
        await audit(transaction, actorUserId, "TERM_CREATED", "TERM", term.id, {
          origin: term.origin,
        });
        return findTerm(transaction, term.id);
      });
    } catch (error) {
      if (isUniqueError(error)) {
        throw new DomainError(
          "TERM_CONFLICT",
          "Slug або варіант терміна вже використовується.",
          409,
        );
      }
      throw error;
    }
  }

  async function updateTerm(actorUserId, id, input) {
    const current = await findTerm(db, id);
    if (current.status === "ARCHIVED") {
      throw new DomainError("TERM_ARCHIVED", "Архівований термін не можна редагувати.", 409);
    }
    const { variants, definitions, categories, sources, changeNote, ...termData } = input;
    const nextRevision = current.currentRevision + 1;
    try {
      return await db.$transaction(async (transaction) => {
        await transaction.contentReview.updateMany({
          where: { termId: id, status: "PENDING" },
          data: { status: "SUPERSEDED", decidedAt: clock(), decidedById: actorUserId },
        });
        await transaction.term.update({
          where: { id },
          data: {
            ...termData,
            status: "DRAFT",
            currentRevision: nextRevision,
            updatedById: actorUserId,
            approvedById: null,
            approvedAt: null,
            publishedById: null,
            publishedAt: null,
            archivedAt: null,
            isBeta: false,
          },
        });
        await replaceTermCollections(
          transaction,
          id,
          { variants, definitions, categories, sources },
          actorUserId,
          clock(),
        );
        const complete = await findTerm(transaction, id);
        await createRevision(transaction, complete, actorUserId, changeNote);
        await audit(transaction, actorUserId, "TERM_REVISED", "TERM", id, {
          revisionNumber: nextRevision,
          previousStatus: current.status,
        });
        return findTerm(transaction, id);
      });
    } catch (error) {
      if (isUniqueError(error)) {
        throw new DomainError(
          "TERM_CONFLICT",
          "Slug або варіант терміна вже використовується.",
          409,
        );
      }
      throw error;
    }
  }

  async function transitionTerm(actorUserId, id, nextStatus, note) {
    const term = await findTerm(db, id);
    if (nextStatus === "APPROVED") {
      throw new DomainError(
        "REVIEW_DECISION_REQUIRED",
        "Затвердження виконується через рішення рецензента.",
        409,
      );
    }
    try {
      assertContentTransition(term, nextStatus);
    } catch (error) {
      mapWorkflowError(error);
    }
    const now = clock();
    return db.$transaction(async (transaction) => {
      const data = { status: nextStatus, updatedById: actorUserId };
      if (nextStatus === "PUBLISHED") {
        data.publishedAt = now;
        data.publishedById = actorUserId;
        data.archivedAt = null;
        data.isBeta = false;
      }
      if (nextStatus === "ARCHIVED") data.archivedAt = now;
      if (nextStatus === "DRAFT") {
        data.approvedAt = null;
        data.approvedById = null;
        data.publishedAt = null;
        data.publishedById = null;
        data.archivedAt = null;
        data.isBeta = false;
      }
      if (term.status === "IN_REVIEW" && nextStatus === "DRAFT") {
        await transaction.contentReview.updateMany({
          where: {
            termId: id,
            revisionNumber: term.currentRevision,
            status: "PENDING",
          },
          data: {
            status: "SUPERSEDED",
            decidedAt: now,
            decidedById: actorUserId,
            ...(note ? { note } : {}),
          },
        });
      }
      await transaction.term.update({ where: { id }, data });
      if (nextStatus === "IN_REVIEW") {
        await transaction.contentReview.create({
          data: {
            termId: id,
            revisionNumber: term.currentRevision,
            requestedById: actorUserId,
            note: note ?? null,
          },
        });
      }
      await audit(transaction, actorUserId, `TERM_${nextStatus}`, "TERM", id, {
        from: term.status,
        revisionNumber: term.currentRevision,
      });
      return findTerm(transaction, id);
    });
  }

  async function setTermDistractors(actorUserId, id, distractorIds) {
    const uniqueIds = [...new Set(distractorIds)];
    if (
      uniqueIds.length < 3 ||
      uniqueIds.length !== distractorIds.length ||
      uniqueIds.includes(id)
    ) {
      throw new DomainError(
        "INVALID_DISTRACTORS",
        "Термін повинен мати щонайменше три унікальні сторонні варіанти.",
        422,
      );
    }
    const count = await db.term.count({ where: { id: { in: uniqueIds } } });
    if (count !== uniqueIds.length) throw notFound("Один із термінів-відволікачів не знайдений.");
    return db.$transaction(async (transaction) => {
      await transaction.termDistractor.deleteMany({ where: { termId: id } });
      await transaction.termDistractor.createMany({
        data: uniqueIds.flatMap((distractorTermId) => [
          { termId: id, distractorTermId, direction: "EN_TO_UK" },
          { termId: id, distractorTermId, direction: "UK_TO_EN" },
        ]),
      });
      await audit(transaction, actorUserId, "TERM_DISTRACTORS_UPDATED", "TERM", id, {
        distractorTermIds: uniqueIds,
      });
      return { termId: id, distractorIds: uniqueIds };
    });
  }

  async function publishBetaTerm(actorUserId, id, note) {
    const term = await findTerm(db, id);
    const hasEnglish = term.variants.some(
      (variant) => variant.locale === "EN" && variant.isPrimary,
    );
    const hasUkrainian = term.variants.some(
      (variant) => variant.locale === "UK" && variant.isPrimary,
    );
    const hasDefinitions = ["EN", "UK"].every((locale) =>
      term.definitions.some(
        (definition) => definition.locale === locale && definition.shortDefinition?.trim(),
      ),
    );
    const hasSource = term.sources.some(({ source }) => /^https?:\/\//u.test(source.exactUrl));
    if (!hasEnglish || !hasUkrainian || !hasDefinitions || !term.categories.length || !hasSource) {
      throw new DomainError(
        "INCOMPLETE_BETA_CONTENT",
        "Beta-публікація потребує двомовного терміна, визначень, категорії та точного джерела.",
        422,
      );
    }
    const now = clock();
    return db.$transaction(async (transaction) => {
      await transaction.term.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          isBeta: true,
          updatedById: actorUserId,
          publishedById: actorUserId,
          publishedAt: now,
          archivedAt: null,
        },
      });
      await audit(transaction, actorUserId, "TERM_BETA_PUBLISHED", "TERM", id, {
        revisionNumber: term.currentRevision,
        note: note ?? null,
        sourceVerification: "UNVERIFIED",
      });
      return findTerm(transaction, id);
    });
  }

  async function listReviews({ status = "PENDING", assignedToId, cursor, limit = 50 } = {}) {
    const reviews = await db.contentReview.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(assignedToId ? { assignedToId } : {}),
      },
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        term: {
          include: {
            variants: { where: { isPrimary: true } },
            categories: { where: { isPrimary: true }, include: { category: true } },
          },
        },
        requestedBy: { select: { id: true, profile: { select: { nickname: true } } } },
        assignedTo: { select: { id: true, profile: { select: { nickname: true } } } },
      },
    });
    const hasMore = reviews.length > limit;
    const page = hasMore ? reviews.slice(0, limit) : reviews;
    return { data: page, nextCursor: hasMore ? page.at(-1).id : null };
  }

  async function decideReview(actorUserId, reviewId, decision, note) {
    const review = await db.contentReview.findUnique({
      where: { id: reviewId },
      include: { term: { include: TERM_INCLUDE } },
    });
    if (!review) throw notFound("Рецензію не знайдено.");
    if (review.status !== "PENDING") {
      throw new DomainError("REVIEW_ALREADY_DECIDED", "Цю рецензію вже завершено.", 409);
    }
    if (
      review.term.status !== "IN_REVIEW" ||
      review.revisionNumber !== review.term.currentRevision
    ) {
      await db.contentReview.update({
        where: { id: reviewId },
        data: { status: "SUPERSEDED", decidedAt: clock(), decidedById: actorUserId },
      });
      throw new DomainError("STALE_REVIEW", "Рецензія стосується застарілої версії.", 409);
    }
    if (decision === "APPROVED") {
      try {
        assertContentTransition(review.term, "APPROVED");
      } catch (error) {
        mapWorkflowError(error);
      }
    }
    const now = clock();
    return db.$transaction(async (transaction) => {
      const decided = await transaction.contentReview.update({
        where: { id: reviewId },
        data: {
          status: decision,
          decidedById: actorUserId,
          decidedAt: now,
          note: note ?? review.note,
        },
      });
      const approved = decision === "APPROVED";
      await transaction.term.update({
        where: { id: review.termId },
        data: {
          status: approved ? "APPROVED" : "DRAFT",
          updatedById: actorUserId,
          approvedById: approved ? actorUserId : null,
          approvedAt: approved ? now : null,
        },
      });
      await audit(transaction, actorUserId, `TERM_REVIEW_${decision}`, "TERM", review.termId, {
        reviewId,
        revisionNumber: review.revisionNumber,
      });
      return decided;
    });
  }

  async function listLessons({ status, cursor, limit = 50 } = {}) {
    const lessons = await db.lesson.findMany({
      where: status ? { status } : {},
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        category: true,
        terms: {
          orderBy: { position: "asc" },
          include: { term: { include: { variants: { where: { isPrimary: true } } } } },
        },
      },
    });
    const hasMore = lessons.length > limit;
    const page = hasMore ? lessons.slice(0, limit) : lessons;
    return { data: page, nextCursor: hasMore ? page.at(-1).id : null };
  }

  async function getLesson(id) {
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: {
        category: true,
        terms: {
          orderBy: { position: "asc" },
          include: { term: { include: { variants: { where: { isPrimary: true } } } } },
        },
      },
    });
    if (!lesson) throw notFound("Урок не знайдено.");
    return lesson;
  }

  async function validateLessonTerms(transaction, termIds, { requirePublished = false } = {}) {
    if (new Set(termIds).size !== termIds.length) {
      throw new DomainError("DUPLICATE_LESSON_TERM", "Терміни уроку не можуть повторюватися.", 422);
    }
    const count = await transaction.term.count({
      where: {
        id: { in: termIds },
        ...(requirePublished ? { status: "PUBLISHED", archivedAt: null } : {}),
      },
    });
    if (count !== termIds.length) {
      throw new DomainError(
        "INVALID_LESSON_TERMS",
        requirePublished
          ? "Усі терміни опублікованого уроку мають бути опубліковані."
          : "Один або кілька термінів не знайдено.",
        422,
      );
    }
  }

  async function replaceLessonTerms(transaction, lessonId, termIds) {
    await validateLessonTerms(transaction, termIds);
    await transaction.lessonTerm.deleteMany({ where: { lessonId } });
    if (termIds.length) {
      await transaction.lessonTerm.createMany({
        data: termIds.map((termId, index) => ({ lessonId, termId, position: index + 1 })),
      });
    }
  }

  async function createLesson(actorUserId, input) {
    const { termIds, ...data } = input;
    try {
      return await db.$transaction(async (transaction) => {
        if (data.categoryId) await assertCategoriesExist(transaction, [data.categoryId]);
        const lesson = await transaction.lesson.create({
          data: { ...data, status: "DRAFT", createdById: actorUserId, updatedById: actorUserId },
        });
        await replaceLessonTerms(transaction, lesson.id, termIds);
        await audit(transaction, actorUserId, "LESSON_CREATED", "LESSON", lesson.id, {
          termCount: termIds.length,
        });
        return transaction.lesson.findUnique({
          where: { id: lesson.id },
          include: {
            category: true,
            terms: {
              orderBy: { position: "asc" },
              include: { term: { include: { variants: { where: { isPrimary: true } } } } },
            },
          },
        });
      });
    } catch (error) {
      if (isUniqueError(error)) {
        throw new DomainError("LESSON_SLUG_IN_USE", "Такий slug уроку вже існує.", 409);
      }
      throw error;
    }
  }

  async function updateLesson(actorUserId, id, input) {
    const current = await getLesson(id);
    if (current.status === "ARCHIVED") {
      throw new DomainError("LESSON_ARCHIVED", "Архівований урок не можна редагувати.", 409);
    }
    const { termIds, ...data } = input;
    return db.$transaction(async (transaction) => {
      if (data.categoryId) await assertCategoriesExist(transaction, [data.categoryId]);
      await transaction.lesson.update({
        where: { id },
        data: {
          ...data,
          status: "DRAFT",
          updatedById: actorUserId,
          publishedAt: null,
          archivedAt: null,
        },
      });
      if (termIds) await replaceLessonTerms(transaction, id, termIds);
      await audit(transaction, actorUserId, "LESSON_UPDATED", "LESSON", id);
      return transaction.lesson.findUnique({
        where: { id },
        include: {
          category: true,
          terms: { orderBy: { position: "asc" }, include: { term: true } },
        },
      });
    });
  }

  async function setLessonStatus(actorUserId, id, status) {
    const lesson = await getLesson(id);
    const allowed = {
      DRAFT: ["PUBLISHED"],
      PUBLISHED: ["DRAFT", "ARCHIVED"],
      ARCHIVED: [],
    };
    if (!allowed[lesson.status]?.includes(status)) {
      throw new DomainError("INVALID_LESSON_TRANSITION", "Некоректна зміна статусу уроку.", 409);
    }
    if (status === "PUBLISHED") {
      const termIds = lesson.terms.map(({ termId }) => termId);
      if (termIds.length < 8 || termIds.length > 12) {
        throw new DomainError(
          "INVALID_LESSON_SIZE",
          "Опублікований урок повинен містити від 8 до 12 термінів.",
          422,
        );
      }
      await validateLessonTerms(db, termIds, { requirePublished: true });
    }
    const now = clock();
    return db.$transaction(async (transaction) => {
      const updated = await transaction.lesson.update({
        where: { id },
        data: {
          status,
          updatedById: actorUserId,
          publishedAt:
            status === "PUBLISHED" ? now : status === "DRAFT" ? null : lesson.publishedAt,
          archivedAt: status === "ARCHIVED" ? now : null,
        },
      });
      await audit(transaction, actorUserId, `LESSON_${status}`, "LESSON", id);
      return updated;
    });
  }

  function previewImport(format, content) {
    return importPreview(format, content);
  }

  async function createImportedTerm(actorUserId, row) {
    const category = await db.category.findFirst({
      where: { slug: row.data.categorySlug, archivedAt: null },
    });
    if (!category) {
      throw new DomainError("IMPORT_CATEGORY_NOT_FOUND", "Категорію рядка не знайдено.", 422);
    }
    const base = row.data.externalKey
      .normalize("NFKD")
      .toLocaleLowerCase("en-US")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "");
    const slug =
      base ||
      `import-${createHash("sha256").update(row.data.externalKey).digest("hex").slice(0, 12)}`;
    return db.$transaction(async (transaction) => {
      const term = await transaction.term.create({
        data: {
          slug,
          partOfSpeech: row.data.partOfSpeech,
          difficulty: row.data.difficulty,
          status: "DRAFT",
          origin: "CSV_IMPORT",
          createdById: actorUserId,
          updatedById: actorUserId,
        },
      });
      await replaceTermCollections(
        transaction,
        term.id,
        {
          variants: row.data.variants,
          definitions: row.data.definitions,
          categories: [{ categoryId: category.id, isPrimary: true }],
          sources: [row.data.source],
        },
        actorUserId,
        clock(),
      );
      const complete = await findTerm(transaction, term.id);
      await createRevision(transaction, complete, actorUserId, "Imported as unverified draft");
      return term;
    });
  }

  async function commitImport(actorUserId, { format, fileName, content, expectedChecksum }) {
    const preview = importPreview(format, content);
    if (preview.checksum !== expectedChecksum) {
      throw new DomainError("IMPORT_CHANGED", "Вміст імпорту змінився після preview.", 409);
    }
    let contentImport;
    try {
      contentImport = await db.contentImport.create({
        data: {
          importedById: actorUserId,
          fileName,
          checksum: preview.checksum,
          status: "VALIDATING",
          totalRows: preview.total,
          startedAt: clock(),
        },
      });
    } catch (error) {
      if (isUniqueError(error)) {
        throw new DomainError("IMPORT_ALREADY_COMMITTED", "Цей файл уже імпортовано.", 409);
      }
      throw error;
    }

    let importedRows = 0;
    let rejectedRows = 0;
    for (const error of preview.errors) {
      rejectedRows += 1;
      await db.contentImportRow.create({
        data: { importId: contentImport.id, rowNumber: error.row, status: "REJECTED", error },
      });
    }
    for (const row of preview.rows) {
      try {
        const term = await createImportedTerm(actorUserId, row);
        importedRows += 1;
        await db.contentImportRow.create({
          data: {
            importId: contentImport.id,
            rowNumber: row.row,
            status: "IMPORTED",
            termId: term.id,
          },
        });
      } catch (error) {
        rejectedRows += 1;
        await db.contentImportRow.create({
          data: {
            importId: contentImport.id,
            rowNumber: row.row,
            status: "REJECTED",
            error: { code: error.code ?? "IMPORT_ROW_FAILED" },
          },
        });
      }
    }
    const status =
      importedRows === 0 ? "FAILED" : rejectedRows ? "PARTIALLY_COMPLETED" : "COMPLETED";
    return db.$transaction(async (transaction) => {
      const completed = await transaction.contentImport.update({
        where: { id: contentImport.id },
        data: { status, importedRows, rejectedRows, completedAt: clock() },
        include: { rows: { orderBy: { rowNumber: "asc" } } },
      });
      await audit(
        transaction,
        actorUserId,
        "CONTENT_IMPORTED",
        "CONTENT_IMPORT",
        contentImport.id,
        {
          importedRows,
          rejectedRows,
        },
      );
      return completed;
    });
  }

  async function listUsers({ status, query, cursor, limit = 50 } = {}) {
    const users = await db.user.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: "insensitive" } },
                { profile: { nickname: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        email: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        profile: true,
        userRoles: {
          where: { OR: [{ expiresAt: null }, { expiresAt: { gt: clock() } }] },
          select: { role: { select: { code: true, nameUk: true, nameEn: true } } },
        },
      },
    });
    const hasMore = users.length > limit;
    const page = hasMore ? users.slice(0, limit) : users;
    return { data: page, nextCursor: hasMore ? page.at(-1).id : null };
  }

  async function getAdminUser(id) {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        profile: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!user) throw notFound("Користувача не знайдено.");
    return user;
  }

  async function updateUser(actorUserId, id, input) {
    const current = await getAdminUser(id);
    const currentlyAdmin = current.userRoles.some(
      ({ role, expiresAt }) => role.code === "ADMIN" && (!expiresAt || expiresAt > clock()),
    );
    const removesAdmin = input.roleCodes && !input.roleCodes.includes("ADMIN");
    const disablesAdmin = input.status === "SUSPENDED";
    if (currentlyAdmin && (removesAdmin || disablesAdmin)) {
      const activeAdmins = await db.user.count({
        where: {
          status: "ACTIVE",
          userRoles: {
            some: {
              role: { code: "ADMIN" },
              OR: [{ expiresAt: null }, { expiresAt: { gt: clock() } }],
            },
          },
        },
      });
      if (activeAdmins <= 1) {
        throw new DomainError(
          "LAST_ADMIN_REQUIRED",
          "Не можна вимкнути або понизити останнього активного адміністратора.",
          409,
        );
      }
    }

    return db.$transaction(async (transaction) => {
      if (input.status) {
        await transaction.user.update({ where: { id }, data: { status: input.status } });
        if (input.status === "SUSPENDED") {
          await transaction.authSession.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: clock(), revocationReason: "ACCOUNT_SUSPENDED" },
          });
        }
      }
      if (input.roleCodes) {
        const roles = await transaction.role.findMany({
          where: { code: { in: input.roleCodes } },
        });
        if (roles.length !== input.roleCodes.length) {
          throw new DomainError("INVALID_ROLE", "Одну або кілька ролей не знайдено.", 422);
        }
        await transaction.userRole.deleteMany({ where: { userId: id } });
        await transaction.userRole.createMany({
          data: roles.map((role) => ({
            userId: id,
            roleId: role.id,
            assignedById: actorUserId,
          })),
        });
      }
      await audit(transaction, actorUserId, "USER_ADMIN_UPDATED", "USER", id, {
        status: input.status,
        roleCodes: input.roleCodes,
      });
      return transaction.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          status: true,
          profile: true,
          userRoles: { include: { role: true } },
        },
      });
    });
  }

  async function listReports({ status, cursor, limit = 50 } = {}) {
    const reports = await db.termReport.findMany({
      where: status ? { status } : {},
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        term: { include: { variants: { where: { isPrimary: true } } } },
        submittedBy: { select: { id: true, profile: { select: { nickname: true } } } },
        resolvedBy: { select: { id: true, profile: { select: { nickname: true } } } },
      },
    });
    const hasMore = reports.length > limit;
    const page = hasMore ? reports.slice(0, limit) : reports;
    return { data: page, nextCursor: hasMore ? page.at(-1).id : null };
  }

  async function moderateReport(actorUserId, id, status, resolutionNote) {
    const report = await db.termReport.findUnique({ where: { id } });
    if (!report) throw notFound("Повідомлення не знайдено.");
    const allowed = {
      OPEN: ["IN_REVIEW", "RESOLVED", "DISMISSED"],
      IN_REVIEW: ["RESOLVED", "DISMISSED"],
      RESOLVED: [],
      DISMISSED: [],
    };
    if (!allowed[report.status]?.includes(status)) {
      throw new DomainError(
        "INVALID_REPORT_TRANSITION",
        "Некоректна зміна статусу повідомлення.",
        409,
      );
    }
    const final = ["RESOLVED", "DISMISSED"].includes(status);
    return db.$transaction(async (transaction) => {
      const updated = await transaction.termReport.update({
        where: { id },
        data: {
          status,
          resolutionNote: resolutionNote ?? null,
          resolvedById: final ? actorUserId : null,
          resolvedAt: final ? clock() : null,
        },
      });
      await audit(transaction, actorUserId, `TERM_REPORT_${status}`, "TERM_REPORT", id, {
        termId: report.termId,
      });
      return updated;
    });
  }

  async function listAuditLogs({ actorUserId, action, targetType, cursor, limit = 100 } = {}) {
    const logs = await db.auditLog.findMany({
      where: {
        ...(actorUserId ? { actorUserId } : {}),
        ...(action ? { action } : {}),
        ...(targetType ? { targetType } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { actor: { select: { id: true, profile: { select: { nickname: true } } } } },
    });
    const hasMore = logs.length > limit;
    const page = hasMore ? logs.slice(0, limit) : logs;
    return { data: page, nextCursor: hasMore ? page.at(-1).id : null };
  }

  async function listAchievements() {
    return db.achievement.findMany({
      orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
      include: {
        rules: { orderBy: [{ groupNumber: "asc" }, { id: "asc" }] },
        _count: { select: { awards: true } },
      },
    });
  }

  async function getAchievement(id) {
    const achievement = await db.achievement.findUnique({
      where: { id },
      include: {
        rules: { orderBy: [{ groupNumber: "asc" }, { id: "asc" }] },
        _count: { select: { awards: true } },
      },
    });
    if (!achievement) throw notFound("Досягнення не знайдено.");
    return achievement;
  }

  async function validateAchievementRules(transaction, rules) {
    const categoryIds = rules.map(({ categoryId }) => categoryId).filter(Boolean);
    await assertCategoriesExist(transaction, categoryIds);
  }

  async function createAchievement(actorUserId, input) {
    const { rules, ...data } = input;
    try {
      return await db.$transaction(async (transaction) => {
        await validateAchievementRules(transaction, rules);
        const achievement = await transaction.achievement.create({
          data: { ...data, rules: { create: rules } },
          include: { rules: true },
        });
        await audit(transaction, actorUserId, "ACHIEVEMENT_CREATED", "ACHIEVEMENT", achievement.id);
        return achievement;
      });
    } catch (error) {
      if (isUniqueError(error)) {
        throw new DomainError(
          "ACHIEVEMENT_CODE_IN_USE",
          "Код досягнення вже використовується.",
          409,
        );
      }
      throw error;
    }
  }

  async function updateAchievement(actorUserId, id, input) {
    await getAchievement(id);
    const { rules, ...data } = input;
    return db.$transaction(async (transaction) => {
      if (rules) {
        await validateAchievementRules(transaction, rules);
        await transaction.achievementRule.deleteMany({ where: { achievementId: id } });
        await transaction.achievementRule.createMany({
          data: rules.map((rule) => ({ achievementId: id, ...rule })),
        });
      }
      const achievement = await transaction.achievement.update({
        where: { id },
        data,
        include: { rules: true, _count: { select: { awards: true } } },
      });
      await audit(transaction, actorUserId, "ACHIEVEMENT_UPDATED", "ACHIEVEMENT", id);
      return achievement;
    });
  }

  async function createAudioAsset(actorUserId, termId, input) {
    const term = await db.term.findUnique({
      where: { id: termId },
      select: { id: true, status: true },
    });
    if (!term) throw notFound("Термін не знайдено.");
    if (term.status === "ARCHIVED") {
      throw new DomainError("TERM_ARCHIVED", "До архівованого терміна не можна додати аудіо.", 409);
    }
    return db.$transaction(async (transaction) => {
      if (input.isPrimary) {
        await transaction.audioAsset.updateMany({
          where: { termId, locale: input.locale, archivedAt: null, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      const asset = await transaction.audioAsset.create({
        data: { ...input, termId, uploadedById: actorUserId },
      });
      await audit(transaction, actorUserId, "TERM_AUDIO_ADDED", "AUDIO_ASSET", asset.id, {
        termId,
        kind: asset.kind,
      });
      return asset;
    });
  }

  async function getAudioAsset(id) {
    const asset = await db.audioAsset.findFirst({ where: { id, archivedAt: null } });
    if (!asset) throw notFound("Аудіозапис не знайдено.");
    return asset;
  }

  async function archiveAudioAsset(actorUserId, id) {
    await getAudioAsset(id);
    return db.$transaction(async (transaction) => {
      const asset = await transaction.audioAsset.update({
        where: { id },
        data: { archivedAt: clock(), isPrimary: false },
      });
      await audit(transaction, actorUserId, "TERM_AUDIO_ARCHIVED", "AUDIO_ASSET", id, {
        termId: asset.termId,
      });
      return asset;
    });
  }

  return {
    listCategories,
    getCategory,
    createCategory,
    updateCategory,
    reorderCategories,
    listTerms,
    getTerm,
    createTerm,
    updateTerm,
    transitionTerm,
    setTermDistractors,
    publishBetaTerm,
    listReviews,
    decideReview,
    listLessons,
    getLesson,
    createLesson,
    updateLesson,
    setLessonStatus,
    previewImport,
    commitImport,
    listUsers,
    getAdminUser,
    updateUser,
    listReports,
    moderateReport,
    listAuditLogs,
    listAchievements,
    getAchievement,
    createAchievement,
    updateAchievement,
    createAudioAsset,
    getAudioAsset,
    archiveAudioAsset,
  };
}
