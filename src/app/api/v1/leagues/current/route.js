import { requireApiUser } from "@/app/api/v1/_shared";
import { prisma } from "@/lib/db/prisma";
import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createProgressService } from "@/server/services/progress-service";

export const GET = withApiErrors(async (request) => {
  const principal = await requireApiUser(request);
  const [board, profile] = await Promise.all([
    createProgressService(prisma).leaderboard("weekly", 30, principal.userId),
    prisma.userProfile.findUnique({
      where: { userId: principal.userId },
      select: { leagueDivision: true, leaderboardVisible: true },
    }),
  ]);
  return apiData(
    {
      division: profile?.leagueDivision ?? "BRONZE",
      optedIn: profile?.leaderboardVisible ?? false,
      promotionCount: board.entries.length < 10 ? 3 : 7,
      relegationCount: profile?.leagueDivision === "BRONZE" || board.entries.length < 10 ? 0 : 5,
      ...board,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
