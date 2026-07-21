import { describe, expect, it } from "vitest";

import { evaluateAnswer, normalizeAnswer } from "@/lib/validation/answer";

describe("answer normalization", () => {
  it("normalizes Unicode, apostrophes, dashes, case and whitespace", () => {
    expect(normalizeAnswer("  CASEVAC —  БОЄЦЬ’Я  ", "uk")).toBe("casevac - боєць'я");
  });

  it("accepts only explicit primary or synonym values", () => {
    const variants = [
      { id: "primary", value: "медична евакуація" },
      { id: "synonym", value: "медевак" },
    ];
    expect(evaluateAnswer({ answer: " МЕДЕВАК ", acceptedVariants: variants }).correct).toBe(true);
    expect(evaluateAnswer({ answer: "евакуація", acceptedVariants: variants }).correct).toBe(false);
  });

  it("ignores variants not approved as answers", () => {
    const result = evaluateAnswer({
      answer: "casualty evacuation",
      locale: "en",
      acceptedVariants: [
        { value: "medical evacuation" },
        { value: "casualty evacuation", isAcceptedAnswer: false },
      ],
    });
    expect(result.correct).toBe(false);
  });
});
