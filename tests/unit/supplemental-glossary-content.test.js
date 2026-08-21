import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

const releaseDirectory = path.join(process.cwd(), "prisma", "content", "v1");

describe("supplemental VTT learning content", () => {
  test("places all 556 terms in 71 lessons with 41 sourced facts", async () => {
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
    expect(lessonTerms).toHaveLength(556);
    expect(glossaryTerms).toHaveLength(0);
    expect(facts).toHaveLength(41);
    expect(manifest.expected).toMatchObject({
      terms: 556,
      lessonTerms: 556,
      glossaryTerms: 0,
      lessons: 71,
      facts: 41,
    });
    expect(new Set(lessonTerms.map(({ externalKey }) => externalKey)).size).toBe(556);
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
});
