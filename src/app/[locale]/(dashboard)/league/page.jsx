import { setRequestLocale } from "next-intl/server";
import { LeagueScreen } from "@/components/screens/game-screens";

export default async function LeaguePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LeagueScreen />;
}
