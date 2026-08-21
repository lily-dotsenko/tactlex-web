import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { createAdminContentService } from "../src/server/services/admin-content-service.js";

function argument(name) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const adminEmail = argument("admin-email") ?? process.env.CONTENT_ACTOR_EMAIL;
if (!adminEmail) throw new Error("Use --admin-email=<existing administrator email>.");

const db = new PrismaClient();
try {
  const actor = await db.user.findUnique({
    where: { email: adminEmail },
    include: { userRoles: { include: { role: true } } },
  });
  if (!actor || !actor.userRoles.some(({ role }) => role.code === "ADMIN")) {
    throw new Error("The supplied account is not an administrator.");
  }
  const root = path.resolve("prisma/content/v1");
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  const service = createAdminContentService(db);
  const keyToId = new Map();
  const pendingDistractors = [];
  let imported = 0;

  for (const descriptor of manifest.files) {
    const payload = JSON.parse(await readFile(path.join(root, descriptor.file), "utf8"));
    const category = await db.category.findUnique({ where: { slug: payload.category.slug } });
    if (!category) throw new Error(`Missing category ${payload.category.slug}; run db:seed first.`);
    for (const lesson of payload.lessons) {
      for (const term of lesson.terms) {
        const input = {
          slug: term.slug,
          partOfSpeech: term.partOfSpeech,
          difficulty: term.difficulty,
          origin: "AI_ASSISTED",
          isDemo: false,
          variants: [
            {
              locale: "EN",
              kind: "PRIMARY",
              value: term.english,
              isPrimary: true,
              isAcceptedAnswer: true,
            },
            {
              locale: "UK",
              kind: "PRIMARY",
              value: term.ukrainian,
              isPrimary: true,
              isAcceptedAnswer: true,
            },
          ],
          definitions: [
            {
              locale: "EN",
              shortDefinition: term.definitionEn,
              example: term.exampleEn,
              contextNote: term.contextNoteEn,
            },
            {
              locale: "UK",
              shortDefinition: term.definitionUk,
              example: term.exampleUk,
              contextNote: term.contextNoteUk,
            },
          ],
          categories: [{ categoryId: category.id, isPrimary: true }],
          sources: [{ ...term.source, isPrimary: true }],
        };
        const existing = await db.term.findUnique({ where: { slug: term.slug } });
        const saved = existing
          ? await service.updateTerm(actor.id, existing.id, {
              ...input,
              changeNote: `Synchronize content release ${manifest.version}`,
            })
          : await service.createTerm(actor.id, {
              ...input,
              changeNote: `Import content release ${manifest.version}`,
            });
        keyToId.set(term.externalKey, saved.id);
        pendingDistractors.push({ termId: saved.id, keys: term.distractorKeys });
        imported += 1;
      }
    }
  }

  for (const entry of pendingDistractors) {
    await service.setTermDistractors(
      actor.id,
      entry.termId,
      entry.keys.map((key) => keyToId.get(key)),
    );
  }
  console.log(
    `Imported ${imported} AI-assisted draft terms. Human review or an explicit unreviewed beta release is still required.`,
  );
} finally {
  await db.$disconnect();
}
