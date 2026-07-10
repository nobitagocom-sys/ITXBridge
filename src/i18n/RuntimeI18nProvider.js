"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initRuntimeI18n, reloadTranslations, getCurrentLocale, onLocaleChange } from "./runtime";

export function RuntimeI18nProvider({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    initRuntimeI18n();
  }, []);

  useEffect(() => {
    const updateHtmlLang = () => {
      const locale = getCurrentLocale();
      document.documentElement.lang = locale;
    };

    updateHtmlLang();
    return onLocaleChange(updateHtmlLang);
  }, []);

  // Re-process DOM when route changes
  useEffect(() => {
    if (pathname) {
      // Double RAF to ensure React has committed changes to DOM
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reloadTranslations();
        });
      });
    }
  }, [pathname]);

  return <>{children}</>;
}
