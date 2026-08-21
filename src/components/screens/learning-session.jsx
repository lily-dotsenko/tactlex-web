"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { apiRequest, createIdempotencyKey } from "@/components/learning-api";
import { AccessibleDialog } from "@/components/accessible-dialog";
import { Confetti, playEffect, useEffectPreferences } from "@/components/effects";
import { Mascot } from "@/components/mascot";
import { PronunciationButton } from "@/features/audio/pronunciation-button";
import { useRouter } from "@/lib/i18n/navigation";
import { pronunciationForItem } from "@/lib/learning/session-presentation";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  Stat,
} from "@/components/ui";

function sessionCopy(locale) {
  return locale === "uk"
    ? {
        loading: "Завантажуємо заняття…",
        unavailable: "Навчальна сесія недоступна",
        empty: "У цій сесії немає доступних завдань.",
        retry: "Спробувати знову",
        submit: "Надіслати на перевірку",
        submitting: "Перевіряємо…",
        next: "Наступне завдання",
        completing: "Завершуємо сесію…",
        answerLabel: "Ваша відповідь",
        answerPlaceholder: "Введіть відповідь",
        noClientScoring: "У цій сесії немає доступних завдань.",
        resultUnavailable: "Підсумок цієї сесії недоступний",
        resultUnavailableText: "Не вдалося завантажити підсумок заняття.",
        completed: "Сесію завершено",
        resultLead: "Ваш результат і отриманий досвід.",
        accuracy: "Точність",
        xp: "Нараховано XP",
        correctItems: "Правильні відповіді",
        awards: "Нарахування",
        noAwards: "Додаткових нарахувань немає.",
        introduction: "Ознайомлення",
        introductionLead: "Перегляньте всі десять термінів перед перевіркою знань.",
        previousCard: "Попередній термін",
        nextCard: "Наступний термін",
        beginPractice: "Почати практику",
        beginningPractice: "Готуємо вправи…",
        audioPrompt: "Прослухайте термін і введіть український відповідник",
        summaryEyebrow: "Підсумок заняття",
        dashboard: "На головну",
        backToCategory: "Повернутися до напряму",
        review: "Повторення",
        matchPairs: "З’єднайте терміни з відповідниками",
        matchLabel: "Зіставлення",
        gapLabel: "Заповніть пропуск",
        gapInstruction: "Оберіть термін, який правильно доповнює речення.",
        answerLabelShort: "Оберіть правильну відповідь",
        listeningLabel: "Аудіювання",
        exitTitle: "Зберегти прогрес і вийти?",
        exitText: "Сесію можна буде продовжити з цього місця протягом двох годин.",
        keepLearning: "Продовжити навчання",
        saveAndExit: "Зберегти й вийти",
        keyboardHint: "Клавіші 1–9 — відповідь, Enter — далі, Esc — вихід",
      }
    : {
        loading: "Loading the lesson…",
        unavailable: "The learning session is unavailable",
        empty: "This session has no available tasks.",
        retry: "Try again",
        submit: "Send for evaluation",
        submitting: "Checking…",
        next: "Next task",
        completing: "Completing session…",
        answerLabel: "Your answer",
        answerPlaceholder: "Type your answer",
        noClientScoring: "This session has no available tasks.",
        resultUnavailable: "This session summary is unavailable",
        resultUnavailableText: "The lesson summary could not be loaded.",
        completed: "Session complete",
        resultLead: "Your lesson result and earned experience.",
        accuracy: "Accuracy",
        xp: "XP awarded",
        correctItems: "Correct answers",
        awards: "Awards",
        noAwards: "No additional awards were returned.",
        introduction: "Introduction",
        introductionLead: "Review all ten terms before starting the knowledge check.",
        previousCard: "Previous term",
        nextCard: "Next term",
        beginPractice: "Start practice",
        beginningPractice: "Preparing exercises…",
        audioPrompt: "Listen to the term and enter its Ukrainian equivalent",
        summaryEyebrow: "Lesson summary",
        dashboard: "Dashboard",
        backToCategory: "Back to learning path",
        review: "Review",
        matchPairs: "Match each term with its translation",
        matchLabel: "Matching",
        gapLabel: "Fill in the blank",
        gapInstruction: "Choose the term that correctly completes the sentence.",
        answerLabelShort: "Choose the correct answer",
        listeningLabel: "Listening",
        exitTitle: "Save your progress and leave?",
        exitText: "You can continue this session from the same place for two hours.",
        keepLearning: "Keep learning",
        saveAndExit: "Save and exit",
        keyboardHint: "Keys 1–9 — answer, Enter — continue, Esc — exit",
      };
}

function awardLabel(reason, locale) {
  const labels = {
    CORRECT_ANSWERS: { uk: "Правильні відповіді", en: "Correct answers" },
    FIRST_LESSON_COMPLETION: { uk: "Перше завершення уроку", en: "First lesson completion" },
    PERFECT_LESSON: { uk: "Урок без помилок", en: "Perfect lesson" },
    SCHEDULED_REVIEW: { uk: "Планове повторення", en: "Scheduled review" },
  };
  return labels[reason]?.[locale] ?? reason.replaceAll("_", " ").toLocaleLowerCase(locale);
}

function normalizeChoice(choice, index) {
  if (typeof choice === "string") return { value: choice, label: choice };
  const label = choice?.label ?? choice?.text ?? choice?.value ?? `Option ${index + 1}`;
  const value = choice?.value ?? choice?.id ?? label;
  return { value: String(value), label: String(label) };
}

function currentSessionItem(session) {
  if (!Array.isArray(session?.items) || session.items.length === 0) return null;
  const indexed = session.items[Number(session.currentIndex || 0)];
  if (indexed?.status !== "ANSWERED") return indexed;
  return session.items.find((item) => item.status !== "ANSWERED") || null;
}

function MatchingExercise({ interaction, locale, busy, onMatch }) {
  const [selectedId, setSelectedId] = useState(null);
  const items = interaction?.items ?? [];
  const pending = items.filter((item) => item.status !== "ANSWERED");
  const selected = pending.find((item) => item.id === selectedId) ?? null;
  const choices = (items[0]?.choices ?? []).map(normalizeChoice);
  const completedValues = new Set(
    items
      .filter((item) => item.status === "ANSWERED" && item.result?.isCorrect)
      .map((item) => item.result.submittedAnswer),
  );

  return (
    <div className="matching-board">
      <div className="matching-column" aria-label={locale === "uk" ? "Терміни" : "Terms"}>
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={clsx(
              "matching-tile",
              selectedId === item.id && "is-selected",
              item.status === "ANSWERED" && "is-complete",
            )}
            disabled={busy || item.status === "ANSWERED"}
            onClick={() => setSelectedId(item.id)}
          >
            <span>{index + 1}</span>
            <strong>{item.prompt}</strong>
          </button>
        ))}
      </div>
      <div
        className="matching-column"
        aria-label={locale === "uk" ? "Відповідники" : "Translations"}
      >
        {choices.map((choice) => {
          const alreadyTried = selected?.attemptedAnswers?.includes(choice.value);
          return (
            <button
              key={choice.value}
              type="button"
              className={clsx(
                "matching-tile matching-answer",
                completedValues.has(choice.value) && "is-complete",
                alreadyTried && "is-wrong",
              )}
              disabled={busy || !selected || completedValues.has(choice.value) || alreadyTried}
              onClick={(event) => onMatch(selected, choice.value, event.timeStamp)}
            >
              <strong>{choice.label}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SessionExitDialog({ open, copy, onClose, onLeave, initialFocusRef }) {
  return (
    <AccessibleDialog
      open={open}
      title={copy.exitTitle}
      onClose={onClose}
      initialFocusRef={initialFocusRef}
    >
      <Mascot pose="encourage" motion="tilt" size={116} className="dialog-mascot" />
      <p>{copy.exitText}</p>
      <div className="dialog-actions">
        <button
          ref={initialFocusRef}
          type="button"
          className="button button-primary button-default"
          onClick={onClose}
        >
          {copy.keepLearning}
        </button>
        <Button variant="secondary" onClick={onLeave}>
          {copy.saveAndExit}
        </Button>
      </div>
    </AccessibleDialog>
  );
}

export function SessionScreen({ sessionId }) {
  const t = useTranslations("Session");
  const locale = useLocale();
  const router = useRouter();
  const copy = sessionCopy(locale);
  const submissionKey = useRef(null);
  const submittingRef = useRef(false);
  const completionKey = useRef(null);
  const itemStartedAt = useRef(0);
  const leaveButtonRef = useRef(null);
  const bypassExitGuard = useRef(false);
  const [state, setState] = useState({ status: "loading", session: null, item: null });
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [introIndex, setIntroIndex] = useState(0);
  const [wrongChoices, setWrongChoices] = useState([]);
  const [revealedChoices, setRevealedChoices] = useState([]);
  const [exitOpen, setExitOpen] = useState(false);
  const [feedbackPose, setFeedbackPose] = useState("think");

  const closeExit = useCallback(() => setExitOpen(false), []);
  const requestExit = useCallback(() => setExitOpen(true), []);
  const leaveSession = useCallback(() => {
    bypassExitGuard.current = true;
    setExitOpen(false);
    router.replace("/learn");
  }, [router]);
  const activeSessionId = state.session?.status === "ACTIVE" ? state.session.id : null;

  const loadSession = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading" }));
    setRequestError("");
    try {
      const session = await apiRequest(`/study-sessions/${encodeURIComponent(sessionId)}`);
      if (session?.status === "COMPLETED") {
        router.replace(`/sessions/${sessionId}/result`);
        return;
      }
      const item = currentSessionItem(session);
      setState({ status: item ? "ready" : "empty", session, item });
      setAnswer("");
      setResult(null);
      setWrongChoices(item?.attemptedAnswers ?? []);
      setRevealedChoices(item?.choices ?? []);
      setFeedbackPose("think");
      submissionKey.current = null;
      itemStartedAt.current = performance.now();
    } catch (error) {
      setState({ status: "error", session: null, item: null, error: error.message });
    }
  }, [router, sessionId]);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(`tactlex:intro-position:${sessionId}`));
    const timer = window.setTimeout(() => {
      if (Number.isInteger(saved) && saved >= 0) setIntroIndex(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sessionId]);

  useEffect(() => {
    if (state.session?.currentStage !== "INTRODUCTION") return;
    window.localStorage.setItem(`tactlex:intro-position:${sessionId}`, String(introIndex));
  }, [introIndex, sessionId, state.session?.currentStage]);

  useEffect(() => {
    if (!activeSessionId) return undefined;
    window.history.pushState({ tactlexSessionGuard: true }, "", window.location.href);
    const guardBack = () => {
      if (bypassExitGuard.current) return;
      window.history.pushState({ tactlexSessionGuard: true }, "", window.location.href);
      requestExit();
    };
    window.addEventListener("popstate", guardBack);
    return () => window.removeEventListener("popstate", guardBack);
  }, [activeSessionId, requestExit]);

  useEffect(() => {
    let active = true;
    apiRequest(`/study-sessions/${encodeURIComponent(sessionId)}`)
      .then((session) => {
        if (!active) return;
        if (session?.status === "COMPLETED") {
          router.replace(`/sessions/${sessionId}/result`);
          return;
        }
        const item = currentSessionItem(session);
        setState({ status: item ? "ready" : "empty", session, item });
        setWrongChoices(item?.attemptedAnswers ?? []);
        setRevealedChoices(item?.choices ?? []);
        setFeedbackPose("think");
        itemStartedAt.current = performance.now();
      })
      .catch((error) => {
        if (active) setState({ status: "error", session: null, item: null, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [router, sessionId]);

  async function submitAnswer(candidateAnswer = answer, responseTimeMs = 0) {
    const submittedAnswer = candidateAnswer.trim();
    if (
      !state.item ||
      !submittedAnswer ||
      result?.correct ||
      state.status === "submitting" ||
      submittingRef.current
    )
      return;
    submittingRef.current = true;
    submissionKey.current ||= createIdempotencyKey();
    setResult(null);
    setState((current) => ({ ...current, status: "submitting" }));
    setRequestError("");
    try {
      const answerResult = await apiRequest(
        `/study-sessions/${encodeURIComponent(sessionId)}/answers`,
        {
          method: "POST",
          headers: { "Idempotency-Key": submissionKey.current },
          body: JSON.stringify({
            sessionItemId: state.item.id,
            answer: submittedAnswer,
            responseTimeMs,
          }),
        },
      );
      setResult(answerResult);
      if (!answerResult.replayed) playEffect(answerResult.correct ? "correct" : "wrong");
      setFeedbackPose(answerResult.correct ? "correct" : "encourage");
      if (!answerResult.correct) {
        setWrongChoices((current) => [...new Set([...current, submittedAnswer])]);
        if (Array.isArray(answerResult.correctionChoices)) {
          setRevealedChoices(answerResult.correctionChoices);
        }
      }
      setState((current) => ({ ...current, status: "answered" }));
      submissionKey.current = null;
    } catch (error) {
      setRequestError(error.message);
      setState((current) => ({ ...current, status: "ready" }));
    } finally {
      submittingRef.current = false;
    }
  }

  async function submitMatch(matchItem, candidateAnswer, eventTimestamp = 0) {
    if (!matchItem || state.status === "submitting" || submittingRef.current) return;
    submittingRef.current = true;
    setState((current) => ({ ...current, status: "submitting" }));
    setRequestError("");
    try {
      const answerResult = await apiRequest(
        `/study-sessions/${encodeURIComponent(sessionId)}/answers`,
        {
          method: "POST",
          headers: { "Idempotency-Key": createIdempotencyKey() },
          body: JSON.stringify({
            sessionItemId: matchItem.id,
            answer: candidateAnswer,
            responseTimeMs: Math.max(0, Math.round(eventTimestamp - itemStartedAt.current)),
          }),
        },
      );
      if (!answerResult.replayed) playEffect(answerResult.correct ? "correct" : "wrong");
      const nextPose = answerResult.correct ? "correct" : "encourage";
      await loadSession();
      setFeedbackPose(nextPose);
    } catch (error) {
      setRequestError(error.message);
      setState((current) => ({ ...current, status: "ready" }));
    } finally {
      submittingRef.current = false;
    }
  }

  async function beginPractice() {
    setState((current) => ({ ...current, status: "beginning-practice" }));
    setRequestError("");
    try {
      const session = await apiRequest(
        `/study-sessions/${encodeURIComponent(sessionId)}/practice`,
        { method: "POST" },
      );
      const item = currentSessionItem(session);
      setState({ status: item ? "ready" : "empty", session, item });
      setWrongChoices(item?.attemptedAnswers ?? []);
      setRevealedChoices(item?.choices ?? []);
      itemStartedAt.current = performance.now();
      window.localStorage.removeItem(`tactlex:intro-position:${sessionId}`);
    } catch (error) {
      setRequestError(error.message);
      setState((current) => ({ ...current, status: "ready" }));
    }
  }

  async function completeSession() {
    completionKey.current ||= createIdempotencyKey();
    setState((current) => ({ ...current, status: "completing" }));
    setRequestError("");
    try {
      const completion = await apiRequest(
        `/study-sessions/${encodeURIComponent(sessionId)}/complete`,
        {
          method: "POST",
          headers: { "Idempotency-Key": completionKey.current },
          body: JSON.stringify({}),
        },
      );
      if (completion?.summary) {
        window.sessionStorage.setItem(
          `tactlex-session-summary:${sessionId}`,
          JSON.stringify({ ...completion.summary, returnTo: completion.returnTo || "/learn" }),
        );
      }
      window.sessionStorage.setItem(
        `tactlex-session-fresh:${sessionId}`,
        completion.replayed || completion.recovered ? "false" : "true",
      );
      bypassExitGuard.current = true;
      router.push(`/sessions/${sessionId}/result`);
    } catch (error) {
      setRequestError(error.message);
      setState((current) => ({ ...current, status: "answered" }));
    }
  }

  function continueSession() {
    const answeredItems = Number(result?.answeredItems ?? state.session?.answeredItems ?? 0);
    const totalItems = Number(result?.totalItems ?? state.session?.totalItems ?? 0);
    if (totalItems > 0 && answeredItems >= totalItems && !result?.nextItem) {
      completeSession();
      return;
    }
    loadSession();
  }

  function chooseAnswer(value, eventTimestamp) {
    const singleAttempt = state.session?.kind === "QUIZ" || state.session?.kind === "CHECKPOINT";
    if (
      state.status === "submitting" ||
      submittingRef.current ||
      result?.correct ||
      (singleAttempt && result) ||
      wrongChoices.includes(value)
    )
      return;
    setAnswer(value);
    submissionKey.current = null;
    submitAnswer(value, Math.max(0, Math.round(eventTimestamp - itemStartedAt.current)));
  }

  function submitTypedAnswer(event) {
    submitAnswer(answer, Math.max(0, Math.round(event.timeStamp - itemStartedAt.current)));
  }

  const session = state.session;
  const item = state.item;
  const choices = Array.isArray(revealedChoices) ? revealedChoices.map(normalizeChoice) : [];
  const matching = session?.currentInteraction?.type === "MATCH_PAIRS";
  const answered = Number(result?.answeredItems ?? session?.answeredItems ?? 0);
  const total = Number(result?.totalItems ?? session?.totalItems ?? 0);
  const current = Math.min(total || 1, answered + (result ? 0 : 1));
  const progress = total ? Math.round((answered / total) * 100) : 0;
  const practicePronunciation =
    session?.kind === "QUIZ" || session?.kind === "CHECKPOINT" ? null : pronunciationForItem(item);
  const singleAttemptQuiz = session?.kind === "QUIZ" || session?.kind === "CHECKPOINT";

  useEffect(() => {
    function onKeyDown(event) {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const editable = event.target?.matches?.("input, textarea, select, [contenteditable='true']");
      if (event.key === "Escape" && !exitOpen) {
        event.preventDefault();
        requestExit();
        return;
      }
      if (editable || exitOpen || state.status === "submitting" || matching) return;
      if (session?.currentStage === "INTRODUCTION") {
        const cards = session.introduction ?? [];
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          setIntroIndex((index) => Math.max(0, index - 1));
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          if (introIndex < cards.length - 1) setIntroIndex((index) => index + 1);
          else beginPractice();
        }
        return;
      }
      if (/^[1-9]$/u.test(event.key) && choices[Number(event.key) - 1]) {
        event.preventDefault();
        chooseAnswer(choices[Number(event.key) - 1].value, event.timeStamp);
      } else if (event.key === "Enter") {
        if (result?.correct || (singleAttemptQuiz && result)) {
          event.preventDefault();
          continueSession();
        } else if (!choices.length && answer.trim() && !result) {
          event.preventDefault();
          submitAnswer(answer, Math.max(0, Math.round(event.timeStamp - itemStartedAt.current)));
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (state.status === "loading" && !session) {
    return (
      <main className="session-page session-state-page">
        <Card className="live-detail-loading" aria-busy="true">
          {copy.loading}
        </Card>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="session-page session-state-page">
        <EmptyState
          icon={<AlertTriangle size={30} />}
          title={copy.unavailable}
          text={state.error}
          action={
            <Button onClick={loadSession} variant="secondary">
              <RefreshCw size={18} /> {copy.retry}
            </Button>
          }
        />
      </main>
    );
  }

  if (session?.currentStage === "INTRODUCTION") {
    const cards = Array.isArray(session.introduction) ? session.introduction : [];
    const card = cards[introIndex];
    return (
      <>
        <main className="session-page introduction-page" id="main-content">
          <header className="session-header">
            <Button variant="ghost" size="small" onClick={requestExit}>
              <X size={20} /> <span className="session-exit-label">{t("exit")}</span>
            </Button>
            <div className="session-progress">
              <span>
                {copy.introduction}: {Math.min(introIndex + 1, cards.length)} / {cards.length}
              </span>
              <ProgressBar
                value={cards.length ? Math.round(((introIndex + 1) / cards.length) * 100) : 0}
                label={copy.introduction}
                compact
              />
            </div>
            <Badge tone="blue">{copy.introduction}</Badge>
          </header>
          {card ? (
            <Card className="introduction-card">
              <Mascot
                pose="coach"
                motion="peek"
                size={112}
                priority
                className="session-morkva session-morkva-intro"
              />
              <p className="eyebrow">{copy.introduction}</p>
              <h1 lang="en">{card.english}</h1>
              <p className="introduction-translation" lang="uk">
                {card.ukrainian}
              </p>
              <PronunciationButton
                key={card.english}
                term={card.english}
                audioUrl={card.audioUrl}
              />
              <div className="introduction-definitions">
                <p lang="en">{card.definitionEn}</p>
                <p lang="uk">{card.definitionUk}</p>
              </div>
              {requestError ? (
                <div className="form-alert" role="alert">
                  {requestError}
                </div>
              ) : null}
              <div className="session-action-row introduction-actions">
                <Button
                  variant="secondary"
                  onClick={() => setIntroIndex((index) => Math.max(0, index - 1))}
                  disabled={introIndex === 0}
                >
                  {copy.previousCard}
                </Button>
                {introIndex < cards.length - 1 ? (
                  <Button onClick={() => setIntroIndex((index) => index + 1)}>
                    {copy.nextCard} <ChevronRight size={20} />
                  </Button>
                ) : (
                  <Button onClick={beginPractice} disabled={state.status === "beginning-practice"}>
                    {state.status === "beginning-practice"
                      ? copy.beginningPractice
                      : copy.beginPractice}
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <EmptyState icon={<ShieldCheck />} title={copy.empty} text={copy.introductionLead} />
          )}
        </main>
        <SessionExitDialog
          open={exitOpen}
          copy={copy}
          onClose={closeExit}
          onLeave={leaveSession}
          initialFocusRef={leaveButtonRef}
        />
      </>
    );
  }

  if (!item) {
    return (
      <>
        <main className="session-page session-state-page">
          <EmptyState
            icon={<ShieldCheck size={30} />}
            title={copy.empty}
            text={copy.noClientScoring}
            action={
              total > 0 && answered >= total ? (
                <Button onClick={completeSession} disabled={state.status === "completing"}>
                  {state.status === "completing" ? copy.completing : copy.completed}
                </Button>
              ) : (
                <Button variant="secondary" onClick={requestExit}>
                  {t("exit")}
                </Button>
              )
            }
          />
        </main>
        <SessionExitDialog
          open={exitOpen}
          copy={copy}
          onClose={closeExit}
          onLeave={leaveSession}
          initialFocusRef={leaveButtonRef}
        />
      </>
    );
  }

  return (
    <>
      <main className="session-page" id="main-content">
        <header className="session-header">
          <Button variant="ghost" size="small" onClick={requestExit}>
            <X size={20} /> <span className="session-exit-label">{t("exit")}</span>
          </Button>
          <div className="session-progress">
            <span>{t("progress", { current, total: total || 1 })}</span>
            <ProgressBar
              value={progress}
              label={t("progress", { current, total: total || 1 })}
              compact
            />
          </div>
          <Badge tone="blue">{session?.kind || t("stage")}</Badge>
        </header>
        <Card className="session-card">
          <Mascot
            pose={feedbackPose}
            motion={
              feedbackPose === "correct"
                ? "bounce"
                : feedbackPose === "encourage"
                  ? "tilt"
                  : "breathe"
            }
            size={92}
            priority
            className="session-morkva session-morkva-practice"
          />
          <div className="session-card-top">
            <Badge tone="olive">{locale === "uk" ? "Практика" : "Practice"}</Badge>
            {practicePronunciation && (
              <PronunciationButton
                key={`${item.id}:${item.prompt}`}
                {...practicePronunciation}
                compact
              />
            )}
          </div>
          <p className="session-prompt">
            {matching
              ? copy.matchLabel
              : item.exerciseType === "CONTEXT_SENTENCE"
                ? copy.gapLabel
                : item.exerciseType === "AUDIO"
                  ? copy.listeningLabel
                  : copy.answerLabelShort}
          </p>
          <h1>
            {matching
              ? copy.matchPairs
              : item.exerciseType === "AUDIO"
                ? copy.audioPrompt
                : item.prompt}
          </h1>
          {item.exerciseType === "CONTEXT_SENTENCE" ? (
            <p className="session-instruction">{copy.gapInstruction}</p>
          ) : null}

          {matching ? (
            <MatchingExercise
              interaction={session.currentInteraction}
              locale={locale}
              busy={state.status === "submitting"}
              onMatch={submitMatch}
            />
          ) : choices.length > 0 ? (
            <div className="answer-grid" role="radiogroup" aria-label={String(item.prompt)}>
              {choices.map((choice, index) => {
                const selected = answer === choice.value;
                const wrong = wrongChoices.includes(choice.value);
                return (
                  <button
                    key={`${choice.value}-${index}`}
                    type="button"
                    className={clsx(
                      "answer-option",
                      selected && "is-selected",
                      selected && result?.correct === true && "is-correct",
                      wrong && "is-wrong",
                    )}
                    role="radio"
                    aria-checked={selected}
                    disabled={
                      wrong ||
                      result?.correct === true ||
                      (singleAttemptQuiz && Boolean(result)) ||
                      state.status === "submitting"
                    }
                    onClick={(event) => chooseAnswer(choice.value, event.timeStamp)}
                  >
                    <span>{index + 1}</span>
                    <strong>{choice.label}</strong>
                    {selected && result?.correct === true && <CheckCircle2 size={20} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <label
              className={clsx(
                "field session-typed-answer",
                result?.correct === true && "is-correct",
                result?.correct === false && "is-wrong",
              )}
            >
              <span className="field-label">{copy.answerLabel}</span>
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={copy.answerPlaceholder}
                maxLength={200}
                autoComplete="off"
                disabled={Boolean(result) || state.status === "submitting"}
              />
            </label>
          )}

          {requestError && (
            <div className="form-alert" role="alert">
              {requestError}
            </div>
          )}
          {singleAttemptQuiz && result?.correct === false && result?.acceptedAnswer ? (
            <div className="session-correction" role="status">
              <strong>{locale === "uk" ? "Правильна відповідь:" : "Correct answer:"}</strong>{" "}
              {result.acceptedAnswer}
            </div>
          ) : null}
          {!matching ? (
            <div className="session-action-row">
              {choices.length === 0 && !result ? (
                <Button
                  size="large"
                  onClick={submitTypedAnswer}
                  disabled={!answer.trim() || state.status === "submitting"}
                >
                  {state.status === "submitting" ? copy.submitting : copy.submit}
                </Button>
              ) : result?.correct ||
                (singleAttemptQuiz && result) ||
                (choices.length === 0 && result) ? (
                <Button
                  size="large"
                  onClick={continueSession}
                  disabled={state.status === "completing"}
                >
                  {state.status === "completing" ? copy.completing : copy.next}{" "}
                  <ChevronRight size={20} />
                </Button>
              ) : null}
            </div>
          ) : null}
          <p className="keyboard-hint">{copy.keyboardHint}</p>
        </Card>
      </main>
      <SessionExitDialog
        open={exitOpen}
        copy={copy}
        onClose={closeExit}
        onLeave={leaveSession}
        initialFocusRef={leaveButtonRef}
      />
    </>
  );
}

function readStoredSummary(sessionId) {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(`tactlex-session-summary:${sessionId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function ResultLiveScreen({ sessionId }) {
  const locale = useLocale();
  const copy = sessionCopy(locale);
  const effects = useEffectPreferences();
  const [celebrating, setCelebrating] = useState(false);
  const [state, setState] = useState(() => {
    const summary = readStoredSummary(sessionId);
    return summary ? { status: "ready", summary } : { status: "loading", summary: null };
  });

  useEffect(() => {
    if (state.summary) return;
    let active = true;
    apiRequest(`/study-sessions/${encodeURIComponent(sessionId)}`)
      .then((session) => {
        if (!active) return;
        if (session?.summary) {
          const summary = {
            ...session.summary,
            returnTo: session.lesson?.category?.slug
              ? `/categories/${session.lesson.category.slug}`
              : "/learn",
          };
          window.sessionStorage.setItem(
            `tactlex-session-summary:${sessionId}`,
            JSON.stringify(summary),
          );
          setState({ status: "ready", summary });
          return;
        }
        setState({
          status: session?.status === "COMPLETED" ? "empty" : "error",
          summary: null,
          error: session?.status === "COMPLETED" ? "" : copy.resultUnavailableText,
        });
      })
      .catch((error) => {
        if (active) setState({ status: "error", summary: null, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [copy.resultUnavailableText, sessionId, state.summary]);

  useEffect(() => {
    if (!state.summary) return undefined;
    const freshKey = `tactlex-session-fresh:${sessionId}`;
    if (window.sessionStorage.getItem(freshKey) !== "true") return undefined;
    window.sessionStorage.setItem(freshKey, "false");
    playEffect(state.summary.celebrationTier === "major" ? "finish" : "correct");
    if (!effects.motion) return undefined;
    const startTimer = window.setTimeout(() => setCelebrating(true), 0);
    const endTimer = window.setTimeout(() => setCelebrating(false), 2800);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
    };
  }, [effects.motion, sessionId, state.summary]);

  if (state.status === "loading") {
    return <Card className="live-detail-loading">{sessionCopy(locale).loading}</Card>;
  }

  if (!state.summary) {
    return (
      <EmptyState
        icon={<ShieldCheck size={31} />}
        title={copy.resultUnavailable}
        text={state.error || copy.resultUnavailableText}
        action={<ButtonLink href="/learn">{copy.backToCategory}</ButtonLink>}
      />
    );
  }

  const summary = state.summary;
  return (
    <div className="result-page">
      <Confetti active={celebrating} subtle={summary.celebrationTier !== "major"} />
      <div className="result-emblem">
        <Mascot
          pose={summary.celebrationTier === "major" ? "victory" : "rest"}
          motion={summary.celebrationTier === "major" ? "victory" : "breathe"}
          size={112}
          priority
        />
        <span>
          <Trophy size={28} aria-hidden="true" />
        </span>
      </div>
      <PageHeader
        eyebrow={copy.summaryEyebrow}
        title={copy.completed}
        lead={copy.resultLead}
        compact
      />
      <div className="result-stats">
        <Stat
          icon={<Target size={21} />}
          label={copy.accuracy}
          value={`${summary.accuracy ?? 0}%`}
        />
        <Stat
          icon={<Zap size={21} />}
          label={copy.xp}
          value={`+${summary.xpAwarded ?? 0}`}
          tone="yellow"
        />
        <Stat
          icon={<CheckCircle2 size={21} />}
          label={copy.correctItems}
          value={`${summary.correctItems ?? 0} / ${summary.totalItems ?? 0}`}
          tone="olive"
        />
      </div>
      <Card className="result-awards">
        <h2>{copy.awards}</h2>
        {summary.awards?.length ? (
          <ul>
            {summary.awards.map((award, index) => (
              <li key={`${award.reason}-${index}`}>
                <span>{awardLabel(award.reason, locale)}</span>
                <strong>+{award.amount} XP</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>{copy.noAwards}</p>
        )}
      </Card>
      <div className="result-actions">
        <ButtonLink href={summary.returnTo || "/learn"}>{copy.backToCategory}</ButtonLink>
        <ButtonLink href="/review" variant="secondary">
          {copy.review}
        </ButtonLink>
      </div>
    </div>
  );
}
