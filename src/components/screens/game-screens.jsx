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

import { CustomAvatar } from "@/components/custom-avatar";
import { apiRequest, createIdempotencyKey } from "@/components/learning-api";
import { Mascot } from "@/components/mascot";
import { Button, ButtonLink, Card, EmptyState, ProgressBar } from "@/components/ui";
import { avatarByKey } from "@/lib/avatars/catalog";
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
        rewards: "Арсенал бонусів",
        rewardsLead: "Обмінюйте зароблені жетони на бонуси й косметичні рамки.",
        buy: "Придбати",
        activate: "Активувати",
        owned: "У колекції",
        inventory: "В інвентарі",
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
        rewards: "Bonus inventory",
        rewardsLead: "Exchange earned coins for boosts and cosmetic profile frames.",
        buy: "Buy",
        activate: "Activate",
        owned: "Owned",
        inventory: "In inventory",
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
  const [categories, setCategories] = useState([]);
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
    Promise.all([
      apiRequest(`/categories/${encodeURIComponent(categorySlug)}/path?locale=${locale}`),
      apiRequest(`/learning-overview?locale=${locale}`),
    ])
      .then(([path, overview]) => {
        if (!active) return;
        setCategories(overview.categories ?? []);
        setState({ loading: false, path, error: "" });
      })
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
    if (node.activeSessionId) {
      router.push(`/sessions/${node.activeSessionId}`);
      return;
    }
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
  if (state.error)
    return (
      <EmptyState
        icon={<Mascot pose="encourage" motion="tilt" size={104} />}
        title={words.path}
        text={state.error}
      />
    );
  const path = state.path;
  return (
    <div className="learning-path-page">
      <header className="path-hero-card">
        <div>
          <span>{words.path}</span>
          <h1>{path.category.name}</h1>
          <p>{words.pathLead}</p>
        </div>
        <Mascot pose="point" motion="nod" size={112} priority />
        <div className="path-progress">
          <ProgressBar
            value={Math.round((path.completedNodes / Math.max(path.totalNodes, 1)) * 100)}
            label={words.path}
          />
        </div>
      </header>
      <nav
        className="path-category-switcher"
        aria-label={locale === "uk" ? "Категорії навчання" : "Learning categories"}
      >
        {categories.map((category) => (
          <ButtonLink
            href={`/categories/${category.slug}`}
            variant={category.slug === categorySlug ? "primary" : "ghost"}
            size="small"
            className={category.slug === categorySlug ? "is-current" : undefined}
            aria-current={category.slug === categorySlug ? "page" : undefined}
            key={category.id}
          >
            {category.name}
          </ButtonLink>
        ))}
      </nav>
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
                <Mascot
                  pose="guard"
                  motion="breathe"
                  size={150}
                  decorative={false}
                  alt="Морква"
                  className="checkpoint-morkva"
                />
              ) : null}
              <div
                className={clsx("path-node-ring", node.activeSessionId && "is-active")}
                style={{ "--node-progress": `${node.progressPercent ?? 0}%` }}
              >
                <button
                  className="path-node"
                  onClick={() => act(node)}
                  disabled={busy}
                  aria-label={`${node.title}. ${node.state}`}
                >
                  <Icon aria-hidden="true" />
                  {node.completed ? <Check className="node-check" aria-hidden="true" /> : null}
                </button>
              </div>
              <div className="path-node-copy">
                {node.recommended ? (
                  <span className="recommended-label">{words.recommended}</span>
                ) : null}
                {node.activeSessionId ? (
                  <small>
                    {locale === "uk" ? "Продовжити" : "Continue"} · {node.progressPercent}%
                  </small>
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
  if (error)
    return (
      <EmptyState
        icon={<Mascot pose="encourage" motion="tilt" size={104} />}
        title={words.quests}
        text={error}
      />
    );
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
        <Mascot pose="coach" motion="breathe" size={130} />
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
      <RewardsPanel />
    </div>
  );
}

function RewardsPanel() {
  const locale = useLocale();
  const words = copy(locale);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setData(await apiRequest(`/rewards?locale=${locale}`));
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    let active = true;
    apiRequest(`/rewards?locale=${locale}`)
      .then((value) => active && setData(value))
      .catch((error) => active && setMessage(error.message));
    return () => {
      active = false;
    };
  }, [locale]);

  async function purchase(productCode) {
    setBusy(productCode);
    setMessage("");
    try {
      await apiRequest("/rewards/purchase", {
        method: "POST",
        headers: { "Idempotency-Key": createIdempotencyKey() },
        body: JSON.stringify({ productCode }),
      });
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  async function activate(bonusId) {
    setBusy(bonusId);
    setMessage("");
    try {
      await apiRequest(`/bonuses/${encodeURIComponent(bonusId)}/activate`, { method: "POST" });
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  const doubleXp = data?.bonuses.find((bonus) => bonus.type === "DOUBLE_XP_15M");
  return (
    <section className="rewards-section">
      <div className="section-heading">
        <div>
          <h2>{words.rewards}</h2>
          <p>{words.rewardsLead}</p>
        </div>
        <strong className="wallet-balance">
          <Gem aria-hidden="true" /> {data?.coins ?? 0}
        </strong>
      </div>
      {message ? (
        <p className="inline-notice" role="status">
          {message}
        </p>
      ) : null}
      <div className="reward-shop-grid">
        {data?.products.map((product) => {
          const isCosmetic = product.type !== "BONUS";
          const owned = Number(product.owned ?? 0);
          const activatable = product.code === "double-xp-15m" && owned > 0;
          return (
            <Card className="reward-shop-card" key={product.code}>
              <span className="reward-shop-icon">
                {isCosmetic ? (
                  <Sparkles />
                ) : product.code === "streak-freeze" ? (
                  <ShieldCheck />
                ) : (
                  <Zap />
                )}
              </span>
              <div>
                <h3>{product.title}</h3>
                {product.description ? <p>{product.description}</p> : null}
                <small>
                  {owned > 0
                    ? `${isCosmetic ? words.owned : words.inventory}: ${owned}`
                    : `${product.priceCoins} ${locale === "uk" ? "жетонів" : "coins"}`}
                </small>
              </div>
              {activatable ? (
                <Button
                  size="small"
                  onClick={() => activate(doubleXp.id)}
                  disabled={Boolean(busy) || Boolean(doubleXp.activeUntil)}
                >
                  {doubleXp.activeUntil ? "×2 active" : words.activate}
                </Button>
              ) : isCosmetic && owned ? (
                <span className="claimed-label">
                  <Check /> {words.owned}
                </span>
              ) : (
                <Button
                  size="small"
                  onClick={() => purchase(product.code)}
                  disabled={Boolean(busy)}
                >
                  {words.buy} · {product.priceCoins}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </section>
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
            className={clsx(
              "league-row",
              entry.isCurrentUser && "is-current",
              entry.zone && `zone-${entry.zone.toLowerCase()}`,
            )}
            key={`${entry.rank}-${entry.nickname}`}
          >
            <span className="league-rank">{entry.rank <= 3 ? <Medal /> : entry.rank}</span>
            <span className="league-avatar">
              {entry.avatarConfig ? (
                <CustomAvatar config={entry.avatarConfig} size={42} />
              ) : entry.avatarKey ? (
                <Image src={avatarByKey(entry.avatarKey).src} alt="" width={42} height={42} />
              ) : (
                entry.nickname.slice(0, 1).toUpperCase()
              )}
            </span>
            <strong>
              {entry.nickname}
              {entry.featuredPatch ? (
                <small className="league-featured-patch">
                  <Award />
                  {locale === "uk" ? entry.featuredPatch.titleUk : entry.featuredPatch.titleEn}
                </small>
              ) : null}
            </strong>
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
