import {
  DEFAULT_LOCALE,
  FRENCH_LOCALE,
  localeFromPathname,
  type SiteLocale
} from "./locale.ts";

export type LocaleRoutePair = Readonly<{
  en: `/${string}` | "/";
  fr: `/fr${string}`;
  indexable: boolean;
  frAvailable?: boolean;
}>;

export const STATIC_LOCALE_ROUTE_PAIRS = [
  { en: "/", fr: "/fr", indexable: true },
  { en: "/404", fr: "/fr/404", indexable: false },
  { en: "/about", fr: "/fr/about", indexable: true },
  { en: "/account/login", fr: "/fr/account/login", indexable: false },
  { en: "/account/register", fr: "/fr/account/register", indexable: false },
  { en: "/articles", fr: "/fr/articles", indexable: true },
  { en: "/careers", fr: "/fr/careers", indexable: true },
  { en: "/cart", fr: "/fr/cart", indexable: false },
  { en: "/checkout", fr: "/fr/checkout", indexable: false },
  { en: "/contact", fr: "/fr/contact", indexable: true },
  { en: "/cookie-settings", fr: "/fr/cookie-settings", indexable: false },
  { en: "/dashboard", fr: "/fr/dashboard", indexable: false },
  { en: "/dealer-program", fr: "/fr/dealer-program", indexable: true },
  { en: "/dealer-services-and-responsibility", fr: "/fr/dealer-services-and-responsibility", indexable: true },
  { en: "/dealers/apply", fr: "/fr/dealers/apply", indexable: true },
  { en: "/dealers/map", fr: "/fr/dealers/map", indexable: true },
  { en: "/favorites", fr: "/fr/favorites", indexable: false },
  { en: "/legal-disclaimer", fr: "/fr/legal-disclaimer", indexable: true },
  { en: "/privacy", fr: "/fr/privacy", indexable: true },
  { en: "/products", fr: "/fr/products", indexable: true },
  { en: "/return-policy", fr: "/fr/return-policy", indexable: true },
  { en: "/terms-and-conditions", fr: "/fr/terms-and-conditions", indexable: true },
  { en: "/v1-1", fr: "/fr/v1-1", indexable: false, frAvailable: false }
] as const satisfies readonly LocaleRoutePair[];

export const DYNAMIC_LOCALE_ROUTE_FAMILIES = [
  { key: "product", enPrefix: "/products/", frPrefix: "/fr/products/", parameter: "slug", indexable: true },
  { key: "article", enPrefix: "/articles/", frPrefix: "/fr/articles/", parameter: "slug", indexable: false },
  { key: "order", enPrefix: "/orders/", frPrefix: "/fr/orders/", parameter: "id", indexable: false }
] as const;

export type DynamicLocaleRouteKey = typeof DYNAMIC_LOCALE_ROUTE_FAMILIES[number]["key"];

const staticRouteByPath = new Map<string, LocaleRoutePair>(
  STATIC_LOCALE_ROUTE_PAIRS.flatMap((pair) => [
    [pair.en, pair],
    [pair.fr, pair]
  ])
);

function configuredBasePath() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
  return basePath === "/" ? "" : basePath;
}

function splitHref(href: string) {
  const suffixIndex = href.search(/[?#]/);
  return suffixIndex === -1
    ? { pathname: href, suffix: "" }
    : { pathname: href.slice(0, suffixIndex), suffix: href.slice(suffixIndex) };
}

function splitBasePath(pathname: string) {
  const basePath = configuredBasePath();
  const hasBasePath = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`));

  return hasBasePath
    ? { basePath, routePath: pathname.slice(basePath.length) || "/" }
    : { basePath: "", routePath: pathname };
}

function preserveTrailingSlash(sourcePath: string, targetPath: string) {
  return sourcePath.length > 1 && sourcePath.endsWith("/") && targetPath !== "/"
    ? `${targetPath}/`
    : targetPath;
}

export function getLocaleRoutePair(pathname: string): LocaleRoutePair | null {
  const { routePath } = splitBasePath(pathname);
  const normalizedPath = routePath.length > 1 ? routePath.replace(/\/$/, "") : routePath;
  const staticPair = staticRouteByPath.get(normalizedPath);
  if (staticPair) return staticPair;

  for (const family of DYNAMIC_LOCALE_ROUTE_FAMILIES) {
    const sourcePrefix = normalizedPath.startsWith(family.frPrefix)
      ? family.frPrefix
      : normalizedPath.startsWith(family.enPrefix)
        ? family.enPrefix
        : null;
    if (!sourcePrefix) continue;

    const routeValue = normalizedPath.slice(sourcePrefix.length);
    if (!routeValue || routeValue.includes("/")) return null;

    return {
      en: `${family.enPrefix}${routeValue}`,
      fr: `${family.frPrefix}${routeValue}`,
      indexable: family.indexable
    };
  }

  return null;
}

export function localeHref(href: string, locale: SiteLocale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const { pathname, suffix } = splitHref(href);
  const { basePath, routePath } = splitBasePath(pathname);
  const pair = getLocaleRoutePair(routePath);
  if (!pair || (locale === FRENCH_LOCALE && pair.frAvailable === false)) return href;

  const targetPath = locale === FRENCH_LOCALE ? pair.fr : pair.en;
  return `${basePath}${preserveTrailingSlash(routePath, targetPath)}${suffix}`;
}

export function alternateLocaleHref(href: string): string {
  const { pathname, suffix } = splitHref(href);
  const sourceLocale = localeFromPathname(pathname);
  const targetLocale = sourceLocale === FRENCH_LOCALE ? DEFAULT_LOCALE : FRENCH_LOCALE;
  const localized = localeHref(href, targetLocale);
  if (localized !== href) return localized;

  const { basePath } = splitBasePath(pathname);
  const notFoundCounterpart = sourceLocale === FRENCH_LOCALE ? "/404" : "/fr/404";
  return `${basePath}${notFoundCounterpart}${suffix}`;
}
