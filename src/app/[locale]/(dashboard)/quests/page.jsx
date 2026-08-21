import { setRequestLocale } from "next-intl/server";
import { QuestsScreen } from "@/components/screens/game-screens";

export default async function QuestsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <QuestsScreen />;
}
