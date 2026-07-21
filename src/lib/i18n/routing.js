import { defineRouting } from "next-intl/routing";

export const locales = ["uk", "en"];
export const defaultLocale = "uk";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
