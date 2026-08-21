"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Crosshair,
  FileText,
  Home,
  Languages,
  LayoutDashboard,
  Library,
  ListChecks,
  Menu,
  Moon,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import clsx from "clsx";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { Brand } from "./brand";
import { IconButton } from "./ui";
import { avatarByKey } from "@/lib/avatars/catalog";

export const primaryNav = [
  { href: "/dashboard", label: "home", icon: Home },
  { href: "/learn", label: "learn", icon: BookOpen },
  { href: "/quests", label: "quests", icon: Crosshair },
  { href: "/league", label: "league", icon: Trophy },
  { href: "/profile", label: "profile", icon: User },
];

export const secondaryNav = [
  { href: "/review", label: "review", icon: RotateCcw },
  { href: "/glossary", label: "glossary", icon: Library },
  { href: "/progress", label: "progress", icon: BarChart3 },
  { href: "/achievements", label: "achievements", icon: Award },
  { href: "/settings", label: "settings", icon: Settings },
];

export const adminNav = [
  { href: "/admin", label: "title", icon: LayoutDashboard, exact: true },
  { href: "/admin/terms", label: "terms", icon: FileText },
  { href: "/admin/reviews", label: "reviews", icon: ClipboardCheck },
  { href: "/admin/categories", label: "categories", icon: Library },
  { href: "/admin/lessons", label: "lessons", icon: ListChecks },
  { href: "/admin/users", label: "users", icon: Users },
  { href: "/admin/achievements", label: "achievements", icon: Award },
  { href: "/admin/reports", label: "reports", icon: ShieldCheck },
  { href: "/admin/audit", label: "audit", icon: BookOpen },
];

function ActiveLink({ item, namespace = "Nav", onClick }) {
  const pathname = usePathname();
  const t = useTranslations(namespace);
  const locale = useLocale();
  const localizedHref = `/${locale}${item.href}`;
  const active = item.exact
    ? pathname === localizedHref
    : pathname === localizedHref || pathname.startsWith(`${localizedHref}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={clsx("nav-link", active && "is-active")}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
      <span>{t(item.label)}</span>
    </Link>
  );
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale = locale === "uk" ? "en" : "uk";
  const barePath = pathname.replace(/^\/(uk|en)/, "") || "/";

  return (
    <button
      className="utility-button"
      onClick={() => router.replace(barePath, { locale: nextLocale })}
      aria-label={locale === "uk" ? "Switch to English" : "Перемкнути українською"}
    >
      <Languages size={18} aria-hidden="true" />
      <span>{nextLocale.toUpperCase()}</span>
    </button>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState("system");

  function toggle() {
    const isDark = document.documentElement.dataset.theme === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    window.localStorage.setItem("tactlex-theme", next);
    setTheme(next);
  }

  const isDark = theme === "dark";
  return (
    <button
      className="utility-button utility-icon-only"
      onClick={toggle}
      aria-label={isDark ? "Use light theme" : "Use dark theme"}
    >
      {isDark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

export function UserSidebar({ user }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const nickname = user?.nickname || (locale === "uk" ? "Користувач" : "Learner");
  const avatar = avatarByKey(user?.avatarKey);
  const totalXp = Number.isFinite(user?.totalXp) ? user.totalXp : 0;
  return (
    <aside className="user-sidebar">
      <Brand />
      <nav className="side-navigation" aria-label="Primary">
        {primaryNav.map((item) => (
          <ActiveLink key={item.href} item={item} />
        ))}
      </nav>
      <nav className="side-navigation side-navigation-secondary" aria-label="Personal">
        {secondaryNav.map((item) => (
          <ActiveLink key={item.href} item={item} />
        ))}
        {user?.isAdmin ? (
          <Link href="/admin" className="nav-link admin-entry">
            <ShieldCheck size={21} aria-hidden="true" />
            <span>{t("admin")}</span>
          </Link>
        ) : null}
      </nav>
      <div className="sidebar-profile">
        <Image className="avatar avatar-image" src={avatar.src} alt="" width={38} height={38} />
        <span>
          <strong>{nickname}</strong>
          <small>{totalXp} XP</small>
        </span>
      </div>
    </aside>
  );
}

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {primaryNav.map((item) => (
        <ActiveLink key={item.href} item={item} />
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Common");
  const navT = useTranslations("Nav");

  return (
    <>
      <div className="admin-mobile-bar">
        <Brand />
        <IconButton label={open ? t("closeMenu") : t("openMenu")} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </IconButton>
      </div>
      {open && (
        <button
          className="drawer-scrim"
          aria-label={t("closeMenu")}
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={clsx("admin-sidebar", open && "is-open")}>
        <Brand />
        <div className="admin-mode">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{navT("admin")}</span>
        </div>
        <nav className="side-navigation" aria-label="Administration">
          {adminNav.map((item) => (
            <ActiveLink
              key={item.href}
              item={item}
              namespace="Admin"
              onClick={() => setOpen(false)}
            />
          ))}
        </nav>
        <Link href="/dashboard" className="nav-link admin-back">
          <Home size={20} aria-hidden="true" />
          <span>{navT("backToLearning")}</span>
        </Link>
      </aside>
    </>
  );
}
