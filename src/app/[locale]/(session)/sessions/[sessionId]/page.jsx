import { setRequestLocale } from "next-intl/server";
import { SessionScreen } from "@/components/screens/learning-session";
import { requirePageUser } from "@/server/policies/page-auth";

export default async function SessionPage({ params }) {
  const { locale, sessionId } = await params;
  setRequestLocale(locale);
  await requirePageUser(locale);
  return <SessionScreen sessionId={sessionId} />;
}
