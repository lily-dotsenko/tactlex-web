"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, RefreshCw, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { apiRequest, createIdempotencyKey } from "@/components/learning-api";
import { PronunciationButton } from "@/features/audio/pronunciation-button";
import { pronunciationForItem } from "@/lib/learning/session-presentation";
import { Mascot } from "@/components/mascot";
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";

function reviewCopy(locale) {
  return locale === "uk"
    ? {
        loading: "Завантажуємо чергу повторень…",
        error: "Не вдалося завантажити повторення",
        empty: "На сьогодні все повторено",
        emptyText: "Зараз немає термінів, які потрібно повторити.",
        retry: "Спробувати знову",
        due: "До повторення зараз",
        answer: "Ваша відповідь",
        placeholder: "Введіть відповідь",
        rate: "Як легко пригадалася відповідь?",
        submit: "Надіслати повторення",
        submitting: "Перевіряємо…",
        nextDue: "Наступне повторення",
        xp: "Отримано XP",
        next: "Наступний термін",
        scheduledReview: "Планове повторення",
      }
    : {
        loading: "Loading the review queue…",
        error: "Reviews could not be loaded",
        empty: "Everything due today is reviewed",
        emptyText: "There are no terms to review right now.",
        retry: "Try again",
        due: "Due now",
        answer: "Your answer",
        placeholder: "Type your answer",
        rate: "How easily did you recall it?",
        submit: "Submit review",
        submitting: "Checking…",
        nextDue: "Next review",
        xp: "XP awarded",
        next: "Next term",
        scheduledReview: "Scheduled review",
      };
}

export function ReviewLiveScreen() {
  const locale = useLocale();
  const t = useTranslations("Review");
  const copy = reviewCopy(locale);
  const requestKey = useRef(null);
  const startedAt = useRef(0);
  const [queue, setQueue] = useState({ status: "loading", items: [] });
  const [answer, setAnswer] = useState("");
  const [rating, setRating] = useState("");
  const [result, setResult] = useState(null);
  const [requestError, setRequestError] = useState("");

  const loadQueue = useCallback(async () => {
    setQueue((current) => ({ ...current, status: "loading" }));
    setRequestError("");
    try {
      const response = await apiRequest("/reviews?limit=20");
      const items = Array.isArray(response?.items) ? response.items : [];
      setQueue({ status: "ready", items });
      setAnswer("");
      setRating("");
      setResult(null);
      requestKey.current = null;
      startedAt.current = performance.now();
    } catch (error) {
      setQueue({ status: "error", items: [], error: error.message });
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/reviews?limit=20")
      .then((response) => {
        if (!active) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        setQueue({ status: "ready", items });
        startedAt.current = performance.now();
      })
      .catch((error) => {
        if (active) setQueue({ status: "error", items: [], error: error.message });
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitReview() {
    const item = queue.items[0];
    if (!item || !answer.trim() || !rating || result) return;
    requestKey.current ||= createIdempotencyKey();
    setQueue((current) => ({ ...current, status: "submitting" }));
    setRequestError("");
    try {
      const response = await apiRequest(`/reviews/${encodeURIComponent(item.termId)}`, {
        method: "POST",
        headers: { "Idempotency-Key": requestKey.current },
        body: JSON.stringify({
          answer,
          rating,
          responseTimeMs: Math.max(0, Math.round(performance.now() - startedAt.current)),
        }),
      });
      setResult(response);
      setQueue((current) => ({ ...current, status: "answered" }));
      requestKey.current = null;
    } catch (error) {
      setRequestError(error.message);
      setQueue((current) => ({ ...current, status: "ready" }));
    }
  }

  const item = queue.items[0];
  const pronunciation = pronunciationForItem(item);

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />

      {queue.status === "loading" && (
        <Card className="live-detail-loading" aria-busy="true">
          {copy.loading}
        </Card>
      )}
      {queue.status === "error" && (
        <EmptyState
          icon={<Mascot pose="encourage" motion="tilt" size={104} />}
          title={copy.error}
          text={queue.error}
          action={
            <Button onClick={loadQueue} variant="secondary">
              <RefreshCw size={18} /> {copy.retry}
            </Button>
          }
        />
      )}
      {queue.status !== "loading" && queue.status !== "error" && !item && (
        <EmptyState
          icon={<Mascot pose="rest" motion="breathe" size={104} />}
          title={copy.empty}
          text={copy.emptyText}
        />
      )}
      {item && (
        <Card className="review-live-card">
          <Mascot pose="reader" motion="breathe" size={112} className="review-mascot" />
          <div className="review-live-head">
            <div>
              <Badge tone="blue">{copy.due}</Badge>
              <span>
                {queue.items.length} {locale === "uk" ? "у черзі" : "in queue"}
              </span>
            </div>
            <ProgressBar
              value={queue.items.length ? 100 / queue.items.length : 100}
              label={`${queue.items.length} ${copy.due}`}
              compact
            />
          </div>
          <div className="review-live-prompt">
            {pronunciation && (
              <PronunciationButton
                key={`${item.termId}:${item.prompt}`}
                {...pronunciation}
                compact
              />
            )}
            <p>{item.stage === "SCHEDULED_REVIEW" ? copy.scheduledReview : item.stage}</p>
            <h2>{item.prompt}</h2>
            {item.dueAt && (
              <span>
                <Clock3 size={16} /> {new Intl.DateTimeFormat(locale).format(new Date(item.dueAt))}
              </span>
            )}
          </div>

          <label
            className={clsx(
              "field session-typed-answer",
              result?.correct === true && "is-correct",
              result?.correct === false && "is-wrong",
            )}
          >
            <span className="field-label">{copy.answer}</span>
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={copy.placeholder}
              maxLength={200}
              autoComplete="off"
              disabled={Boolean(result) || queue.status === "submitting"}
            />
          </label>

          <fieldset className="review-rating-fieldset" disabled={Boolean(result)}>
            <legend>{copy.rate}</legend>
            <div className="rating-control">
              {[
                ["AGAIN", t("again")],
                ["HARD", t("hard")],
                ["GOOD", t("good")],
                ["EASY", t("easy")],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {requestError && (
            <div className="form-alert" role="alert">
              {requestError}
            </div>
          )}
          {result && (
            <div className="review-result-meta" role="status">
              {result.nextDueAt && (
                <p>
                  {copy.nextDue}:{" "}
                  {new Intl.DateTimeFormat(locale).format(new Date(result.nextDueAt))}
                </p>
              )}
              <p>
                {copy.xp}: {result.xpAwarded ?? 0}
              </p>
            </div>
          )}

          <div className="review-live-actions">
            {!result ? (
              <Button
                onClick={submitReview}
                disabled={!answer.trim() || !rating || queue.status === "submitting"}
              >
                {queue.status === "submitting" ? copy.submitting : copy.submit}
              </Button>
            ) : (
              <Button onClick={loadQueue}>
                <RotateCcw size={18} /> {copy.next}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
