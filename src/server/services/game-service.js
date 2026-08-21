import { startOfDay, startOfMonth, startOfWeek } from "date-fns";

import { conflict, notFound } from "@/server/services/errors";
import { runSerializable } from "@/server/services/study-service";

function periodStart(period, now) {
  if (period === "MONTHLY") return startOfMonth(now);
  if (period === "WEEKLY") return startOfWeek(now, { weekStartsOn: 1 });
  return startOfDay(now);
}

function periodKey(period, now) {
  const start = periodStart(period, now);
  return `${period.toLowerCase()}:${start.toISOString().slice(0, 10)}`;
}

async function metricValue(db, userId, definition, now) {
  const start = periodStart(definition.period, now);
  if (definition.metric === "NODES_COMPLETED" || definition.metric === "QUIZZES_COMPLETED") {
    return db.userLearningNodeProgress.count({
      where: {
        userId,
        firstCompletedAt: { gte: start },
        ...(definition.metric === "QUIZZES_COMPLETED" ? { node: { type: "QUIZ" } } : {}),
      },
    });
  }
  const activities = await db.userDailyActivity.findMany({
    where: { userId, activityDate: { gte: start } },
    select: { xpEarned: true, correctAnswers: true, reviewsCompleted: true, activityDate: true },
  });
  if (definition.metric === "XP_EARNED")
    return activities.reduce((sum, item) => sum + item.xpEarned, 0);
  if (definition.metric === "CORRECT_ANSWERS")
    return activities.reduce((sum, item) => sum + item.correctAnswers, 0);
  if (definition.metric === "REVIEWS_COMPLETED")
    return activities.reduce((sum, item) => sum + item.reviewsCompleted, 0);
  if (definition.metric === "ACTIVE_DAYS")
    return activities.filter((item) => item.xpEarned > 0).length;
  return 0;
}

async function creditQuestCoins(transaction, userId, questId, periodKeyValue, amount) {
  const dedupeKey = `QUEST:${userId}:${questId}:${periodKeyValue}`;
  const existing = await transaction.coinTransaction.findUnique({ where: { dedupeKey } });
  if (existing) return 0;
  await transaction.userWallet.upsert({
    where: { userId },
    create: { userId, coins: amount },
    update: { coins: { increment: amount } },
  });
  await transaction.coinTransaction.create({
    data: {
      userId,
      amount,
      reason: "QUEST_REWARD",
      sourceType: "QUEST",
      sourceId: `${questId}:${periodKeyValue}`,
      dedupeKey,
    },
  });
  return amount;
}

export function createGameService(db, { clock = () => new Date() } = {}) {
  async function getStatus(userId) {
    const now = clock();
    const today = startOfDay(now);
    const [profile, wallet, activity, bonuses] = await Promise.all([
      db.userProfile.findUnique({ where: { userId } }),
      db.userWallet.upsert({ where: { userId }, create: { userId }, update: {} }),
      db.userDailyActivity.findUnique({
        where: { userId_activityDate: { userId, activityDate: today } },
      }),
      db.userBonus.findMany({ where: { userId } }),
    ]);
    const doubleXp = bonuses.find(
      (bonus) => bonus.type === "DOUBLE_XP_15M" && bonus.activeUntil > now,
    );
    return {
      streak: profile?.currentStreak ?? 0,
      coins: wallet.coins,
      dailyXp: activity?.xpEarned ?? 0,
      dailyGoalXp: profile?.dailyGoalXp ?? 20,
      activeDoubleXpUntil: doubleXp?.activeUntil ?? null,
      streakFreezes: bonuses.find((bonus) => bonus.type === "STREAK_FREEZE")?.quantity ?? 0,
      leagueDivision: profile?.leagueDivision ?? "BRONZE",
    };
  }

  async function getQuests(userId, { locale = "uk" } = {}) {
    const now = clock();
    const definitions = await db.questDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ period: "asc" }, { displayOrder: "asc" }],
    });
    const result = [];
    for (const quest of definitions) {
      const key = periodKey(quest.period, now);
      const current = await metricValue(db, userId, quest, now);
      const status = current >= quest.threshold ? "COMPLETED" : "ACTIVE";
      const progress = await db.userQuestProgress.upsert({
        where: { userId_questId_periodKey: { userId, questId: quest.id, periodKey: key } },
        create: {
          userId,
          questId: quest.id,
          periodKey: key,
          current,
          status,
          completedAt: status === "COMPLETED" ? now : null,
        },
        update: {
          current,
          ...(status === "COMPLETED" ? { status, completedAt: now } : {}),
        },
      });
      result.push({
        id: quest.id,
        code: quest.code,
        period: quest.period,
        title: quest[locale === "en" ? "titleEn" : "titleUk"],
        description: quest[locale === "en" ? "descriptionEn" : "descriptionUk"],
        current,
        threshold: quest.threshold,
        status: progress.status,
        claimable: progress.status === "COMPLETED" && !progress.claimedAt,
        claimed: Boolean(progress.claimedAt),
        reward: { coins: quest.rewardCoins, bonus: quest.rewardBonus },
      });
    }
    return { quests: result };
  }

  async function claimQuest(userId, questId) {
    return runSerializable(db, async (transaction) => {
      const now = clock();
      const quest = await transaction.questDefinition.findFirst({
        where: { id: questId, isActive: true },
      });
      if (!quest) throw notFound("Квест не знайдено.");
      const key = periodKey(quest.period, now);
      const current = await metricValue(transaction, userId, quest, now);
      if (current < quest.threshold) throw conflict("QUEST_NOT_COMPLETE", "Квест ще не виконано.");
      const progress = await transaction.userQuestProgress.upsert({
        where: { userId_questId_periodKey: { userId, questId, periodKey: key } },
        create: { userId, questId, periodKey: key, current, status: "COMPLETED", completedAt: now },
        update: { current, status: "COMPLETED", completedAt: now },
      });
      if (progress.claimedAt) return { claimed: true, replayed: true, coinsAwarded: 0 };
      const coinsAwarded = await creditQuestCoins(
        transaction,
        userId,
        questId,
        key,
        quest.rewardCoins,
      );
      await transaction.userQuestProgress.update({
        where: { id: progress.id },
        data: { status: "CLAIMED", claimedAt: now },
      });
      if (quest.rewardBonus) {
        await transaction.userBonus.upsert({
          where: { userId_type: { userId, type: quest.rewardBonus } },
          create: { userId, type: quest.rewardBonus, quantity: 1 },
          update: { quantity: { increment: 1 } },
        });
      }
      return { claimed: true, coinsAwarded, bonus: quest.rewardBonus };
    });
  }

  async function getPatches(userId, { locale = "uk" } = {}) {
    const [patches, profile, featured] = await Promise.all([
      db.patchDefinition.findMany({
        orderBy: { displayOrder: "asc" },
        include: { awards: { where: { userId }, take: 1 } },
      }),
      db.userProfile.findUnique({ where: { userId } }),
      db.userFeaturedPatch.findMany({ where: { userId }, orderBy: { slot: "asc" } }),
    ]);
    const [lessonCount, quizCount, learnedTerms] = await Promise.all([
      db.userLearningNodeProgress.count({
        where: { userId, completions: { gt: 0 }, node: { type: "LESSON" } },
      }),
      db.userLearningNodeProgress.count({
        where: { userId, completions: { gt: 0 }, node: { type: "QUIZ" } },
      }),
      db.userTermProgress.count({ where: { userId } }),
    ]);
    const eligibleCodes = new Set();
    if (lessonCount >= 1) eligibleCodes.add("first-sortie");
    if (quizCount >= 1) eligibleCodes.add("first-quiz");
    if (lessonCount >= 10) eligibleCodes.add("learning-ten");
    if (learnedTerms >= 100) eligibleCodes.add("hundred-terms");
    if (learnedTerms >= 300) eligibleCodes.add("three-hundred-terms");
    if (learnedTerms >= 556) eligibleCodes.add("full-dictionary");
    for (const [days, code] of [
      [3, "streak-three"],
      [7, "streak-seven"],
      [30, "streak-thirty"],
      [100, "streak-hundred"],
      [365, "streak-year"],
    ]) {
      if ((profile?.longestStreak ?? 0) >= days) eligibleCodes.add(code);
    }
    for (const patch of patches.filter(
      (item) => eligibleCodes.has(item.code) && item.awards.length === 0,
    )) {
      await db.userPatch.upsert({
        where: { userId_patchId: { userId, patchId: patch.id } },
        create: { userId, patchId: patch.id, triggerType: "PROGRESS" },
        update: {},
      });
      patch.awards.push({ awardedAt: clock() });
    }
    return {
      featuredPatchIds: featured.map(({ patchId }) => patchId),
      patches: patches.map((patch) => ({
        id: patch.id,
        code: patch.code,
        title: patch[locale === "en" ? "titleEn" : "titleUk"],
        description: patch[locale === "en" ? "descriptionEn" : "descriptionUk"],
        rarity: patch.rarity,
        category: patch.category,
        iconKey: patch.iconKey,
        earned: patch.awards.length > 0,
        awardedAt: patch.awards[0]?.awardedAt ?? null,
      })),
    };
  }

  async function setFeaturedPatches(userId, patchIds) {
    if (patchIds.length > 3 || new Set(patchIds).size !== patchIds.length) {
      throw conflict("INVALID_FEATURED_PATCHES", "Оберіть до трьох різних патчів.");
    }
    const owned = await db.userPatch.count({ where: { userId, patchId: { in: patchIds } } });
    if (owned !== patchIds.length)
      throw conflict("PATCH_NOT_OWNED", "Можна закріпити лише отримані патчі.");
    await db.$transaction(async (transaction) => {
      await transaction.userFeaturedPatch.deleteMany({ where: { userId } });
      if (patchIds.length) {
        await transaction.userFeaturedPatch.createMany({
          data: patchIds.map((patchId, index) => ({ userId, patchId, slot: index + 1 })),
        });
      }
    });
    return { patchIds };
  }

  return { getStatus, getQuests, claimQuest, getPatches, setFeaturedPatches };
}
