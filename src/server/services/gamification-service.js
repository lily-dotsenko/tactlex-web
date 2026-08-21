import { XP_POLICY_VERSION, levelFromXp, updateStreak } from "@/server/services/gamification";

const DAY_MS = 86_400_000;

function localDateParts(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function getLocalActivityDate(now, timezone) {
  return new Date(`${localDateParts(now, timezone)}T00:00:00.000Z`);
}

export function getIsoWeek(now) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / DAY_MS + 1) / 7);
  const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startDay = startsAt.getUTCDay() || 7;
  startsAt.setUTCDate(startsAt.getUTCDate() - startDay + 1);
  const endsAt = new Date(startsAt.getTime() + 7 * DAY_MS);
  return {
    slug: `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`,
    startsAt,
    endsAt,
  };
}

async function updateLeaderboard(transaction, userId, amount, now) {
  if (amount === 0) return;
  const week = getIsoWeek(now);
  const [allTime, weekly] = await Promise.all([
    transaction.leaderboardPeriod.upsert({
      where: { slug: "all-time" },
      create: { slug: "all-time", type: "ALL_TIME" },
      update: {},
    }),
    transaction.leaderboardPeriod.upsert({
      where: { slug: week.slug },
      create: { slug: week.slug, type: "WEEKLY", startsAt: week.startsAt, endsAt: week.endsAt },
      update: { startsAt: week.startsAt, endsAt: week.endsAt },
    }),
  ]);
  await Promise.all(
    [allTime.id, weekly.id].map((periodId) =>
      transaction.leaderboardEntry.upsert({
        where: { periodId_userId: { periodId, userId } },
        create: { periodId, userId, xp: amount },
        update: { xp: { increment: amount } },
      }),
    ),
  );
}

export function createGamificationService(transaction, { clock = () => new Date() } = {}) {
  async function awardXp({ userId, amount, reason, sourceType, sourceId, dedupeKey, metadata }) {
    if (!Number.isInteger(amount) || amount <= 0) return { amount: 0, duplicate: false };
    const existing = await transaction.xpTransaction.findUnique({ where: { dedupeKey } });
    if (existing) return { amount: 0, duplicate: true };

    const now = clock();
    let effectiveAmount = amount;
    if (reason !== "ACHIEVEMENT" && transaction.userBonus?.findUnique) {
      const boost = await transaction.userBonus.findUnique({
        where: { userId_type: { userId, type: "DOUBLE_XP_15M" } },
      });
      if (boost?.activeUntil && boost.activeUntil > now) effectiveAmount *= 2;
    }
    await transaction.xpTransaction.create({
      data: {
        userId,
        amount: effectiveAmount,
        reason,
        sourceType,
        sourceId,
        dedupeKey,
        policyVersion: XP_POLICY_VERSION,
        metadata:
          effectiveAmount === amount
            ? (metadata ?? undefined)
            : { ...(metadata ?? {}), baseAmount: amount, bonus: "DOUBLE_XP_15M" },
        createdAt: now,
      },
    });
    const profile = await transaction.userProfile.update({
      where: { userId },
      data: { totalXp: { increment: effectiveAmount } },
    });
    const level = levelFromXp(profile.totalXp);
    if (level !== profile.level) {
      await transaction.userProfile.update({ where: { userId }, data: { level } });
    }
    await updateLeaderboard(transaction, userId, effectiveAmount, now);
    return { amount: effectiveAmount, duplicate: false, totalXp: profile.totalXp, level };
  }

  async function recordActivity({
    userId,
    xpEarned = 0,
    answersSubmitted = 0,
    correctAnswers = 0,
    lessonsCompleted = 0,
    reviewsCompleted = 0,
  }) {
    const now = clock();
    const profile = await transaction.userProfile.findUnique({ where: { userId } });
    if (!profile) return null;
    const activityDate = getLocalActivityDate(now, profile.timezone);
    const existing = await transaction.userDailyActivity.findUnique({
      where: { userId_activityDate: { userId, activityDate } },
    });
    const activity = existing
      ? await transaction.userDailyActivity.update({
          where: { userId_activityDate: { userId, activityDate } },
          data: {
            xpEarned: { increment: xpEarned },
            answersSubmitted: { increment: answersSubmitted },
            correctAnswers: { increment: correctAnswers },
            lessonsCompleted: { increment: lessonsCompleted },
            reviewsCompleted: { increment: reviewsCompleted },
          },
        })
      : await transaction.userDailyActivity.create({
          data: {
            userId,
            activityDate,
            timezone: profile.timezone,
            xpEarned,
            answersSubmitted,
            correctAnswers,
            lessonsCompleted,
            reviewsCompleted,
          },
        });

    if (!activity.goalMetAt && activity.xpEarned >= profile.dailyGoalXp) {
      const previous = await transaction.userDailyActivity.findFirst({
        where: { userId, goalMetAt: { not: null }, activityDate: { lt: activityDate } },
        orderBy: { activityDate: "desc" },
      });
      const previousIso = previous?.activityDate.toISOString().slice(0, 10);
      const currentIso = activityDate.toISOString().slice(0, 10);
      let streakPreviousIso = previousIso;
      if (previousIso) {
        const missedDays = Math.round(
          (Date.parse(`${currentIso}T00:00:00Z`) - Date.parse(`${previousIso}T00:00:00Z`)) / DAY_MS,
        );
        if (missedDays === 2 && transaction.userBonus?.findUnique) {
          const freeze = await transaction.userBonus.findUnique({
            where: { userId_type: { userId, type: "STREAK_FREEZE" } },
          });
          if ((freeze?.quantity ?? 0) > 0) {
            await transaction.userBonus.update({
              where: { id: freeze.id },
              data: { quantity: { decrement: 1 } },
            });
            streakPreviousIso = new Date(activityDate.getTime() - DAY_MS)
              .toISOString()
              .slice(0, 10);
          }
        }
      }
      const streak = updateStreak({
        previousActivityDate: streakPreviousIso,
        currentActivityDate: currentIso,
        previousCurrentStreak: profile.currentStreak,
        previousLongestStreak: profile.longestStreak,
      });
      await Promise.all([
        transaction.userDailyActivity.update({
          where: { userId_activityDate: { userId, activityDate } },
          data: { goalMetAt: now },
        }),
        transaction.userProfile.update({ where: { userId }, data: streak }),
      ]);
      return { ...activity, goalMetAt: now, ...streak };
    }
    return activity;
  }

  async function metricValue(userId, rule) {
    switch (rule.metric) {
      case "LESSONS_COMPLETED":
        return transaction.userLessonProgress.count({
          where: { userId, completions: { gt: 0 } },
        });
      case "CONSECUTIVE_CORRECT": {
        const rows = await transaction.sessionAnswer.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: rule.threshold,
          select: { isCorrect: true },
        });
        return rows.findIndex((row) => !row.isCorrect) === -1
          ? rows.length
          : rows.findIndex((row) => !row.isCorrect);
      }
      case "PERFECT_LESSONS": {
        const sessions = await transaction.studySession.findMany({
          where: { userId, kind: "LESSON", status: "COMPLETED" },
          select: { score: true, maxScore: true },
        });
        return sessions.filter(({ score, maxScore }) => maxScore > 0 && score === maxScore).length;
      }
      case "MASTERED_TERMS":
        return transaction.userTermProgress.count({
          where: { userId, state: "REVIEW", repetitions: { gte: 3 }, stability: { gte: 21 } },
        });
      case "MASTERED_TERMS_IN_CATEGORY":
        if (rule.categoryId) {
          return transaction.userTermProgress.count({
            where: {
              userId,
              state: "REVIEW",
              repetitions: { gte: 3 },
              stability: { gte: 21 },
              term: { categories: { some: { categoryId: rule.categoryId } } },
            },
          });
        }
        {
          const categories = await transaction.category.findMany({
            where: { archivedAt: null },
            select: {
              terms: {
                where: { term: { status: "PUBLISHED", archivedAt: null } },
                select: {
                  term: {
                    select: {
                      userProgress: {
                        where: {
                          userId,
                          state: "REVIEW",
                          repetitions: { gte: 3 },
                          stability: { gte: 21 },
                        },
                        select: { id: true },
                      },
                    },
                  },
                },
              },
            },
          });
          return Math.max(
            0,
            ...categories.map(
              (category) =>
                category.terms.filter(({ term }) => term.userProgress.length > 0).length,
            ),
          );
        }
      case "CURRENT_STREAK": {
        const profile = await transaction.userProfile.findUnique({ where: { userId } });
        return profile?.currentStreak ?? 0;
      }
      case "PREVIOUSLY_MISSED_CORRECT":
        return transaction.reviewLog.count({
          where: { userId, wasCorrect: true, previousState: "RELEARNING" },
        });
      case "ALL_CATEGORIES_LEVEL": {
        const categories = await transaction.category.findMany({
          where: { archivedAt: null },
          select: {
            terms: {
              where: { term: { status: "PUBLISHED", archivedAt: null } },
              select: {
                term: {
                  select: {
                    userProgress: {
                      where: {
                        userId,
                        state: "REVIEW",
                        repetitions: { gte: 3 },
                        stability: { gte: 21 },
                      },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        });
        return categories.length > 0 &&
          categories.every((category) =>
            category.terms.some(({ term }) => term.userProgress.length > 0),
          )
          ? 1
          : 0;
      }
      default:
        return 0;
    }
  }

  async function evaluateAchievements({ userId, triggerType, triggerId }) {
    const achievements = await transaction.achievement.findMany({
      where: { isActive: true, awards: { none: { userId } } },
      include: { rules: { orderBy: { groupNumber: "asc" } } },
    });
    const awarded = [];
    for (const achievement of achievements) {
      const groups = Map.groupBy(achievement.rules, (rule) => rule.groupNumber);
      let achieved = false;
      for (const rules of groups.values()) {
        const values = await Promise.all(rules.map((rule) => metricValue(userId, rule)));
        if (
          rules.every((rule, index) =>
            rule.operator === "EQUALS"
              ? values[index] === rule.threshold
              : values[index] >= rule.threshold,
          )
        ) {
          achieved = true;
          break;
        }
      }
      if (!achieved || achievement.rules.length === 0) continue;
      const award = await transaction.userAchievement.create({
        data: { userId, achievementId: achievement.id, triggerType, triggerId },
      });
      let reward = { amount: 0 };
      if (achievement.rewardXp > 0) {
        reward = await awardXp({
          userId,
          amount: achievement.rewardXp,
          reason: "ACHIEVEMENT",
          sourceType: "ACHIEVEMENT",
          sourceId: achievement.id,
          dedupeKey: `achievement:${userId}:${achievement.id}`,
          metadata: { code: achievement.code },
        });
        await recordActivity({ userId, xpEarned: reward.amount });
      }
      awarded.push({
        id: achievement.id,
        code: achievement.code,
        nameUk: achievement.nameUk,
        nameEn: achievement.nameEn,
        awardedAt: award.awardedAt,
        rewardXp: reward.amount,
      });
    }
    return awarded;
  }

  return { awardXp, recordActivity, evaluateAchievements };
}
