import { setRequestLocale } from "next-intl/server";
import { AdminListScreen } from "@/components/screens/admin";
export default async function Page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminListScreen section="audit" />;
}
