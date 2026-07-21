import { setRequestLocale } from "next-intl/server";
import { CatalogLearnScreen } from "@/components/screens/catalog-live";

export default async function LearnPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CatalogLearnScreen />;
}
