function localize(record, locale, field) {
  return record[`${field}${locale === "en" ? "En" : "Uk"}`] ?? null;
}

export function createLearningOverviewService(db) {
  async function getOverview(userId, { locale = "uk" } = {}) {
    const [categories, activeSession] = await Promise.all([
      db.category.findMany({
        where: { archivedAt: null },
        orderBy: [{ displayOrder: "asc" }, { slug: "asc" }],
        include: {
          terms: {
            where: { term: { status: "PUBLISHED", archivedAt: null } },
            select: {
              term: {
                select: {
                  userProgress: { where: { userId }, select: { id: true }, take: 1 },
                },
              },
            },
          },
          lessons: {
            where: { status: "PUBLISHED", archivedAt: null },
            orderBy: [{ difficulty: "asc" }, { publishedAt: "asc" }],
            include: {
              _count: { select: { terms: true } },
              userProgress: {
                where: { userId },
                select: { completions: true, firstCompletedAt: true, lastCompletedAt: true },
                take: 1,
              },
            },
          },
        },
      }),
      db.studySession.findFirst({
        where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          currentStage: true,
          startedAt: true,
          lesson: {
            select: {
              id: true,
              titleUk: true,
              titleEn: true,
              category: { select: { slug: true } },
            },
          },
        },
      }),
    ]);

    const mapped = categories.map((category) => {
      const practicedTermCount = category.terms.filter(
        ({ term }) => term.userProgress.length > 0,
      ).length;
      const lessons = category.lessons.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        categorySlug: category.slug,
        title: localize(lesson, locale, "title"),
        description: localize(lesson, locale, "description"),
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        termCount: lesson._count.terms,
        completed: Boolean(lesson.userProgress[0]?.firstCompletedAt),
        completions: lesson.userProgress[0]?.completions ?? 0,
      }));
      const nextLesson = lessons.find((lesson) => !lesson.completed) ?? lessons[0] ?? null;
      return {
        id: category.id,
        slug: category.slug,
        name: localize(category, locale, "name"),
        description: localize(category, locale, "description"),
        targetTermCount: category.targetTermCount,
        publishedTermCount: category.terms.length,
        practicedTermCount,
        progressPercent: category.targetTermCount
          ? Math.round((practicedTermCount / category.targetTermCount) * 100)
          : 0,
        publishedLessonCount: lessons.length,
        completedLessonCount: lessons.filter(({ completed }) => completed).length,
        nextLesson,
        lessons,
      };
    });

    const fallbackNext = mapped.map(({ nextLesson }) => nextLesson).find(Boolean) ?? null;
    return {
      activeSession: activeSession
        ? {
            id: activeSession.id,
            currentStage: activeSession.currentStage,
            startedAt: activeSession.startedAt,
            lesson: activeSession.lesson
              ? {
                  id: activeSession.lesson.id,
                  title: localize(activeSession.lesson, locale, "title"),
                  categorySlug: activeSession.lesson.category?.slug ?? null,
                }
              : null,
          }
        : null,
      nextLesson: fallbackNext,
      categories: mapped,
    };
  }

  return { getOverview };
}
