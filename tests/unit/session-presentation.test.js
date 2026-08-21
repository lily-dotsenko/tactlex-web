import { describe, expect, test } from "vitest";

import { pronunciationForItem } from "@/lib/learning/session-presentation";

describe("practice pronunciation presentation", () => {
  test("uses TTS fallback when an English audio exercise has no asset", () => {
    expect(
      pronunciationForItem({
        exerciseType: "AUDIO",
        promptLocale: "en",
        prompt: "physical training",
        audio: null,
      }),
    ).toEqual({ term: "physical training", audioUrl: null, lang: "en-US" });
  });

  test("does not reveal an English answer for a Ukrainian prompt", () => {
    expect(
      pronunciationForItem({
        exerciseType: "MULTIPLE_CHOICE",
        promptLocale: "uk",
        prompt: "фізична підготовка",
        audio: null,
      }),
    ).toBeNull();
  });
});
