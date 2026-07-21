import { setRequestLocale } from "next-intl/server";
import { LiveDashboardScreen } from "@/components/screens/live-overviews";

export default async function DashboardPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LiveDashboardScreen />;
}
