export function pronunciationForItem(item) {
  if (!item || (item.promptLocale !== "en" && item.exerciseType !== "AUDIO")) return null;
  return {
    term: String(item.prompt ?? ""),
    audioUrl: item.audio?.url ?? null,
    lang: "en-US",
  };
}
