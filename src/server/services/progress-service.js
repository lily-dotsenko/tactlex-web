function mastered(progress) {
  return (
    progress?.state === "REVIEW" && progress.repetitions >= 3 && Number(progress.stability) >= 21
  );
}

export function createProgressService(db) {
  async function summary(userId) {
    const [profile, grouped, dueCount, activity, categories] = await Promise.all([
      db.userProfile.findUnique({ where: { userId } }),
      db.userTermProgress.groupBy({
        by: ["state"],
        where: { userId },
        _count: { _all: true },
      }),
      db.userTermProgress.count({ where: { userId, dueAt: { lte: new Date() } } }),
      db.userDailyActivity.findMany({
        where: { userId },
        orderBy: { activityDate: "desc" },
        take: 7,
        select: { activityDate: true, xpEarned: true, goalMetAt: true },
      }),
      db.category.findMany({
        where: { archivedAt: null },
        orderBy: { displayOrder: "asc" },
        include: {
          terms: {
            where: {
              term: {
                status: "PUBLISHED",
                archivedAt: null,
                lessonTerms: {
                  some: { lesson: { status: "PUBLISHED", archivedAt: null } },
                },
              },
            },
            select: {
              term: {
                select: {
                  userProgress: {
                    where: { userId },
                    select: { state: true, repetitions: true, stability: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const stateCounts = Object.fromEntries(grouped.map((row) => [row.state, row._count._all]));
    return {
      totalXp: profile?.totalXp ?? 0,
      level: profile?.level ?? 1,
      dailyGoalXp: profile?.dailyGoalXp ?? 20,
      currentStreak: profile?.currentStreak ?? 0,
      longestStreak: profile?.longestStreak ?? 0,
      dueCount,
      states: {
        new: stateCounts.NEW ?? 0,
        learning: stateCounts.LEARNING ?? 0,
        review: stateCounts.REVIEW ?? 0,
        relearning: stateCounts.RELEARNING ?? 0,
      },
      activity: activity.reverse(),
      categories: categories.map((category) => {
        const published = category.terms.length;
        const masteredCount = category.terms.filter(({ term }) =>
          mastered(term.userProgress[0]),
        ).length;
        return {
          id: category.id,
          slug: category.slug,
          nameUk: category.nameUk,
          nameEn: category.nameEn,
          published,
          mastered: masteredCount,
          percent: published ? Math.round((masteredCount / published) * 100) : 0,
        };
      }),
    };
  }

  async function achievements(userId, locale = "uk") {
    const rows = await db.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
      include: {
        rules: true,
        awards: { where: { userId }, select: { awardedAt: true, triggerType: true } },
      },
    });
    return rows.map((achievement) => ({
      id: achievement.id,
      code: achievement.code,
      name: locale === "en" ? achievement.nameEn : achievement.nameUk,
      description: locale === "en" ? achievement.descriptionEn : achievement.descriptionUk,
      iconKey: achievement.iconKey,
      rewardXp: achievement.rewardXp,
      rules: achievement.rules.map((rule) => ({
        metric: rule.metric,
        operator: rule.operator,
        threshold: rule.threshold,
        window: rule.window,
      })),
      awardedAt: achievement.awards[0]?.awardedAt ?? null,
    }));
  }

  async function leaderboard(periodType, limit = 50, currentUserId) {
    const now = new Date();
    const period =
      periodType === "all-time"
        ? await db.leaderboardPeriod.findUnique({ where: { slug: "all-time" } })
        : await db.leaderboardPeriod.findFirst({
            where: { type: "WEEKLY", startsAt: { lte: now }, endsAt: { gt: now } },
            orderBy: { startsAt: "desc" },
          });
    if (!period) return { period: null, entries: [], currentUser: null };

    const entries = await db.leaderboardEntry.findMany({
      where: {
        periodId: period.id,
        user: { profile: { is: { leaderboardVisible: true } } },
      },
      orderBy: [{ xp: "desc" }, { updatedAt: "asc" }],
      take: limit,
      include: {
        user: { select: { profile: { select: { nickname: true, avatarKey: true } } } },
      },
    });
    const currentEntry = currentUserId
      ? await db.leaderboardEntry.findUnique({
          where: { periodId_userId: { periodId: period.id, userId: currentUserId } },
          include: {
            user: {
              select: {
                profile: {
                  select: { nickname: true, avatarKey: true, leaderboardVisible: true },
                },
              },
            },
          },
        })
      : null;

    return {
      period: {
        type: period.type,
        slug: period.slug,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
      },
      entries: entries.map((entry, index) => ({
        rank: index + 1,
        nickname: entry.user.profile?.nickname ?? "—",
        avatarKey: entry.user.profile?.avatarKey ?? null,
        xp: entry.xp,
        isCurrentUser: entry.userId === currentUserId,
      })),
      currentUser:
        currentEntry?.user.profile?.leaderboardVisible === true
          ? {
              nickname: currentEntry.user.profile.nickname,
              avatarKey: currentEntry.user.profile.avatarKey,
              xp: currentEntry.xp,
            }
          : null,
    };
  }

  return { summary, achievements, leaderboard };
}
