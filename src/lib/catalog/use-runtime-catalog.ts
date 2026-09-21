import { useCallback, useEffect, useRef, useState } from "react";
import { vanstroApi } from "@/lib/api/api-client";
import { toCatalogCategoryOptions, type CatalogCategoryOption } from "@/lib/product/catalog-config";
import type { StorefrontDealerSummary } from "@/lib/api/api-contract";

export type RuntimeCatalogStatus = "idle" | "refreshing" | "error";

export type RuntimeCatalogState = {
  categories: CatalogCategoryOption[];
  dealers: StorefrontDealerSummary[];
  status: RuntimeCatalogStatus;
};

/**
 * Runtime revalidation for mutable storefront master data (categories and
 * dealers). The build-time snapshot from `RootLayout` is the initial value
 * (SEO/first paint); this hook replaces it with the latest public API
 * projection after hydration and re-validates on focus/visibility.
 *
 * Stale-guard contract:
 * - a monotonic generation counter drops any response that resolves after a
 *   newer revalidation has started (no old response overwrites new state);
 * - a transient API failure keeps the last valid data and surfaces a
 *   non-blocking `error` status, never substituting an empty array for the
 *   last known facts.
 */
export function useRuntimeCatalog(
  initialCategories: CatalogCategoryOption[],
  initialDealers: StorefrontDealerSummary[]
): RuntimeCatalogState {
  const [categories, setCategories] = useState(initialCategories);
  const [dealers, setDealers] = useState(initialDealers);
  const [status, setStatus] = useState<RuntimeCatalogStatus>("idle");
  const generationRef = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current;
    setStatus("refreshing");
    try {
      const [categoryResult, dealerResult] = await Promise.all([
        vanstroApi.getCategories(),
        vanstroApi.getDealers()
      ]);
      if (generation !== generationRef.current) return; // stale response dropped
      setCategories(toCatalogCategoryOptions(categoryResult.data));
      setDealers(dealerResult.data);
      setStatus("idle");
    } catch {
      if (generation !== generationRef.current) return;
      setStatus("error");
    }
  }, []);

  // Hydration revalidation: replace the build-time snapshot after first mount.
  useEffect(() => {
    void refresh();
    return () => {
      generationRef.current += 1;
    };
  }, [refresh]);

  // Focus/visibility revalidation. Non-blocking; the generation guard drops
  // stale responses.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onFocus = () => void refresh();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { categories, dealers, status };
}
