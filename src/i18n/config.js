export const LOCALES = ["en", "ja", "vi"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "locale";

export const LOCALE_NAMES = {
  "en": "English",
  "ja": "日本語",
  "vi": "Tiếng Việt"
};

export function normalizeLocale(locale) {
  if (locale === "en") {
    return "en";
  }
  if (locale === "ja") {
    return "ja";
  }
  if (locale === "vi") {
    return "vi";
  }
  return DEFAULT_LOCALE;
}

export function isSupportedLocale(locale) {
  return LOCALES.includes(locale);
}
