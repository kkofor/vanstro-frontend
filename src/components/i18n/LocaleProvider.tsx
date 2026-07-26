"use client";

import { createContext, useContext } from "react";
import type { SiteLocale } from "@/lib/i18n/locale";
import { getSiteCopy } from "@/lib/i18n/site-copy";

type LocaleContextValue = {
  locale: SiteLocale;
  copy: ReturnType<typeof getSiteCopy>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  locale
}: {
  children: React.ReactNode;
  locale: SiteLocale;
}) {
  return (
    <LocaleContext.Provider value={{ locale, copy: getSiteCopy(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider.");
  }

  return context;
}
