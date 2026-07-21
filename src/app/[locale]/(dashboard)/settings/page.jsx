import { setRequestLocale } from "next-intl/server";
import { SettingsScreen } from "@/components/screens/personal";

export default async function SettingsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SettingsScreen />;
}
