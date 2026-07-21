"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Flame,
  LockKeyhole,
  Medal,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { apiRequest } from "@/components/learning-api";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionHeading,
  Stat,
} from "@/components/ui";

function liveCopy(locale) {
  return locale === "uk"
    ? {
        loading: "Завантажуємо дані з сервера…",
        error: "Не вдалося завантажити дані",
        retry: "Спробувати знову",
        emptyTitle: "Даних поки немає",
        emptyProgress: "Прогрес з’явиться після завершення опублікованого уроку.",
        signIn: "Увійти",
        dashboard: "Навчальна панель",
        dashboardLead: "Тут відображаються лише показники, які повернув сервер.",
        nextReview: "Перейти до повторення",
        chooseLesson: "Обрати опублікований урок",
        published: "Опубліковано",
        currentStreak: "Поточна серія",
        due: "До повторення",
        totalXp: "Всього XP",
        level: "Рівень",
        dailyGoal: "Щоденна ціль",
        categoryProgress: "Прогрес за напрямами",
        mastered: "опановано",
        activity: "Активність за 7 днів",
        longest: "Найдовша серія",
        achievementsEmpty: "Сервер не повернув активних досягнень.",
        earned: "Відкрито",
        locked: "Попереду",
        leaderboardEmpty: "Для цього періоду ще немає учасників із відкритим профілем.",
        privacy: "Відображаються лише псевдоніми користувачів, які погодилися на участь.",
        profile: "Профіль",
        profileLead: "Приватні поля не відображаються іншим користувачам.",
        notShared: "Не публікується",
      }
    : {
        loading: "Loading data from the server…",
        error: "Data could not be loaded",
        retry: "Try again",
        emptyTitle: "No data yet",
        emptyProgress: "Progress appears after you complete a published lesson.",
        signIn: "Sign in",
        dashboard: "Learning dashboard",
        dashboardLead: "Only metrics returned by the server are shown here.",
        nextReview: "Go to reviews",
        chooseLesson: "Choose a published lesson",
        published: "Published",
        currentStreak: "Current streak",
        due: "Due for review",
        totalXp: "Total XP",
        level: "Level",
        dailyGoal: "Daily goal",
        categoryProgress: "Progress by field",
        mastered: "mastered",
        activity: "Seven-day activity",
        longest: "Longest streak",
        achievementsEmpty: "The server returned no active achievements.",
        earned: "Unlocked",
        locked: "Ahead",
        leaderboardEmpty: "No opted-in learners are ranked for this period yet.",
        privacy: "Only nicknames of learners who opted in are displayed.",
        profile: "Profile",
        profileLead: "Private fields are not shown to other learners.",
        notShared: "Not public",
      };
}

function useApi(path) {
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const request = useMemo(() => path, [path]);

  function load() {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    apiRequest(request)
      .then((data) => setState({ status: "ready", data, error: "" }))
      .catch((error) => setState({ status: "error", data: null, error: error.message }));
  }

  useEffect(() => {
    let active = true;
    apiRequest(request)
      .then((data) => active && setState({ status: "ready", data, error: "" }))
      .catch((error) => active && setState({ status: "error", data: null, error: error.message }));
    return () => {
      active = false;
    };
  }, [request]);

  return { ...state, reload: load };
}

function LiveState({ state, copy, emptyText }) {
  if (state.status === "loading") {
    return (
      <Card className="live-detail-loading" aria-busy="true">
        {copy.loading}
      </Card>
    );
  }
  if (state.status === "error") {
    return (
      <EmptyState
        icon={<AlertTriangle size={30} />}
        title={copy.error}
        text={state.error}
        action={
          <Button onClick={state.reload} variant="secondary">
            <RefreshCw size={18} /> {copy.retry}
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={<ShieldCheck size={30} />}
      title={copy.emptyTitle}
      text={emptyText || copy.emptyProgress}
    />
  );
}

function ActivityBars({ activity, locale }) {
  const max = Math.max(1, ...activity.map((day) => Number(day.xpEarned || 0)));
  return (
    <div
      className="activity-bars"
      role="img"
      aria-label={activity.map((day) => `${day.activityDate}: ${day.xpEarned} XP`).join(", ")}
    >
      {activity.map((day) => (
        <div key={day.activityDate}>
          <span style={{ height: `${Math.max(8, (Number(day.xpEarned || 0) / max) * 100)}%` }} />
          <small>
            {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
              new Date(day.activityDate),
            )}
          </small>
        </div>
      ))}
    </div>
  );
}

export function LiveDashboardScreen() {
  const locale = useLocale();
  const copy = liveCopy(locale);
  const progress = useApi("/progress");
  const lessons = useApi(`/lessons?locale=${locale}`);
  const data = progress.data;
  const nextLesson = Array.isArray(lessons.data) ? lessons.data[0] : null;

  return (
    <div className="page-stack">
      <PageHeader eyebrow="TactLex" title={copy.dashboard} lead={copy.dashboardLead} />
      {progress.status !== "ready" && <LiveState state={progress} copy={copy} />}
      {progress.status === "ready" && data && (
        <>
          {Number(data.dueCount || 0) > 0 ? (
            <Card className="next-action-card">
              <div className="next-action-main">
                <span className="next-action-icon">
                  <RotateCcw size={26} />
                </span>
                <div>
                  <p className="eyebrow">{copy.due}</p>
                  <h2>{data.dueCount}</h2>
                  <p>{copy.dashboardLead}</p>
                </div>
              </div>
              <ButtonLink href="/review">{copy.nextReview}</ButtonLink>
            </Card>
          ) : nextLesson ? (
            <Card className="next-action-card">
              <div className="next-action-main">
                <span className="next-action-icon">
                  <BookOpen size={26} />
                </span>
                <div>
                  <p className="eyebrow">{copy.published}</p>
                  <h2>{nextLesson.title}</h2>
                  <p>{nextLesson.description}</p>
                </div>
              </div>
              <ButtonLink
                href={`/categories/${nextLesson.category?.slug || "all"}/lessons/${nextLesson.id}`}
              >
                {copy.chooseLesson}
              </ButtonLink>
            </Card>
          ) : lessons.status === "ready" ? (
            <Card className="server-empty-strip">
              <ShieldCheck size={22} />
              <p>{copy.emptyProgress}</p>
            </Card>
          ) : null}

          <div className="stats-grid stats-grid-four">
            <Stat icon={<RotateCcw size={22} />} label={copy.due} value={data.dueCount ?? 0} />
            <Stat
              icon={<Flame size={22} />}
              label={copy.currentStreak}
              value={data.currentStreak ?? 0}
              tone="yellow"
            />
            <Stat
              icon={<Zap size={22} />}
              label={copy.totalXp}
              value={data.totalXp ?? 0}
              tone="olive"
            />
            <Stat
              icon={<Trophy size={22} />}
              label={copy.level}
              value={data.level ?? 1}
              tone="graphite"
            />
          </div>

          <section>
            <SectionHeading title={copy.categoryProgress} />
            {!data.categories?.length ? (
              <Card className="server-empty-strip">
                <p>{copy.emptyProgress}</p>
              </Card>
            ) : (
              <div className="category-progress-list">
                {data.categories.map((category) => (
                  <Card className="category-progress-card" key={category.id}>
                    <span className="category-mini-icon">
                      <BookOpen size={20} />
                    </span>
                    <div className="category-progress-copy">
                      <div>
                        <strong>{locale === "uk" ? category.nameUk : category.nameEn}</strong>
                        <span>{category.percent}%</span>
                      </div>
                      <ProgressBar
                        value={category.percent}
                        label={`${category.percent}%`}
                        compact
                      />
                      <small>
                        {category.mastered} / {category.published} {copy.mastered}
                      </small>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function LiveProgressScreen() {
  const locale = useLocale();
  const copy = liveCopy(locale);
  const progress = useApi("/progress");
  const data = progress.data;

  return (
    <div className="page-stack">
      <PageHeader eyebrow={copy.totalXp} title={copy.categoryProgress} lead={copy.dashboardLead} />
      {progress.status !== "ready" && <LiveState state={progress} copy={copy} />}
      {progress.status === "ready" && data && (
        <>
          <div className="stats-grid stats-grid-four">
            <Stat icon={<Zap size={21} />} label={copy.totalXp} value={data.totalXp ?? 0} />
            <Stat
              icon={<Trophy size={21} />}
              label={copy.level}
              value={data.level ?? 1}
              tone="olive"
            />
            <Stat
              icon={<Flame size={21} />}
              label={copy.currentStreak}
              value={data.currentStreak ?? 0}
              tone="yellow"
            />
            <Stat
              icon={<Target size={21} />}
              label={copy.dailyGoal}
              value={`${data.dailyGoalXp ?? 20} XP`}
              tone="graphite"
            />
          </div>
          <div className="progress-page-grid">
            <Card className="activity-card">
              <SectionHeading title={copy.activity} />
              {data.activity?.length ? (
                <ActivityBars activity={data.activity} locale={locale} />
              ) : (
                <p>{copy.emptyProgress}</p>
              )}
            </Card>
            <Card>
              <SectionHeading title={copy.categoryProgress} />
              {data.categories?.length ? (
                data.categories.map((category) => (
                  <div className="progress-list-row" key={category.id}>
                    <div>
                      <strong>{locale === "uk" ? category.nameUk : category.nameEn}</strong>
                      <span>{category.percent}%</span>
                    </div>
                    <ProgressBar value={category.percent} label={`${category.percent}%`} compact />
                  </div>
                ))
              ) : (
                <p>{copy.emptyProgress}</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export function LiveAchievementsScreen() {
  const locale = useLocale();
  const copy = liveCopy(locale);
  const state = useApi(`/achievements?locale=${locale}`);
  const items = Array.isArray(state.data) ? state.data : [];
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={copy.earned}
        title={locale === "uk" ? "Досягнення" : "Achievements"}
        lead={copy.dashboardLead}
      />
      {state.status !== "ready" && <LiveState state={state} copy={copy} />}
      {state.status === "ready" && items.length === 0 && (
        <LiveState state={state} copy={copy} emptyText={copy.achievementsEmpty} />
      )}
      {state.status === "ready" && items.length > 0 && (
        <div className="achievement-grid">
          {items.map((item) => (
            <Card className={`achievement-card ${item.awardedAt ? "is-earned" : ""}`} key={item.id}>
              <div className="achievement-icon">
                <Award size={28} />
              </div>
              <Badge tone={item.awardedAt ? "olive" : "neutral"}>
                {item.awardedAt ? copy.earned : copy.locked}
              </Badge>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <strong>+{item.rewardXp ?? 0} XP</strong>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveLeaderboardScreen() {
  const locale = useLocale();
  const t = useTranslations("Leaderboard");
  const copy = liveCopy(locale);
  const [period, setPeriod] = useState("weekly");
  const state = useApi(`/leaderboards?period=${period}&limit=50`);
  const entries = Array.isArray(state.data?.entries) ? state.data.entries : [];

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={copy.privacy} />
      <div className="tab-list" role="tablist">
        <button
          className={period === "weekly" ? "is-active" : ""}
          role="tab"
          aria-selected={period === "weekly"}
          onClick={() => setPeriod("weekly")}
        >
          {t("weekly")}
        </button>
        <button
          className={period === "all-time" ? "is-active" : ""}
          role="tab"
          aria-selected={period === "all-time"}
          onClick={() => setPeriod("all-time")}
        >
          {t("allTime")}
        </button>
      </div>
      {state.status !== "ready" && <LiveState state={state} copy={copy} />}
      {state.status === "ready" && entries.length === 0 && (
        <LiveState state={state} copy={copy} emptyText={copy.leaderboardEmpty} />
      )}
      {state.status === "ready" && entries.length > 0 && (
        <Card className="leaderboard-card">
          <div className="responsive-table-wrap">
            <table className="data-table leaderboard-table">
              <thead>
                <tr>
                  <th>{t("place")}</th>
                  <th>{t("learner")}</th>
                  <th>{t("xp")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    className={entry.isCurrentUser ? "is-current-user" : ""}
                    key={`${entry.rank}-${entry.nickname}`}
                  >
                    <td>#{entry.rank}</td>
                    <td>
                      <span className="table-avatar">{entry.nickname?.slice(0, 1) || "?"}</span>
                      <strong>{entry.nickname}</strong>
                      {entry.isCurrentUser && <Badge tone="blue">{t("you")}</Badge>}
                    </td>
                    <td>
                      <strong>{entry.xp}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <div className="privacy-note">
        <LockKeyhole size={18} /> <span>{copy.privacy}</span>
      </div>
    </div>
  );
}

export function LiveProfileScreen() {
  const locale = useLocale();
  const copy = liveCopy(locale);
  const state = useApi("/profile");
  const user = state.data?.user;
  const nickname = user?.profile?.nickname;

  return (
    <div className="page-stack">
      {state.status !== "ready" && <LiveState state={state} copy={copy} />}
      {state.status === "ready" && user && (
        <>
          <Card className="profile-hero">
            <span className="profile-avatar">{nickname?.slice(0, 1) || <User size={28} />}</span>
            <div>
              <p className="eyebrow">{copy.profile}</p>
              <h1>{nickname || copy.notShared}</h1>
              <p>{copy.profileLead}</p>
            </div>
            <ButtonLink href="/settings" variant="secondary">
              <Settings size={18} /> {locale === "uk" ? "Налаштування" : "Settings"}
            </ButtonLink>
          </Card>
          <Card className="profile-details">
            <div>
              <ShieldCheck size={20} />
              <span>
                <small>Email</small>
                <strong>{user.email}</strong>
              </span>
            </div>
            <div>
              <LockKeyhole size={20} />
              <span>
                <small>{locale === "uk" ? "Ролі" : "Roles"}</small>
                <strong>{user.roles?.join(", ") || "USER"}</strong>
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
