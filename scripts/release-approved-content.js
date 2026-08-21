import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { createAdminContentService } from "../src/server/services/admin-content-service.js";

function argument(name) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const reviewerEmail = argument("reviewer-email") ?? process.env.CONTENT_ACTOR_EMAIL;
const allowUnreviewedBeta = process.argv.includes("--allow-unreviewed-beta");
if (!reviewerEmail) throw new Error("Use --reviewer-email=<existing administrator email>.");

const db = new PrismaClient();
try {
  const reviewer = await db.user.findUnique({
    where: { email: reviewerEmail },
    include: { userRoles: { include: { role: true } } },
  });
  if (!reviewer || !reviewer.userRoles.some(({ role }) => role.code === "ADMIN")) {
    throw new Error("The supplied reviewer is not an administrator.");
  }
  const root = path.resolve("prisma/content/v1");
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  const bundles = await Promise.all(
    manifest.files.map(async ({ file }) =>
      JSON.parse(await readFile(path.join(root, file), "utf8")),
    ),
  );
  const allTerms = bundles.flatMap(({ lessons, glossaryTerms = [] }) => [
    ...lessons.flatMap(({ terms }) => terms),
    ...glossaryTerms,
  ]);
  const rows = await db.term.findMany({
    where: { slug: { in: allTerms.map(({ slug }) => slug) } },
    select: { id: true, slug: true, status: true },
  });
  const bySlug = new Map(rows.map((term) => [term.slug, term]));
  const blockers = allTerms.filter(({ slug }) => {
    const term = bySlug.get(slug);
    return !term || (!allowUnreviewedBeta && term.status !== "APPROVED");
  });
  if (blockers.length) {
    throw new Error(
      `Release blocked: ${blockers.length} terms are missing or not APPROVED. First examples: ${blockers
        .slice(0, 8)
        .map(({ slug }) => slug)
        .join(", ")}`,
    );
  }

  const service = createAdminContentService(db);
  for (const term of rows) {
    if (allowUnreviewedBeta && term.status !== "APPROVED") {
      await service.publishBetaTerm(
        reviewer.id,
        term.id,
        `Explicit unreviewed beta release ${manifest.version}`,
      );
    } else {
      await service.transitionTerm(
        reviewer.id,
        term.id,
        "PUBLISHED",
        `Publish release ${manifest.version}`,
      );
    }
  }
  const rewardCounts = {
    "basic-military-english": 5,
    "general-tactical-english": 3,
    "tactical-medicine": 2,
    "drones-uas": 1,
    "sniper-terminology": 1,
  };
  const categoryPatchCodes = {
    "basic-military-english": "category-basic",
    "general-tactical-english": "category-tactical",
    "tactical-medicine": "category-medicine",
    "drones-uas": "category-drones",
    "sniper-terminology": "category-sniper",
  };
  for (const bundle of bundles) {
    const category = await db.category.findUnique({ where: { slug: bundle.category.slug } });
    const releasedLessons = [];
    for (const lesson of bundle.lessons) {
      const termIds = lesson.terms.map(({ slug }) => bySlug.get(slug).id);
      const input = {
        slug: `${bundle.category.slug}-${lesson.slug}`,
        categoryId: category.id,
        titleUk: lesson.titleUk,
        titleEn: lesson.titleEn,
        descriptionUk: `${lesson.cefrLevel} · ${lesson.terms.length} термінів із навчальних джерел: ${lesson.titleUk}.`,
        descriptionEn: `${lesson.cefrLevel} · ${lesson.terms.length} terms from the learning sources: ${lesson.titleEn}.`,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        termIds,
      };
      const existing = await db.lesson.findUnique({ where: { slug: input.slug } });
      const saved = existing
        ? await service.updateLesson(reviewer.id, existing.id, input)
        : await service.createLesson(reviewer.id, input);
      if (saved.status !== "PUBLISHED") {
        await service.setLessonStatus(reviewer.id, saved.id, "PUBLISHED");
      }
      const fact = lesson.fact
        ? await db.lessonFact.upsert({
            where: { lessonId: saved.id },
            update: lesson.fact,
            create: { lessonId: saved.id, ...lesson.fact },
          })
        : null;
      releasedLessons.push({ source: lesson, saved, fact });
    }

    const rewardCount = rewardCounts[bundle.category.slug];
    const rewardAfter = new Set(
      Array.from({ length: rewardCount }, (_, index) =>
        Math.ceil(((index + 1) * releasedLessons.length) / (rewardCount + 1)),
      ),
    );
    const activeNodeSlugs = releasedLessons.flatMap((lesson, index) => {
      const baseSlug = `${bundle.category.slug}-${lesson.source.slug}`;
      return [
        `${baseSlug}-lesson`,
        `${baseSlug}-quiz`,
        ...(lesson.fact ? [`${baseSlug}-fact`] : []),
        ...(rewardAfter.has(index + 1) ? [`${bundle.category.slug}-reward-${index + 1}`] : []),
      ];
    });
    activeNodeSlugs.push(`${bundle.category.slug}-checkpoint`, `${bundle.category.slug}-patch`);
    // Move obsolete and retained nodes into separate temporary ranges before
    // assigning the new contiguous positions. This keeps the unique
    // (category, position) constraint valid even after lesson insertion.
    await db.learningNode.updateMany({
      where: { categoryId: category.id, slug: { notIn: activeNodeSlugs } },
      data: { position: { increment: 1_000_000 }, active: false },
    });
    await db.learningNode.updateMany({
      where: { categoryId: category.id, slug: { in: activeNodeSlugs } },
      data: { position: { increment: 100_000 } },
    });
    let position = 0;
    for (const [index, lesson] of releasedLessons.entries()) {
      const baseSlug = `${bundle.category.slug}-${lesson.source.slug}`;
      const common = {
        categoryId: category.id,
        lessonId: lesson.saved.id,
        active: true,
      };
      await db.learningNode.upsert({
        where: { slug: `${baseSlug}-lesson` },
        update: {
          ...common,
          position,
          titleUk: lesson.source.titleUk,
          titleEn: lesson.source.titleEn,
        },
        create: {
          ...common,
          slug: `${baseSlug}-lesson`,
          type: "LESSON",
          position,
          titleUk: lesson.source.titleUk,
          titleEn: lesson.source.titleEn,
          displayMetadata: { estimatedMinutes: lesson.source.estimatedMinutes },
        },
      });
      position += 1;
      await db.learningNode.upsert({
        where: { slug: `${baseSlug}-quiz` },
        update: {
          ...common,
          position,
          titleUk: `Квіз: ${lesson.source.titleUk}`,
          titleEn: `Quiz: ${lesson.source.titleEn}`,
        },
        create: {
          ...common,
          slug: `${baseSlug}-quiz`,
          type: "QUIZ",
          position,
          titleUk: `Квіз: ${lesson.source.titleUk}`,
          titleEn: `Quiz: ${lesson.source.titleEn}`,
          displayMetadata: { textOnly: true, choices: 6 },
        },
      });
      position += 1;
      if (lesson.fact) {
        await db.learningNode.upsert({
          where: { slug: `${baseSlug}-fact` },
          update: {
            categoryId: category.id,
            lessonId: lesson.saved.id,
            factId: lesson.fact.id,
            position,
            active: true,
            titleUk: lesson.fact.titleUk,
            titleEn: lesson.fact.titleEn,
          },
          create: {
            categoryId: category.id,
            lessonId: lesson.saved.id,
            factId: lesson.fact.id,
            slug: `${baseSlug}-fact`,
            type: "FACT",
            position,
            titleUk: lesson.fact.titleUk,
            titleEn: lesson.fact.titleEn,
            rewardXp: 5,
            active: true,
          },
        });
        position += 1;
      }
      if (rewardAfter.has(index + 1)) {
        await db.learningNode.upsert({
          where: { slug: `${bundle.category.slug}-reward-${index + 1}` },
          update: { categoryId: category.id, position, active: true },
          create: {
            categoryId: category.id,
            slug: `${bundle.category.slug}-reward-${index + 1}`,
            type: "REWARD",
            position,
            titleUk: "Польова скриня",
            titleEn: "Field chest",
            rewardCoins: 20,
            displayMetadata: { requiredCompletions: index + 1 },
            active: true,
          },
        });
        position += 1;
      }
    }
    await db.learningNode.upsert({
      where: { slug: `${bundle.category.slug}-checkpoint` },
      update: { categoryId: category.id, position, active: true },
      create: {
        categoryId: category.id,
        slug: `${bundle.category.slug}-checkpoint`,
        type: "CHECKPOINT",
        position,
        titleUk: "Контрольна точка з Морквою",
        titleEn: "Checkpoint with Morkva",
        displayMetadata: { mascotState: "checkpoint" },
        active: true,
      },
    });
    position += 1;
    const categoryPatch = await db.patchDefinition.findUnique({
      where: { code: categoryPatchCodes[bundle.category.slug] },
    });
    await db.learningNode.upsert({
      where: { slug: `${bundle.category.slug}-patch` },
      update: { categoryId: category.id, patchId: categoryPatch?.id, position, active: true },
      create: {
        categoryId: category.id,
        patchId: categoryPatch?.id,
        slug: `${bundle.category.slug}-patch`,
        type: "PATCH",
        position,
        titleUk: categoryPatch?.titleUk ?? "Категорійний патч",
        titleEn: categoryPatch?.titleEn ?? "Category patch",
        active: true,
      },
    });
    await db.learningNode.updateMany({
      where: { categoryId: category.id, slug: { notIn: activeNodeSlugs } },
      data: { active: false },
    });

    const legacyProgress = await db.userLessonProgress.findMany({
      where: {
        lessonId: { in: releasedLessons.map(({ saved }) => saved.id) },
        completions: { gt: 0 },
      },
    });
    const completionNodes = await db.learningNode.findMany({
      where: {
        categoryId: category.id,
        type: { in: ["LESSON", "QUIZ"] },
        lessonId: { in: legacyProgress.map(({ lessonId }) => lessonId) },
      },
    });
    for (const progress of legacyProgress) {
      for (const node of completionNodes.filter(({ lessonId }) => lessonId === progress.lessonId)) {
        await db.userLearningNodeProgress.upsert({
          where: { userId_nodeId: { userId: progress.userId, nodeId: node.id } },
          update: {},
          create: {
            userId: progress.userId,
            nodeId: node.id,
            attempts: progress.completions,
            completions: progress.completions,
            bestScore: progress.bestScore,
            stars: progress.bestScore >= 90 ? 3 : progress.bestScore >= 70 ? 2 : 1,
            firstCompletedAt: progress.firstCompletedAt,
            lastCompletedAt: progress.lastCompletedAt,
          },
        });
      }
    }
  }
  console.log(
    `Published ${rows.length} ${allowUnreviewedBeta ? "unreviewed beta" : "reviewed"} terms and ${manifest.expected.lessons} lessons.`,
  );
} finally {
  await db.$disconnect();
}
