"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Clock3,
  Crosshair,
  HeartPulse,
  Layers3,
  RadioTower,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { apiRequest, createIdempotencyKey } from "@/components/learning-api";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ListLink,
  PageHeader,
  ProgressBar,
  SectionHeading,
} from "@/components/ui";

function localCopy(locale) {
  return locale === "uk"
    ? {
        loadError: "Не вдалося завантажити опубліковані матеріали.",
        emptyTitle: "Опублікованих уроків поки немає",
        emptyText:
          "Адміністратор має перевірити джерела й переклади, перш ніж матеріали стануть доступними для навчання.",
        retry: "Спробувати знову",
        published: "Опубліковано",
        lessons: "Уроки",
        terms: "термінів",
        lessonLoading: "Перевіряємо доступність уроку…",
        signIn: "Увійдіть, щоб почати серверну навчальну сесію.",
        startError: "Не вдалося створити навчальну сесію.",
        unavailable: "Цей урок недоступний або ще не опублікований.",
        starting: "Створюємо сесію…",
      }
    : {
        loadError: "Published learning material could not be loaded.",
        emptyTitle: "No lessons have been published yet",
        emptyText:
          "An administrator must review sources and translations before material becomes available for learning.",
        retry: "Try again",
        published: "Published",
        lessons: "Lessons",
        terms: "terms",
        lessonLoading: "Checking lesson availability…",
        signIn: "Sign in to start a server-backed learning session.",
        startError: "The learning session could not be created.",
        unavailable: "This lesson is unavailable or has not been published.",
        starting: "Creating session…",
      };
}

function categoryIcon(slug) {
  if (slug?.includes("tccc") || slug?.includes("medicine")) return HeartPulse;
  if (slug?.includes("uas") || slug?.includes("drone")) return RadioTower;
  if (slug?.includes("sniper")) return Crosshair;
  if (slug?.includes("basic")) return BookOpen;
  return Layers3;
}

function LoadingCards() {
  return (
    <div className="learning-category-grid" aria-busy="true" aria-label="Loading">
      {[0, 1, 2, 3].map((item) => (
        <Card className="learning-category-card live-skeleton" key={item} />
      ))}
    </div>
  );
}

export function CatalogLearnScreen() {
  const locale = useLocale();
  const t = useTranslations("Learn");
  const common = useTranslations("Common");
  const copy = localCopy(locale);
  const [state, setState] = useState({ status: "loading", categories: [], overview: null });

  async function load() {
    setState((current) => ({ ...current, status: "loading" }));
    try {
      const overview = await apiRequest(`/learning-overview?locale=${locale}`);
      setState({
        status: "ready",
        categories: Array.isArray(overview?.categories) ? overview.categories : [],
        overview,
      });
    } catch (error) {
      setState({ status: "error", categories: [], overview: null, error: error.message });
    }
  }

  useEffect(() => {
    let active = true;
    apiRequest(`/learning-overview?locale=${locale}`)
      .then((overview) => {
        if (!active) return;
        setState({
          status: "ready",
          categories: Array.isArray(overview?.categories) ? overview.categories : [],
          overview,
        });
      })
      .catch((error) => {
        if (active)
          setState({ status: "error", categories: [], overview: null, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [locale]);

  const activeSession = state.overview?.activeSession;
  const nextLesson = state.overview?.nextLesson;

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />

      {state.status === "loading" && <LoadingCards />}
      {state.status === "error" && (
        <EmptyState
          icon={<AlertTriangle size={30} />}
          title={copy.loadError}
          text={state.error}
          action={
            <Button onClick={load} variant="secondary">
              <RefreshCw size={18} /> {copy.retry}
            </Button>
          }
        />
      )}
      {state.status === "ready" && state.categories.length === 0 && (
        <EmptyState
          icon={<ShieldCheck size={31} />}
          title={copy.emptyTitle}
          text={copy.emptyText}
        />
      )}
      {state.status === "ready" && state.categories.length > 0 && (
        <>
          {(activeSession || nextLesson) && (
            <Card className="continue-strip">
              <span className="continue-strip-icon">
                <BookOpen size={24} />
              </span>
              <div>
                <Badge tone="blue">{copy.published}</Badge>
                <h2>{activeSession?.lesson?.title || nextLesson?.title}</h2>
                <p>
                  {activeSession
                    ? activeSession.currentStage
                    : `CEFR ${nextLesson.cefrLevel} · ${nextLesson.termCount} ${copy.terms} · ${nextLesson.estimatedMinutes} min`}
                </p>
              </div>
              <ButtonLink
                href={
                  activeSession
                    ? `/sessions/${activeSession.id}`
                    : `/categories/${nextLesson.categorySlug}/lessons/${nextLesson.id}`
                }
                arrow
              >
                {common("continue")}
              </ButtonLink>
            </Card>
          )}
          <div className="learning-category-grid">
            {state.categories.map((category) => {
              const Icon = categoryIcon(category.slug);
              const available = Number(category.publishedLessonCount || 0) > 0;
              const percent = Number(category.progressPercent || 0);
              return (
                <Card className="learning-category-card" key={category.id}>
                  <div className="learning-category-top">
                    <span className="category-large-icon">
                      <Icon size={27} aria-hidden="true" />
                    </span>
                    <Badge tone={available ? "blue" : "neutral"}>
                      {available
                        ? `${category.publishedLessonCount} ${copy.lessons.toLowerCase()}`
                        : t("preparing")}
                    </Badge>
                  </div>
                  <h2>{category.name}</h2>
                  <p>{category.description || copy.emptyText}</p>
                  <div className="category-plan-row">
                    <span>
                      {category.practicedTermCount || 0} / {category.targetTermCount || 0}{" "}
                      {copy.terms}
                    </span>
                    <ProgressBar value={percent} label={`${category.name}: ${percent}%`} compact />
                  </div>
                  {available ? (
                    <ButtonLink
                      href={`/categories/${category.slug}`}
                      variant="secondary"
                      className="card-action"
                    >
                      {common("start")}
                    </ButtonLink>
                  ) : (
                    <Button className="card-action" variant="ghost" disabled>
                      {t("preparing")}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function CategoryLiveScreen({ categorySlug }) {
  const locale = useLocale();
  const common = useTranslations("Common");
  const copy = localCopy(locale);
  const [state, setState] = useState({ status: "loading", category: null });

  useEffect(() => {
    let active = true;
    apiRequest(`/categories/${encodeURIComponent(categorySlug)}?locale=${locale}`)
      .then((category) => active && setState({ status: "ready", category }))
      .catch(
        (error) => active && setState({ status: "error", category: null, error: error.message }),
      );
    return () => {
      active = false;
    };
  }, [categorySlug, locale]);

  return (
    <div className="page-stack">
      <ButtonLink href="/learn" variant="ghost" size="small">
        <ArrowLeft size={18} /> {common("back")}
      </ButtonLink>
      {state.status === "loading" && (
        <Card className="live-detail-loading">{copy.lessonLoading}</Card>
      )}
      {state.status === "error" && (
        <EmptyState icon={<AlertTriangle size={30} />} title={copy.loadError} text={state.error} />
      )}
      {state.status === "ready" && state.category && (
        <>
          <PageHeader
            eyebrow={copy.published}
            title={state.category.name}
            lead={state.category.description || copy.emptyText}
          />
          <Card className="catalog-facts">
            <span>
              <BookOpen size={19} /> {state.category.publishedTermCount || 0} {copy.terms}
            </span>
            <span>
              <Clock3 size={19} /> {state.category.publishedLessonCount || 0}{" "}
              {copy.lessons.toLowerCase()}
            </span>
          </Card>
          <section>
            <SectionHeading title={copy.lessons} />
            {!state.category.lessons?.length ? (
              <EmptyState
                icon={<BookOpen size={30} />}
                title={copy.emptyTitle}
                text={copy.emptyText}
              />
            ) : (
              <Card className="lesson-list">
                {state.category.lessons.map((lesson) => (
                  <ListLink
                    key={lesson.id}
                    href={`/categories/${categorySlug}/lessons/${lesson.id}`}
                    title={lesson.title}
                    meta={`CEFR ${lesson.cefrLevel} · ${lesson.termCount} ${copy.terms} · ${lesson.estimatedMinutes} min`}
                    icon={<BookOpen size={20} />}
                    badge={<Badge tone="blue">{copy.published}</Badge>}
                  />
                ))}
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function LessonLiveScreen({ lessonId, categorySlug }) {
  const locale = useLocale();
  const common = useTranslations("Common");
  const router = useRouter();
  const copy = localCopy(locale);
  const [state, setState] = useState({ status: "loading", lesson: null });
  const [startError, setStartError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest(`/lessons/${encodeURIComponent(lessonId)}?locale=${locale}`)
      .then((lesson) => active && setState({ status: "ready", lesson }))
      .catch(
        (error) => active && setState({ status: "error", lesson: null, error: error.message }),
      );
    return () => {
      active = false;
    };
  }, [lessonId, locale]);

  async function startSession() {
    setStarting(true);
    setStartError("");
    try {
      const session = await apiRequest("/study-sessions", {
        method: "POST",
        headers: { "Idempotency-Key": createIdempotencyKey() },
        body: JSON.stringify({ lessonId, mode: "LESSON", direction: "MIXED" }),
      });
      if (!session?.id) throw new Error(copy.startError);
      router.push(`/sessions/${session.id}`);
    } catch (error) {
      setStartError(error.status === 401 ? copy.signIn : error.message || copy.startError);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="lesson-intro-page">
      <ButtonLink href={`/categories/${categorySlug}`} variant="ghost" size="small">
        <ArrowLeft size={18} /> {common("back")}
      </ButtonLink>
      {state.status === "loading" && (
        <Card className="live-detail-loading">{copy.lessonLoading}</Card>
      )}
      {state.status === "error" && (
        <EmptyState
          icon={<AlertTriangle size={30} />}
          title={copy.unavailable}
          text={state.error}
        />
      )}
      {state.status === "ready" && state.lesson && (
        <div className="lesson-intro-grid">
          <section>
            <Badge tone="blue">{copy.published}</Badge>
            <h1>{state.lesson.title}</h1>
            <p className="page-lead">{state.lesson.description}</p>
            <div className="lesson-meta-row">
              <span>CEFR {state.lesson.cefrLevel}</span>
              <span>
                <BookOpen size={18} /> {state.lesson.termCount} {copy.terms}
              </span>
              <span>
                <Clock3 size={18} /> {state.lesson.estimatedMinutes} min
              </span>
            </div>
            {startError && (
              <div className="form-alert" role="alert">
                {startError}
              </div>
            )}
            <Button size="large" onClick={startSession} disabled={starting}>
              {starting ? copy.starting : common("start")}
            </Button>
          </section>
          <Card className="lesson-stages-card">
            <div className="lesson-stage">
              <span className="lesson-stage-number">01</span>
              <span className="lesson-stage-icon">
                <BookOpen size={21} />
              </span>
              <div>
                <h3>{locale === "uk" ? "Знайомство з термінами" : "Term introduction"}</h3>
                <p>
                  {locale === "uk"
                    ? "Перегляньте значення, контекст і вимову кожного терміна."
                    : "Review the meaning, context, and pronunciation of every term."}
                </p>
              </div>
            </div>
            <div className="lesson-stage">
              <span className="lesson-stage-number">02</span>
              <span className="lesson-stage-icon">
                <ShieldCheck size={21} />
              </span>
              <div>
                <h3>{locale === "uk" ? "Перевірка знань" : "Knowledge check"}</h3>
                <p>
                  {locale === "uk"
                    ? "Виконайте вправи з вибором відповіді, введенням і аудіюванням."
                    : "Complete choice, typed-answer, and listening exercises."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
