import { readFile } from "node:fs/promises";
import path from "node:path";

const releaseMode = process.argv.includes("--release");
const root = path.resolve("prisma/content/v1");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const errors = [];
const warnings = [];
const keys = new Set();
const slugs = new Set();
const cefrByDifficulty = [null, "A1", "A2", "B1", "B2", "C1"];
let termCount = 0;
let lessonCount = 0;

function required(value, label) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${label} is required`);
}

for (const descriptor of manifest.files) {
  const payload = JSON.parse(await readFile(path.join(root, descriptor.file), "utf8"));
  if (payload.category.slug !== descriptor.categorySlug) {
    errors.push(`${descriptor.file}: category slug does not match manifest`);
  }
  if (payload.lessons.length !== descriptor.lessonCount) {
    errors.push(`${descriptor.file}: expected ${descriptor.lessonCount} lessons`);
  }
  const descriptorTermCount = payload.lessons.reduce((sum, lesson) => sum + lesson.terms.length, 0);
  if (descriptorTermCount !== descriptor.termCount) {
    errors.push(`${descriptor.file}: expected ${descriptor.termCount} terms`);
  }
  for (const lesson of payload.lessons) {
    lessonCount += 1;
    if (lesson.terms.length !== manifest.expected.termsPerLesson) {
      errors.push(`${lesson.slug}: expected ${manifest.expected.termsPerLesson} terms`);
    }
    if (lesson.cefrLevel !== cefrByDifficulty[lesson.difficulty]) {
      errors.push(`${lesson.slug}: CEFR level does not match difficulty`);
    }
    for (const term of lesson.terms) {
      termCount += 1;
      required(term.externalKey, `${lesson.slug}.externalKey`);
      required(term.slug, `${lesson.slug}.slug`);
      required(term.english, `${term.slug}.english`);
      required(term.ukrainian, `${term.slug}.ukrainian`);
      required(term.definitionEn, `${term.slug}.definitionEn`);
      required(term.definitionUk, `${term.slug}.definitionUk`);
      required(term.exampleEn, `${term.slug}.exampleEn`);
      required(term.exampleUk, `${term.slug}.exampleUk`);
      required(term.contextNoteEn, `${term.slug}.contextNoteEn`);
      required(term.contextNoteUk, `${term.slug}.contextNoteUk`);
      if (term.cefrLevel !== lesson.cefrLevel) {
        errors.push(`${term.slug}: CEFR level does not match lesson`);
      }
      for (const alias of [...(term.aliasesEn ?? []), ...(term.aliasesUk ?? [])]) {
        required(alias, `${term.slug}.alias`);
      }
      if (keys.has(term.externalKey)) errors.push(`Duplicate externalKey: ${term.externalKey}`);
      if (slugs.has(term.slug)) errors.push(`Duplicate slug: ${term.slug}`);
      keys.add(term.externalKey);
      slugs.add(term.slug);
      if (!Array.isArray(term.distractorKeys) || term.distractorKeys.length < 3) {
        errors.push(`${term.slug}: at least three distractors are required`);
      }
      if (!term.source?.exactUrl || !URL.canParse(term.source.exactUrl)) {
        errors.push(`${term.slug}: exact public source URL is required`);
      }
      if (term.source?.verificationStatus !== "VERIFIED") {
        const message = `${term.slug}: source still requires human verification`;
        if (releaseMode) errors.push(message);
        else warnings.push(message);
      }
    }
  }
}

for (const descriptor of manifest.files) {
  const payload = JSON.parse(await readFile(path.join(root, descriptor.file), "utf8"));
  for (const lesson of payload.lessons) {
    for (const term of lesson.terms) {
      for (const distractor of term.distractorKeys) {
        if (!keys.has(distractor)) errors.push(`${term.slug}: unknown distractor ${distractor}`);
        if (distractor === term.externalKey)
          errors.push(`${term.slug}: self distractor is forbidden`);
      }
    }
  }
}

if (termCount !== manifest.expected.terms)
  errors.push(`Expected ${manifest.expected.terms} terms, got ${termCount}`);
if (lessonCount !== manifest.expected.lessons)
  errors.push(`Expected ${manifest.expected.lessons} lessons, got ${lessonCount}`);
if (manifest.files.length !== manifest.expected.categories) {
  errors.push(
    `Expected ${manifest.expected.categories} category files, got ${manifest.files.length}`,
  );
}

console.log(`Validated ${termCount} terms in ${lessonCount} lessons.`);
if (warnings.length) console.log(`${warnings.length} expected review warnings (draft mode).`);
if (errors.length) {
  console.error(errors.slice(0, 50).join("\n"));
  if (errors.length > 50) console.error(`…and ${errors.length - 50} more errors`);
  process.exitCode = 1;
}
