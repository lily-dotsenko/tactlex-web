import { setRequestLocale } from "next-intl/server";
import { OnboardingScreen } from "@/components/screens/auth";

export default async function OnboardingPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OnboardingScreen />;
}
