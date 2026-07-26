export type SiteLocale = "en-CA" | "fr-CA";

export const DEFAULT_LOCALE: SiteLocale = "en-CA";
export const FRENCH_LOCALE: SiteLocale = "fr-CA";

export function localeFromPathname(pathname: string): SiteLocale {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "");
  const routePath = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ? pathname.slice(basePath.length) || "/"
    : pathname;

  return routePath === "/fr" || routePath.startsWith("/fr/")
    ? FRENCH_LOCALE
    : DEFAULT_LOCALE;
}

export function localeHomePath(locale: SiteLocale) {
  return locale === FRENCH_LOCALE ? "/fr" : "/";
}
