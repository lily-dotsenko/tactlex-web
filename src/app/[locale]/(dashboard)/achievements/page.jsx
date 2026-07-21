import { setRequestLocale } from "next-intl/server";
import { LiveAchievementsScreen } from "@/components/screens/live-overviews";

export default async function AchievementsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LiveAchievementsScreen />;
}
