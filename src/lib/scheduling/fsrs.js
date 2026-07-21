const DAY_MS = 86_400_000;

export const REVIEW_RATINGS = Object.freeze({
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
});

export const SCHEDULER_VERSION = "tactlex-fsrs-compatible-v1";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function initialSchedule(rating, now) {
  const initial = {
    AGAIN: { state: "LEARNING", difficulty: 6, stability: 0.2, interval: 0 },
    HARD: { state: "LEARNING", difficulty: 5.5, stability: 0.7, interval: 1 },
    GOOD: { state: "REVIEW", difficulty: 5, stability: 2.5, interval: 3 },
    EASY: { state: "REVIEW", difficulty: 4.2, stability: 5, interval: 5 },
  }[rating];

  return {
    state: initial.state,
    difficulty: initial.difficulty,
    stability: initial.stability,
    scheduledDays: initial.interval,
    dueAt: addDays(now, initial.interval),
    repetitions: rating === "AGAIN" ? 0 : 1,
    lapses: rating === "AGAIN" ? 1 : 0,
  };
}

function retrievability(previous, now) {
  if (!previous.lastReviewedAt || previous.stability <= 0) {
    return 0.9;
  }

  const elapsedDays = Math.max(
    0,
    (now.getTime() - new Date(previous.lastReviewedAt).getTime()) / DAY_MS,
  );
  return clamp(Math.exp((Math.log(0.9) * elapsedDays) / previous.stability), 0, 1);
}

export function scheduleReview(previous, rating, reviewedAt = new Date()) {
  if (!(rating in REVIEW_RATINGS)) {
    throw new RangeError(`Unsupported review rating: ${rating}`);
  }

  const now = new Date(reviewedAt);
  if (Number.isNaN(now.getTime())) {
    throw new TypeError("reviewedAt must be a valid date");
  }

  if (!previous || previous.state === "NEW" || previous.repetitions === 0) {
    return {
      ...initialSchedule(rating, now),
      lastReviewedAt: now,
      schedulerVersion: SCHEDULER_VERSION,
    };
  }

  const ratingValue = REVIEW_RATINGS[rating];
  const difficulty = clamp(
    previous.difficulty - 0.35 * (ratingValue - 3) + 0.05 * (5 - previous.difficulty),
    1,
    10,
  );
  const currentStability = Math.max(0.1, previous.stability);
  const recall = retrievability(previous, now);

  if (rating === "AGAIN") {
    const stability = clamp(currentStability * (0.18 + (10 - difficulty) * 0.015), 0.1, 36500);
    return {
      state: "RELEARNING",
      difficulty: round(difficulty + 0.6),
      stability: round(stability),
      scheduledDays: 0,
      dueAt: now,
      lastReviewedAt: now,
      repetitions: previous.repetitions,
      lapses: previous.lapses + 1,
      schedulerVersion: SCHEDULER_VERSION,
    };
  }

  const ratingMultiplier = rating === "HARD" ? 0.7 : rating === "EASY" ? 1.35 : 1;
  const growth =
    Math.exp((10 - difficulty) * 0.12) *
    Math.pow(currentStability, -0.2) *
    (Math.exp((1 - recall) * 1.7) - 1) *
    ratingMultiplier;
  const stability = clamp(currentStability * (1 + Math.max(0.08, growth)), 0.1, 36500);
  const intervalMultiplier = rating === "HARD" ? 0.8 : rating === "EASY" ? 1.3 : 1;
  const scheduledDays = Math.max(1, Math.round(stability * intervalMultiplier));

  return {
    state: "REVIEW",
    difficulty: round(difficulty),
    stability: round(stability),
    scheduledDays,
    dueAt: addDays(now, scheduledDays),
    lastReviewedAt: now,
    repetitions: previous.repetitions + 1,
    lapses: previous.lapses,
    schedulerVersion: SCHEDULER_VERSION,
  };
}

export function createReviewSnapshot(progress) {
  return {
    state: progress.state,
    difficulty: progress.difficulty,
    stability: progress.stability,
    dueAt: new Date(progress.dueAt),
    scheduledDays: progress.scheduledDays,
    repetitions: progress.repetitions,
    lapses: progress.lapses,
  };
}
