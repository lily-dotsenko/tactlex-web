import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LocaleDocument, PwaProvider } from "@/components/providers";
import { LiveUiStyles } from "@/components/live-ui-styles";
import { routing } from "@/lib/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <LiveUiStyles />
      <LocaleDocument locale={locale} />
      <div lang={locale}>
        <PwaProvider>{children}</PwaProvider>
      </div>
    </NextIntlClientProvider>
  );
}
