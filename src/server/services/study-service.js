import { randomUUID } from "node:crypto";

import { evaluateAnswer } from "@/lib/validation/answer";
import { SCHEDULER_VERSION, scheduleReview } from "@/lib/scheduling/fsrs";
import { XP_AWARDS, XP_POLICY_VERSION } from "@/server/services/gamification";
import { createGamificationService } from "@/server/services/gamification-service";
import { createIdempotencyService } from "@/server/services/idempotency-service";
import { conflict, notFound, DomainError } from "@/server/services/errors";

const SESSION_TTL_MS = 2 * 60 * 60 * 1_000;
const NORMALIZATION_VERSION = "answer-normalization-v1";
const MAX_TRANSACTION_RETRIES = 3;

const sessionInclude = {
  lesson: {
    select: { id: true, slug: true, titleUk: true, titleEn: true },
  },
  items: {
    orderBy: { position: "asc" },
    include: {
      promptVariant: { select: { id: true, locale: true, value: true } },
      term: {
        select: {
          id: true,
          variants: {
            orderBy: [{ isPrimary: "desc" }, { value: "asc" }],
            select: {
              id: true,
              locale: true,
              value: true,
              normalizedValue: true,
              isPrimary: true,
              isAcceptedAnswer: true,
            },
          },
          definitions: {
            select: { locale: true, shortDefinition: true },
          },
          audioAssets: {
            where: { archivedAt: null, isPrimary: true, locale: "EN" },
            select: { id: true, kind: true, provider: true },
            take: 1,
          },
        },
      },
      answers: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
        select: {
          id: true,
          submittedAnswer: true,
          normalizedAnswer: true,
          isCorrect: true,
          rating: true,
          responseTimeMs: true,
          awardedXp: true,
          createdAt: true,
        },
      },
    },
  },
};

function isRetryableTransactionError(error) {
  return error?.code === "P2034" || error?.code === "PROGRESS_WRITE_CONFLICT";
}

export async function runSerializable(db, operation) {
  let lastError;
  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 15_000,
      });
    } catch (error) {
      if (!isRetryableTransactionError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

function databaseDirection(mode) {
  const normalized = mode?.toString().trim().toUpperCase().replaceAll("-", "_");
  return normalized === "UK_TO_EN" || normalized === "UA_TO_EN" ? "UK_TO_EN" : "EN_TO_UK";
}

function apiDirection(direction) {
  return direction === "UK_TO_EN" ? "UA_TO_EN" : "EN_TO_UA";
}

function targetLocale(direction) {
  return direction === "UK_TO_EN" ? "EN" : "UK";
}

function sourceLocale(direction) {
  return direction === "UK_TO_EN" ? "UK" : "EN";
}

function apiLocale(locale) {
  return locale === "UK" ? "uk" : "en";
}

function primaryVariant(term, locale) {
  return term.variants.find((variant) => variant.locale === locale && variant.isPrimary);
}

function acceptedVariants(term, locale) {
  return term.variants.filter((variant) => variant.locale === locale && variant.isAcceptedAnswer);
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

function mapSession(session, summary = null) {
  const target = targetLocale(session.direction);
  const source = sourceLocale(session.direction);
  return {
    id: session.id,
    kind: session.kind,
    direction: apiDirection(session.direction),
    status: session.status,
    currentStage: session.currentStage,
    score: session.score,
    maxScore: session.maxScore,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    completedAt: session.completedAt,
    summary,
    lesson: session.lesson,
    answeredItems: session.items.filter((item) => item.status === "ANSWERED").length,
    totalItems: session.items.length,
    currentIndex: Math.max(
      0,
      session.items.findIndex((item) => item.status !== "ANSWERED"),
    ),
    items: session.items.map((item) => {
      const answer = item.answers?.[0] ?? null;
      const accepted = answer ? primaryVariant(item.term, target) : null;
      const definition = item.term.definitions.find((entry) => entry.locale === source);
      const audioAsset = source === "EN" ? item.term.audioAssets?.[0] : null;
      return {
        id: item.id,
        termId: item.termId,
        position: item.position,
        stage: item.stage,
        exerciseType: item.exerciseType,
        status: item.status,
        prompt: item.promptVariant?.value ?? null,
        promptLocale: item.promptVariant ? apiLocale(item.promptVariant.locale) : null,
        definition: definition?.shortDefinition ?? null,
        choices: [],
        audio: audioAsset
          ? {
              id: audioAsset.id,
              kind: audioAsset.kind,
              provider: audioAsset.provider,
              url: `/api/v1/audio/${audioAsset.id}`,
            }
          : null,
        result: answer
          ? {
              id: answer.id,
              submittedAnswer: answer.submittedAnswer,
              normalizedAnswer: answer.normalizedAnswer,
              isCorrect: answer.isCorrect,
              rating: answer.rating,
              responseTimeMs: answer.responseTimeMs,
              awardedXp: answer.awardedXp,
              acceptedAnswer: accepted?.value ?? null,
              answeredAt: answer.createdAt,
            }
          : null,
      };
    }),
  };
}

function schedulingInput(progress) {
  if (!progress) return null;
  return {
    state: progress.state,
    difficulty: Number(progress.difficulty),
    stability: Number(progress.stability),
    dueAt: progress.dueAt,
    lastReviewedAt: progress.lastReviewedAt,
    scheduledDays: progress.scheduledDays,
    repetitions: progress.repetitions,
    lapses: progress.lapses,
  };
}

function averageResponseTime(progress, responseTimeMs) {
  if (!progress) return responseTimeMs;
  const count = progress.correctCount + progress.incorrectCount;
  return Math.round((progress.averageResponseTimeMs * count + responseTimeMs) / (count + 1));
}

export async function applyProgressReview(
  transaction,
  { userId, termId, sessionAnswerId, rating, isCorrect, responseTimeMs, now },
) {
  const previous = await transaction.userTermProgress.findUnique({
    where: { userId_termId: { userId, termId } },
  });
  const next = scheduleReview(schedulingInput(previous), rating, now);
  let progress;
  if (!previous) {
    progress = await transaction.userTermProgress.create({
      data: {
        userId,
        termId,
        state: next.state,
        difficulty: next.difficulty,
        stability: next.stability,
        dueAt: next.dueAt,
        lastReviewedAt: now,
        scheduledDays: next.scheduledDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        correctCount: isCorrect ? 1 : 0,
        incorrectCount: isCorrect ? 0 : 1,
        averageResponseTimeMs: responseTimeMs,
        version: 1,
      },
    });
  } else {
    const updated = await transaction.userTermProgress.updateMany({
      where: { id: previous.id, version: previous.version },
      data: {
        state: next.state,
        difficulty: next.difficulty,
        stability: next.stability,
        dueAt: next.dueAt,
        lastReviewedAt: now,
        scheduledDays: next.scheduledDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        correctCount: { increment: isCorrect ? 1 : 0 },
        incorrectCount: { increment: isCorrect ? 0 : 1 },
        averageResponseTimeMs: averageResponseTime(previous, responseTimeMs),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      const error = new Error("Concurrent progress update.");
      error.code = "PROGRESS_WRITE_CONFLICT";
      throw error;
    }
    progress = await transaction.userTermProgress.findUnique({ where: { id: previous.id } });
  }

  await transaction.reviewLog.create({
    data: {
      userTermProgressId: progress.id,
      userId,
      termId,
      sessionAnswerId,
      rating,
      wasCorrect: isCorrect,
      previousState: previous?.state ?? "NEW",
      previousDifficulty: previous?.difficulty ?? 0,
      previousStability: previous?.stability ?? 0,
      previousDueAt: previous?.dueAt ?? null,
      newState: next.state,
      newDifficulty: next.difficulty,
      newStability: next.stability,
      newDueAt: next.dueAt,
      scheduledDays: next.scheduledDays,
      schedulerVersion: SCHEDULER_VERSION,
      reviewedAt: now,
    },
  });
  return progress;
}

function responseTime(item, supplied, now) {
  const elapsed = item.servedAt ? now.getTime() - item.servedAt.getTime() : (supplied ?? 0);
  return Math.max(0, Math.min(600_000, Math.round(elapsed)));
}

export function deriveEffectiveRating(isCorrect, requestedRating) {
  if (!isCorrect) return "AGAIN";
  return !requestedRating || requestedRating === "AGAIN" ? "GOOD" : requestedRating;
}

async function sessionTerms(db, input) {
  if (input.lessonId) {
    const lesson = await db.lesson.findFirst({
      where: { id: input.lessonId, status: "PUBLISHED", archivedAt: null },
      include: {
        terms: {
          orderBy: { position: "asc" },
          include: { term: { include: { variants: true, definitions: true } } },
        },
      },
    });
    if (!lesson) throw notFound("Опублікований урок не знайдено.");
    const terms = lesson.terms
      .map(({ term }) => term)
      .filter((term) => term.status === "PUBLISHED");
    if (terms.length < 8 || terms.length > 12) {
      throw conflict(
        "LESSON_NOT_READY",
        "Урок повинен містити від 8 до 12 опублікованих термінів.",
      );
    }
    return { lesson, terms, kind: "LESSON" };
  }

  if (input.categoryId) {
    const category = await db.category.findFirst({
      where: { id: input.categoryId, archivedAt: null },
      select: { id: true },
    });
    if (!category) throw notFound("Категорію не знайдено.");
  }
  const terms = await db.term.findMany({
    where: {
      status: "PUBLISHED",
      archivedAt: null,
      ...(input.categoryId ? { categories: { some: { categoryId: input.categoryId } } } : {}),
    },
    orderBy: { id: "asc" },
    take: 10,
    include: { variants: true, definitions: true },
  });
  if (terms.length === 0) throw notFound("Немає доступних опублікованих термінів.");
  return { lesson: null, terms, kind: "PRACTICE" };
}

export function createStudyService(db, { clock = () => new Date() } = {}) {
  if (!db) throw new TypeError("A database client is required.");
  const idempotency = createIdempotencyService(db, { clock });

  async function createSession(userId, input, requestKey) {
    const now = clock();
    const direction = databaseDirection(input.direction ?? input.mode);
    const selected = await sessionTerms(db, input);
    const items = selected.terms.map((term, index) => {
      const prompt = primaryVariant(term, sourceLocale(direction));
      const accepted = acceptedVariants(term, targetLocale(direction));
      if (!prompt || accepted.length === 0) {
        throw conflict(
          "TERM_NOT_STUDY_READY",
          "Один із термінів не має перевіреної пари для цього напрямку.",
        );
      }
      return {
        termId: term.id,
        promptVariantId: prompt.id,
        contentRevisionNumber: term.currentRevision,
        position: index + 1,
        stage: "PRACTICE",
        exerciseType: direction === "UK_TO_EN" ? "UA_TO_EN" : "EN_TO_UA",
        servedAt: now,
      };
    });
    const idempotencyKey = requestKey ?? randomUUID();

    try {
      const created = await db.studySession.create({
        data: {
          userId,
          lessonId: selected.lesson?.id ?? null,
          kind: selected.kind,
          direction,
          status: "ACTIVE",
          currentStage: "PRACTICE",
          idempotencyKey,
          xpPolicyVersion: XP_POLICY_VERSION,
          schedulerVersion: SCHEDULER_VERSION,
          maxScore: items.length,
          startedAt: now,
          expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
          items: { create: items },
        },
        include: sessionInclude,
      });
      return mapSession(created);
    } catch (error) {
      if (error?.code !== "P2002") throw error;
      const existing = await db.studySession.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
        include: sessionInclude,
      });
      if (!existing) throw error;
      return mapSession(existing);
    }
  }

  async function getSession(userId, sessionId) {
    const session = await db.studySession.findFirst({
      where: { id: sessionId, userId },
      include: sessionInclude,
    });
    if (!session) throw notFound("Навчальну сесію не знайдено.");
    if (session.status === "ACTIVE" && session.expiresAt <= clock()) {
      await db.studySession.updateMany({
        where: { id: session.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });
      session.status = "EXPIRED";
    }
    let summary = null;
    if (session.status === "COMPLETED") {
      const completionXp = session.lessonId
        ? await db.xpTransaction.findMany({
            where: {
              userId,
              sourceId: session.lessonId,
              sourceType: { in: ["LESSON_COMPLETION", "PERFECT_LESSON"] },
              metadata: { path: ["sessionId"], equals: session.id },
            },
            select: { reason: true, amount: true },
          })
        : [];
      const answerXp = session.items.reduce(
        (sum, item) => sum + (item.answers[0]?.awardedXp ?? 0),
        0,
      );
      const completionXpTotal = completionXp.reduce(
        (sum, transactionEntry) => sum + transactionEntry.amount,
        0,
      );
      summary = {
        correctItems: session.score,
        totalItems: session.maxScore,
        accuracy: session.maxScore ? Math.round((session.score / session.maxScore) * 100) : 0,
        xpAwarded: answerXp + completionXpTotal,
        awards: [
          ...(answerXp > 0 ? [{ reason: "CORRECT_ANSWERS", amount: answerXp }] : []),
          ...completionXp,
        ],
      };
    }
    return mapSession(session, summary);
  }

  async function submitAnswer(userId, sessionId, input, idempotencyKey) {
    return idempotency
      .execute(
        {
          userId,
          scope: `study-session:${sessionId}:answer`,
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
            const session = await transaction.studySession.findFirst({
              where: { id: sessionId, userId },
              select: {
                id: true,
                userId: true,
                lessonId: true,
                kind: true,
                direction: true,
                status: true,
                expiresAt: true,
                score: true,
                maxScore: true,
              },
            });
            if (!session) throw notFound("Навчальну сесію не знайдено.");
            const recordedAnswer = await transaction.sessionAnswer.findUnique({
              where: {
                studySessionId_clientAnswerId: {
                  studySessionId: session.id,
                  clientAnswerId: idempotencyKey,
                },
              },
              include: {
                acceptedVariant: { select: { value: true } },
                sessionItem: { select: { id: true, termId: true } },
              },
            });
            if (recordedAnswer) {
              const [progress, answeredItems, primary, awards] = await Promise.all([
                transaction.userTermProgress.findUnique({
                  where: {
                    userId_termId: { userId, termId: recordedAnswer.sessionItem.termId },
                  },
                }),
                transaction.studySessionItem.count({
                  where: { studySessionId: session.id, status: "ANSWERED" },
                }),
                transaction.termVariant.findFirst({
                  where: {
                    termId: recordedAnswer.sessionItem.termId,
                    locale: targetLocale(session.direction),
                    isPrimary: true,
                  },
                  select: { value: true },
                }),
                transaction.userAchievement.findMany({
                  where: {
                    userId,
                    triggerType: "SESSION_ANSWER",
                    triggerId: recordedAnswer.id,
                  },
                  include: { achievement: true },
                }),
              ]);
              return {
                answer: {
                  id: recordedAnswer.id,
                  sessionItemId: recordedAnswer.sessionItemId,
                  isCorrect: recordedAnswer.isCorrect,
                  normalizedAnswer: recordedAnswer.normalizedAnswer,
                  acceptedAnswer: recordedAnswer.acceptedVariant?.value ?? primary?.value ?? null,
                  rating: recordedAnswer.rating,
                  responseTimeMs: recordedAnswer.responseTimeMs,
                  awardedXp: recordedAnswer.awardedXp,
                },
                progress: progress ? mapProgress(progress) : null,
                session: {
                  id: session.id,
                  score: session.score,
                  maxScore: session.maxScore,
                },
                achievements: awards.map(({ achievement, awardedAt }) => ({
                  id: achievement.id,
                  code: achievement.code,
                  nameUk: achievement.nameUk,
                  nameEn: achievement.nameEn,
                  awardedAt,
                  rewardXp: achievement.rewardXp,
                })),
                correct: recordedAnswer.isCorrect,
                acceptedAnswer: recordedAnswer.acceptedVariant?.value ?? primary?.value ?? null,
                feedback: recordedAnswer.isCorrect
                  ? "Відповідь зараховано сервером."
                  : "Перевірте затверджений варіант і повторіть термін за розкладом.",
                xpAwarded: recordedAnswer.awardedXp,
                answeredItems,
                totalItems: session.maxScore,
                nextItem: answeredItems < session.maxScore ? { available: true } : null,
                recovered: true,
              };
            }
            if (session.status !== "ACTIVE") {
              throw conflict("SESSION_NOT_ACTIVE", "Ця навчальна сесія вже не активна.");
            }
            if (session.expiresAt <= now) {
              throw new DomainError("SESSION_EXPIRED", "Час навчальної сесії минув.", 409);
            }
            const item = await transaction.studySessionItem.findFirst({
              where: { id: input.sessionItemId, studySessionId: session.id },
              include: {
                term: {
                  select: {
                    id: true,
                    variants: {
                      where: {
                        locale: targetLocale(session.direction),
                        isAcceptedAnswer: true,
                      },
                      orderBy: [{ isPrimary: "desc" }, { value: "asc" }],
                    },
                  },
                },
              },
            });
            if (!item) throw notFound("Вправу не знайдено в цій сесії.");
            if (item.status !== "PENDING") {
              throw conflict("ANSWER_ALREADY_RECORDED", "Відповідь на цю вправу вже записано.");
            }

            const evaluation = evaluateAnswer({
              answer: input.answer,
              acceptedVariants: item.term.variants,
              locale: apiLocale(targetLocale(session.direction)),
            });
            const rating = deriveEffectiveRating(evaluation.correct, input.rating);
            const responseTimeMs = responseTime(item, input.responseTimeMs, now);
            const answerId = randomUUID();
            const gamification = createGamificationService(transaction, { clock: () => now });
            let xp = { amount: 0 };
            if (evaluation.correct && session.kind === "LESSON" && session.lessonId) {
              xp = await gamification.awardXp({
                userId,
                amount: XP_AWARDS.FIRST_ATTEMPT_CORRECT,
                reason: "CORRECT_ANSWER",
                sourceType: "LESSON_TERM",
                sourceId: `${session.lessonId}:${item.termId}`,
                dedupeKey: `lesson-term:${userId}:${session.lessonId}:${item.termId}`,
                metadata: { sessionId: session.id },
              });
            } else if (evaluation.correct && session.kind === "REVIEW") {
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
                studySessionId: session.id,
                sessionItemId: item.id,
                userId,
                termId: item.termId,
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
              termId: item.termId,
              sessionAnswerId: answer.id,
              rating,
              isCorrect: evaluation.correct,
              responseTimeMs,
              now,
            });
            await transaction.studySessionItem.update({
              where: { id: item.id },
              data: { status: "ANSWERED", answeredAt: now },
            });
            await transaction.studySession.update({
              where: { id: session.id },
              data: { score: { increment: evaluation.correct ? 1 : 0 } },
            });
            await gamification.recordActivity({
              userId,
              xpEarned: xp.amount,
              answersSubmitted: 1,
              correctAnswers: evaluation.correct ? 1 : 0,
              reviewsCompleted: session.kind === "REVIEW" ? 1 : 0,
            });
            const achievements = await gamification.evaluateAchievements({
              userId,
              triggerType: "SESSION_ANSWER",
              triggerId: answer.id,
            });
            const answeredItems = await transaction.studySessionItem.count({
              where: { studySessionId: session.id, status: "ANSWERED" },
            });
            const result = {
              answer: {
                id: answer.id,
                sessionItemId: item.id,
                isCorrect: evaluation.correct,
                normalizedAnswer: evaluation.normalizedAnswer,
                acceptedAnswer: evaluation.acceptedValue,
                rating,
                responseTimeMs,
                awardedXp: xp.amount,
              },
              progress: mapProgress(progress),
              session: {
                id: session.id,
                score: session.score + (evaluation.correct ? 1 : 0),
                maxScore: session.maxScore,
              },
              achievements,
              correct: evaluation.correct,
              acceptedAnswer: evaluation.acceptedValue,
              feedback: evaluation.correct
                ? "Відповідь зараховано сервером."
                : "Перевірте затверджений варіант і повторіть термін за розкладом.",
              xpAwarded: xp.amount,
              answeredItems,
              totalItems: session.maxScore,
              nextItem: answeredItems < session.maxScore ? { available: true } : null,
            };
            return result;
          }),
      )
      .then(({ data, replayed }) => ({ ...data, replayed }));
  }

  async function completeSession(userId, sessionId, idempotencyKey) {
    return idempotency
      .execute(
        {
          userId,
          scope: `study-session:${sessionId}:complete`,
          key: idempotencyKey,
          payload: { sessionId },
        },
        () =>
          runSerializable(db, async (transaction) => {
            const now = clock();
            await transaction.userProfile.update({
              where: { userId },
              data: { updatedAt: now },
            });
            const session = await transaction.studySession.findFirst({
              where: { id: sessionId, userId },
              include: {
                items: { select: { id: true, status: true } },
                answers: { select: { isCorrect: true, awardedXp: true } },
              },
            });
            if (!session) throw notFound("Навчальну сесію не знайдено.");
            if (session.status === "COMPLETED") {
              const [profile, completionXp, earnedAchievements] = await Promise.all([
                transaction.userProfile.findUnique({ where: { userId } }),
                session.lessonId
                  ? transaction.xpTransaction.findMany({
                      where: {
                        userId,
                        sourceId: session.lessonId,
                        sourceType: { in: ["LESSON_COMPLETION", "PERFECT_LESSON"] },
                        metadata: { path: ["sessionId"], equals: session.id },
                      },
                      select: { reason: true, amount: true },
                    })
                  : [],
                transaction.userAchievement.findMany({
                  where: {
                    userId,
                    triggerType: "STUDY_SESSION",
                    triggerId: session.id,
                  },
                  include: { achievement: true },
                }),
              ]);
              const answerXp = session.answers.reduce((sum, answer) => sum + answer.awardedXp, 0);
              const completionXpTotal = completionXp.reduce(
                (sum, transactionEntry) => sum + transactionEntry.amount,
                0,
              );
              const awards = [
                ...(answerXp > 0 ? [{ reason: "CORRECT_ANSWERS", amount: answerXp }] : []),
                ...completionXp,
              ];
              const achievements = earnedAchievements.map(({ achievement, awardedAt }) => ({
                id: achievement.id,
                code: achievement.code,
                nameUk: achievement.nameUk,
                nameEn: achievement.nameEn,
                awardedAt,
                rewardXp: achievement.rewardXp,
              }));
              return {
                id: session.id,
                status: session.status,
                completedAt: session.completedAt,
                score: session.score,
                maxScore: session.maxScore,
                summary: {
                  correct: session.score,
                  total: session.maxScore,
                  accuracy: session.maxScore
                    ? Math.round((session.score / session.maxScore) * 100)
                    : 0,
                  correctItems: session.score,
                  totalItems: session.maxScore,
                  xpAwarded: answerXp + completionXpTotal,
                  awards,
                },
                rewards: { xpAwarded: completionXpTotal, achievements },
                progress: profile
                  ? {
                      totalXp: profile.totalXp,
                      level: profile.level,
                      currentStreak: profile.currentStreak,
                      longestStreak: profile.longestStreak,
                    }
                  : null,
                recovered: true,
              };
            }
            if (session.status !== "ACTIVE" || session.expiresAt <= now) {
              throw conflict("SESSION_NOT_ACTIVE", "Ця навчальна сесія вже не активна.");
            }
            if (
              session.items.length === 0 ||
              session.items.some((item) => item.status !== "ANSWERED")
            ) {
              throw conflict("SESSION_INCOMPLETE", "Спочатку завершіть усі вправи сесії.");
            }
            const correct = session.answers.filter((answer) => answer.isCorrect).length;
            const claimed = await transaction.studySession.updateMany({
              where: { id: session.id, status: "ACTIVE", completedAt: null },
              data: {
                status: "COMPLETED",
                currentStage: "AFTER_ACTION_REVIEW",
                score: correct,
                completedAt: now,
              },
            });
            if (claimed.count !== 1) {
              throw conflict("SESSION_ALREADY_COMPLETED", "Цю сесію вже завершено.");
            }

            let firstCompletion = false;
            if (session.kind === "LESSON" && session.lessonId) {
              const existing = await transaction.userLessonProgress.findUnique({
                where: { userId_lessonId: { userId, lessonId: session.lessonId } },
              });
              firstCompletion = !existing?.firstCompletedAt;
              await transaction.userLessonProgress.upsert({
                where: { userId_lessonId: { userId, lessonId: session.lessonId } },
                create: {
                  userId,
                  lessonId: session.lessonId,
                  completions: 1,
                  bestScore: correct,
                  firstCompletedAt: now,
                  lastCompletedAt: now,
                },
                update: {
                  completions: { increment: 1 },
                  bestScore: Math.max(existing?.bestScore ?? 0, correct),
                  firstCompletedAt: existing?.firstCompletedAt ?? now,
                  lastCompletedAt: now,
                },
              });
            }

            const gamification = createGamificationService(transaction, { clock: () => now });
            let xpAwarded = 0;
            const awards = [];
            if (firstCompletion) {
              const completion = await gamification.awardXp({
                userId,
                amount: XP_AWARDS.LESSON_COMPLETED,
                reason: "FIRST_LESSON_COMPLETION",
                sourceType: "LESSON_COMPLETION",
                sourceId: session.lessonId,
                dedupeKey: `lesson-completion:${userId}:${session.lessonId}`,
                metadata: { sessionId: session.id },
              });
              xpAwarded += completion.amount;
              if (completion.amount > 0) {
                awards.push({ reason: "FIRST_LESSON_COMPLETION", amount: completion.amount });
              }
              if (correct === session.items.length) {
                const perfect = await gamification.awardXp({
                  userId,
                  amount: XP_AWARDS.PERFECT_LESSON,
                  reason: "PERFECT_LESSON",
                  sourceType: "PERFECT_LESSON",
                  sourceId: session.lessonId,
                  dedupeKey: `perfect-lesson:${userId}:${session.lessonId}`,
                  metadata: { sessionId: session.id },
                });
                xpAwarded += perfect.amount;
                if (perfect.amount > 0) {
                  awards.push({ reason: "PERFECT_LESSON", amount: perfect.amount });
                }
              }
            }
            await gamification.recordActivity({
              userId,
              xpEarned: xpAwarded,
              lessonsCompleted: session.kind === "LESSON" ? 1 : 0,
            });
            const achievements = await gamification.evaluateAchievements({
              userId,
              triggerType: "STUDY_SESSION",
              triggerId: session.id,
            });
            const profile = await transaction.userProfile.findUnique({ where: { userId } });
            const answerXp = session.answers.reduce((sum, answer) => sum + answer.awardedXp, 0);
            if (answerXp > 0) awards.unshift({ reason: "CORRECT_ANSWERS", amount: answerXp });
            return {
              id: session.id,
              status: "COMPLETED",
              completedAt: now,
              score: correct,
              maxScore: session.items.length,
              summary: {
                correct,
                total: session.items.length,
                accuracy: Math.round((correct / session.items.length) * 100),
                correctItems: correct,
                totalItems: session.items.length,
                xpAwarded: answerXp + xpAwarded,
                awards,
              },
              rewards: { xpAwarded, achievements },
              progress: profile
                ? {
                    totalXp: profile.totalXp,
                    level: profile.level,
                    currentStreak: profile.currentStreak,
                    longestStreak: profile.longestStreak,
                  }
                : null,
            };
          }),
      )
      .then(({ data, replayed }) => ({ ...data, replayed }));
  }

  return { createSession, getSession, submitAnswer, completeSession };
}
