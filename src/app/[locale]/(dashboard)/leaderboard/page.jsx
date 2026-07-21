import { setRequestLocale } from "next-intl/server";
import { LiveLeaderboardScreen } from "@/components/screens/live-overviews";

export default async function LeaderboardPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LiveLeaderboardScreen />;
}
