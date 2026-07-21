import { setRequestLocale } from "next-intl/server";
import { GlossaryScreen } from "@/components/screens/glossary";

export default async function GlossaryPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GlossaryScreen />;
}
