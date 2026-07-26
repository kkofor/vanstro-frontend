"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { localeFromPathname } from "@/lib/i18n/locale";

export function LocaleBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
