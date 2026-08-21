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
        loading: "Завантажуємо серверну сесію…",
        unavailable: "Навчальна сесія недоступна",
        empty: "У цій сесії немає доступних завдань.",
        retry: "Спробувати знову",
        submit: "Надіслати на перевірку",
        submitting: "Перевіряємо на сервері…",
        next: "Наступне завдання",
        completing: "Завершуємо сесію…",
        answerLabel: "Ваша відповідь",
        answerPlaceholder: "Введіть відповідь",
        noClientScoring: "У цій сесії немає доступних завдань.",
        resultUnavailable: "Підсумок цієї сесії недоступний",
        resultUnavailableText:
          "Сервер не повернув підсумкові показники. Жодних результатів не було вигадано в браузері.",
        completed: "Сесію завершено",
        resultLead: "Усі показники нижче повернув сервер під час завершення сесії.",
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
      }
    : {
        loading: "Loading the server session…",
        unavailable: "The learning session is unavailable",
        empty: "This session has no available tasks.",
        retry: "Try again",
        submit: "Send for evaluation",
        submitting: "Checking on the server…",
        next: "Next task",
        completing: "Completing session…",
        answerLabel: "Your answer",
        answerPlaceholder: "Type your answer",
        noClientScoring: "This session has no available tasks.",
        resultUnavailable: "This session summary is unavailable",
        resultUnavailableText:
          "The server did not return summary metrics. No results were invented in the browser.",
        completed: "Session complete",
        resultLead: "Every metric below was returned by the server when the session completed.",
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
      };
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

export function SessionScreen({ sessionId }) {
  const t = useTranslations("Session");
  const locale = useLocale();
  const router = useRouter();
  const copy = sessionCopy(locale);
  const submissionKey = useRef(null);
  const submittingRef = useRef(false);
  const completionKey = useRef(null);
  const itemStartedAt = useRef(0);
  const [state, setState] = useState({ status: "loading", session: null, item: null });
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [introIndex, setIntroIndex] = useState(0);
  const [wrongChoices, setWrongChoices] = useState([]);
  const [revealedChoices, setRevealedChoices] = useState([]);

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
      submissionKey.current = null;
      itemStartedAt.current = performance.now();
    } catch (error) {
      setState({ status: "error", session: null, item: null, error: error.message });
    }
  }, [router, sessionId]);

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
          JSON.stringify(completion.summary),
        );
      }
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
    if (
      state.status === "submitting" ||
      submittingRef.current ||
      result?.correct ||
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
  const answered = Number(result?.answeredItems ?? session?.answeredItems ?? 0);
  const total = Number(result?.totalItems ?? session?.totalItems ?? 0);
  const current = Math.min(total || 1, answered + (result ? 0 : 1));
  const progress = total ? Math.round((answered / total) * 100) : 0;
  const practicePronunciation = pronunciationForItem(item);

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
      <main className="session-page introduction-page" id="main-content">
        <header className="session-header">
          <ButtonLink href="/learn" variant="ghost" size="small">
            <X size={20} /> <span className="session-exit-label">{t("exit")}</span>
          </ButtonLink>
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
            <p className="eyebrow">{copy.introduction}</p>
            <h1 lang="en">{card.english}</h1>
            <p className="introduction-translation" lang="uk">
              {card.ukrainian}
            </p>
            <PronunciationButton key={card.english} term={card.english} audioUrl={card.audioUrl} />
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
    );
  }

  if (!item) {
    return (
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
              <ButtonLink href="/learn" variant="secondary">
                {t("exit")}
              </ButtonLink>
            )
          }
        />
      </main>
    );
  }

  return (
    <main className="session-page" id="main-content">
      <header className="session-header">
        <ButtonLink href="/learn" variant="ghost" size="small">
          <X size={20} /> <span className="session-exit-label">{t("exit")}</span>
        </ButtonLink>
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
        <p className="session-prompt">{item.exerciseType}</p>
        <h1>{item.exerciseType === "AUDIO" ? copy.audioPrompt : item.prompt}</h1>

        {choices.length > 0 ? (
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
                  disabled={wrong || result?.correct === true || state.status === "submitting"}
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
        <div className="session-action-row">
          {choices.length === 0 && !result ? (
            <Button
              size="large"
              onClick={submitTypedAnswer}
              disabled={!answer.trim() || state.status === "submitting"}
            >
              {state.status === "submitting" ? copy.submitting : copy.submit}
            </Button>
          ) : result?.correct || (choices.length === 0 && result) ? (
            <Button size="large" onClick={continueSession} disabled={state.status === "completing"}>
              {state.status === "completing" ? copy.completing : copy.next}{" "}
              <ChevronRight size={20} />
            </Button>
          ) : null}
        </div>
      </Card>
    </main>
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
          window.sessionStorage.setItem(
            `tactlex-session-summary:${sessionId}`,
            JSON.stringify(session.summary),
          );
          setState({ status: "ready", summary: session.summary });
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

  if (state.status === "loading") {
    return <Card className="live-detail-loading">{sessionCopy(locale).loading}</Card>;
  }

  if (!state.summary) {
    return (
      <EmptyState
        icon={<ShieldCheck size={31} />}
        title={copy.resultUnavailable}
        text={state.error || copy.resultUnavailableText}
        action={<ButtonLink href="/dashboard">Dashboard</ButtonLink>}
      />
    );
  }

  const summary = state.summary;
  return (
    <div className="result-page">
      <div className="result-emblem">
        <Trophy size={34} aria-hidden="true" />
      </div>
      <PageHeader
        eyebrow="After Action Review"
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
                <span>{award.reason}</span>
                <strong>+{award.amount} XP</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>{copy.noAwards}</p>
        )}
      </Card>
      <div className="result-actions">
        <ButtonLink href="/dashboard">Dashboard</ButtonLink>
        <ButtonLink href="/review" variant="secondary">
          Review
        </ButtonLink>
      </div>
    </div>
  );
}
