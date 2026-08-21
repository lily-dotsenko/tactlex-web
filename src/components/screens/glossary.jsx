"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Filter,
  Flag,
  Search,
  ShieldAlert,
  Tag,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  PageHeader,
  SectionHeading,
} from "@/components/ui";
import { apiRequest, apiRequestPage } from "@/components/learning-api";
import { PronunciationButton } from "@/features/audio/pronunciation-button";
import { cefrForDifficulty } from "@/lib/learning/cefr";

function liveCopy(locale) {
  return locale === "uk"
    ? {
        loading: "Завантажуємо опубліковані терміни…",
        unavailable: "Не вдалося завантажити глосарій",
        empty: "Опублікованих термінів за цим запитом немає.",
        published: "ОПУБЛІКОВАНО",
        source: "Перевірене джерело",
        noDefinition: "Визначення ще не опубліковано.",
        noExample: "Приклад ще не опубліковано.",
        noSource: "Перевірене джерело не додано.",
        reportSent: "Повідомлення надіслано модераторам.",
        reportError: "Не вдалося надіслати повідомлення.",
        sending: "Надсилаємо…",
        partOfSpeech: "Частина мови",
        difficulty: "Рівень CEFR",
        sort: "Сортування",
        alphabetical: "За алфавітом",
        recent: "Найновіші",
        clear: "Очистити фільтри",
        loadMore: "Завантажити ще",
        noMore: "Усі результати завантажено",
        beta: "БЕТА · НЕ ПЕРЕВІРЕНО",
        unverifiedSource: "Джерело очікує перевірки",
      }
    : {
        loading: "Loading published terms…",
        unavailable: "The glossary could not be loaded",
        empty: "No published terms match this request.",
        published: "PUBLISHED",
        source: "Verified source",
        noDefinition: "No definition has been published yet.",
        noExample: "No example has been published yet.",
        noSource: "No verified source has been added.",
        reportSent: "The report was sent to moderators.",
        reportError: "The report could not be sent.",
        sending: "Sending…",
        partOfSpeech: "Part of speech",
        difficulty: "CEFR level",
        sort: "Sort",
        alphabetical: "Alphabetical",
        recent: "Newest",
        clear: "Clear filters",
        loadMore: "Load more",
        noMore: "All results loaded",
        beta: "BETA · UNREVIEWED",
        unverifiedSource: "Source awaiting verification",
      };
}

function audioFor(term, locale = "en") {
  return (
    term?.audio?.find((asset) => asset.locale === locale)?.url ?? term?.audio?.[0]?.url ?? null
  );
}

export function GlossaryScreen() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = useTranslations("Glossary");
  const common = useTranslations("Common");
  const copy = liveCopy(locale);
  const initial = {
    q: searchParams.get("q") || "",
    category: searchParams.get("category") || "",
    partOfSpeech: searchParams.get("partOfSpeech") || "",
    difficulty: searchParams.get("difficulty") || "",
    sort: searchParams.get("sort") || "alphabetical",
  };
  const [filters, setFilters] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [showFilters, setShowFilters] = useState(false);
  const [state, setState] = useState({
    status: "loading",
    items: [],
    categories: [],
    nextCursor: null,
    error: "",
  });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ locale, limit: "24", sort: query.sort });
    if (query.q) params.set("q", query.q);
    if (query.category) params.set("category", query.category);
    if (query.partOfSpeech) params.set("partOfSpeech", query.partOfSpeech);
    if (query.difficulty) params.set("difficulty", query.difficulty);
    Promise.all([
      apiRequestPage(`/terms?${params}`),
      apiRequest(`/categories?locale=${encodeURIComponent(locale)}`),
    ])
      .then(([result, categories]) => {
        if (active) {
          setState({
            status: "ready",
            items: result.items,
            categories: Array.isArray(categories) ? categories : [],
            nextCursor: result.page?.nextCursor ?? null,
            error: "",
          });
        }
      })
      .catch((error) => {
        if (active)
          setState((current) => ({
            ...current,
            status: "error",
            items: [],
            nextCursor: null,
            error: error.message,
          }));
      });
    return () => {
      active = false;
    };
  }, [locale, query]);

  function submit(event) {
    event.preventDefault();
    setState((current) => ({ ...current, status: "loading", error: "" }));
    const next = { ...filters, q: filters.q.trim() };
    const url = new URL(window.location.href);
    ["q", "category", "partOfSpeech", "difficulty", "sort"].forEach((key) => {
      if (next[key] && !(key === "sort" && next[key] === "alphabetical")) {
        url.searchParams.set(key, next[key]);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.replaceState({}, "", url);
    setQuery(next);
  }

  function clearFilters() {
    const cleared = { q: "", category: "", partOfSpeech: "", difficulty: "", sort: "alphabetical" };
    setFilters(cleared);
    setQuery(cleared);
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function loadMore() {
    if (!state.nextCursor || state.status === "loading-more") return;
    setState((current) => ({ ...current, status: "loading-more" }));
    const params = new URLSearchParams({
      locale,
      limit: "24",
      sort: query.sort,
      cursor: state.nextCursor,
    });
    Object.entries(query).forEach(
      ([key, value]) => value && key !== "sort" && params.set(key, value),
    );
    try {
      const result = await apiRequestPage(`/terms?${params}`);
      setState((current) => ({
        ...current,
        status: "ready",
        items: [...current.items, ...result.items],
        nextCursor: result.page?.nextCursor ?? null,
      }));
    } catch (error) {
      setState((current) => ({ ...current, status: "error", error: error.message }));
    }
  }

  function removeFilter(key) {
    const next = { ...query, [key]: "" };
    setFilters(next);
    setQuery(next);
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    window.history.replaceState({}, "", url);
  }

  const activeFilters = [
    query.q && { key: "q", label: query.q },
    query.category && {
      key: "category",
      label: state.categories.find(({ slug }) => slug === query.category)?.name || query.category,
    },
    query.partOfSpeech && { key: "partOfSpeech", label: query.partOfSpeech },
    query.difficulty && {
      key: "difficulty",
      label: `${copy.difficulty}: ${cefrForDifficulty(query.difficulty)}`,
    },
  ].filter(Boolean);

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <form className="glossary-toolbar" role="search" onSubmit={submit}>
        <label className="search-field">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">{common("search")}</span>
          <input
            type="search"
            name="q"
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder={t("placeholder")}
          />
        </label>
        <select
          name="category"
          aria-label="Category"
          value={filters.category}
          onChange={(event) =>
            setFilters((current) => ({ ...current, category: event.target.value }))
          }
        >
          <option value="">{t("all")}</option>
          {state.categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" onClick={() => setShowFilters((value) => !value)}>
          <Filter size={18} /> {common("filters")}
        </Button>
        <Button type="submit">{common("search")}</Button>
      </form>
      {showFilters ? (
        <Card className="glossary-filter-panel">
          <Field label={copy.partOfSpeech}>
            <select
              value={filters.partOfSpeech}
              onChange={(event) =>
                setFilters((current) => ({ ...current, partOfSpeech: event.target.value }))
              }
            >
              <option value="">{t("all")}</option>
              {[
                "NOUN",
                "VERB",
                "ADJECTIVE",
                "ADVERB",
                "PHRASE",
                "ABBREVIATION",
                "PROPER_NOUN",
                "OTHER",
              ].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.difficulty}>
            <select
              value={filters.difficulty}
              onChange={(event) =>
                setFilters((current) => ({ ...current, difficulty: event.target.value }))
              }
            >
              <option value="">{t("all")}</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {cefrForDifficulty(value)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.sort}>
            <select
              value={filters.sort}
              onChange={(event) =>
                setFilters((current) => ({ ...current, sort: event.target.value }))
              }
            >
              <option value="alphabetical">{copy.alphabetical}</option>
              <option value="difficulty">{copy.difficulty}</option>
              <option value="recent">{copy.recent}</option>
            </select>
          </Field>
        </Card>
      ) : null}
      {activeFilters.length ? (
        <div className="filter-chips" aria-label={common("filters")}>
          {activeFilters.map((filter) => (
            <button type="button" key={filter.key} onClick={() => removeFilter(filter.key)}>
              {filter.label} <X size={14} />
            </button>
          ))}
          <Button type="button" variant="ghost" size="small" onClick={clearFilters}>
            {copy.clear}
          </Button>
        </div>
      ) : null}
      <SectionHeading
        title={t("results")}
        action={
          ["ready", "loading-more"].includes(state.status) ? (
            <Badge tone="neutral">{state.items.length}</Badge>
          ) : undefined
        }
      />
      {state.status === "loading" ? <Card>{copy.loading}</Card> : null}
      {state.status === "error" ? (
        <EmptyState icon={<ShieldAlert />} title={copy.unavailable} text={state.error} />
      ) : null}
      {state.status === "ready" && state.items.length === 0 ? (
        <EmptyState icon={<BookOpen />} title={t("results")} text={copy.empty} />
      ) : null}
      {["ready", "loading-more"].includes(state.status) && state.items.length > 0 ? (
        <>
          <div className="term-list">
            {state.items.map((term) => (
              <Card className="term-row" key={term.id}>
                <PronunciationButton
                  term={term.english ?? term.primary ?? ""}
                  audioUrl={audioFor(term, "en")}
                  compact
                />
                <div className="term-main">
                  <div className="term-languages">
                    <strong lang="en">{term.english}</strong>
                    <span lang="uk">{term.ukrainian}</span>
                  </div>
                  <div className="term-meta">
                    <span>{term.partOfSpeech}</span>
                    {term.cefrLevel ? <span>CEFR {term.cefrLevel}</span> : null}
                    {term.categories?.map((item) => (
                      <span key={item.id}>{item.name}</span>
                    ))}
                    {term.sources?.length ? (
                      <span>{term.isBeta ? copy.unverifiedSource : copy.source}</span>
                    ) : null}
                  </div>
                </div>
                <Badge tone={term.isBeta ? "yellow" : "olive"}>
                  {term.isBeta ? copy.beta : copy.published}
                </Badge>
                <ButtonLink
                  href={`/glossary/${term.id}${searchParams.toString() ? `?${searchParams}` : ""}`}
                  variant="ghost"
                  size="small"
                  aria-label={`${t("openTerm")}: ${term.english ?? term.primary}`}
                >
                  <ExternalLink size={18} />
                </ButtonLink>
              </Card>
            ))}
          </div>
          <div className="glossary-pagination">
            {state.nextCursor ? (
              <Button
                onClick={loadMore}
                variant="secondary"
                disabled={state.status === "loading-more"}
              >
                {state.status === "loading-more" ? copy.loading : copy.loadMore}
              </Button>
            ) : (
              <span>{copy.noMore}</span>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function TermScreen({ termId }) {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const contextQuery = searchParams.toString();
  const t = useTranslations("Term");
  const common = useTranslations("Common");
  const copy = liveCopy(locale);
  const [state, setState] = useState({ status: "loading", term: null, error: "" });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(contextQuery);
    params.set("locale", locale);
    apiRequest(`/terms/${encodeURIComponent(termId)}?${params}`)
      .then((term) => {
        if (active) setState({ status: "ready", term, error: "" });
      })
      .catch((error) => {
        if (active) setState({ status: "error", term: null, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [contextQuery, locale, termId]);

  if (state.status === "loading") return <Card>{copy.loading}</Card>;
  if (!state.term) {
    return (
      <EmptyState icon={<BookOpen />} title={copy.unavailable} text={state.error || copy.empty} />
    );
  }

  const term = state.term;
  const ukDefinition = term.definitions?.find((item) => item.locale === "UK");
  const enDefinition = term.definitions?.find((item) => item.locale === "EN");
  return (
    <div className="page-stack term-detail-page">
      <ButtonLink
        href={`/glossary${contextQuery ? `?${contextQuery}` : ""}`}
        variant="ghost"
        size="small"
      >
        <ArrowLeft size={18} /> {common("back")}
      </ButtonLink>
      <Card className="term-hero-card">
        <div className="term-hero-top">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <Badge tone={term.isBeta ? "yellow" : "olive"}>
              {term.isBeta ? copy.beta : copy.published}
            </Badge>
          </div>
          <PronunciationButton term={term.english} audioUrl={audioFor(term, "en")} />
        </div>
        <div className="term-title-pair">
          <h1 lang="en">{term.english}</h1>
          <p lang="uk">{term.ukrainian}</p>
        </div>
        <div className="term-tags">
          <span>
            <Tag size={16} /> {term.partOfSpeech}
          </span>
          {term.categories?.map((item) => (
            <span key={item.id}>
              <BookOpen size={16} /> {item.name}
            </span>
          ))}
          {term.cefrLevel ? <span>CEFR {term.cefrLevel}</span> : null}
        </div>
      </Card>
      <div className="term-detail-grid">
        <section className="term-detail-main">
          <Card>
            <h2>{t("definitionUk")}</h2>
            <p>{ukDefinition?.shortDefinition || copy.noDefinition}</p>
          </Card>
          <Card>
            <h2>{t("definitionEn")}</h2>
            <p lang="en">{enDefinition?.shortDefinition || copy.noDefinition}</p>
          </Card>
          <Card>
            <h2>{t("example")}</h2>
            <p lang="en">{enDefinition?.example || copy.noExample}</p>
            <p lang="uk">{ukDefinition?.example || copy.noExample}</p>
          </Card>
          <Card>
            <h2>{locale === "uk" ? "Синоніми та скорочення" : "Synonyms and abbreviations"}</h2>
            <div className="term-tags">
              {term.variants?.filter((variant) => !variant.isPrimary).length ? (
                term.variants
                  .filter((variant) => !variant.isPrimary)
                  .map((variant) => <span key={variant.id}>{variant.value}</span>)
              ) : (
                <span>
                  {locale === "uk" ? "Додаткових варіантів немає" : "No additional variants"}
                </span>
              )}
            </div>
          </Card>
          <Card>
            <h2>{locale === "uk" ? "Контекст" : "Context"}</h2>
            <p lang="en">{enDefinition?.contextNote || copy.noDefinition}</p>
            <p lang="uk">{ukDefinition?.contextNote || copy.noDefinition}</p>
          </Card>
        </section>
        <aside className="term-detail-aside">
          <Card className="source-card">
            <ShieldAlert size={23} />
            <h2>{t("sources")}</h2>
            {term.sources?.length ? (
              term.sources.map((source) => (
                <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                  {source.title || source.publisher || source.url} <ExternalLink size={15} />
                  {source.checkedAt ? (
                    <small>
                      {new Intl.DateTimeFormat(locale).format(new Date(source.checkedAt))}
                    </small>
                  ) : null}
                </a>
              ))
            ) : (
              <p>{copy.noSource}</p>
            )}
          </Card>
          <ButtonLink href={`/glossary/${term.id}/report`} variant="secondary">
            <Flag size={18} /> {t("report")}
          </ButtonLink>
        </aside>
      </div>
      <nav
        className="term-neighbors"
        aria-label={locale === "uk" ? "Сусідні терміни" : "Adjacent terms"}
      >
        {term.neighbors?.previous ? (
          <ButtonLink
            href={`/glossary/${term.neighbors.previous}${contextQuery ? `?${contextQuery}` : ""}`}
            variant="secondary"
          >
            <ArrowLeft size={18} /> {locale === "uk" ? "Попередній" : "Previous"}
          </ButtonLink>
        ) : (
          <span />
        )}
        {term.neighbors?.next ? (
          <ButtonLink
            href={`/glossary/${term.neighbors.next}${contextQuery ? `?${contextQuery}` : ""}`}
            variant="secondary"
          >
            {locale === "uk" ? "Наступний" : "Next"} <ExternalLink size={18} />
          </ButtonLink>
        ) : null}
      </nav>
    </div>
  );
}

export function ReportScreen({ termId }) {
  const locale = useLocale();
  const t = useTranslations("Term");
  const common = useTranslations("Common");
  const copy = liveCopy(locale);
  const [term, setTerm] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/terms/${encodeURIComponent(termId)}?locale=${encodeURIComponent(locale)}`)
      .then((item) => {
        if (active) setTerm(item);
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [locale, termId]);

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus("sending");
    setMessage("");
    try {
      await apiRequest("/reports", {
        method: "POST",
        body: JSON.stringify({
          termId,
          reason: form.get("reason"),
          details: form.get("details"),
        }),
      });
      setStatus("sent");
      setMessage(copy.reportSent);
      formElement.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || copy.reportError);
    }
  }

  return (
    <div className="narrow-page page-stack">
      <ButtonLink href={`/glossary/${termId}`} variant="ghost" size="small">
        <ArrowLeft size={18} /> {common("back")}
      </ButtonLink>
      <PageHeader
        eyebrow={term?.english || term?.primary || t("eyebrow")}
        title={t("reportTitle")}
        lead={t("reportLead")}
      />
      <Card className="form-card">
        <form className="form-stack" onSubmit={submit}>
          <Field label={t("reason")}>
            <select name="reason" required defaultValue="INCORRECT_TRANSLATION">
              <option value="INCORRECT_TRANSLATION">Translation</option>
              <option value="INCORRECT_DEFINITION">Definition</option>
              <option value="INCORRECT_AUDIO">Audio</option>
              <option value="BROKEN_SOURCE">Source</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label={t("details")}>
            <textarea name="details" rows={7} minLength={10} maxLength={2000} required />
          </Field>
          {message ? <p role="status">{message}</p> : null}
          <div className="form-actions">
            <ButtonLink href={`/glossary/${termId}`} variant="ghost">
              {common("cancel")}
            </ButtonLink>
            <Button type="submit" disabled={status === "sending" || !term}>
              {status === "sending" ? copy.sending : t("send")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
