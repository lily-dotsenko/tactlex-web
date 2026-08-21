import { conflict, notFound } from "@/server/services/errors";
import { getLocalActivityDate } from "@/server/services/gamification-service";
import { runSerializable } from "@/server/services/study-service";

function periodStart(period, now, timezone = "Europe/Kyiv") {
  const localDay = getLocalActivityDate(now, timezone);
  if (period === "MONTHLY") {
    return new Date(Date.UTC(localDay.getUTCFullYear(), localDay.getUTCMonth(), 1));
  }
  if (period === "WEEKLY") {
    const mondayOffset = (localDay.getUTCDay() || 7) - 1;
    return new Date(localDay.getTime() - mondayOffset * 86_400_000);
  }
  return localDay;
}

function periodKey(period, now, timezone) {
  const start = periodStart(period, now, timezone);
  return `${period.toLowerCase()}:${start.toISOString().slice(0, 10)}`;
}

async function metricValue(db, userId, definition, now, timezone) {
  const start = periodStart(definition.period, now, timezone);
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

async function awardPatch(transaction, userId, code, triggerType, triggerId) {
  const patch = await transaction.patchDefinition.findUnique({ where: { code } });
  if (!patch) return null;
  await transaction.userPatch.upsert({
    where: { userId_patchId: { userId, patchId: patch.id } },
    create: { userId, patchId: patch.id, triggerType, triggerId },
    update: {},
  });
  return patch;
}

export function createGameService(db, { clock = () => new Date() } = {}) {
  async function getStatus(userId) {
    const now = clock();
    const profile = await db.userProfile.findUnique({ where: { userId } });
    const today = getLocalActivityDate(now, profile?.timezone ?? "Europe/Kyiv");
    const [wallet, activity, bonuses] = await Promise.all([
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
    const [definitions, profile] = await Promise.all([
      db.questDefinition.findMany({
        where: { isActive: true },
        orderBy: [{ period: "asc" }, { displayOrder: "asc" }],
      }),
      db.userProfile.findUnique({ where: { userId }, select: { timezone: true } }),
    ]);
    const timezone = profile?.timezone ?? "Europe/Kyiv";
    const result = [];
    for (const quest of definitions) {
      const key = periodKey(quest.period, now, timezone);
      const current = await metricValue(db, userId, quest, now, timezone);
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
      const profile = await transaction.userProfile.findUnique({
        where: { userId },
        select: { timezone: true },
      });
      const timezone = profile?.timezone ?? "Europe/Kyiv";
      const key = periodKey(quest.period, now, timezone);
      const current = await metricValue(transaction, userId, quest, now, timezone);
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
      const periodQuests = await transaction.questDefinition.findMany({
        where: { period: quest.period, isActive: true },
        select: { id: true },
      });
      const claimedInPeriod = await transaction.userQuestProgress.count({
        where: {
          userId,
          periodKey: key,
          questId: { in: periodQuests.map(({ id }) => id) },
          claimedAt: { not: null },
        },
      });
      let bundle = null;
      if (claimedInPeriod === periodQuests.length) {
        const patchCode =
          quest.period === "DAILY"
            ? "daily-watch"
            : quest.period === "WEEKLY"
              ? "weekly-operation"
              : "monthly-route";
        await awardPatch(transaction, userId, patchCode, "QUEST_BUNDLE", key);
        if (quest.period === "DAILY") {
          await transaction.userBonus.upsert({
            where: { userId_type: { userId, type: "DOUBLE_XP_15M" } },
            create: { userId, type: "DOUBLE_XP_15M", quantity: 1 },
            update: { quantity: { increment: 1 } },
          });
          bundle = { bonus: "DOUBLE_XP_15M", patchCode };
        } else if (quest.period === "WEEKLY") {
          const bonus = await transaction.userBonus.findUnique({
            where: { userId_type: { userId, type: "STREAK_FREEZE" } },
          });
          if (!bonus) {
            await transaction.userBonus.create({
              data: { userId, type: "STREAK_FREEZE", quantity: 1 },
            });
          } else if (bonus.quantity < 2) {
            await transaction.userBonus.update({
              where: { id: bonus.id },
              data: { quantity: { increment: 1 } },
            });
          }
          const extra = await creditQuestCoins(transaction, userId, "weekly-bundle", key, 50);
          bundle = { coins: extra, bonus: "STREAK_FREEZE", patchCode };
        } else {
          const seasonalFrame = await transaction.cosmeticItem.findUnique({
            where: { code: "frame-monthly-route" },
          });
          if (seasonalFrame) {
            await transaction.userCosmetic.upsert({
              where: { userId_cosmeticId: { userId, cosmeticId: seasonalFrame.id } },
              create: { userId, cosmeticId: seasonalFrame.id },
              update: {},
            });
          }
          bundle = { patchCode, cosmeticCode: seasonalFrame?.code ?? null };
        }
      }
      return { claimed: true, coinsAwarded, bonus: quest.rewardBonus, bundle };
    });
  }

  async function getRewards(userId, { locale = "uk" } = {}) {
    const [status, cosmetics, bonuses] = await Promise.all([
      getStatus(userId),
      db.cosmeticItem.findMany({
        where: { OR: [{ isActive: true }, { owners: { some: { userId } } }] },
        orderBy: { displayOrder: "asc" },
        include: { owners: { where: { userId }, take: 1 } },
      }),
      db.userBonus.findMany({ where: { userId } }),
    ]);
    return {
      coins: status.coins,
      products: [
        {
          code: "double-xp-15m",
          type: "BONUS",
          title: locale === "uk" ? "×2 XP на 15 хвилин" : "×2 XP for 15 minutes",
          priceCoins: 30,
          owned: bonuses.find(({ type }) => type === "DOUBLE_XP_15M")?.quantity ?? 0,
        },
        {
          code: "streak-freeze",
          type: "BONUS",
          title: locale === "uk" ? "Захист серії" : "Streak freeze",
          priceCoins: 50,
          owned: bonuses.find(({ type }) => type === "STREAK_FREEZE")?.quantity ?? 0,
        },
        ...cosmetics.map((item) => ({
          code: item.code,
          type: item.type,
          title: item[locale === "en" ? "titleEn" : "titleUk"],
          description: item[locale === "en" ? "descriptionEn" : "descriptionUk"],
          priceCoins: item.priceCoins,
          owned: item.owners.length > 0 ? 1 : 0,
          metadata: item.metadata,
        })),
      ],
      bonuses: bonuses.map(({ id, type, quantity, activeUntil }) => ({
        id,
        type,
        quantity,
        activeUntil,
      })),
    };
  }

  async function purchaseReward(userId, productCode, idempotencyKey) {
    return runSerializable(db, async (transaction) => {
      const bonusProducts = {
        "double-xp-15m": { type: "DOUBLE_XP_15M", price: 30 },
        "streak-freeze": { type: "STREAK_FREEZE", price: 50 },
      };
      const bonusProduct = bonusProducts[productCode];
      const cosmetic = bonusProduct
        ? null
        : await transaction.cosmeticItem.findFirst({
            where: { code: productCode, isActive: true },
          });
      if (!bonusProduct && !cosmetic) throw notFound("Нагороду не знайдено.");
      const price = bonusProduct?.price ?? cosmetic.priceCoins;
      const dedupeKey = `PURCHASE:${userId}:${idempotencyKey}`;
      const prior = await transaction.coinTransaction.findUnique({ where: { dedupeKey } });
      if (prior) return { purchased: true, replayed: true, coinsSpent: 0 };
      if (cosmetic) {
        const owned = await transaction.userCosmetic.findUnique({
          where: { userId_cosmeticId: { userId, cosmeticId: cosmetic.id } },
        });
        if (owned) throw conflict("COSMETIC_ALREADY_OWNED", "Цю косметичну нагороду вже отримано.");
      }
      if (bonusProduct?.type === "STREAK_FREEZE") {
        const current = await transaction.userBonus.findUnique({
          where: { userId_type: { userId, type: "STREAK_FREEZE" } },
        });
        if ((current?.quantity ?? 0) >= 2) {
          throw conflict("STREAK_FREEZE_LIMIT", "Можна зберігати не більше двох захистів серії.");
        }
      }
      const debited = await transaction.userWallet.updateMany({
        where: { userId, coins: { gte: price } },
        data: { coins: { decrement: price } },
      });
      if (debited.count !== 1) throw conflict("INSUFFICIENT_COINS", "Недостатньо жетонів.");
      await transaction.coinTransaction.create({
        data: {
          userId,
          amount: -price,
          reason: "REWARD_PURCHASE",
          sourceType: bonusProduct ? "BONUS" : "COSMETIC",
          sourceId: productCode,
          dedupeKey,
        },
      });
      if (bonusProduct) {
        await transaction.userBonus.upsert({
          where: { userId_type: { userId, type: bonusProduct.type } },
          create: { userId, type: bonusProduct.type, quantity: 1 },
          update: { quantity: { increment: 1 } },
        });
      } else {
        await transaction.userCosmetic.create({
          data: { userId, cosmeticId: cosmetic.id },
        });
      }
      return { purchased: true, productCode, coinsSpent: price };
    });
  }

  async function activateBonus(userId, bonusId) {
    return runSerializable(db, async (transaction) => {
      const now = clock();
      const bonus = await transaction.userBonus.findFirst({
        where: { id: bonusId, userId },
      });
      if (!bonus) throw notFound("Бонус не знайдено.");
      if (bonus.type !== "DOUBLE_XP_15M") {
        throw conflict("BONUS_NOT_ACTIVATABLE", "Цей бонус застосовується автоматично.");
      }
      if (bonus.quantity < 1) throw conflict("BONUS_EMPTY", "Немає доступних бонусів.");
      if (bonus.activeUntil && bonus.activeUntil > now) {
        throw conflict("BONUS_ALREADY_ACTIVE", "Бонус ×2 XP уже активний.");
      }
      const activeUntil = new Date(now.getTime() + 15 * 60 * 1_000);
      await transaction.userBonus.update({
        where: { id: bonus.id },
        data: { quantity: { decrement: 1 }, activeUntil },
      });
      return { id: bonus.id, type: bonus.type, activeUntil };
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

  return {
    getStatus,
    getQuests,
    claimQuest,
    getRewards,
    purchaseReward,
    activateBonus,
    getPatches,
    setFeaturedPatches,
  };
}
