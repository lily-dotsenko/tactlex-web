import { setRequestLocale } from "next-intl/server";
import { AdminTermScreen } from "@/components/screens/admin";
export default async function Page({ params }) {
  const { locale, termId } = await params;
  setRequestLocale(locale);
  return <AdminTermScreen itemId={termId} />;
}
