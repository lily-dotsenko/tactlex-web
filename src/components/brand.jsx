import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";

export function Brand({ compact = false }) {
  return (
    <Link href="/" className="brand" aria-label="TactLex — home">
      <span className="brand-mark" aria-hidden="true">
        <Image src="/brand/morkva-mark.png" alt="" width={54} height={54} priority />
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
