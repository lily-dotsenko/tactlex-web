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
  const allTerms = bundles.flatMap(({ lessons }) => lessons.flatMap(({ terms }) => terms));
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
  for (const bundle of bundles) {
    const category = await db.category.findUnique({ where: { slug: bundle.category.slug } });
    for (const lesson of bundle.lessons) {
      const termIds = lesson.terms.map(({ slug }) => bySlug.get(slug).id);
      const input = {
        slug: `${bundle.category.slug}-${lesson.slug}`,
        categoryId: category.id,
        titleUk: lesson.titleUk,
        titleEn: lesson.titleEn,
        descriptionUk: `${lesson.cefrLevel} · 10 термінів із навчальних джерел: ${lesson.titleUk}.`,
        descriptionEn: `${lesson.cefrLevel} · 10 terms from the learning sources: ${lesson.titleEn}.`,
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
    }
  }
  console.log(
    `Published ${rows.length} ${allowUnreviewedBeta ? "unreviewed beta" : "reviewed"} terms and ${manifest.expected.lessons} lessons.`,
  );
} finally {
  await db.$disconnect();
}
