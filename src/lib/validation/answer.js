const APOSTROPHES = /[’‘`´ʼ]/gu;
const HYPHENS = /[‐‑‒–—―]/gu;
const WHITESPACE = /\s+/gu;

export function normalizeAnswer(value, locale = "uk") {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedLocale = locale === "en" ? "en-US" : "uk-UA";

  return value
    .normalize("NFC")
    .replace(APOSTROPHES, "'")
    .replace(HYPHENS, "-")
    .trim()
    .replace(WHITESPACE, " ")
    .toLocaleLowerCase(normalizedLocale);
}

export function evaluateAnswer({ answer, acceptedVariants, locale = "uk" }) {
  const normalizedAnswer = normalizeAnswer(answer, locale);
  const normalizedVariants = acceptedVariants
    .filter((variant) => variant.isAcceptedAnswer !== false)
    .map((variant) => ({
      id: variant.id ?? null,
      value: variant.value,
      normalizedValue: normalizeAnswer(variant.normalizedValue ?? variant.value, locale),
    }));
  const match = normalizedVariants.find((variant) => variant.normalizedValue === normalizedAnswer);

  return {
    correct: Boolean(match) && normalizedAnswer.length > 0,
    normalizedAnswer,
    matchedVariantId: match?.id ?? null,
    acceptedValue: match?.value ?? normalizedVariants[0]?.value ?? null,
  };
}
