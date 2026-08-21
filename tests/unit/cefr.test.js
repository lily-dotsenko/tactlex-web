import { describe, expect, test } from "vitest";

import { cefrForDifficulty, CEFR_BY_DIFFICULTY } from "@/lib/learning/cefr";

describe("CEFR mapping", () => {
  test("maps stored difficulty values to public CEFR levels", () => {
    expect(CEFR_BY_DIFFICULTY).toEqual({ 1: "A1", 2: "A2", 3: "B1", 4: "B2", 5: "C1" });
    expect(cefrForDifficulty("3")).toBe("B1");
  });

  test("does not invent a level for invalid values", () => {
    expect(cefrForDifficulty(0)).toBeNull();
    expect(cefrForDifficulty(6)).toBeNull();
  });
});
