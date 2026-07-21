export const XP_POLICY_VERSION = "xp-policy-v1";

export const XP_AWARDS = Object.freeze({
  FIRST_ATTEMPT_CORRECT: 10,
  SCHEDULED_REVIEW_CORRECT: 5,
  LESSON_COMPLETED: 20,
  PERFECT_LESSON: 15,
  ACHIEVEMENT_UNLOCKED: 25,
});

export function calculateLessonAwards({ correctFirstAttempts, totalItems, isFirstCompletion }) {
  const entries = [];
  if (correctFirstAttempts > 0) {
    entries.push({
      reason: "FIRST_ATTEMPT_CORRECT",
      amount: correctFirstAttempts * XP_AWARDS.FIRST_ATTEMPT_CORRECT,
    });
  }
  if (isFirstCompletion) {
    entries.push({ reason: "LESSON_COMPLETED", amount: XP_AWARDS.LESSON_COMPLETED });
  }
  if (totalItems > 0 && correctFirstAttempts === totalItems && isFirstCompletion) {
    entries.push({ reason: "PERFECT_LESSON", amount: XP_AWARDS.PERFECT_LESSON });
  }

  return entries.map((entry) => ({ ...entry, policyVersion: XP_POLICY_VERSION }));
}

export function levelFromXp(totalXp) {
  const safeXp = Math.max(0, totalXp);
  return Math.floor(Math.pow(safeXp / 100, 2 / 3) + Number.EPSILON * 16) + 1;
}

export function xpForNextLevel(level) {
  return Math.ceil(100 * Math.pow(Math.max(1, level), 1.5));
}

export function updateStreak({
  previousActivityDate,
  currentActivityDate,
  previousCurrentStreak,
  previousLongestStreak,
}) {
  if (!previousActivityDate) {
    return { currentStreak: 1, longestStreak: Math.max(1, previousLongestStreak) };
  }

  const previous = Date.parse(`${previousActivityDate}T00:00:00Z`);
  const current = Date.parse(`${currentActivityDate}T00:00:00Z`);
  const delta = Math.round((current - previous) / 86_400_000);
  const currentStreak =
    delta === 0 ? previousCurrentStreak : delta === 1 ? previousCurrentStreak + 1 : 1;

  return {
    currentStreak,
    longestStreak: Math.max(previousLongestStreak, currentStreak),
  };
}
