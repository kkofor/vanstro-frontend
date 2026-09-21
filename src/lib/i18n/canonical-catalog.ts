"use client";

import { canonicalCatalogUrl, getLocaleRoutePair } from "./routes.ts";
import type { SiteLocale } from "./locale.ts";

export function isCanonicalCatalogHref(href: string): boolean {
  if (href.includes("?") || href.includes("#")) return false;
  const pair = getLocaleRoutePair(href);
  return pair !== null && pair.en === "/products";
}

export function openCanonicalCatalog(locale: SiteLocale): void {
  const target = canonicalCatalogUrl(locale);
  const current = window.location.pathname;
  if (current === target && !window.location.search && !window.location.hash) return;
  window.location.assign(target);
}

export function handleCanonicalCatalogClick(locale: SiteLocale) {
  return (event: { preventDefault: () => void }) => {
    event.preventDefault();
    openCanonicalCatalog(locale);
  };
}
