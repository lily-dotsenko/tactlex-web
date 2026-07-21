import { setRequestLocale } from "next-intl/server";
import { AuthScreen } from "@/components/screens/auth";

export default async function LoginPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthScreen mode="login" />;
}
