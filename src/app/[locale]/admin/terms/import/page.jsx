import { setRequestLocale } from "next-intl/server";
import { AdminImportScreen } from "@/components/screens/admin";
export default async function Page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminImportScreen />;
}
