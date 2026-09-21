"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { localeFromPathname } from "@/lib/i18n/locale";
import { useRuntimeCatalog } from "@/lib/catalog/use-runtime-catalog";
import { fulfillableDealerLocations } from "@/lib/dealer/dealer-projection";
import type { StorefrontDealerSummary } from "@/lib/api/api-contract";
import type { CatalogCategoryOption } from "@/lib/product/catalog-config";

export function LocaleBoundary({
  children,
  categories = [],
  dealers = []
}: {
  children: React.ReactNode;
  categories?: CatalogCategoryOption[];
  dealers?: StorefrontDealerSummary[];
}) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const {
    categories: runtimeCategories,
    dealers: runtimeSummaries
  } = useRuntimeCatalog(categories, dealers);
  const runtimeDealers = fulfillableDealerLocations(runtimeSummaries);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <LocaleProvider
      locale={locale}
      categories={runtimeCategories}
      dealers={runtimeDealers}
      dealerSummaries={runtimeSummaries}
    >
      {children}
    </LocaleProvider>
  );
}
