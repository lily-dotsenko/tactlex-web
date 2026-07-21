import { setRequestLocale } from "next-intl/server";
import { LiveProfileScreen } from "@/components/screens/live-overviews";

export default async function ProfilePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LiveProfileScreen />;
}
