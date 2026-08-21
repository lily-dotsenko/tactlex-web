export const CEFR_BY_DIFFICULTY = Object.freeze({
  1: "A1",
  2: "A2",
  3: "B1",
  4: "B2",
  5: "C1",
});

export function cefrForDifficulty(difficulty) {
  return CEFR_BY_DIFFICULTY[Number(difficulty)] ?? null;
}
