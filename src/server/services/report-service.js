import { notFound } from "@/server/services/errors";

export function createReportService(db) {
  async function create(userId, input) {
    const term = await db.term.findFirst({
      where: { id: input.termId, status: "PUBLISHED", archivedAt: null },
      select: { id: true },
    });
    if (!term) throw notFound("Опублікований термін не знайдено.");
    return db.termReport.create({
      data: {
        termId: term.id,
        submittedById: userId,
        reason: input.reason,
        details: input.details || null,
      },
      select: { id: true, termId: true, reason: true, status: true, createdAt: true },
    });
  }

  async function listOwn(userId) {
    return db.termReport.findMany({
      where: { submittedById: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        termId: true,
        reason: true,
        details: true,
        status: true,
        resolutionNote: true,
        createdAt: true,
        resolvedAt: true,
      },
    });
  }

  return { create, listOwn };
}
