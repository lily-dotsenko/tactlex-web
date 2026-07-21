import clsx from "clsx";
import { ArrowRight, Check, ChevronRight, LockKeyhole } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";

export function Button({
  children,
  variant = "primary",
  size = "default",
  className,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={clsx("button", `button-${variant}`, `button-${size}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "default",
  className,
  arrow = false,
  ...props
}) {
  return (
    <Link
      href={href}
      className={clsx("button", `button-${variant}`, `button-${size}`, className)}
      {...props}
    >
      {children}
      {arrow && <ArrowRight size={18} aria-hidden="true" />}
    </Link>
  );
}

export function IconButton({ label, children, className, ...props }) {
  return (
    <button className={clsx("icon-button", className)} aria-label={label} {...props}>
      {children}
    </button>
  );
}

export function Card({ as: Component = "div", className, children, ...props }) {
  return (
    <Component className={clsx("card", className)} {...props}>
      {children}
    </Component>
  );
}

export function Badge({ children, tone = "neutral", className }) {
  return <span className={clsx("badge", `badge-${tone}`, className)}>{children}</span>;
}

export function PageHeader({ eyebrow, title, lead, actions, compact = false }) {
  return (
    <header className={clsx("page-header", compact && "page-header-compact")}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function ProgressBar({ value, label, compact = false }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx("progress-wrap", compact && "progress-compact")}>
      {label && <span className="sr-only">{label}</span>}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={safeValue}
        aria-label={label}
      >
        <span className="progress-value" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function Stat({ icon, label, value, note, tone = "blue" }) {
  return (
    <Card className={clsx("stat-card", `stat-${tone}`)}>
      <span className="stat-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </Card>
  );
}

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={clsx("field", className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export function SectionHeading({ eyebrow, title, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function ListLink({ href, title, meta, badge, icon, locked = false }) {
  const content = (
    <>
      <span className="list-link-icon" aria-hidden="true">
        {locked ? <LockKeyhole size={20} /> : icon}
      </span>
      <span className="list-link-copy">
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      {badge}
      {!locked && <ChevronRight size={20} aria-hidden="true" />}
    </>
  );

  return locked ? (
    <div className="list-link is-locked">{content}</div>
  ) : (
    <Link href={href} className="list-link">
      {content}
    </Link>
  );
}

export function CheckItem({ children, complete = true }) {
  return (
    <li className={clsx("check-item", !complete && "is-incomplete")}>
      <span aria-hidden="true">{complete ? <Check size={17} /> : "!"}</span>
      {children}
    </li>
  );
}

export function EmptyState({ icon, title, text, action }) {
  return (
    <Card className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        {icon}
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </Card>
  );
}
