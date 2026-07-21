import { setRequestLocale } from "next-intl/server";
import { AdminOverviewScreen } from "@/components/screens/admin";

export default async function AdminPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminOverviewScreen />;
}
