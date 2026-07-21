import { setRequestLocale } from "next-intl/server";
import { ReportScreen } from "@/components/screens/glossary";

export default async function ReportPage({ params }) {
  const { locale, termId } = await params;
  setRequestLocale(locale);
  return <ReportScreen termId={termId} />;
}
