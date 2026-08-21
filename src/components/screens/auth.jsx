"use client";

import { useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Brand } from "@/components/brand";
import { Mascot } from "@/components/mascot";
import { Button, ButtonLink, Card, Field } from "@/components/ui";
import { Link, useRouter } from "@/lib/i18n/navigation";

export function AuthScreen({ mode = "login" }) {
  const t = useTranslations("Auth");
  const common = useTranslations("Common");
  const router = useRouter();
  const locale = useLocale();
  const isRegister = mode === "register";
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function errorMessage(code) {
    const messageKeys = {
      ACCOUNT_ALREADY_EXISTS: "accountExists",
      INVALID_CREDENTIALS: "invalidCredentials",
      ACCOUNT_UNAVAILABLE: "accountUnavailable",
      VALIDATION_ERROR: "validationError",
      RATE_LIMITED: "rateLimited",
      INTERNAL_ERROR: "serverError",
    };
    return t(messageKeys[code] ?? "error");
  }

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (isRegister) data.locale = locale;
    try {
      const response = await fetch(`/api/v1/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(errorMessage(payload?.error?.code));
        return;
      }
      router.push(isRegister ? "/onboarding" : "/dashboard", { locale });
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Brand />
        <Link href="/" className="text-link">
          <ArrowLeft size={17} /> {common("back")}
        </Link>
      </div>
      <div className="auth-layout">
        <section className="auth-message">
          <span className="auth-symbol" aria-hidden="true">
            <LockKeyhole size={30} />
          </span>
          <p className="eyebrow">{common("slogan")}</p>
          <h1>{isRegister ? t("registerTitle") : t("loginTitle")}</h1>
          <p>{isRegister ? t("registerLead") : t("loginLead")}</p>
          <ul className="auth-benefits">
            <li>
              <Check size={18} /> {t("privacy")}
            </li>
            <li>
              <Check size={18} /> {t("bilingual")}
            </li>
          </ul>
        </section>
        <Card className="auth-card">
          <form onSubmit={submit} className="form-stack">
            {error && (
              <div className="form-alert" role="alert">
                {error}
              </div>
            )}
            {isRegister && (
              <Field label={t("nickname")}>
                <span className="input-with-icon">
                  <UserRound size={18} />
                  <input name="nickname" autoComplete="nickname" required minLength={2} />
                </span>
              </Field>
            )}
            <Field label={t("email")}>
              <span className="input-with-icon">
                <Mail size={18} />
                <input name="email" type="email" autoComplete="email" required />
              </span>
            </Field>
            <div className="field">
              <label className="field-label" htmlFor="auth-password">
                {t("password")}
              </label>
              <span className="input-with-icon password-input">
                <LockKeyhole size={18} />
                <input
                  id="auth-password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  minLength={12}
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={t(visible ? "hidePassword" : "showPassword")}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </div>
            {!isRegister && (
              <Link href="/forgot-password" className="form-side-link">
                {t("forgot")}
              </Link>
            )}
            <Button type="submit" size="large" disabled={pending}>
              {pending ? "…" : t(isRegister ? "registerAction" : "loginAction")}
            </Button>
          </form>
          <p className="auth-switch">
            {t(isRegister ? "haveAccount" : "newHere")}{" "}
            <Link href={isRegister ? "/login" : "/register"}>
              {t(isRegister ? "loginAction" : "registerAction")}
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

export function OnboardingScreen() {
  const t = useTranslations("Onboarding");
  const common = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const selectedLocale = String(formData.get("locale") || locale);
    const direction = String(formData.get("direction") || "EN_TO_UA");
    window.localStorage.setItem("tactlex-learning-direction", direction);
    const data = {
      locale: selectedLocale,
      audienceType: String(formData.get("audienceType") || "prefer_not_to_say"),
      leaderboardVisible: formData.has("leaderboardVisible"),
      dailyGoalXp: Number(formData.get("dailyGoalXp") || 20),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    try {
      const response = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("profile_failed");
      router.push("/dashboard", { locale });
    } catch {
      setError("Could not save preferences. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="onboarding-page">
      <Brand />
      <div className="onboarding-layout">
        <header className="onboarding-header">
          <Mascot pose="coach" motion="peek" size={118} priority />
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("lead")}</p>
        </header>
        <Card className="onboarding-card">
          <form onSubmit={submit} className="form-stack form-stack-wide">
            {error && (
              <div className="form-alert" role="alert">
                {error}
              </div>
            )}
            <fieldset className="choice-fieldset">
              <legend>{t("interface")}</legend>
              <div className="segmented-options">
                <label>
                  <input type="radio" name="locale" value="uk" defaultChecked={locale === "uk"} />
                  <span>Українська</span>
                </label>
                <label>
                  <input type="radio" name="locale" value="en" defaultChecked={locale === "en"} />
                  <span>English</span>
                </label>
              </div>
            </fieldset>
            <fieldset className="choice-fieldset">
              <legend>{t("direction")}</legend>
              <div className="option-cards option-cards-two">
                <label>
                  <input type="radio" name="direction" value="EN_TO_UA" defaultChecked />
                  <span>
                    <strong>EN → UA</strong>
                    <small>{t("enUa")}</small>
                  </span>
                </label>
                <label>
                  <input type="radio" name="direction" value="UA_TO_EN" />
                  <span>
                    <strong>UA → EN</strong>
                    <small>{t("uaEn")}</small>
                  </span>
                </label>
              </div>
            </fieldset>
            <fieldset className="choice-fieldset">
              <legend>{t("goal")}</legend>
              <div className="option-cards option-cards-three">
                {[20, 50, 100].map((goal) => (
                  <label key={goal}>
                    <input
                      type="radio"
                      name="dailyGoalXp"
                      value={goal}
                      defaultChecked={goal === 20}
                    />
                    <span>{locale === "uk" ? `${goal} XP на день` : `${goal} XP per day`}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label={t("audience")}>
              <select name="audienceType" defaultValue="prefer_not_to_say">
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="military">Military</option>
                <option value="civilian">Civilian</option>
                <option value="cadet">Cadet</option>
                <option value="volunteer">Volunteer</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <label className="check-control">
              <input type="checkbox" name="leaderboardVisible" value="true" />
              <span>{t("leaderboard")}</span>
            </label>
            <Button type="submit" size="large" disabled={pending}>
              {pending ? "…" : t("finish")}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

export function PasswordHelpScreen() {
  const locale = useLocale();
  const unavailable =
    locale === "uk"
      ? {
          title: "Відновлення пароля ще не підключено",
          text: "Ми не надсилатимемо удаваний лист. Поки поштовий сервіс не налаштовано, зверніться до адміністратора або поверніться до входу.",
          action: "Повернутися до входу",
        }
      : {
          title: "Password recovery is not enabled yet",
          text: "We will not pretend that an email was sent. Until email delivery is configured, contact an administrator or return to sign in.",
          action: "Back to sign in",
        };
  return (
    <main className="auth-page auth-page-simple">
      <Brand />
      <Card className="auth-card">
        <p className="eyebrow">TactLex</p>
        <h1>{unavailable.title}</h1>
        <p className="page-lead">{unavailable.text}</p>
        <ButtonLink href="/login">{unavailable.action}</ButtonLink>
      </Card>
    </main>
  );
}
