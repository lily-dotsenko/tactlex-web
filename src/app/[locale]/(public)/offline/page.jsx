import { WifiOff } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Brand } from "@/components/brand";
import { ButtonLink, EmptyState } from "@/components/ui";

export default async function OfflinePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Offline");
  return (
    <main className="offline-page">
      <Brand />
      <EmptyState
        icon={<WifiOff size={32} />}
        title={t("title")}
        text={t("lead")}
        action={<ButtonLink href="/">{t("retry")}</ButtonLink>}
      />
    </main>
  );
}
