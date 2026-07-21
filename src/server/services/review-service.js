import { randomUUID } from "node:crypto";

import { SCHEDULER_VERSION } from "@/lib/scheduling/fsrs";
import { evaluateAnswer } from "@/lib/validation/answer";
import { XP_AWARDS, XP_POLICY_VERSION } from "@/server/services/gamification";
import { createGamificationService } from "@/server/services/gamification-service";
import { createIdempotencyService } from "@/server/services/idempotency-service";
import { conflict, notFound } from "@/server/services/errors";
import {
  applyProgressReview,
  deriveEffectiveRating,
  runSerializable,
} from "@/server/services/study-service";

const NORMALIZATION_VERSION = "answer-normalization-v1";
const REVIEW_SESSION_TTL_MS = 15 * 60 * 1_000;

function reviewDirection(progress) {
  return progress.repetitions % 2 === 0 ? "EN_TO_UK" : "UK_TO_EN";
}

function apiDirection(direction) {
  return direction === "UK_TO_EN" ? "UA_TO_EN" : "EN_TO_UA";
}

function locales(direction) {
  return direction === "UK_TO_EN"
    ? { source: "UK", target: "EN", apiTarget: "en" }
    : { source: "EN", target: "UK", apiTarget: "uk" };
}

function primaryVariant(term, locale) {
  return term.variants.find((variant) => variant.locale === locale && variant.isPrimary);
}

function mapProgress(progress) {
  return {
    state: progress.state,
    difficulty: Number(progress.difficulty),
    stability: Number(progress.stability),
    dueAt: progress.dueAt,
    scheduledDays: progress.scheduledDays,
    repetitions: progress.repetitions,
    lapses: progress.lapses,
    correctCount: progress.correctCount,
    incorrectCount: progress.incorrectCount,
  };
}

function safeResponseTime(value) {
  return Math.max(0, Math.min(600_000, Math.round(value ?? 0)));
}

export function createReviewService(db, { clock = () => new Date() } = {}) {
  if (!db) throw new TypeError("A database client is required.");
  const idempotency = createIdempotencyService(db, { clock });

  async function listDue(userId, limit = 20) {
    const now = clock();
    const [progressRows, next] = await Promise.all([
      db.userTermProgress.findMany({
        where: {
          userId,
          dueAt: { lte: now },
          term: { status: "PUBLISHED", archivedAt: null },
        },
        orderBy: [{ dueAt: "asc" }, { id: "asc" }],
        take: limit,
        include: {
          term: {
            select: {
              id: true,
              variants: {
                orderBy: [{ isPrimary: "desc" }, { value: "asc" }],
                select: {
                  id: true,
                  locale: true,
                  value: true,
                  isPrimary: true,
                  isAcceptedAnswer: true,
                },
              },
              definitions: { select: { locale: true, shortDefinition: true } },
              audioAssets: {
                where: { archivedAt: null, isPrimary: true, locale: "EN" },
                select: { id: true, kind: true, provider: true },
                take: 1,
              },
            },
          },
        },
      }),
      db.userTermProgress.findFirst({
        where: {
          userId,
          dueAt: { gt: now },
          term: { status: "PUBLISHED", archivedAt: null },
        },
        orderBy: { dueAt: "asc" },
        select: { dueAt: true },
      }),
    ]);
    const items = progressRows.flatMap((progress) => {
      const direction = reviewDirection(progress);
      const { source } = locales(direction);
      const prompt = primaryVariant(progress.term, source);
      if (!prompt) return [];
      const definition = progress.term.definitions.find((entry) => entry.locale === source);
      return [
        {
          termId: progress.termId,
          dueAt: progress.dueAt,
          state: progress.state,
          direction: apiDirection(direction),
          exerciseType: direction === "UK_TO_EN" ? "UA_TO_EN" : "EN_TO_UA",
          prompt: prompt.value,
          promptLocale: source === "UK" ? "uk" : "en",
          definition: definition?.shortDefinition ?? null,
          stage: "SCHEDULED_REVIEW",
          audio:
            source === "EN" && progress.term.audioAssets[0]
              ? {
                  ...progress.term.audioAssets[0],
                  url: `/api/v1/audio/${progress.term.audioAssets[0].id}`,
                }
              : null,
        },
      ];
    });
    return { items, nextDueAt: next?.dueAt ?? null };
  }

  async function submit(userId, termId, input, idempotencyKey) {
    return idempotency
      .execute(
        {
          userId,
          scope: `review:${termId}`,
          key: idempotencyKey,
          payload: input,
        },
        () =>
          runSerializable(db, async (transaction) => {
            const now = clock();
            await transaction.userProfile.update({
              where: { userId },
              data: { updatedAt: now },
            });
            const recordedAnswer = await transaction.sessionAnswer.findFirst({
              where: {
                userId,
                termId,
                clientAnswerId: idempotencyKey,
                studySession: { kind: "REVIEW" },
              },
              orderBy: { createdAt: "desc" },
              include: {
                acceptedVariant: { select: { value: true } },
                studySession: { select: { direction: true } },
              },
            });
            if (recordedAnswer) {
              const target = locales(recordedAnswer.studySession.direction).target;
              const [progress, primary, profile, awards] = await Promise.all([
                transaction.userTermProgress.findUnique({
                  where: { userId_termId: { userId, termId } },
                }),
                transaction.termVariant.findFirst({
                  where: { termId, locale: target, isPrimary: true },
                  select: { value: true },
                }),
                transaction.userProfile.findUnique({ where: { userId } }),
                transaction.userAchievement.findMany({
                  where: {
                    userId,
                    triggerType: "REVIEW_ANSWER",
                    triggerId: recordedAnswer.id,
                  },
                  include: { achievement: true },
                }),
              ]);
              const acceptedAnswer =
                recordedAnswer.acceptedVariant?.value ?? primary?.value ?? null;
              const achievements = awards.map(({ achievement, awardedAt }) => ({
                id: achievement.id,
                code: achievement.code,
                nameUk: achievement.nameUk,
                nameEn: achievement.nameEn,
                awardedAt,
                rewardXp: achievement.rewardXp,
              }));
              return {
                answer: {
                  id: recordedAnswer.id,
                  termId,
                  isCorrect: recordedAnswer.isCorrect,
                  normalizedAnswer: recordedAnswer.normalizedAnswer,
                  acceptedAnswer,
                  rating: recordedAnswer.rating,
                  responseTimeMs: recordedAnswer.responseTimeMs,
                  awardedXp: recordedAnswer.awardedXp,
                },
                progress: progress ? mapProgress(progress) : null,
                achievements,
                summary: profile
                  ? {
                      totalXp: profile.totalXp,
                      level: profile.level,
                      currentStreak: profile.currentStreak,
                      longestStreak: profile.longestStreak,
                    }
                  : null,
                correct: recordedAnswer.isCorrect,
                acceptedAnswer,
                nextDueAt: progress?.dueAt ?? null,
                xpAwarded: recordedAnswer.awardedXp,
                recovered: true,
              };
            }
            const previous = await transaction.userTermProgress.findUnique({
              where: { userId_termId: { userId, termId } },
              include: {
                term: {
                  select: {
                    id: true,
                    status: true,
                    archivedAt: true,
                    currentRevision: true,
                    variants: {
                      orderBy: [{ isPrimary: "desc" }, { value: "asc" }],
                    },
                  },
                },
              },
            });
            if (!previous || previous.term.status !== "PUBLISHED" || previous.term.archivedAt) {
              throw notFound("Термін не знайдено в черзі повторення.");
            }
            if (previous.dueAt > now) {
              throw conflict("REVIEW_NOT_DUE", "Час повторення цього терміна ще не настав.");
            }
            const direction = reviewDirection(previous);
            const { target, apiTarget } = locales(direction);
            const variants = previous.term.variants.filter(
              (variant) => variant.locale === target && variant.isAcceptedAnswer,
            );
            const evaluation = evaluateAnswer({
              answer: input.answer,
              acceptedVariants: variants,
              locale: apiTarget,
            });
            const rating = deriveEffectiveRating(evaluation.correct, input.rating);
            const responseTimeMs = safeResponseTime(input.responseTimeMs);
            const sessionId = randomUUID();
            const itemId = randomUUID();
            const answerId = randomUUID();
            const prompt = primaryVariant(previous.term, locales(direction).source);
            if (!prompt || variants.length === 0) {
              throw conflict("TERM_NOT_STUDY_READY", "Термін не має повної перевіреної пари.");
            }

            await transaction.studySession.create({
              data: {
                id: sessionId,
                userId,
                kind: "REVIEW",
                direction,
                status: "COMPLETED",
                currentStage: "AFTER_ACTION_REVIEW",
                idempotencyKey: randomUUID(),
                xpPolicyVersion: XP_POLICY_VERSION,
                schedulerVersion: SCHEDULER_VERSION,
                score: evaluation.correct ? 1 : 0,
                maxScore: 1,
                startedAt: now,
                expiresAt: new Date(now.getTime() + REVIEW_SESSION_TTL_MS),
                completedAt: now,
                items: {
                  create: {
                    id: itemId,
                    termId,
                    promptVariantId: prompt.id,
                    contentRevisionNumber: previous.term.currentRevision,
                    position: 1,
                    stage: "PRACTICE",
                    exerciseType: direction === "UK_TO_EN" ? "UA_TO_EN" : "EN_TO_UA",
                    status: "ANSWERED",
                    maxAttempts: 1,
                    servedAt: now,
                    answeredAt: now,
                  },
                },
              },
            });
            const gamification = createGamificationService(transaction, { clock: () => now });
            let xp = { amount: 0 };
            if (evaluation.correct) {
              xp = await gamification.awardXp({
                userId,
                amount: XP_AWARDS.SCHEDULED_REVIEW_CORRECT,
                reason: "SCHEDULED_REVIEW",
                sourceType: "REVIEW_ANSWER",
                sourceId: answerId,
                dedupeKey: `review-answer:${answerId}`,
              });
            }
            const answer = await transaction.sessionAnswer.create({
              data: {
                id: answerId,
                studySessionId: sessionId,
                sessionItemId: itemId,
                userId,
                termId,
                acceptedVariantId: evaluation.matchedVariantId,
                clientAnswerId: idempotencyKey,
                attemptNumber: 1,
                submittedAnswer: input.answer,
                normalizedAnswer: evaluation.normalizedAnswer,
                isCorrect: evaluation.correct,
                rating,
                responseTimeMs,
                awardedXp: xp.amount,
                normalizationVersion: NORMALIZATION_VERSION,
                createdAt: now,
              },
            });
            const progress = await applyProgressReview(transaction, {
              userId,
              termId,
              sessionAnswerId: answer.id,
              rating,
              isCorrect: evaluation.correct,
              responseTimeMs,
              now,
            });
            await gamification.recordActivity({
              userId,
              xpEarned: xp.amount,
              answersSubmitted: 1,
              correctAnswers: evaluation.correct ? 1 : 0,
              reviewsCompleted: 1,
            });
            const achievements = await gamification.evaluateAchievements({
              userId,
              triggerType: "REVIEW_ANSWER",
              triggerId: answer.id,
            });
            const profile = await transaction.userProfile.findUnique({ where: { userId } });
            return {
              answer: {
                id: answer.id,
                termId,
                isCorrect: evaluation.correct,
                normalizedAnswer: evaluation.normalizedAnswer,
                acceptedAnswer: evaluation.acceptedValue,
                rating,
                responseTimeMs,
                awardedXp: xp.amount,
              },
              progress: mapProgress(progress),
              achievements,
              summary: profile
                ? {
                    totalXp: profile.totalXp,
                    level: profile.level,
                    currentStreak: profile.currentStreak,
                    longestStreak: profile.longestStreak,
                  }
                : null,
              correct: evaluation.correct,
              acceptedAnswer: evaluation.acceptedValue,
              nextDueAt: progress.dueAt,
              xpAwarded: xp.amount,
            };
          }),
      )
      .then(({ data, replayed }) => ({ ...data, replayed }));
  }

  return { listDue, submit };
}
