import { createGamificationService } from "@/server/services/gamification-service";
import { conflict, notFound } from "@/server/services/errors";
import { runSerializable } from "@/server/services/study-service";

function text(record, locale, field = "title") {
  return record[`${field}${locale === "en" ? "En" : "Uk"}`] ?? null;
}

function starCount(progress) {
  return progress?.stars ?? 0;
}

function nodeState(node, progress, { recommended, claimable }) {
  if (progress?.claimedAt) return "CLAIMED";
  if (claimable) return "CLAIMABLE";
  if (progress?.completions > 0) return starCount(progress) === 3 ? "PERFECT" : "COMPLETED";
  return recommended ? "RECOMMENDED" : "NOT_STARTED";
}

async function creditCoins(transaction, { userId, amount, reason, sourceType, sourceId }) {
  const dedupeKey = `${sourceType}:${userId}:${sourceId}`;
  const existing = await transaction.coinTransaction.findUnique({ where: { dedupeKey } });
  if (existing) return { amount: 0, duplicate: true };
  await transaction.userWallet.upsert({
    where: { userId },
    create: { userId, coins: amount },
    update: { coins: { increment: amount } },
  });
  await transaction.coinTransaction.create({
    data: { userId, amount, reason, sourceType, sourceId, dedupeKey },
  });
  return { amount, duplicate: false };
}

export function createLearningPathService(db, { clock = () => new Date() } = {}) {
  async function rawPath(userId, categorySlug) {
    const category = await db.category.findFirst({
      where: { slug: categorySlug, archivedAt: null },
      include: {
        learningNodes: {
          where: { active: true },
          orderBy: { position: "asc" },
          include: {
            lesson: { include: { _count: { select: { terms: true } } } },
            fact: true,
            patch: true,
            progress: { where: { userId }, take: 1 },
          },
        },
      },
    });
    if (!category) throw notFound("Категорію не знайдено.");
    return category;
  }

  async function getPath(userId, categorySlug, { locale = "uk" } = {}) {
    const category = await rawPath(userId, categorySlug);
    const activeSessions = await db.studySession.findMany({
      where: {
        userId,
        status: "ACTIVE",
        expiresAt: { gt: clock() },
        nodeId: { in: category.learningNodes.map((node) => node.id) },
      },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        nodeId: true,
        currentStage: true,
        items: { select: { status: true } },
      },
    });
    const activeByNode = new Map();
    for (const session of activeSessions) {
      if (session.nodeId && !activeByNode.has(session.nodeId))
        activeByNode.set(session.nodeId, session);
    }
    const educational = category.learningNodes.filter((node) =>
      ["LESSON", "QUIZ", "FACT", "CHECKPOINT"].includes(node.type),
    );
    const activeNode = category.learningNodes.find((node) => activeByNode.has(node.id));
    const recommendedNode =
      activeNode ?? educational.find((node) => !node.progress[0]?.completions) ?? educational[0];
    const completedLessonNodes = category.learningNodes.filter(
      (node) => node.type === "LESSON" && node.progress[0]?.completions,
    ).length;
    const checkpointComplete = category.learningNodes.some(
      (node) => node.type === "CHECKPOINT" && node.progress[0]?.completions,
    );

    return {
      category: {
        id: category.id,
        slug: category.slug,
        name: text(category, locale, "name"),
        description: text(category, locale, "description"),
      },
      recommendedNodeId: recommendedNode?.id ?? null,
      completedNodes: educational.filter((node) => node.progress[0]?.completions).length,
      totalNodes: category.learningNodes.length,
      nodes: category.learningNodes.map((node) => {
        const progress = node.progress[0] ?? null;
        const activeSession = activeByNode.get(node.id) ?? null;
        const answeredItems =
          activeSession?.items.filter((item) => item.status === "ANSWERED").length ?? 0;
        const totalItems = activeSession?.items.length ?? 0;
        const requiredCompletions = Number(node.displayMetadata?.requiredCompletions ?? 0);
        const claimable =
          !progress?.claimedAt &&
          ((node.type === "REWARD" && completedLessonNodes >= requiredCompletions) ||
            (node.type === "PATCH" && checkpointComplete));
        const recommended = node.id === recommendedNode?.id;
        return {
          id: node.id,
          slug: node.slug,
          type: node.type,
          position: node.position,
          title: text(node, locale),
          state: nodeState(node, progress, { recommended, claimable }),
          recommended,
          playable: ["LESSON", "QUIZ", "CHECKPOINT"].includes(node.type),
          readable: node.type === "FACT",
          claimable,
          completed: Boolean(progress?.completions),
          bestScore: progress?.bestScore ?? 0,
          stars: progress?.stars ?? 0,
          lessonId: node.lessonId,
          termCount: node.lesson?._count.terms ?? 0,
          estimatedMinutes: node.lesson?.estimatedMinutes ?? (node.type === "FACT" ? 2 : 1),
          activeSessionId: activeSession?.id ?? null,
          answeredItems,
          totalItems,
          progressPercent: totalItems ? Math.round((answeredItems / totalItems) * 100) : 0,
          rewardPreview:
            node.type === "REWARD"
              ? { coins: node.rewardCoins }
              : node.type === "PATCH"
                ? { patch: node.patch ? text(node.patch, locale) : null }
                : node.rewardXp
                  ? { xp: node.rewardXp }
                  : null,
          fact:
            node.fact && node.type === "FACT"
              ? {
                  title: text(node.fact, locale),
                  body: text(node.fact, locale, "body"),
                  sourceTitle: node.fact.sourceTitle,
                  sourceUrl: node.fact.sourceUrl,
                  isBeta: node.fact.isBeta,
                }
              : null,
        };
      }),
    };
  }

  async function completeNode(userId, nodeId) {
    return runSerializable(db, async (transaction) => {
      const node = await transaction.learningNode.findFirst({
        where: { id: nodeId, active: true },
      });
      if (!node) throw notFound("Вузол не знайдено.");
      if (node.type !== "FACT") {
        throw conflict("NODE_REQUIRES_SESSION", "Цей вузол завершується через навчальну сесію.");
      }
      const now = clock();
      const existing = await transaction.userLearningNodeProgress.findUnique({
        where: { userId_nodeId: { userId, nodeId } },
      });
      await transaction.userLearningNodeProgress.upsert({
        where: { userId_nodeId: { userId, nodeId } },
        create: {
          userId,
          nodeId,
          attempts: 1,
          completions: 1,
          bestScore: 100,
          stars: 3,
          firstCompletedAt: now,
          lastCompletedAt: now,
        },
        update: {
          attempts: { increment: 1 },
          completions: { increment: 1 },
          lastCompletedAt: now,
        },
      });
      let xpAwarded = 0;
      if (!existing?.firstCompletedAt && node.rewardXp > 0) {
        const xp = await createGamificationService(transaction, { clock }).awardXp({
          userId,
          amount: node.rewardXp,
          reason: "FACT_COMPLETION",
          sourceType: "LEARNING_NODE",
          sourceId: node.id,
          dedupeKey: `fact:${userId}:${node.id}`,
        });
        xpAwarded = xp.amount;
      }
      return { id: node.id, completed: true, xpAwarded };
    });
  }

  async function claimNode(userId, nodeId) {
    return runSerializable(db, async (transaction) => {
      const node = await transaction.learningNode.findFirst({
        where: { id: nodeId, active: true },
        include: { patch: true },
      });
      if (!node) throw notFound("Вузол не знайдено.");
      if (!["REWARD", "PATCH"].includes(node.type)) {
        throw conflict("NODE_NOT_CLAIMABLE", "Цей вузол не містить нагороди.");
      }
      const progress = await transaction.userLearningNodeProgress.findUnique({
        where: { userId_nodeId: { userId, nodeId } },
      });
      if (progress?.claimedAt) return { id: node.id, claimed: true, replayed: true };
      const related = await transaction.learningNode.findMany({
        where: { categoryId: node.categoryId, position: { lt: node.position } },
        include: { progress: { where: { userId }, take: 1 } },
      });
      const eligible =
        node.type === "REWARD"
          ? related.filter((entry) => entry.type === "LESSON" && entry.progress[0]?.completions)
              .length >= Number(node.displayMetadata?.requiredCompletions ?? 0)
          : related.some((entry) => entry.type === "CHECKPOINT" && entry.progress[0]?.completions);
      if (!eligible) throw conflict("REWARD_NOT_READY", "Спочатку виконайте умову нагороди.");
      const now = clock();
      await transaction.userLearningNodeProgress.upsert({
        where: { userId_nodeId: { userId, nodeId } },
        create: { userId, nodeId, claimedAt: now },
        update: { claimedAt: now },
      });
      const coinResult =
        node.rewardCoins > 0
          ? await creditCoins(transaction, {
              userId,
              amount: node.rewardCoins,
              reason: "PATH_REWARD",
              sourceType: "LEARNING_NODE",
              sourceId: node.id,
            })
          : { amount: 0 };
      if (node.type === "PATCH" && node.patchId) {
        await transaction.userPatch.upsert({
          where: { userId_patchId: { userId, patchId: node.patchId } },
          create: {
            userId,
            patchId: node.patchId,
            triggerType: "LEARNING_NODE",
            triggerId: node.id,
          },
          update: {},
        });
      }
      return {
        id: node.id,
        claimed: true,
        coinsAwarded: coinResult.amount,
        patch: node.patch
          ? { code: node.patch.code, titleUk: node.patch.titleUk, titleEn: node.patch.titleEn }
          : null,
      };
    });
  }

  return { getPath, completeNode, claimNode };
}
