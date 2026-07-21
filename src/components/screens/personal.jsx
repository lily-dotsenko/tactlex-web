import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

// Compatibility exports retain the original component names while routing
// every authenticated overview through its server-backed implementation.
export {
  LiveAchievementsScreen as AchievementsScreen,
  LiveLeaderboardScreen as LeaderboardScreen,
  LiveProfileScreen as ProfileScreen,
  LiveProgressScreen as ProgressScreen,
} from "@/components/screens/live-overviews";

export async function SettingsScreen() {
  const t = await getTranslations("Settings");
  return (
    <div className="page-stack">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <SettingsForm />
    </div>
  );
}
