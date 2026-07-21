import { setRequestLocale } from "next-intl/server";
import { TermScreen } from "@/components/screens/glossary";

export default async function TermPage({ params }) {
  const { locale, termId } = await params;
  setRequestLocale(locale);
  return <TermScreen termId={termId} />;
}
