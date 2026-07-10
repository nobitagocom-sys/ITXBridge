"use client";

import { useEffect, useState } from "react";
import { translate, getCurrentLocale, onLocaleChange } from "./runtime";

export function T({ children }) {
  const [locale, setLocale] = useState(getCurrentLocale());

  useEffect(() => {
    return onLocaleChange(() => setLocale(getCurrentLocale()));
  }, []);

  if (!children || typeof children !== "string") return children;
  return translate(children);
}
