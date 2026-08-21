"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  FolderOpen,
  Library,
  ListChecks,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  PageHeader,
  SectionHeading,
  Stat,
} from "@/components/ui";
import { apiRequest } from "@/components/learning-api";

const sectionIcons = {
  terms: FileText,
  reviews: ClipboardCheck,
  categories: Library,
  lessons: ListChecks,
  users: Users,
  achievements: Award,
  reports: ShieldAlert,
  audit: Activity,
};

const detailSections = new Set(["terms", "reviews", "categories", "lessons", "users", "reports"]);

function adminCopy(locale) {
  return locale === "uk"
    ? {
        loading: "Завантажуємо дані з адміністративного API…",
        unavailable: "Дані адміністративного розділу недоступні",
        empty: "У базі даних немає записів для цього розділу.",
        live: "LIVE API",
        loaded: "завантажено",
        search: "Пошук у завантажених записах",
        record: "Запис",
        notFound: "Запис не знайдено у відповіді сервера.",
        readOnly: "Цей екран показує лише дані, отримані від сервера.",
        newTermLead:
          "Створює двомовний термін як DRAFT. Рецензування й публікація виконуються окремо.",
        createDraft: "Створити DRAFT",
        saving: "Зберігаємо…",
        transition: "Змінити статус",
        transitionLead: "Сервер перевірить дозволений перехід, повноту та підтверджене джерело.",
        decision: "Рішення рецензента",
        decisionLead: "Рішення застосовується сервером до поточної ревізії.",
        submit: "Надіслати",
        importLead:
          "Спочатку сервер перевіряє файл і checksum; імпорт можливий лише з незмінним preview.",
        previewFile: "Перевірити файл",
        commitImport: "Імпортувати валідні рядки як DRAFT",
        chooseFileFirst: "Оберіть CSV або JSON-файл.",
        importComplete: "Імпорт завершено сервером.",
        queueEmpty: "Черга рецензування порожня.",
        exactCounts: "Фактичні записи у завантаженій відповіді",
      }
    : {
        loading: "Loading data from the administration API…",
        unavailable: "Administration data is unavailable",
        empty: "There are no database records for this section.",
        live: "LIVE API",
        loaded: "loaded",
        search: "Search loaded records",
        record: "Record",
        notFound: "The record was not present in the server response.",
        readOnly: "This screen only shows data returned by the server.",
        newTermLead:
          "Creates a bilingual term as DRAFT. Review and publishing remain separate actions.",
        createDraft: "Create DRAFT",
        saving: "Saving…",
        transition: "Change status",
        transitionLead:
          "The server validates the workflow transition, completeness, and verified source.",
        decision: "Reviewer decision",
        decisionLead: "The server applies the decision to the current revision.",
        submit: "Submit",
        importLead:
          "The server previews the file and checksum first; only the unchanged preview can be committed.",
        previewFile: "Preview file",
        commitImport: "Import valid rows as DRAFT",
        chooseFileFirst: "Choose a CSV or JSON file.",
        importComplete: "The server completed the import.",
        queueEmpty: "The review queue is empty.",
        exactCounts: "Actual records in the loaded response",
      };
}

function useAdminResource(path) {
  const [state, setState] = useState(() => ({
    status: path ? "loading" : "ready",
    data: path ? null : [],
    error: "",
  }));

  useEffect(() => {
    if (!path) return undefined;
    let active = true;
    apiRequest(path)
      .then((data) => {
        if (active) setState({ status: "ready", data, error: "" });
      })
      .catch((error) => {
        if (active) setState({ status: "error", data: null, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [path]);

  return state;
}

function dateLabel(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function primaryVariant(term, targetLocale = "EN") {
  return (
    term?.variants?.find((item) => item.locale === targetLocale && item.isPrimary)?.value ??
    term?.variants?.find((item) => item.locale === targetLocale)?.value ??
    null
  );
}

function recordTitle(record, section, locale) {
  if (!record) return "—";
  if (section === "terms") return primaryVariant(record) || record.slug || record.id;
  if (section === "reviews" || section === "reports") {
    return primaryVariant(record.term) || record.term?.slug || record.id;
  }
  if (section === "categories") {
    return (
      (locale === "uk" ? record.nameUk : record.nameEn) ||
      record.nameUk ||
      record.nameEn ||
      record.slug
    );
  }
  if (section === "lessons") {
    return (
      (locale === "uk" ? record.titleUk : record.titleEn) ||
      record.titleUk ||
      record.titleEn ||
      record.slug
    );
  }
  if (section === "users") return record.profile?.nickname || record.email || record.id;
  if (section === "achievements") {
    return (
      (locale === "uk" ? record.nameUk : record.nameEn) ||
      record.nameUk ||
      record.nameEn ||
      record.code
    );
  }
  if (section === "audit") return record.action || record.id;
  return record.name || record.title || record.id;
}

function rowFor(record, section, locale) {
  const label = recordTitle(record, section, locale);
  if (section === "terms") {
    return {
      label,
      secondary:
        record.categories
          ?.map((item) => item.category?.nameEn || item.category?.slug)
          .filter(Boolean)
          .join(", ") || "—",
      status: record.status,
      detail: dateLabel(record.updatedAt, locale),
    };
  }
  if (section === "reviews") {
    return {
      label,
      secondary: record.requestedBy?.profile?.nickname || record.requestedById || "—",
      status: record.status,
      detail: dateLabel(record.submittedAt, locale),
    };
  }
  if (section === "reports") {
    return {
      label,
      secondary: record.reason || "—",
      status: record.status,
      detail: dateLabel(record.createdAt, locale),
    };
  }
  if (section === "categories") {
    return {
      label,
      secondary: record.slug,
      status: record.archivedAt ? "ARCHIVED" : "ACTIVE",
      detail: String(record.displayOrder ?? "—"),
    };
  }
  if (section === "lessons") {
    return {
      label,
      secondary: record.category?.nameEn || record.category?.slug || "—",
      status: record.status,
      detail: `${record.terms?.length ?? 0} terms`,
    };
  }
  if (section === "users") {
    return {
      label,
      secondary: record.email,
      status: record.status,
      detail:
        record.userRoles
          ?.map((item) => item.role?.code)
          .filter(Boolean)
          .join(", ") || "—",
    };
  }
  if (section === "achievements") {
    return {
      label,
      secondary: record.code,
      status: record.active === false ? "INACTIVE" : "ACTIVE",
      detail: `${record._count?.awards ?? 0} awards`,
    };
  }
  if (section === "audit") {
    return {
      label,
      secondary: record.actor?.profile?.nickname || record.actorUserId || "system",
      status: [record.targetType, record.targetId].filter(Boolean).join(":") || "—",
      detail: dateLabel(record.createdAt, locale),
    };
  }
  return {
    label,
    secondary: "—",
    status: record.status || "—",
    detail: dateLabel(record.updatedAt, locale),
  };
}

function toneFor(status) {
  if (["PUBLISHED", "APPROVED", "ACTIVE", "RESOLVED"].includes(status)) return "olive";
  if (["IN_REVIEW", "PENDING", "OPEN"].includes(status)) return "yellow";
  if (["SUSPENDED", "REJECTED", "ARCHIVED"].includes(status)) return "red";
  return "neutral";
}

function AdminState({ state, copy, children }) {
  if (state.status === "loading") return <Card>{copy.loading}</Card>;
  if (state.status === "error") {
    return <EmptyState icon={<ShieldAlert />} title={copy.unavailable} text={state.error} />;
  }
  return children;
}

export function AdminOverviewScreen() {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const copy = adminCopy(locale);
  const [state, setState] = useState({
    status: "loading",
    terms: [],
    reviews: [],
    reports: [],
    audit: [],
    error: "",
  });

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiRequest("/admin/terms?limit=50"),
      apiRequest("/admin/reviews?limit=50"),
      apiRequest("/admin/reports?limit=50"),
      apiRequest("/admin/audit?limit=50"),
    ]).then((results) => {
      if (!active) return;
      const values = results.map((result) =>
        result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [],
      );
      const errors = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason?.message)
        .filter(Boolean);
      setState({
        status: results.every((result) => result.status === "rejected") ? "error" : "ready",
        terms: values[0],
        reviews: values[1],
        reports: values[2],
        audit: values[3],
        error: errors.join(" "),
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const count = (status) => state.terms.filter((term) => term.status === status).length;
  const openReports = state.reports.filter((report) =>
    ["OPEN", "IN_REVIEW"].includes(report.status),
  ).length;

  return (
    <div className="page-stack admin-page-stack">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <div className="page-action-group">
            <Badge tone="olive">{copy.live}</Badge>
            <ButtonLink href="/admin/terms/import" variant="secondary">
              <Upload size={18} /> {t("import")}
            </ButtonLink>
            <ButtonLink href="/admin/terms/new">
              <FileText size={18} /> {t("newTerm")}
            </ButtonLink>
          </div>
        }
      />
      <AdminState state={state} copy={copy}>
        <div className="stats-grid stats-grid-four admin-stats">
          <Stat
            icon={<FileText size={21} />}
            label={t("drafts")}
            value={count("DRAFT")}
            note={copy.exactCounts}
            tone="graphite"
          />
          <Stat
            icon={<Clock3 size={21} />}
            label={t("inReview")}
            value={count("IN_REVIEW")}
            note={copy.exactCounts}
            tone="yellow"
          />
          <Stat
            icon={<CheckCircle2 size={21} />}
            label={t("approved")}
            value={count("APPROVED")}
            note={copy.exactCounts}
            tone="olive"
          />
          <Stat
            icon={<ShieldCheck size={21} />}
            label={t("published")}
            value={count("PUBLISHED")}
            note={copy.exactCounts}
            tone="blue"
          />
        </div>
        <div className="admin-overview-grid">
          <section>
            <SectionHeading
              title={t("queue")}
              action={
                <ButtonLink href="/admin/reviews" variant="ghost" size="small">
                  View all
                </ButtonLink>
              }
            />
            <Card className="admin-queue-list">
              {state.reviews.length ? (
                state.reviews.slice(0, 5).map((review) => {
                  const row = rowFor(review, "reviews", locale);
                  return (
                    <ButtonLink
                      key={review.id}
                      href={`/admin/reviews/${review.id}`}
                      variant="unstyled"
                      className="admin-queue-row"
                    >
                      <span className="table-term">
                        <strong>{row.label}</strong>
                        <small>{row.secondary}</small>
                      </span>
                      <Badge tone={toneFor(row.status)}>{row.status}</Badge>
                      <span>{row.detail}</span>
                      <ChevronRight size={18} />
                    </ButtonLink>
                  );
                })
              ) : (
                <p>{copy.queueEmpty}</p>
              )}
            </Card>
          </section>
          <aside className="admin-attention-list">
            <Card className="attention-card">
              <AlertTriangle size={23} />
              <div>
                <strong>{openReports}</strong>
                <span>{t("openReports")}</span>
              </div>
              <ButtonLink href="/admin/reports" variant="ghost" size="small">
                <ChevronRight size={18} />
              </ButtonLink>
            </Card>
            <Card className="attention-card">
              <Activity size={23} />
              <div>
                <strong>{state.audit.length}</strong>
                <span>
                  {t("audit")} · {copy.loaded}
                </span>
              </div>
              <ButtonLink href="/admin/audit" variant="ghost" size="small">
                <ChevronRight size={18} />
              </ButtonLink>
            </Card>
          </aside>
        </div>
      </AdminState>
    </div>
  );
}

function sectionPath(section) {
  return `/admin/${section}${["categories", "achievements"].includes(section) ? "" : "?limit=100"}`;
}

export function AdminListScreen({ section }) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const copy = adminCopy(locale);
  const Icon = sectionIcons[section] || FolderOpen;
  const state = useAdminResource(sectionPath(section));
  const [query, setQuery] = useState("");
  const records = useMemo(() => (Array.isArray(state.data) ? state.data : []), [state.data]);
  const rows = useMemo(
    () =>
      records
        .map((record) => ({ record, ...rowFor(record, section, locale) }))
        .filter((row) =>
          JSON.stringify([row.label, row.secondary, row.status])
            .toLocaleLowerCase(locale)
            .includes(query.trim().toLocaleLowerCase(locale)),
        ),
    [locale, query, records, section],
  );
  const sectionLabel = t(section);

  return (
    <div className="page-stack admin-page-stack">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("listTitle", { section: sectionLabel })}
        lead={copy.readOnly}
        actions={
          section === "terms" ? (
            <div className="page-action-group">
              <ButtonLink href="/admin/terms/import" variant="secondary">
                <Upload size={18} /> {t("import")}
              </ButtonLink>
              <ButtonLink href="/admin/terms/new">
                <FileText size={18} /> {t("newTerm")}
              </ButtonLink>
            </div>
          ) : (
            <Badge tone="olive">{copy.live}</Badge>
          )
        }
      />
      <Card className="admin-toolbar">
        <label className="search-field">
          <Search size={19} />
          <span className="sr-only">{copy.search}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
          />
        </label>
      </Card>
      <AdminState state={state} copy={copy}>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Icon />}
            title={sectionLabel}
            text={records.length ? copy.notFound : copy.empty}
          />
        ) : (
          <Card className="admin-table-card">
            <div className="admin-table-heading">
              <span className="section-icon">
                <Icon size={20} />
              </span>
              <strong>{sectionLabel}</strong>
              <Badge tone="neutral">{rows.length}</Badge>
            </div>
            <div className="responsive-table-wrap">
              <table className="data-table admin-data-table">
                <thead>
                  <tr>
                    <th>{copy.record}</th>
                    <th>Context</th>
                    <th>{t("status")}</th>
                    <th>{t("updated")}</th>
                    <th>
                      <span className="sr-only">{t("actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ record, label, secondary, status, detail }) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{label}</strong>
                      </td>
                      <td>{secondary || "—"}</td>
                      <td>
                        {section === "audit" ? (
                          status
                        ) : (
                          <Badge tone={toneFor(status)}>{status || "—"}</Badge>
                        )}
                      </td>
                      <td>{detail}</td>
                      <td>
                        {detailSections.has(section) ? (
                          <ButtonLink
                            href={`/admin/${section}/${record.id}`}
                            variant="ghost"
                            size="small"
                            aria-label={`${t("editAction")} ${label}`}
                          >
                            <ChevronRight size={18} />
                          </ButtonLink>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </AdminState>
    </div>
  );
}

function RecordFacts({ record, locale }) {
  const facts = [
    ["ID", record.id],
    ["Status", record.status],
    ["Slug", record.slug],
    ["Email", record.email],
    ["Code", record.code],
    ["Created", dateLabel(record.createdAt, locale)],
    ["Updated", dateLabel(record.updatedAt, locale)],
  ].filter(([, value]) => value && value !== "—");
  return (
    <dl className="profile-facts">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function allowedTermTransitions(status) {
  return (
    {
      DRAFT: ["IN_REVIEW"],
      IN_REVIEW: ["DRAFT"],
      APPROVED: ["PUBLISHED", "DRAFT"],
      PUBLISHED: ["ARCHIVED", "DRAFT"],
      ARCHIVED: [],
    }[status] ?? []
  );
}

export function AdminTermScreen({ isNew = false, itemId }) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const copy = adminCopy(locale);
  const router = useRouter();
  const state = useAdminResource(isNew ? null : `/admin/terms/${encodeURIComponent(itemId)}`);
  const categoriesState = useAdminResource(isNew ? "/admin/categories" : null);
  const [mutation, setMutation] = useState({ status: "idle", error: "" });

  async function createTerm(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMutation({ status: "pending", error: "" });
    const publisher = String(form.get("publisher") || "").trim();
    try {
      const created = await apiRequest("/admin/terms", {
        method: "POST",
        body: JSON.stringify({
          slug: String(form.get("slug") || "").trim(),
          partOfSpeech: form.get("partOfSpeech"),
          difficulty: Number(form.get("difficulty")),
          origin: "HUMAN",
          isDemo: false,
          variants: [
            {
              locale: "EN",
              kind: "PRIMARY",
              value: String(form.get("english") || "").trim(),
              isPrimary: true,
              isAcceptedAnswer: true,
            },
            {
              locale: "UK",
              kind: "PRIMARY",
              value: String(form.get("ukrainian") || "").trim(),
              isPrimary: true,
              isAcceptedAnswer: true,
            },
          ],
          definitions: [
            {
              locale: "EN",
              shortDefinition: String(form.get("definitionEn") || "").trim(),
              example: String(form.get("exampleEn") || "").trim() || null,
              contextNote: String(form.get("contextNoteEn") || "").trim() || null,
            },
            {
              locale: "UK",
              shortDefinition: String(form.get("definitionUk") || "").trim(),
              example: String(form.get("exampleUk") || "").trim() || null,
              contextNote: String(form.get("contextNoteUk") || "").trim() || null,
            },
          ],
          contextDefinitions: [
            {
              categoryId: String(form.get("categoryId")),
              locale: "EN",
              shortDefinition: String(form.get("contextDefinitionEn") || "").trim(),
              example: String(form.get("contextExampleEn") || "").trim() || null,
              contextNote: String(form.get("contextNoteEn") || "").trim() || null,
            },
            {
              categoryId: String(form.get("categoryId")),
              locale: "UK",
              shortDefinition: String(form.get("contextDefinitionUk") || "").trim(),
              example: String(form.get("contextExampleUk") || "").trim() || null,
              contextNote: String(form.get("contextNoteUk") || "").trim() || null,
            },
          ],
          categories: [{ categoryId: form.get("categoryId"), isPrimary: true }],
          sources: [
            {
              exactUrl: String(form.get("sourceUrl") || "").trim(),
              title: String(form.get("sourceTitle") || "").trim(),
              ...(publisher ? { publisher } : {}),
              sourceType: form.get("sourceType"),
              verificationStatus: "UNVERIFIED",
              isPrimary: true,
            },
          ],
          changeNote: "Initial bilingual draft",
        }),
      });
      setMutation({ status: "success", error: "" });
      router.push(`/admin/terms/${created.id}`);
    } catch (error) {
      setMutation({ status: "error", error: error.message });
    }
  }

  async function transitionTerm(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMutation({ status: "pending", error: "" });
    const note = String(form.get("note") || "").trim();
    try {
      await apiRequest(`/admin/terms/${encodeURIComponent(itemId)}/transition`, {
        method: "POST",
        body: JSON.stringify({
          status: form.get("status"),
          ...(note ? { note } : {}),
        }),
      });
      setMutation({ status: "success", error: "" });
      router.push("/admin/terms");
    } catch (error) {
      setMutation({ status: "error", error: error.message });
    }
  }

  if (isNew) {
    const categories = Array.isArray(categoriesState.data) ? categoriesState.data : [];
    return (
      <div className="page-stack admin-page-stack">
        <ButtonLink href="/admin/terms" variant="ghost" size="small">
          <ArrowLeft size={18} /> {t("terms")}
        </ButtonLink>
        <PageHeader
          eyebrow="DRAFT"
          title={t("newTerm")}
          lead={copy.newTermLead}
          actions={<Badge tone="neutral">DRAFT</Badge>}
        />
        <form className="form-stack" onSubmit={createTerm}>
          <Card className="editor-section">
            <SectionHeading title="Identity" />
            <div className="form-grid-two">
              <Field label="Slug">
                <input
                  name="slug"
                  required
                  minLength={2}
                  maxLength={120}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="bilingual-term"
                />
              </Field>
              <Field label="Part of speech">
                <select name="partOfSpeech" defaultValue="NOUN">
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
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Difficulty (1–5)">
              <input name="difficulty" type="number" min="1" max="5" defaultValue="1" required />
            </Field>
          </Card>
          <Card className="editor-section">
            <SectionHeading title="English / Українська" />
            <div className="form-grid-two">
              <Field label="English primary variant">
                <input name="english" lang="en" required maxLength={200} />
              </Field>
              <Field label={t("translation")}>
                <input name="ukrainian" lang="uk" required maxLength={200} />
              </Field>
            </div>
            <Field label="English definition">
              <textarea name="definitionEn" lang="en" rows={3} required maxLength={2000} />
            </Field>
            <Field label="Українське визначення">
              <textarea name="definitionUk" lang="uk" rows={3} required maxLength={2000} />
            </Field>
            <div className="form-grid-two">
              <Field label="English general example">
                <textarea name="exampleEn" lang="en" rows={2} maxLength={2000} />
              </Field>
              <Field label="Загальний приклад українською">
                <textarea name="exampleUk" lang="uk" rows={2} maxLength={2000} />
              </Field>
            </div>
          </Card>
          <Card className="editor-section">
            <SectionHeading title={t("categories")} />
            <Field label={t("categories")}>
              <select
                name="categoryId"
                required
                disabled={categoriesState.status !== "ready" || categories.length === 0}
                defaultValue=""
              >
                <option value="" disabled>
                  {categoriesState.status === "loading" ? copy.loading : copy.empty}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {(locale === "uk" ? category.nameUk : category.nameEn) || category.slug}
                  </option>
                ))}
              </select>
            </Field>
            {categoriesState.status === "error" ? (
              <p role="alert">{categoriesState.error}</p>
            ) : null}
          </Card>
          <Card className="editor-section">
            <SectionHeading title="Context-specific meaning / Контекстне значення" />
            <p className="muted-copy">
              These verified fields belong to the selected category and power sentence exercises.
            </p>
            <div className="form-grid-two">
              <Field label="English contextual definition">
                <textarea name="contextDefinitionEn" lang="en" rows={3} required maxLength={2000} />
              </Field>
              <Field label="Контекстне визначення українською">
                <textarea name="contextDefinitionUk" lang="uk" rows={3} required maxLength={2000} />
              </Field>
              <Field label="Verified English example">
                <textarea name="contextExampleEn" lang="en" rows={3} required maxLength={2000} />
              </Field>
              <Field label="Перевірений приклад українською">
                <textarea name="contextExampleUk" lang="uk" rows={3} required maxLength={2000} />
              </Field>
              <Field label="English context note">
                <textarea name="contextNoteEn" lang="en" rows={2} maxLength={2000} />
              </Field>
              <Field label="Контекстна примітка українською">
                <textarea name="contextNoteUk" lang="uk" rows={2} maxLength={2000} />
              </Field>
            </div>
          </Card>
          <Card className="editor-section">
            <SectionHeading title={t("source")} />
            <Field label={t("sourceUrl")}>
              <input name="sourceUrl" type="url" required maxLength={2000} />
            </Field>
            <Field label="Source title">
              <input name="sourceTitle" required maxLength={300} />
            </Field>
            <div className="form-grid-two">
              <Field label="Publisher">
                <input name="publisher" maxLength={200} />
              </Field>
              <Field label="Source type">
                <select name="sourceType" defaultValue="OTHER">
                  {[
                    "OFFICIAL_UKRAINIAN",
                    "NATO",
                    "DOD",
                    "DOCTRINE",
                    "DICTIONARY",
                    "MEDICAL",
                    "OTHER",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="notice notice-warning">
              <AlertTriangle size={19} />
              <p>{t("checkSource")}</p>
            </div>
          </Card>
          {mutation.error ? <p role="alert">{mutation.error}</p> : null}
          <Button type="submit" disabled={mutation.status === "pending" || categories.length === 0}>
            {mutation.status === "pending" ? copy.saving : copy.createDraft}
          </Button>
        </form>
      </div>
    );
  }

  const term = state.data;
  return (
    <div className="page-stack admin-page-stack">
      <ButtonLink href="/admin/terms" variant="ghost" size="small">
        <ArrowLeft size={18} /> {t("terms")}
      </ButtonLink>
      <AdminState state={state} copy={copy}>
        {term ? (
          <>
            <PageHeader
              eyebrow={copy.live}
              title={recordTitle(term, "terms", locale)}
              lead={copy.readOnly}
              actions={<Badge tone={toneFor(term.status)}>{term.status}</Badge>}
            />
            <Card className="editor-section">
              <RecordFacts record={term} locale={locale} />
            </Card>
            <Card className="editor-section">
              <SectionHeading title="Variants" />
              {term.variants?.length ? (
                <ul>
                  {term.variants.map((variant) => (
                    <li key={variant.id}>
                      <strong>{variant.locale}</strong> · {variant.value}
                      {variant.isPrimary ? " · PRIMARY" : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{copy.empty}</p>
              )}
            </Card>
            <Card className="editor-section">
              <SectionHeading title={t("definition")} />
              {term.definitions?.length ? (
                term.definitions.map((definition) => (
                  <div key={definition.id}>
                    <strong>{definition.locale}</strong>
                    <p>{definition.shortDefinition || "—"}</p>
                  </div>
                ))
              ) : (
                <p>{copy.empty}</p>
              )}
            </Card>
            <Card className="editor-section">
              <SectionHeading title="Context-specific meanings" />
              {term.contextDefinitions?.length ? (
                term.contextDefinitions.map((definition) => (
                  <div key={definition.id} className="admin-context-definition">
                    <strong>
                      {definition.category?.nameEn || definition.category?.slug} ·{" "}
                      {definition.locale}
                    </strong>
                    <p>{definition.shortDefinition || "—"}</p>
                    {definition.example ? <blockquote>{definition.example}</blockquote> : null}
                    {definition.contextNote ? <small>{definition.contextNote}</small> : null}
                  </div>
                ))
              ) : (
                <p>{copy.empty}</p>
              )}
              {term.categories?.flatMap(({ categoryId, category }) => {
                const presentLocales = new Set(
                  (term.contextDefinitions ?? [])
                    .filter((definition) => definition.categoryId === categoryId)
                    .map((definition) => definition.locale),
                );
                const missingLocales = ["EN", "UK"].filter(
                  (requiredLocale) => !presentLocales.has(requiredLocale),
                );
                return missingLocales.length
                  ? [
                      <div className="notice notice-warning" key={`missing-${categoryId}`}>
                        <AlertTriangle size={19} />
                        <p>
                          {category?.nameEn || category?.slug}: editorial fill required for{" "}
                          {missingLocales.join(" / ")} context.
                        </p>
                      </div>,
                    ]
                  : [];
              })}
            </Card>
            <Card className="editor-section">
              <SectionHeading title={copy.transition} />
              <p>{copy.transitionLead}</p>
              {allowedTermTransitions(term.status).length ? (
                <form className="form-stack" onSubmit={transitionTerm}>
                  <Field label={t("status")}>
                    <select name="status" required>
                      {allowedTermTransitions(term.status).map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Note">
                    <textarea name="note" rows={3} maxLength={2000} />
                  </Field>
                  {mutation.error ? <p role="alert">{mutation.error}</p> : null}
                  <Button type="submit" disabled={mutation.status === "pending"}>
                    {mutation.status === "pending" ? copy.saving : copy.transition}
                  </Button>
                </form>
              ) : (
                <p>{copy.empty}</p>
              )}
            </Card>
          </>
        ) : (
          <EmptyState icon={<FileText />} title={t("terms")} text={copy.notFound} />
        )}
      </AdminState>
    </div>
  );
}

export function AdminReviewScreen({ reviewId }) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const copy = adminCopy(locale);
  const router = useRouter();
  const state = useAdminResource("/admin/reviews?limit=100");
  const [mutation, setMutation] = useState({ status: "idle", error: "" });
  const review = Array.isArray(state.data) ? state.data.find((item) => item.id === reviewId) : null;

  async function decideReview(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const decision = form.get("decision");
    const note = String(form.get("note") || "").trim();
    if (decision !== "APPROVED" && !note) {
      setMutation({
        status: "error",
        error:
          locale === "uk"
            ? "Для негативного рішення потрібна примітка."
            : "A note is required for a negative decision.",
      });
      return;
    }
    setMutation({ status: "pending", error: "" });
    try {
      await apiRequest(`/admin/reviews/${encodeURIComponent(reviewId)}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, ...(note ? { note } : {}) }),
      });
      setMutation({ status: "success", error: "" });
      router.push("/admin/reviews");
    } catch (error) {
      setMutation({ status: "error", error: error.message });
    }
  }

  return (
    <div className="page-stack admin-page-stack">
      <ButtonLink href="/admin/reviews" variant="ghost" size="small">
        <ArrowLeft size={18} /> {t("reviews")}
      </ButtonLink>
      <AdminState state={state} copy={copy}>
        {review ? (
          <>
            <PageHeader
              eyebrow={copy.live}
              title={t("reviewTitle")}
              lead={recordTitle(review, "reviews", locale)}
              actions={<Badge tone={toneFor(review.status)}>{review.status}</Badge>}
            />
            <Card>
              <RecordFacts record={review} locale={locale} />
            </Card>
            <Card>
              <SectionHeading title={t("revision")} />
              <p>Revision {review.revisionNumber ?? "—"}</p>
              <p>{review.note || copy.readOnly}</p>
            </Card>
            <Card>
              <SectionHeading title={copy.decision} />
              <p>{copy.decisionLead}</p>
              <form className="form-stack" onSubmit={decideReview}>
                <Field label={copy.decision}>
                  <select name="decision" defaultValue="APPROVED" required>
                    <option value="APPROVED">APPROVED</option>
                    <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </Field>
                <Field label="Note">
                  <textarea name="note" rows={4} maxLength={2000} />
                </Field>
                {mutation.error ? <p role="alert">{mutation.error}</p> : null}
                <Button type="submit" disabled={mutation.status === "pending"}>
                  {mutation.status === "pending" ? copy.saving : copy.submit}
                </Button>
              </form>
            </Card>
          </>
        ) : (
          <EmptyState icon={<ClipboardCheck />} title={t("reviews")} text={copy.notFound} />
        )}
      </AdminState>
    </div>
  );
}

export function AdminImportScreen() {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const copy = adminCopy(locale);
  const [filePayload, setFilePayload] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [mutation, setMutation] = useState({ status: "idle", error: "" });

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    setPreview(null);
    setResult(null);
    if (!file) {
      setFilePayload(null);
      return;
    }
    setMutation({ status: "reading", error: "" });
    try {
      if (file.size > 1_024 * 1_024) throw new Error("File exceeds the 1 MB request limit.");
      const text = await file.text();
      const format = file.name.toLocaleLowerCase("en-US").endsWith(".json") ? "json" : "csv";
      const content = format === "json" ? JSON.parse(text) : text;
      if (format === "json" && !Array.isArray(content)) {
        throw new Error("A JSON import must contain an array of rows.");
      }
      setFilePayload({ format, fileName: file.name, content });
      setMutation({ status: "idle", error: "" });
    } catch (error) {
      setFilePayload(null);
      setMutation({ status: "error", error: error.message });
    }
  }

  async function previewImport() {
    if (!filePayload) {
      setMutation({ status: "error", error: copy.chooseFileFirst });
      return;
    }
    setMutation({ status: "previewing", error: "" });
    try {
      const data = await apiRequest("/admin/imports/preview", {
        method: "POST",
        body: JSON.stringify(filePayload),
      });
      setPreview(data);
      setResult(null);
      setMutation({ status: "idle", error: "" });
    } catch (error) {
      setPreview(null);
      setMutation({ status: "error", error: error.message });
    }
  }

  async function commitImport() {
    if (!filePayload || !preview?.checksum) return;
    setMutation({ status: "committing", error: "" });
    try {
      const data = await apiRequest("/admin/imports/commit", {
        method: "POST",
        body: JSON.stringify({ ...filePayload, expectedChecksum: preview.checksum }),
      });
      setResult(data);
      setMutation({ status: "done", error: "" });
    } catch (error) {
      setMutation({ status: "error", error: error.message });
    }
  }

  return (
    <div className="narrow-page page-stack admin-page-stack">
      <ButtonLink href="/admin/terms" variant="ghost" size="small">
        <ArrowLeft size={18} /> {t("terms")}
      </ButtonLink>
      <PageHeader eyebrow="CSV / JSON → DRAFT" title={t("importTitle")} lead={copy.importLead} />
      <Card className="import-card">
        <label className="dropzone">
          <Upload size={30} />
          <strong>{t("chooseFile")}</strong>
          <span>CSV or JSON · UTF-8 · max 1 MB request</span>
          <input type="file" accept=".csv,.json,text/csv,application/json" onChange={chooseFile} />
        </label>
        {filePayload ? (
          <p>
            {filePayload.fileName} · {filePayload.format.toUpperCase()}
          </p>
        ) : null}
        {mutation.error ? <p role="alert">{mutation.error}</p> : null}
        <Button
          type="button"
          onClick={previewImport}
          disabled={
            !filePayload || ["reading", "previewing", "committing"].includes(mutation.status)
          }
        >
          {mutation.status === "previewing" ? copy.saving : copy.previewFile}
        </Button>
      </Card>
      {preview ? (
        <Card className="import-rules">
          <SectionHeading title="Server preview" />
          <dl className="profile-facts">
            <div>
              <dt>Total rows</dt>
              <dd>{preview.total}</dd>
            </div>
            <div>
              <dt>Valid rows</dt>
              <dd>{preview.rows?.length ?? 0}</dd>
            </div>
            <div>
              <dt>Rejected rows</dt>
              <dd>{preview.errors?.length ?? 0}</dd>
            </div>
            <div>
              <dt>Checksum</dt>
              <dd>
                <code>{preview.checksum}</code>
              </dd>
            </div>
          </dl>
          {preview.errors?.length ? (
            <ul>
              {preview.errors.map((error) => (
                <li key={error.row}>
                  Row {error.row}: {JSON.stringify(error.fields)}
                </li>
              ))}
            </ul>
          ) : null}
          <Button
            type="button"
            variant="olive"
            onClick={commitImport}
            disabled={mutation.status === "committing" || mutation.status === "done"}
          >
            {mutation.status === "committing" ? copy.saving : copy.commitImport}
          </Button>
        </Card>
      ) : null}
      {result ? (
        <Card>
          <SectionHeading title={copy.importComplete} />
          <Badge tone={toneFor(result.status)}>{result.status}</Badge>
          <p>
            {result.importedRows ?? 0} imported · {result.rejectedRows ?? 0} rejected
          </p>
        </Card>
      ) : null}
    </div>
  );
}

export function AdminGenericDetailScreen({ section, itemId }) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const copy = adminCopy(locale);
  const listOnly = section === "reports";
  const state = useAdminResource(
    listOnly ? "/admin/reports?limit=100" : `/admin/${section}/${encodeURIComponent(itemId)}`,
  );
  const record =
    listOnly && Array.isArray(state.data)
      ? state.data.find((item) => item.id === itemId)
      : state.data;
  const label = t(section);
  return (
    <div className="narrow-page page-stack admin-page-stack">
      <ButtonLink href={`/admin/${section}`} variant="ghost" size="small">
        <ArrowLeft size={18} /> {label}
      </ButtonLink>
      <AdminState state={state} copy={copy}>
        {record ? (
          <>
            <PageHeader
              eyebrow={copy.live}
              title={recordTitle(record, section, locale)}
              lead={copy.readOnly}
              actions={
                record.status ? (
                  <Badge tone={toneFor(record.status)}>{record.status}</Badge>
                ) : undefined
              }
            />
            <Card className="form-card">
              <div className="generic-detail-placeholder">
                <UserRound size={28} />
                <RecordFacts record={record} locale={locale} />
                <p>{copy.readOnly}</p>
              </div>
            </Card>
          </>
        ) : (
          <EmptyState icon={<FolderOpen />} title={label} text={copy.notFound} />
        )}
      </AdminState>
    </div>
  );
}
