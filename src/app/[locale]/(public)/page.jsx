import { setRequestLocale } from "next-intl/server";
import { LandingScreen } from "@/components/screens/marketing";

export default async function LandingPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LandingScreen />;
}
