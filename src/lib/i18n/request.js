import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import enMessages from "../../../messages/en.json";
import ukMessages from "../../../messages/uk.json";
import { routing } from "./routing";

const messagesByLocale = { en: enMessages, uk: ukMessages };

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
