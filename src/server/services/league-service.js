import { getIsoWeek } from "@/server/services/gamification-service";

const divisions = ["BRONZE", "STEEL", "GOLD", "SAPPHIRE", "DIAMOND"];
const patchByDivision = Object.fromEntries(
  divisions.map((division) => [division, `league-${division.toLowerCase()}`]),
);

function nextDivision(division, offset) {
  const index = divisions.indexOf(division);
  return divisions[Math.max(0, Math.min(divisions.length - 1, index + offset))];
}

async function awardDivisionPatch(db, userId, division, triggerId) {
  const patch = await db.patchDefinition.findUnique({ where: { code: patchByDivision[division] } });
  if (!patch) return;
  await db.userPatch.upsert({
    where: { userId_patchId: { userId, patchId: patch.id } },
    create: { userId, patchId: patch.id, triggerType: "LEAGUE_DIVISION", triggerId },
    update: {},
  });
}

async function awardLeagueCoins(db, userId, seasonId, amount, rank) {
  if (!amount) return;
  const dedupeKey = `LEAGUE:${userId}:${seasonId}`;
  if (await db.coinTransaction.findUnique({ where: { dedupeKey } })) return;
  await db.userWallet.upsert({
    where: { userId },
    create: { userId, coins: amount },
    update: { coins: { increment: amount } },
  });
  await db.coinTransaction.create({
    data: {
      userId,
      amount,
      reason: "LEAGUE_REWARD",
      sourceType: "LEAGUE_SEASON",
      sourceId: seasonId,
      dedupeKey,
      metadata: { rank },
    },
  });
}

export function createLeagueService(db, { clock = () => new Date() } = {}) {
  async function finalizeExpiredSeasons() {
    const now = clock();
    const expired = await db.leagueSeason.findMany({
      where: { endsAt: { lte: now }, finalizedAt: null },
      include: { groups: { include: { members: true } } },
    });
    for (const season of expired) {
      const period = await db.leaderboardPeriod.findUnique({ where: { slug: season.slug } });
      const scores = period
        ? await db.leaderboardEntry.findMany({ where: { periodId: period.id } })
        : [];
      const scoreByUser = new Map(scores.map((entry) => [entry.userId, entry]));
      await db.$transaction(async (transaction) => {
        for (const group of season.groups) {
          const ranked = group.members
            .map((member) => ({
              ...member,
              weeklyXp: scoreByUser.get(member.userId)?.xp ?? member.weeklyXp,
              reachedAt: scoreByUser.get(member.userId)?.updatedAt ?? member.reachedAt,
            }))
            .sort(
              (left, right) => right.weeklyXp - left.weeklyXp || left.reachedAt - right.reachedAt,
            );
          const promotionCount =
            ranked.length < 10 ? Math.min(3, ranked.length) : Math.min(7, ranked.length);
          const relegationCount =
            ranked.length < 10 || group.division === "BRONZE" ? 0 : Math.min(5, ranked.length);
          for (const [index, member] of ranked.entries()) {
            const promoted = index < promotionCount && group.division !== "DIAMOND";
            const relegated = relegationCount > 0 && index >= ranked.length - relegationCount;
            const division = promoted
              ? nextDivision(group.division, 1)
              : relegated
                ? nextDivision(group.division, -1)
                : group.division;
            const reward =
              index === 0 ? 100 : index === 1 ? 75 : index === 2 ? 50 : promoted ? 25 : 0;
            await transaction.userProfile.update({
              where: { userId: member.userId },
              data: { leagueDivision: division },
            });
            await transaction.leagueMembership.update({
              where: { id: member.id },
              data: { weeklyXp: member.weeklyXp, reachedAt: member.reachedAt, finalizedAt: now },
            });
            await awardLeagueCoins(transaction, member.userId, season.id, reward, index + 1);
            if (division !== group.division) {
              await awardDivisionPatch(transaction, member.userId, division, season.id);
            }
          }
        }
        await transaction.leagueSeason.update({
          where: { id: season.id },
          data: { finalizedAt: now },
        });
      });
    }
  }

  async function getCurrent(userId) {
    await finalizeExpiredSeasons();
    const now = clock();
    const profile = await db.userProfile.findUnique({
      where: { userId },
      select: { leagueDivision: true, leaderboardVisible: true },
    });
    const division = profile?.leagueDivision ?? "BRONZE";
    if (!profile?.leaderboardVisible) {
      return { division, optedIn: false, entries: [], promotionCount: 0, relegationCount: 0 };
    }
    const week = getIsoWeek(now);
    const season = await db.leagueSeason.upsert({
      where: { slug: week.slug },
      create: { slug: week.slug, startsAt: week.startsAt, endsAt: week.endsAt },
      update: { startsAt: week.startsAt, endsAt: week.endsAt },
    });
    let membership = await db.leagueMembership.findUnique({
      where: { seasonId_userId: { seasonId: season.id, userId } },
    });
    if (!membership) {
      const groups = await db.leagueGroup.findMany({
        where: { seasonId: season.id, division },
        orderBy: { groupNumber: "asc" },
        include: { _count: { select: { members: true } } },
      });
      let group = groups.find((entry) => entry._count.members < 30);
      if (!group) {
        group = await db.leagueGroup.create({
          data: {
            seasonId: season.id,
            division,
            groupNumber: (groups.at(-1)?.groupNumber ?? 0) + 1,
          },
        });
      }
      membership = await db.leagueMembership.create({
        data: { seasonId: season.id, groupId: group.id, userId },
      });
      await awardDivisionPatch(db, userId, division, season.id);
    }
    const period = await db.leaderboardPeriod.findUnique({ where: { slug: week.slug } });
    const userScore = period
      ? await db.leaderboardEntry.findUnique({
          where: { periodId_userId: { periodId: period.id, userId } },
        })
      : null;
    membership = await db.leagueMembership.update({
      where: { id: membership.id },
      data: {
        weeklyXp: userScore?.xp ?? 0,
        reachedAt: userScore?.updatedAt ?? membership.reachedAt,
      },
    });
    const members = await db.leagueMembership.findMany({
      where: { groupId: membership.groupId },
      include: {
        user: {
          select: {
            profile: { select: { nickname: true, avatarKey: true, avatarConfig: true } },
            featuredPatches: {
              where: { slot: 1 },
              include: { patch: { select: { code: true, titleUk: true, titleEn: true } } },
            },
          },
        },
      },
      orderBy: [{ weeklyXp: "desc" }, { reachedAt: "asc" }],
    });
    const promotionCount = members.length < 10 ? Math.min(3, members.length) : 7;
    const relegationCount = members.length < 10 || division === "BRONZE" ? 0 : 5;
    return {
      division,
      optedIn: true,
      season: { slug: season.slug, startsAt: season.startsAt, endsAt: season.endsAt },
      promotionCount,
      relegationCount,
      entries: members.map((entry, index) => ({
        rank: index + 1,
        nickname: entry.user.profile?.nickname ?? "—",
        avatarKey: entry.user.profile?.avatarKey ?? null,
        avatarConfig: entry.user.profile?.avatarConfig ?? null,
        featuredPatch: entry.user.featuredPatches[0]?.patch ?? null,
        xp: entry.weeklyXp,
        isCurrentUser: entry.userId === userId,
        zone:
          index < promotionCount
            ? division === "DIAMOND"
              ? "TOP"
              : "PROMOTION"
            : relegationCount && index >= members.length - relegationCount
              ? "RELEGATION"
              : "SAFE",
      })),
    };
  }

  return { getCurrent, finalizeExpiredSeasons };
}
