export function pronunciationForItem(item) {
  if (
    !item ||
    item.exerciseType === "CONTEXT_SENTENCE" ||
    (item.promptLocale !== "en" && item.exerciseType !== "AUDIO")
  )
    return null;
  return {
    term: String(item.prompt ?? ""),
    audioUrl: item.audio?.url ?? null,
    lang: "en-US",
  };
}
