import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

const releaseDirectory = path.join(process.cwd(), "prisma", "content", "v1");

describe("supplemental VTT learning content", () => {
  test("places all 616 terms in 77 lessons with 41 sourced facts", async () => {
    const manifest = JSON.parse(
      await readFile(path.join(releaseDirectory, "manifest.json"), "utf8"),
    );
    const bundles = await Promise.all(
      manifest.files.map(async ({ file }) =>
        JSON.parse(await readFile(path.join(releaseDirectory, file), "utf8")),
      ),
    );
    const glossaryTerms = bundles.flatMap(({ glossaryTerms = [] }) => glossaryTerms);
    const lessonTerms = bundles.flatMap(({ lessons }) => lessons.flatMap(({ terms }) => terms));

    const facts = bundles.flatMap(({ lessons }) => lessons.map(({ fact }) => fact).filter(Boolean));
    expect(lessonTerms).toHaveLength(616);
    expect(glossaryTerms).toHaveLength(0);
    expect(facts).toHaveLength(41);
    expect(manifest.expected).toMatchObject({
      terms: 616,
      lessonTerms: 616,
      glossaryTerms: 0,
      lessons: 77,
      facts: 41,
    });
    expect(new Set(lessonTerms.map(({ externalKey }) => externalKey)).size).toBe(616);
    expect(lessonTerms.every(({ distractorKeys }) => distractorKeys.length === 3)).toBe(true);
    expect(facts.every(({ sourceUrl }) => URL.canParse(sourceUrl))).toBe(true);
  });

  test("uses the requested bilingual TCCC Ukraine terminology source", async () => {
    const medicine = JSON.parse(
      await readFile(path.join(releaseDirectory, "tactical-medicine.json"), "utf8"),
    );
    const byEnglish = new Map(
      medicine.lessons.flatMap(({ terms }) => terms).map((term) => [term.english, term]),
    );

    expect(byEnglish.get("massive hemorrhage")?.ukrainian).toBe("масивна кровотеча");
    expect(byEnglish.get("head injury")?.ukrainian).toBe("травма голови");
    expect(byEnglish.get("pain control")?.ukrainian).toBe("знеболення");
    expect(
      medicine.lessons
        .flatMap(({ terms }) => terms)
        .filter(({ english }) =>
          ["massive hemorrhage", "head injury", "pain control"].includes(english),
        )
        .every(({ source }) => source.exactUrl.startsWith("https://tccc.org.ua/")),
    ).toBe(true);
  });

  test("builds the expanded ASM and CLS medical track without duplicate headwords", async () => {
    const manifest = JSON.parse(
      await readFile(path.join(releaseDirectory, "manifest.json"), "utf8"),
    );
    const bundles = await Promise.all(
      manifest.files.map(async ({ file }) =>
        JSON.parse(await readFile(path.join(releaseDirectory, file), "utf8")),
      ),
    );
    const medicine = bundles.find(({ category }) => category.slug === "tactical-medicine");
    const medicalTerms = medicine.lessons.flatMap(({ terms }) => terms);
    const addedLessonSlugs = [
      "tccc-phases-safety",
      "massive-bleeding-control",
      "airway-assessment",
      "chest-breathing",
      "shock-hypothermia-injuries",
      "equipment-movement-evacuation",
    ];
    const addedLessons = medicine.lessons.filter(({ slug }) => addedLessonSlugs.includes(slug));
    const addedTerms = addedLessons.flatMap(({ terms }) => terms);
    const normalizeHeadword = (value) =>
      value
        .toLocaleLowerCase("en")
        .replaceAll(/[’'\-]/gu, " ")
        .replaceAll(/\s+/gu, " ")
        .replace(/s$/u, "")
        .trim();
    const otherHeadwords = new Set(
      bundles
        .filter(({ category }) => category.slug !== "tactical-medicine")
        .flatMap(({ lessons }) => lessons.flatMap(({ terms }) => terms))
        .flatMap(({ english, aliasesEn = [] }) => [english, ...aliasesEn])
        .map(normalizeHeadword),
    );

    expect(medicine.lessons).toHaveLength(12);
    expect(medicalTerms).toHaveLength(120);
    expect(addedLessons).toHaveLength(6);
    expect(addedLessons.every(({ terms }) => terms.length === 10)).toBe(true);
    expect(new Set(medicalTerms.map(({ externalKey }) => externalKey)).size).toBe(120);
    expect(new Set(medicalTerms.map(({ english }) => english.toLocaleLowerCase("en"))).size).toBe(
      120,
    );
    expect(
      addedTerms.every(({ english, aliasesEn = [] }) =>
        [english, ...aliasesEn].every((value) => !otherHeadwords.has(normalizeHeadword(value))),
      ),
    ).toBe(true);
    expect(
      addedTerms.every(
        ({ definitionEn, definitionUk, exampleEn, exampleUk, contextNoteEn, contextNoteUk }) =>
          definitionEn && definitionUk && exampleEn && exampleUk && contextNoteEn && contextNoteUk,
      ),
    ).toBe(true);
    expect(
      medicalTerms.every(
        ({ definitionEn, exampleEn }) =>
          !definitionEn.includes("The concept denoted") &&
          !exampleEn.includes("neutral language exercise"),
      ),
    ).toBe(true);
    expect(
      medicalTerms.every(
        ({ source, distractorKeys }) =>
          source.exactUrl.startsWith("https://tccc.org.ua/") && distractorKeys.length === 3,
      ),
    ).toBe(true);
    expect(
      medicine.lessons
        .slice(0, 5)
        .flatMap(({ slug, terms }) =>
          terms.map(
            ({ externalKey }, index) => externalKey === `tactical-medicine:${slug}:${index + 1}`,
          ),
        )
        .every(Boolean),
    ).toBe(true);
    expect(
      medicine.lessons.at(-1).terms.every(({ externalKey }) => externalKey.startsWith("glossary:")),
    ).toBe(true);
    expect(medicine.lessons.at(-1).titleUk).toBe("Розширена допомога пораненим 1");
    expect(medicine.lessons.at(-1).slug).toBe("supplemental-01");
  });
});
