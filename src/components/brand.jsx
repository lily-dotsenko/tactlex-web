import { Link } from "@/lib/i18n/navigation";

export function Brand({ compact = false }) {
  return (
    <Link href="/" className="brand" aria-label="TactLex — home">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-mark-blue" />
        <span className="brand-mark-yellow" />
        <span className="brand-mark-olive" />
      </span>
      {!compact && (
        <span className="brand-name">
          <span>ТактЛекс</span>
          <small>TactLex</small>
        </span>
      )}
    </Link>
  );
}
