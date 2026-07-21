import { setRequestLocale } from "next-intl/server";
import { CategoryLiveScreen } from "@/components/screens/catalog-live";

export default async function CategoryPage({ params }) {
  const { locale, categorySlug } = await params;
  setRequestLocale(locale);
  return <CategoryLiveScreen categorySlug={categorySlug} />;
}
