import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

const releaseDirectory = path.join(process.cwd(), "prisma", "content", "v1");

describe("basic military English release", () => {
  test("contains 100 unique terms divided into 10 CEFR-labelled lessons", async () => {
    const content = JSON.parse(
      await readFile(path.join(releaseDirectory, "basic-military-english.json"), "utf8"),
    );
    const terms = content.lessons.flatMap((lesson) => lesson.terms);
    const levelCounts = terms.reduce((counts, term) => {
      counts[term.cefrLevel] = (counts[term.cefrLevel] ?? 0) + 1;
      return counts;
    }, {});

    expect(content.lessons).toHaveLength(10);
    expect(terms).toHaveLength(100);
    expect(new Set(terms.map(({ slug }) => slug)).size).toBe(100);
    expect(levelCounts).toEqual({ A1: 20, A2: 30, B1: 40, B2: 10 });

    for (const lesson of content.lessons) {
      expect(lesson.terms).toHaveLength(10);
      expect(lesson.terms.every((term) => term.cefrLevel === lesson.cefrLevel)).toBe(true);
      expect(lesson.terms.every((term) => term.lessonSlug === lesson.slug)).toBe(true);
    }

    const getDressed = terms.find(({ english }) => english === "get dressed");
    const physicalTraining = terms.find(({ english }) => english === "physical training");
    expect(getDressed.aliasesUk).toEqual(
      expect.arrayContaining(["одягатись", "одягтися", "одягтись"]),
    );
    expect(physicalTraining.aliasesUk).toEqual(
      expect.arrayContaining(["фізичне тренування", "фізичні тренування", "фізпідготовка"]),
    );
  });
});
