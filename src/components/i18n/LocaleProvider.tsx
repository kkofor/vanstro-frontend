"use client";

import { createContext, useContext } from "react";
import type { SiteLocale } from "@/lib/i18n/locale";
import { getSiteCopy } from "@/lib/i18n/site-copy";
import type { Dealer, StorefrontDealerSummary } from "@/lib/api/api-contract";
import type { CatalogCategoryOption } from "@/lib/product/catalog-config";

type LocaleContextValue = {
  locale: SiteLocale;
  copy: ReturnType<typeof getSiteCopy>;
  /**
   * Storefront categories from the Website API `/categories` endpoint. Empty
   * when the API is not configured (fixture/local builds); consumers fall
   * back to the static locale copy in that case.
   */
  categories: CatalogCategoryOption[];
  dealers: Dealer[];
  dealerSummaries: StorefrontDealerSummary[];
};

const LocaleContext = createContext<LocaleContextValue | null>(null);
export function LocaleProvider({
  children,
  locale,
  categories = [],
  dealers = [],
  dealerSummaries = []
}: {
  children: React.ReactNode;
  locale: SiteLocale;
  categories?: CatalogCategoryOption[];
  dealers?: Dealer[];
  dealerSummaries?: StorefrontDealerSummary[];
}) {
  return (
    <LocaleContext.Provider value={{ locale, copy: getSiteCopy(locale), categories, dealers, dealerSummaries }}>
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
