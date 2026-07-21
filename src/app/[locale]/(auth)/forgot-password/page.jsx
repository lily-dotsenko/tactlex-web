import { setRequestLocale } from "next-intl/server";
import { PasswordHelpScreen } from "@/components/screens/auth";

export default async function ForgotPasswordPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PasswordHelpScreen />;
}
