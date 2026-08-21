import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

const releaseDirectory = path.join(process.cwd(), "prisma", "content", "v1");

describe("supplemental VTT glossary", () => {
  test("adds dictionary-only entries without changing the 300 lesson terms", async () => {
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

    expect(lessonTerms).toHaveLength(300);
    expect(glossaryTerms).toHaveLength(256);
    expect(manifest.expected).toMatchObject({
      terms: 556,
      lessonTerms: 300,
      glossaryTerms: 256,
      lessons: 30,
    });
    expect(glossaryTerms.every(({ dictionaryOnly }) => dictionaryOnly)).toBe(true);
    expect(glossaryTerms.every(({ distractorKeys }) => distractorKeys === undefined)).toBe(true);
    const lessonHeadwords = new Set(lessonTerms.map(({ english }) => english.toLowerCase()));
    expect(new Set(glossaryTerms.map(({ english }) => english.toLowerCase())).size).toBe(256);
    expect(glossaryTerms.some(({ english }) => lessonHeadwords.has(english.toLowerCase()))).toBe(
      false,
    );
  });

  test("uses the requested bilingual TCCC Ukraine terminology source", async () => {
    const medicine = JSON.parse(
      await readFile(path.join(releaseDirectory, "tactical-medicine.json"), "utf8"),
    );
    const byEnglish = new Map(medicine.glossaryTerms.map((term) => [term.english, term]));

    expect(byEnglish.get("massive hemorrhage")?.ukrainian).toBe("масивна кровотеча");
    expect(byEnglish.get("head injury")?.ukrainian).toBe("травма голови");
    expect(byEnglish.get("pain control")?.ukrainian).toBe("знеболення");
    expect(
      medicine.glossaryTerms.every(({ source }) =>
        source.exactUrl.startsWith("https://tccc.org.ua/"),
      ),
    ).toBe(true);
  });
});
