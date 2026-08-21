import { describe, expect, it, vi } from "vitest";

import { createAdminContentService } from "@/server/services/admin-content-service";

const now = new Date("2026-07-21T12:00:00.000Z");

function completeTerm(status = "DRAFT") {
  return {
    id: "term-1",
    slug: "medical-evacuation",
    status,
    currentRevision: 2,
    variants: [
      { locale: "EN", kind: "PRIMARY", value: "medical evacuation", isPrimary: true },
      { locale: "UK", kind: "PRIMARY", value: "медична евакуація", isPrimary: true },
    ],
    definitions: [
      { locale: "EN", shortDefinition: "A concise definition" },
      { locale: "UK", shortDefinition: "Коротке визначення" },
    ],
    categories: [{ categoryId: "category-1", isPrimary: true }],
    sources: [
      {
        sourceId: "source-1",
        verificationStatus: "VERIFIED",
        checkedAt: now,
        checkedById: "admin-1",
        source: { exactUrl: "https://example.gov/term" },
      },
    ],
    reviews: [{ status: "APPROVED", revisionNumber: 2 }],
    revisions: [],
    audioAssets: [],
  };
}

function transactionDb(overrides = {}) {
  const db = {
    term: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    lesson: { findUnique: vi.fn(), update: vi.fn() },
    contentReview: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    contentRevision: { create: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    user: { findUnique: vi.fn(), count: vi.fn() },
    authSession: { updateMany: vi.fn() },
    audioAsset: { updateMany: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    termReport: { findUnique: vi.fn(), update: vi.fn() },
    ...overrides,
  };
  db.$transaction = vi.fn((callback) => callback(db));
  return db;
}

describe("admin content service", () => {
  it("does not submit incomplete terminology for review", async () => {
    const db = transactionDb();
    db.term.findUnique.mockResolvedValue({ ...completeTerm(), sources: [] });
    const service = createAdminContentService(db, { clock: () => now });

    await expect(service.transitionTerm("admin-1", "term-1", "IN_REVIEW")).rejects.toMatchObject({
      code: "INCOMPLETE_CONTENT",
      status: 409,
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("publishes only the approved current revision and writes an audit event", async () => {
    const db = transactionDb();
    const term = completeTerm("APPROVED");
    db.term.findUnique.mockResolvedValue(term);
    const service = createAdminContentService(db, { clock: () => now });

    await service.transitionTerm("admin-1", "term-1", "PUBLISHED");

    expect(db.term.update).toHaveBeenCalledWith({
      where: { id: "term-1" },
      data: expect.objectContaining({
        status: "PUBLISHED",
        publishedAt: now,
        publishedById: "admin-1",
      }),
    });
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "TERM_PUBLISHED" }) }),
    );
  });

  it("records the actor when a pending review is superseded by an edit", async () => {
    const db = transactionDb();
    db.term.findUnique.mockResolvedValue(completeTerm("IN_REVIEW"));
    const service = createAdminContentService(db, { clock: () => now });

    await service.updateTerm("admin-1", "term-1", { changeNote: "Corrected draft" });

    expect(db.contentReview.updateMany).toHaveBeenCalledWith({
      where: { termId: "term-1", status: "PENDING" },
      data: { status: "SUPERSEDED", decidedAt: now, decidedById: "admin-1" },
    });
  });

  it("preserves variant ids referenced by immutable learning history", async () => {
    const termVariant = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "variant-en",
          locale: "EN",
          normalizedValue: "medical evacuation",
        },
        {
          id: "variant-old",
          locale: "EN",
          normalizedValue: "medevacuation",
        },
      ]),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    const db = transactionDb({ termVariant });
    db.term.findUnique.mockResolvedValue(completeTerm());
    const service = createAdminContentService(db, { clock: () => now });

    await service.updateTerm("admin-1", "term-1", {
      changeNote: "Refresh accepted spelling",
      variants: [
        {
          locale: "EN",
          kind: "PRIMARY",
          value: "medical evacuation",
          isPrimary: true,
          isAcceptedAnswer: true,
        },
      ],
    });

    expect(termVariant.update).toHaveBeenCalledWith({
      where: { id: "variant-en" },
      data: expect.objectContaining({ normalizedValue: "medical evacuation", isPrimary: true }),
    });
    expect(termVariant.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["variant-old"] },
        acceptedAnswers: { none: {} },
        promptItems: { none: {} },
      },
    });
  });

  it("supersedes the pending review when a term returns to draft", async () => {
    const db = transactionDb();
    db.term.findUnique.mockResolvedValue(completeTerm("IN_REVIEW"));
    const service = createAdminContentService(db, { clock: () => now });

    await service.transitionTerm("admin-1", "term-1", "DRAFT", "Needs revision");

    expect(db.contentReview.updateMany).toHaveBeenCalledWith({
      where: {
        termId: "term-1",
        revisionNumber: 2,
        status: "PENDING",
      },
      data: {
        status: "SUPERSEDED",
        decidedAt: now,
        decidedById: "admin-1",
        note: "Needs revision",
      },
    });
    expect(db.term.update).toHaveBeenCalledWith({
      where: { id: "term-1" },
      data: expect.objectContaining({ status: "DRAFT" }),
    });
  });

  it("records the reviewer when rejecting a stale review decision", async () => {
    const db = transactionDb();
    db.contentReview.findUnique.mockResolvedValue({
      id: "review-1",
      status: "PENDING",
      revisionNumber: 1,
      termId: "term-1",
      term: completeTerm("DRAFT"),
    });
    const service = createAdminContentService(db, { clock: () => now });

    await expect(
      service.decideReview("admin-1", "review-1", "APPROVED", "Outdated"),
    ).rejects.toMatchObject({ code: "STALE_REVIEW" });
    expect(db.contentReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: { status: "SUPERSEDED", decidedAt: now, decidedById: "admin-1" },
    });
  });

  it("enforces the 6–12 term lesson publication boundary", async () => {
    const db = transactionDb();
    db.lesson.findUnique.mockResolvedValue({
      id: "lesson-1",
      status: "DRAFT",
      terms: Array.from({ length: 5 }, (_, index) => ({ termId: `term-${index}` })),
    });
    const service = createAdminContentService(db, { clock: () => now });

    await expect(service.setLessonStatus("admin-1", "lesson-1", "PUBLISHED")).rejects.toMatchObject(
      {
        code: "INVALID_LESSON_SIZE",
        status: 422,
      },
    );
    expect(db.lesson.update).not.toHaveBeenCalled();
  });

  it("protects the final active administrator", async () => {
    const db = transactionDb();
    db.user.findUnique.mockResolvedValue({
      id: "admin-1",
      status: "ACTIVE",
      userRoles: [{ role: { code: "ADMIN" }, expiresAt: null }],
    });
    db.user.count.mockResolvedValue(1);
    const service = createAdminContentService(db, { clock: () => now });

    await expect(
      service.updateUser("admin-1", "admin-1", { status: "SUSPENDED" }),
    ).rejects.toMatchObject({
      code: "LAST_ADMIN_REQUIRED",
    });
  });

  it("never approves JSON imports during preview", () => {
    const db = transactionDb();
    const service = createAdminContentService(db, { clock: () => now });
    const preview = service.previewImport("json", [
      {
        external_key: "medevac",
        english: "medical evacuation",
        ukrainian: "медична евакуація",
        part_of_speech: "noun",
        difficulty: 2,
        category_slug: "tactical-medicine",
        definition_en: "Movement for medical care",
        definition_uk: "Переміщення для медичної допомоги",
        example: "",
        context_note: "",
        source_url: "https://example.gov/medevac",
        source_title: "Public glossary",
      },
    ]);

    expect(preview.errors).toEqual([]);
    expect(preview.rows[0].data).toMatchObject({
      status: "DRAFT",
      origin: "CSV_IMPORT",
      source: { verificationStatus: "UNVERIFIED" },
    });
  });

  it("keeps one primary audio asset per locale", async () => {
    const db = transactionDb();
    db.term.findUnique.mockResolvedValue({ id: "term-1", status: "DRAFT" });
    db.audioAsset.create.mockResolvedValue({
      id: "audio-1",
      termId: "term-1",
      locale: "EN",
      kind: "HUMAN_RECORDING",
    });
    const service = createAdminContentService(db, { clock: () => now });

    await service.createAudioAsset("admin-1", "term-1", {
      locale: "EN",
      isPrimary: true,
      kind: "HUMAN_RECORDING",
      provider: "LOCAL",
      objectKey: "audio.mp3",
      mimeType: "audio/mpeg",
      byteSize: 100,
      checksum: "a".repeat(64),
    });

    expect(db.audioAsset.updateMany).toHaveBeenCalledWith({
      where: { termId: "term-1", locale: "EN", archivedAt: null, isPrimary: true },
      data: { isPrimary: false },
    });
  });
});
