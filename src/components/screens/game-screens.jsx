"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import {
  Award,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Flame,
  Gem,
  Gift,
  Info,
  Medal,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import clsx from "clsx";

import { apiRequest, createIdempotencyKey } from "@/components/learning-api";
import { Button, ButtonLink, Card, EmptyState, ProgressBar } from "@/components/ui";
import { useRouter } from "@/lib/i18n/navigation";

const nodeIcons = {
  LESSON: BookOpen,
  QUIZ: CircleHelp,
  FACT: Info,
  REWARD: Gift,
  CHECKPOINT: ShieldCheck,
  PATCH: Award,
};

const patchIcons = {
  quiz: CircleHelp,
  progress: Route,
  category: ShieldCheck,
  streak: Flame,
  quest: Target,
  league: Trophy,
};

function copy(locale) {
  return locale === "uk"
    ? {
        path: "Відкрита навчальна стежка",
        pathLead: "Оберіть будь-який урок або квіз. Морква лише радить наступний крок.",
        recommended: "Рекомендовано",
        allOpen: "Усі навчальні вузли відкриті",
        start: "Почати",
        read: "Прочитати",
        claim: "Забрати",
        claimed: "Отримано",
        close: "Закрити",
        source: "Джерело",
        beta: "Beta · потребує предметної перевірки",
        quests: "Квести",
        questsLead: "Виконуйте короткі цілі й забирайте жетони. Помилки не забирають спроби.",
        daily: "Щоденні",
        weekly: "Тижневі",
        monthly: "Місячні",
        league: "Ліга",
        leagueLead: "Тижневий рейтинг за XP. Участь добровільна й показує лише публічний профіль.",
        optIn: "Увімкніть рейтинг у налаштуваннях профілю.",
        patches: "Польова дошка",
        patchesLead: "Колекційні патчі не впливають на XP. Закріпіть до трьох отриманих.",
        saveFeatured: "Зберегти закріплені",
        earned: "Отримано",
        lockedReward: "Нагорода стане доступною після виконання умови.",
      }
    : {
        path: "Open learning path",
        pathLead: "Choose any lesson or quiz. Morkva only recommends the next step.",
        recommended: "Recommended",
        allOpen: "All learning nodes are open",
        start: "Start",
        read: "Read",
        claim: "Claim",
        claimed: "Claimed",
        close: "Close",
        source: "Source",
        beta: "Beta · subject-matter review required",
        quests: "Quests",
        questsLead: "Complete short goals and claim coins. Mistakes never remove attempts.",
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly",
        league: "League",
        leagueLead:
          "A weekly XP ranking. Participation is optional and only public profile data is shown.",
        optIn: "Enable the leaderboard in profile settings.",
        patches: "Field board",
        patchesLead: "Collectible patches do not affect XP. Feature up to three earned patches.",
        saveFeatured: "Save featured patches",
        earned: "Earned",
        lockedReward: "Complete the requirement to claim this reward.",
      };
}

export function GameResourceBar() {
  const locale = useLocale();
  const [status, setStatus] = useState(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    apiRequest("/game-status")
      .then((value) => active && setStatus(value))
      .catch(() => {});
    return () => {
      active = false;
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  if (!status) return <div className="game-resource-bar is-loading" aria-hidden="true" />;
  return (
    <div
      className="game-resource-bar"
      aria-label={locale === "uk" ? "Ігрові ресурси" : "Game resources"}
    >
      <span title={locale === "uk" ? "Серія" : "Streak"}>
        <Flame aria-hidden="true" /> {status.streak}
      </span>
      <span title={locale === "uk" ? "Жетони" : "Coins"}>
        <Gem aria-hidden="true" /> {status.coins}
      </span>
      <span title={locale === "uk" ? "Денна ціль XP" : "Daily XP goal"}>
        <Target aria-hidden="true" /> {status.dailyXp}/{status.dailyGoalXp}
      </span>
      {status.activeDoubleXpUntil ? (
        <span className="boost-pill">
          <Zap aria-hidden="true" /> ×2
        </span>
      ) : null}
      {!online ? (
        <span className="offline-pill">
          <WifiOff aria-hidden="true" /> offline
        </span>
      ) : null}
    </div>
  );
}

export function LearningPathScreen({ categorySlug }) {
  const locale = useLocale();
  const router = useRouter();
  const words = copy(locale);
  const [state, setState] = useState({ loading: true, path: null, error: "" });
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const recommendedRef = useRef(null);

  async function load() {
    try {
      const path = await apiRequest(
        `/categories/${encodeURIComponent(categorySlug)}/path?locale=${locale}`,
      );
      setState({ loading: false, path, error: "" });
    } catch (error) {
      setState({ loading: false, path: null, error: error.message });
    }
  }

  useEffect(() => {
    let active = true;
    apiRequest(`/categories/${encodeURIComponent(categorySlug)}/path?locale=${locale}`)
      .then((path) => active && setState({ loading: false, path, error: "" }))
      .catch((error) => active && setState({ loading: false, path: null, error: error.message }));
    return () => {
      active = false;
    };
  }, [categorySlug, locale]);

  useEffect(() => {
    if (!state.path) return;
    const key = `tactlex:path-scroll:${categorySlug}`;
    const saved = Number(window.sessionStorage.getItem(key));
    const timer = window.setTimeout(() => {
      if (saved > 0) window.scrollTo({ top: saved });
      else recommendedRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
    const remember = () => window.sessionStorage.setItem(key, String(window.scrollY));
    window.addEventListener("scroll", remember, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", remember);
    };
  }, [state.path, categorySlug]);

  async function act(node) {
    if (busy) return;
    if (node.type === "FACT") {
      setSelected(node);
      return;
    }
    if (node.type === "REWARD" || node.type === "PATCH") {
      if (!node.claimable) {
        setSelected(node);
        return;
      }
      setBusy(true);
      try {
        await apiRequest(`/path-nodes/${node.id}/claim`, { method: "POST" });
        await load();
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const session = await apiRequest("/study-sessions", {
        method: "POST",
        headers: { "Idempotency-Key": createIdempotencyKey() },
        body: JSON.stringify({ nodeId: node.id, mode: node.type, direction: "MIXED" }),
      });
      router.push(`/sessions/${session.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function completeFact() {
    if (!selected || selected.completed) return setSelected(null);
    setBusy(true);
    try {
      await apiRequest(`/path-nodes/${selected.id}/complete`, { method: "POST" });
      setSelected(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (state.loading) return <div className="path-loading" aria-busy="true" />;
  if (state.error) return <EmptyState title={words.path} text={state.error} />;
  const path = state.path;
  return (
    <div className="learning-path-page">
      <header className="path-hero-card">
        <div>
          <span>{words.path}</span>
          <h1>{path.category.name}</h1>
          <p>{words.pathLead}</p>
        </div>
        <Image src="/brand/morkva-mark.png" alt="" width={112} height={112} priority />
        <div className="path-progress">
          <ProgressBar
            value={Math.round((path.completedNodes / Math.max(path.totalNodes, 1)) * 100)}
            label={words.path}
          />
        </div>
      </header>
      <div className="open-path-note">
        <Sparkles /> {words.allOpen}
      </div>
      <div className="learning-path" role="list">
        <span className="path-route" aria-hidden="true" />
        {path.nodes.map((node, index) => {
          const Icon = nodeIcons[node.type];
          return (
            <div
              className={clsx(
                "path-stop",
                `path-stop-${index % 3}`,
                `state-${node.state.toLowerCase()}`,
              )}
              key={node.id}
              ref={node.recommended ? recommendedRef : undefined}
              role="listitem"
            >
              {node.type === "CHECKPOINT" ? (
                <Image
                  className="checkpoint-morkva"
                  src="/brand/morkva-anchor.png"
                  alt="Морква"
                  width={150}
                  height={150}
                />
              ) : null}
              <button
                className="path-node"
                onClick={() => act(node)}
                disabled={busy}
                aria-label={`${node.title}. ${node.state}`}
              >
                <Icon aria-hidden="true" />
                {node.completed ? <Check className="node-check" aria-hidden="true" /> : null}
              </button>
              <div className="path-node-copy">
                {node.recommended ? (
                  <span className="recommended-label">{words.recommended}</span>
                ) : null}
                <strong>{node.title}</strong>
                {node.stars > 0 ? (
                  <span className="node-stars" aria-label={`${node.stars} stars`}>
                    {[1, 2, 3].map((star) => (
                      <Star key={star} className={star <= node.stars ? "is-filled" : ""} />
                    ))}
                  </span>
                ) : null}
                {node.termCount ? (
                  <small>
                    {node.termCount} · {node.estimatedMinutes} min
                  </small>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="recommended-fab"
        onClick={() =>
          recommendedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        aria-label={words.recommended}
      >
        <ChevronDown />
      </button>
      {selected ? (
        <div className="node-dialog-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <Card
            className="node-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="dialog-close"
              onClick={() => setSelected(null)}
              aria-label={words.close}
            >
              <X />
            </button>
            <span className="node-dialog-icon">
              {selected.type === "FACT" ? (
                <Info />
              ) : selected.type === "PATCH" ? (
                <Award />
              ) : (
                <Gift />
              )}
            </span>
            <h2>{selected.title}</h2>
            {selected.fact ? (
              <>
                <p>{selected.fact.body}</p>
                <a href={selected.fact.sourceUrl} target="_blank" rel="noreferrer">
                  {words.source}: {selected.fact.sourceTitle}
                </a>
                {selected.fact.isBeta ? <small>{words.beta}</small> : null}
              </>
            ) : (
              <p>{words.lockedReward}</p>
            )}
            {selected.type === "FACT" ? (
              <Button onClick={completeFact} disabled={busy}>
                {selected.completed ? words.close : words.read}
              </Button>
            ) : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export function QuestsScreen() {
  const locale = useLocale();
  const words = copy(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () =>
    apiRequest(`/quests?locale=${locale}`)
      .then(setData)
      .catch((value) => setError(value.message));
  useEffect(() => {
    let active = true;
    apiRequest(`/quests?locale=${locale}`)
      .then((value) => active && setData(value))
      .catch((value) => active && setError(value.message));
    return () => {
      active = false;
    };
  }, [locale]);
  async function claim(id) {
    await apiRequest(`/quests/${id}/claim`, { method: "POST" });
    await load();
  }
  if (error) return <EmptyState title={words.quests} text={error} />;
  return (
    <div className="game-page">
      <header className="game-page-heading">
        <span>
          <Target />
        </span>
        <div>
          <h1>{words.quests}</h1>
          <p>{words.questsLead}</p>
        </div>
        <Image src="/brand/morkva-anchor.png" alt="" width={130} height={130} />
      </header>
      {["DAILY", "WEEKLY", "MONTHLY"].map((period) => (
        <section className="quest-section" key={period}>
          <h2>{words[period.toLowerCase()]}</h2>
          <div className="quest-grid">
            {data?.quests
              .filter((quest) => quest.period === period)
              .map((quest) => {
                const percent = Math.min(100, Math.round((quest.current / quest.threshold) * 100));
                return (
                  <Card
                    className={clsx("quest-card", quest.claimed && "is-claimed")}
                    key={quest.id}
                  >
                    <span className="quest-icon">
                      <Target />
                    </span>
                    <div>
                      <h3>{quest.title}</h3>
                      <p>{quest.description}</p>
                      <ProgressBar value={percent} label={quest.title} />
                      <small>
                        {quest.current} / {quest.threshold} · <Gem /> {quest.reward.coins}
                      </small>
                    </div>
                    {quest.claimable ? (
                      <Button size="small" onClick={() => claim(quest.id)}>
                        {words.claim}
                      </Button>
                    ) : quest.claimed ? (
                      <span className="claimed-label">
                        <Check /> {words.claimed}
                      </span>
                    ) : null}
                  </Card>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function LeagueScreen() {
  const locale = useLocale();
  const words = copy(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    apiRequest("/leagues/current")
      .then(setData)
      .catch((value) => setError(value.message));
  }, []);
  if (error) return <EmptyState title={words.league} text={error} />;
  return (
    <div className="game-page">
      <header className="league-hero">
        <span className={`league-gem league-${data?.division?.toLowerCase() || "bronze"}`}>
          <Gem />
        </span>
        <div>
          <small>{words.league}</small>
          <h1>{data?.division || "BRONZE"}</h1>
          <p>{words.leagueLead}</p>
        </div>
      </header>
      {data && !data.optedIn ? (
        <Card className="league-opt-in">
          <ShieldCheck />
          <p>{words.optIn}</p>
          <ButtonLink href="/settings">{locale === "uk" ? "Налаштування" : "Settings"}</ButtonLink>
        </Card>
      ) : null}
      <Card className="league-board">
        {data?.entries?.map((entry) => (
          <div
            className={clsx("league-row", entry.isCurrentUser && "is-current")}
            key={`${entry.rank}-${entry.nickname}`}
          >
            <span className="league-rank">{entry.rank <= 3 ? <Medal /> : entry.rank}</span>
            <span className="league-avatar">{entry.nickname.slice(0, 1).toUpperCase()}</span>
            <strong>{entry.nickname}</strong>
            <span>{entry.xp} XP</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function PatchBoard() {
  const locale = useLocale();
  const words = copy(locale);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  useEffect(() => {
    apiRequest(`/patches?locale=${locale}`)
      .then((value) => {
        setData(value);
        setSelected(value.featuredPatchIds);
      })
      .catch(() => {});
  }, [locale]);
  const earned = useMemo(() => data?.patches.filter((patch) => patch.earned) ?? [], [data]);
  function toggle(id) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  }
  async function save() {
    await apiRequest("/profile/featured-patches", {
      method: "PATCH",
      body: JSON.stringify({ patchIds: selected }),
    });
  }
  return (
    <section className="patch-board-section">
      <div className="section-heading">
        <div>
          <h2>{words.patches}</h2>
          <p>{words.patchesLead}</p>
        </div>
        <Button onClick={save} size="small" disabled={!data}>
          {words.saveFeatured}
        </Button>
      </div>
      <div className="patch-board">
        {data?.patches.map((patch) => {
          const Icon = patchIcons[patch.category] || Award;
          return (
            <button
              key={patch.id}
              disabled={!patch.earned}
              onClick={() => toggle(patch.id)}
              className={clsx(
                "patch-tile",
                `rarity-${patch.rarity.toLowerCase()}`,
                patch.earned && "is-earned",
                selected.includes(patch.id) && "is-featured",
              )}
            >
              <span className="patch-art">
                <Icon />
              </span>
              <strong>{patch.title}</strong>
              <small>{patch.earned ? words.earned : patch.rarity}</small>
              {selected.includes(patch.id) ? <Star className="featured-star" /> : null}
            </button>
          );
        })}
      </div>
      {earned.length === 0 ? (
        <p className="muted-copy">
          {locale === "uk"
            ? "Перший патч з’явиться після завершення уроку."
            : "Your first patch appears after completing a lesson."}
        </p>
      ) : null}
    </section>
  );
}
