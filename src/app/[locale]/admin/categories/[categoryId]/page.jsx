import { setRequestLocale } from "next-intl/server";
import { AdminGenericDetailScreen } from "@/components/screens/admin";
export default async function Page({ params }) {
  const { locale, categoryId } = await params;
  setRequestLocale(locale);
  return <AdminGenericDetailScreen section="categories" itemId={categoryId} />;
}
