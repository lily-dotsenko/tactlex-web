import { getTranslations } from "next-intl/server";
import { Brand } from "./brand";
import { AdminSidebar, BottomNav, LocaleSwitcher, ThemeToggle, UserSidebar } from "./navigation";
import { ButtonLink } from "./ui";
import { GameResourceBar } from "./screens/game-screens";

export async function PublicHeader() {
  const t = await getTranslations("Nav");
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Brand />
        <nav className="public-nav" aria-label="Public">
          <a href="#program">{t("learn")}</a>
          <a href="#method">{t("review")}</a>
        </nav>
        <div className="public-actions">
          <LocaleSwitcher />
          <ThemeToggle />
          <ButtonLink href="/login" variant="ghost" className="desktop-auth-link">
            {t("login")}
          </ButtonLink>
          <ButtonLink href="/register" size="small">
            {t("register")}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

export async function UserShell({ children, user }) {
  const t = await getTranslations("Common");
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("skipToContent")}
      </a>
      <UserSidebar user={user} />
      <div className="app-stage">
        <header className="app-topbar">
          <Brand compact />
          <GameResourceBar />
          <div className="topbar-actions">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="app-content">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export async function AdminShell({ children }) {
  const t = await getTranslations("Common");
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-content">
        {t("skipToContent")}
      </a>
      <AdminSidebar />
      <main id="admin-content" className="admin-content">
        {children}
      </main>
    </div>
  );
}
