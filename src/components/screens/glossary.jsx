"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Filter,
  Flag,
  Search,
  ShieldAlert,
  Tag,
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
import { apiRequest } from "@/components/learning-api";
import { PronunciationButton } from "@/features/audio/pronunciation-button";

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
      };
}

function audioFor(term, locale = "en") {
  return (
    term?.audio?.find((asset) => asset.locale === locale)?.url ?? term?.audio?.[0]?.url ?? null
  );
}

export function GlossaryScreen() {
  const locale = useLocale();
  const t = useTranslations("Glossary");
  const common = useTranslations("Common");
  const copy = liveCopy(locale);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState({ q: "", category: "" });
  const [state, setState] = useState({ status: "loading", items: [], categories: [], error: "" });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ locale, limit: "50" });
    if (query.q) params.set("q", query.q);
    if (query.category) params.set("category", query.category);
    Promise.all([
      apiRequest(`/terms?${params}`),
      apiRequest(`/categories?locale=${encodeURIComponent(locale)}`),
    ])
      .then(([items, categories]) => {
        if (active) {
          setState({
            status: "ready",
            items: Array.isArray(items) ? items : [],
            categories: Array.isArray(categories) ? categories : [],
            error: "",
          });
        }
      })
      .catch((error) => {
        if (active) setState({ status: "error", items: [], categories: [], error: error.message });
      });
    return () => {
      active = false;
    };
  }, [locale, query]);

  function submit(event) {
    event.preventDefault();
    setState((current) => ({ ...current, status: "loading", error: "" }));
    setQuery({ q: search.trim(), category });
  }

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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("placeholder")}
          />
        </label>
        <select
          name="category"
          aria-label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">{t("all")}</option>
          {state.categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          <Filter size={18} /> {common("filters")}
        </Button>
      </form>
      <SectionHeading
        title={t("results")}
        action={
          state.status === "ready" ? <Badge tone="neutral">{state.items.length}</Badge> : undefined
        }
      />
      {state.status === "loading" ? <Card>{copy.loading}</Card> : null}
      {state.status === "error" ? (
        <EmptyState icon={<ShieldAlert />} title={copy.unavailable} text={state.error} />
      ) : null}
      {state.status === "ready" && state.items.length === 0 ? (
        <EmptyState icon={<BookOpen />} title={t("results")} text={copy.empty} />
      ) : null}
      {state.status === "ready" && state.items.length > 0 ? (
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
                  {term.categories?.map((item) => (
                    <span key={item.id}>{item.name}</span>
                  ))}
                  {term.sources?.length ? <span>{copy.source}</span> : null}
                </div>
              </div>
              <Badge tone="olive">{copy.published}</Badge>
              <ButtonLink
                href={`/glossary/${term.id}`}
                variant="ghost"
                size="small"
                aria-label={`${t("openTerm")}: ${term.english ?? term.primary}`}
              >
                <ExternalLink size={18} />
              </ButtonLink>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TermScreen({ termId }) {
  const locale = useLocale();
  const t = useTranslations("Term");
  const common = useTranslations("Common");
  const copy = liveCopy(locale);
  const [state, setState] = useState({ status: "loading", term: null, error: "" });

  useEffect(() => {
    let active = true;
    apiRequest(`/terms/${encodeURIComponent(termId)}?locale=${encodeURIComponent(locale)}`)
      .then((term) => {
        if (active) setState({ status: "ready", term, error: "" });
      })
      .catch((error) => {
        if (active) setState({ status: "error", term: null, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [locale, termId]);

  if (state.status === "loading") return <Card>{copy.loading}</Card>;
  if (!state.term) {
    return (
      <EmptyState icon={<BookOpen />} title={copy.unavailable} text={state.error || copy.empty} />
    );
  }

  const term = state.term;
  const ukDefinition = term.definitions?.find((item) => item.locale === "UK");
  const enDefinition = term.definitions?.find((item) => item.locale === "EN");
  const example = (locale === "uk" ? ukDefinition : enDefinition)?.example;
  return (
    <div className="page-stack term-detail-page">
      <ButtonLink href="/glossary" variant="ghost" size="small">
        <ArrowLeft size={18} /> {common("back")}
      </ButtonLink>
      <Card className="term-hero-card">
        <div className="term-hero-top">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <Badge tone="olive">{copy.published}</Badge>
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
          {term.difficulty ? <span>{term.difficulty}</span> : null}
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
            <p>{example || copy.noExample}</p>
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
