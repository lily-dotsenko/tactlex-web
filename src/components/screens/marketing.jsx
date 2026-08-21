import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Crosshair,
  HeartPulse,
  Layers3,
  RadioTower,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/shells";
import { Badge, ButtonLink, Card, ProgressBar } from "@/components/ui";
import { PronunciationButton } from "@/features/audio/pronunciation-button";
import { Mascot } from "@/components/mascot";

export async function LandingScreen() {
  const t = await getTranslations("Landing");
  const common = await getTranslations("Common");
  const learn = await getTranslations("Learn");
  const categories = [
    { key: "general", target: 60, icon: Layers3, tone: "blue" },
    { key: "medicine", target: 50, icon: HeartPulse, tone: "olive" },
    { key: "uas", target: 50, icon: RadioTower, tone: "yellow" },
    { key: "sniper", target: 40, icon: Crosshair, tone: "graphite" },
  ];

  return (
    <div className="marketing-page">
      <PublicHeader />
      <main id="main-content">
        <section className="hero-section">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">{t("eyebrow")}</p>
              <h1>{t("title")}</h1>
              <p className="hero-lead">{t("lead")}</p>
              <div className="hero-actions">
                <ButtonLink href="/register" size="large" arrow>
                  {t("primaryCta")}
                </ButtonLink>
                <a className="text-link" href="#method">
                  {t("secondaryCta")} <ArrowRight size={17} aria-hidden="true" />
                </a>
              </div>
              <p className="trust-line">
                <CheckCircle2 size={18} aria-hidden="true" /> {t("trust")}
              </p>
            </div>

            <div className="hero-demo-wrap">
              <div className="geometry-grid" aria-hidden="true" />
              <Mascot pose="point" motion="nod" size={180} priority className="landing-mascot" />
              <Card className="hero-demo">
                <div className="demo-topline">
                  <Badge tone="blue">EN → UA</Badge>
                  <span>02 / 08</span>
                </div>
                <ProgressBar value={25} label="Lesson progress" />
                <div className="demo-prompt">
                  <span>{common("draft")}</span>
                  <h2 lang="en">rally point</h2>
                  <PronunciationButton term="rally point" compact />
                </div>
                <div className="demo-options" aria-hidden="true">
                  <span>пункт збору</span>
                  <span>маршрут</span>
                  <span>лінія зв’язку</span>
                </div>
                <div className="demo-footer">
                  <Sparkles size={18} aria-hidden="true" />
                  <span>{common("demo")}</span>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="program-section" id="program">
          <div className="section-intro">
            <p className="eyebrow">{t("program")}</p>
            <h2>{t("programTitle")}</h2>
            <p>{t("programLead")}</p>
          </div>
          <div className="program-grid">
            {categories.map(({ key, target, icon: Icon, tone }, index) => (
              <Card className={`program-card program-${tone}`} key={key}>
                <div className="program-card-top">
                  <span className="program-icon">
                    <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="program-number">0{index + 1}</span>
                </div>
                <h3>{learn(key)}</h3>
                <p>{learn(`${key}Text`)}</p>
                <span className="program-plan">{learn("plannedCount", { count: target })}</span>
              </Card>
            ))}
          </div>
        </section>

        <section className="method-section" id="method">
          <div className="section-intro section-intro-light">
            <p className="eyebrow">{t("how")}</p>
            <h2>{t("howTitle")}</h2>
          </div>
          <ol className="method-list">
            {[
              ["01", t("step1"), t("step1Text"), BookOpenCheck],
              ["02", t("step2"), t("step2Text"), Sparkles],
              ["03", t("step3"), t("step3Text"), ShieldCheck],
            ].map(([number, title, text, Icon]) => (
              <li key={number}>
                <span className="method-number">{number}</span>
                <span className="method-icon">
                  <Icon size={23} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="safety-section">
          <Card className="safety-card">
            <span className="safety-icon">
              <ShieldCheck size={28} aria-hidden="true" />
            </span>
            <div>
              <h2>{t("safetyTitle")}</h2>
              <p>{t("safetyText")}</p>
            </div>
          </Card>
        </section>

        <section className="marketing-cta">
          <div>
            <p className="eyebrow">{common("slogan")}</p>
            <h2>{t("ctaTitle")}</h2>
            <p>{t("ctaText")}</p>
          </div>
          <ButtonLink href="/register" variant="yellow" size="large" arrow>
            {t("primaryCta")}
          </ButtonLink>
        </section>
      </main>
      <footer className="public-footer">
        <div>
          <strong>{common("brand")}</strong>
          <span>{t("footer")}</span>
        </div>
        <span>© 2026 TactLex</span>
      </footer>
    </div>
  );
}
