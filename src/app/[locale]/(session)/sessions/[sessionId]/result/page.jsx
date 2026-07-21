import { setRequestLocale } from "next-intl/server";
import { UserShell } from "@/components/shells";
import { ResultLiveScreen } from "@/components/screens/learning-session";
import { requirePageUser } from "@/server/policies/page-auth";

export default async function SessionResultPage({ params }) {
  const { locale, sessionId } = await params;
  setRequestLocale(locale);
  await requirePageUser(locale);
  return (
    <UserShell>
      <ResultLiveScreen sessionId={sessionId} />
    </UserShell>
  );
}
