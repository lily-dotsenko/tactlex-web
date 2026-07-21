import { setRequestLocale } from "next-intl/server";
import { LiveProgressScreen } from "@/components/screens/live-overviews";

export default async function ProgressPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LiveProgressScreen />;
}
