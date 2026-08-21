"use client";

import { useEffect, useState } from "react";
import { Check, Globe2, Moon, ShieldCheck, Sparkles, Sun, Target, Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button, Card, Field } from "@/components/ui";
import { apiRequest } from "@/components/learning-api";
import { useRouter } from "@/lib/i18n/navigation";
import { effectPreferences, playEffect, setEffectPreference } from "@/components/effects";

export function SettingsForm() {
  const t = useTranslations("Settings");
  const common = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [dailyGoalXp, setDailyGoalXp] = useState(20);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [motionEffects, setMotionEffects] = useState(true);

  useEffect(() => {
    const effects = effectPreferences();
    const effectsTimer = window.setTimeout(() => {
      setSoundEffects(effects.sound);
      setMotionEffects(effects.motion);
    }, 0);
    let active = true;
    apiRequest("/profile")
      .then((data) => {
        if (!active) return;
        setDailyGoalXp(Number(data?.user?.profile?.dailyGoalXp || 20));
        setLeaderboardVisible(data?.user?.profile?.leaderboardVisible === true);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
      window.clearTimeout(effectsTimer);
    };
  }, []);

  async function save(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    setSaved(false);
    window.localStorage.setItem("tactlex-theme", data.theme);
    window.localStorage.setItem(
      "tactlex-learning-direction",
      data.direction === "UA_TO_EN" ? "UA_TO_EN" : "EN_TO_UA",
    );
    setEffectPreference("sound", soundEffects);
    setEffectPreference("motion", motionEffects);
    if (data.theme !== "system") {
      document.documentElement.dataset.theme = data.theme;
      document.documentElement.style.colorScheme = data.theme;
    }
    try {
      await apiRequest("/profile", {
        method: "PATCH",
        body: JSON.stringify({
          locale: data.locale,
          dailyGoalXp: Number(data.dailyGoalXp || 20),
          leaderboardVisible: form.has("leaderboardVisible"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (data.locale && data.locale !== locale)
        router.replace("/settings", { locale: data.locale });
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="settings-layout">
      <Card className="settings-card">
        <div className="settings-section-title">
          <Sun size={22} />
          <div>
            <h2>{t("appearance")}</h2>
            <p>{t("theme")}</p>
          </div>
        </div>
        <div className="option-cards option-cards-three compact-options">
          {[
            ["system", t("themeSystem"), Globe2],
            ["light", t("themeLight"), Sun],
            ["dark", t("themeDark"), Moon],
          ].map(([value, label, Icon]) => (
            <label key={value}>
              <input type="radio" name="theme" value={value} defaultChecked={value === "system"} />
              <span>
                <Icon size={18} />
                {label}
              </span>
            </label>
          ))}
        </div>
        <Field label={t("language")}>
          <select name="locale" defaultValue={locale}>
            <option value="uk">Українська</option>
            <option value="en">English</option>
          </select>
        </Field>
      </Card>
      <Card className="settings-card">
        <div className="settings-section-title">
          <Sparkles size={22} />
          <div>
            <h2>{locale === "uk" ? "Ефекти" : "Effects"}</h2>
            <p>
              {locale === "uk"
                ? "Звуки, анімації Морковочки та святкування"
                : "Sounds, Morkva animations and celebrations"}
            </p>
          </div>
        </div>
        <label className="check-control">
          <input
            type="checkbox"
            checked={soundEffects}
            onChange={(event) => {
              const enabled = event.target.checked;
              setSoundEffects(enabled);
              setEffectPreference("sound", enabled);
              if (enabled) playEffect("correct");
            }}
          />
          <Volume2 size={18} aria-hidden="true" />
          <span>{locale === "uk" ? "Звукові ефекти" : "Sound effects"}</span>
        </label>
        <label className="check-control">
          <input
            type="checkbox"
            checked={motionEffects}
            onChange={(event) => {
              setMotionEffects(event.target.checked);
              setEffectPreference("motion", event.target.checked);
            }}
          />
          <Sparkles size={18} aria-hidden="true" />
          <span>{locale === "uk" ? "Анімації й святкування" : "Animations and celebrations"}</span>
        </label>
      </Card>
      <Card className="settings-card">
        <div className="settings-section-title">
          <Target size={22} />
          <div>
            <h2>{t("learning")}</h2>
            <p>{t("direction")}</p>
          </div>
        </div>
        <Field label={t("direction")}>
          <select name="direction" defaultValue="EN_TO_UA">
            <option value="EN_TO_UA">English → українська</option>
            <option value="UA_TO_EN">Українська → English</option>
          </select>
        </Field>
        <Field label={t("dailyGoal")}>
          <select
            name="dailyGoalXp"
            value={dailyGoalXp}
            onChange={(event) => setDailyGoalXp(Number(event.target.value))}
          >
            {[20, 50, 100].map((goal) => (
              <option key={goal} value={goal}>
                {goal} XP
              </option>
            ))}
          </select>
        </Field>
      </Card>
      <Card className="settings-card">
        <div className="settings-section-title">
          <ShieldCheck size={22} />
          <div>
            <h2>{t("privacy")}</h2>
            <p>{t("leaderboard")}</p>
          </div>
        </div>
        <label className="check-control">
          <input
            type="checkbox"
            name="leaderboardVisible"
            checked={leaderboardVisible}
            onChange={(event) => setLeaderboardVisible(event.target.checked)}
          />
          <span>{t("leaderboard")}</span>
        </label>
      </Card>
      <div className="settings-actions">
        <Button type="submit" size="large" disabled={pending}>
          {pending ? "…" : common("save")}
        </Button>
        {saved && (
          <span className="saved-message" role="status">
            <Check size={18} />
            {locale === "uk"
              ? "Параметри профілю збережено на сервері"
              : "Profile preferences saved on the server"}
          </span>
        )}
        {error && (
          <span className="field-error" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
