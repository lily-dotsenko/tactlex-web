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
        correct: "Сервер підтвердив правильну відповідь",
        incorrect: "Сервер визначив, що відповідь потребує виправлення",
        accepted: "Прийнята відповідь",
        feedback: "Пояснення",
        next: "Наступне завдання",
        completing: "Завершуємо сесію…",
        answerLabel: "Ваша відповідь",
        answerPlaceholder: "Введіть відповідь",
        noClientScoring: "Правильність і XP визначаються лише сервером.",
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
      }
    : {
        loading: "Loading the server session…",
        unavailable: "The learning session is unavailable",
        empty: "This session has no available tasks.",
        retry: "Try again",
        submit: "Send for evaluation",
        submitting: "Checking on the server…",
        correct: "The server confirmed a correct answer",
        incorrect: "The server determined that the answer needs correction",
        accepted: "Accepted answer",
        feedback: "Feedback",
        next: "Next task",
        completing: "Completing session…",
        answerLabel: "Your answer",
        answerPlaceholder: "Type your answer",
        noClientScoring: "Correctness and XP are determined by the server only.",
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
  const completionKey = useRef(null);
  const itemStartedAt = useRef(0);
  const [state, setState] = useState({ status: "loading", session: null, item: null });
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [requestError, setRequestError] = useState("");

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
        itemStartedAt.current = performance.now();
      })
      .catch((error) => {
        if (active) setState({ status: "error", session: null, item: null, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [router, sessionId]);

  async function submitAnswer() {
    if (!state.item || !answer.trim() || result || state.status === "submitting") return;
    submissionKey.current ||= createIdempotencyKey();
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
            answer,
            responseTimeMs: Math.max(0, Math.round(performance.now() - itemStartedAt.current)),
          }),
        },
      );
      setResult(answerResult);
      setState((current) => ({ ...current, status: "answered" }));
      submissionKey.current = null;
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

  const session = state.session;
  const item = state.item;
  const choices = Array.isArray(item?.choices) ? item.choices.map(normalizeChoice) : [];
  const answered = Number(result?.answeredItems ?? session?.answeredItems ?? 0);
  const total = Number(result?.totalItems ?? session?.totalItems ?? 0);
  const current = Math.min(total || 1, answered + (result ? 0 : 1));
  const progress = total ? Math.round((answered / total) * 100) : 0;

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
          <Badge tone="olive">{locale === "uk" ? "Серверна перевірка" : "Server evaluated"}</Badge>
          {item.audio && (
            <PronunciationButton
              term={String(item.prompt || "")}
              audioUrl={item.audio.url || null}
              compact
            />
          )}
        </div>
        <p className="session-prompt">{item.exerciseType}</p>
        <h1>{item.prompt}</h1>

        {choices.length > 0 ? (
          <div className="answer-grid" role="radiogroup" aria-label={String(item.prompt)}>
            {choices.map((choice, index) => {
              const selected = answer === choice.value;
              return (
                <button
                  key={`${choice.value}-${index}`}
                  type="button"
                  className={clsx(
                    "answer-option",
                    selected && "is-selected",
                    selected && result?.correct === true && "is-correct",
                    selected && result?.correct === false && "is-wrong",
                  )}
                  role="radio"
                  aria-checked={selected}
                  disabled={Boolean(result) || state.status === "submitting"}
                  onClick={() => setAnswer(choice.value)}
                >
                  <span>{index + 1}</span>
                  <strong>{choice.label}</strong>
                  {selected && result?.correct === true && <CheckCircle2 size={20} />}
                </button>
              );
            })}
          </div>
        ) : (
          <label className="field session-typed-answer">
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
        {result && (
          <div
            className={clsx(
              "answer-feedback",
              result.correct ? "feedback-correct" : "feedback-wrong",
            )}
            role="status"
          >
            <div>
              <strong>{result.correct ? copy.correct : copy.incorrect}</strong>
              {result.acceptedAnswer && (
                <p>
                  {copy.accepted}: <b>{result.acceptedAnswer}</b>
                </p>
              )}
              {result.feedback && (
                <p>
                  {copy.feedback}: {result.feedback}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="server-authority-note">
          <ShieldCheck size={17} /> {copy.noClientScoring}
        </p>
        <div className="session-action-row">
          {!result ? (
            <Button
              size="large"
              onClick={submitAnswer}
              disabled={!answer.trim() || state.status === "submitting"}
            >
              {state.status === "submitting" ? copy.submitting : copy.submit}
            </Button>
          ) : (
            <Button size="large" onClick={continueSession} disabled={state.status === "completing"}>
              {state.status === "completing" ? copy.completing : copy.next}{" "}
              <ChevronRight size={20} />
            </Button>
          )}
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
