"use client";

import { useEffect, useState } from "react";
import { translate, getCurrentLocale, onLocaleChange } from "./runtime";

export function useTranslation() {
  const [locale, setLocale] = useState(getCurrentLocale());

  useEffect(() => {
    return onLocaleChange(() => setLocale(getCurrentLocale()));
  }, []);

  return (text) => {
    return translate(text);
  };
}
