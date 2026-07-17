const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";

export const basePath = configuredBasePath
  ? `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";

function normalizeRoute(path: string) {
  const route = path.startsWith("/") ? path : `/${path}`;
  return route === "/" ? "/" : route.replace(/\/+$/g, "");
}

export function getSiteBaseUrl() {
  if (!configuredSiteUrl) return null;

  try {
    const url = new URL(configuredSiteUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return url.toString().replace(/\/+$/g, "");
  } catch {
    return null;
  }
}

export function publicUrl(path: string) {
  const siteBaseUrl = getSiteBaseUrl();
  if (!siteBaseUrl) return null;

  let route = normalizeRoute(path);
  if (basePath && (route === basePath || route.startsWith(`${basePath}/`))) {
    route = route.slice(basePath.length) || "/";
  }

  if (route === "/") return `${siteBaseUrl}/`;
  const isFilePath = /\/[^/]+\.[^/]+$/.test(route);
  return `${siteBaseUrl}${route}${isFilePath ? "" : "/"}`;
}

export function publicAssetUrl(path: string) {
  if (/^https:\/\//.test(path)) return path;
  const siteBaseUrl = getSiteBaseUrl();
  if (!siteBaseUrl) return null;

  let asset = normalizeRoute(path);
  if (basePath && asset.startsWith(`${basePath}/`)) {
    asset = asset.slice(basePath.length);
  }

  return `${siteBaseUrl}${asset}`;
}

export function deployedPath(path: string) {
  const route = normalizeRoute(path);
  return route === "/" ? `${basePath}/` || "/" : `${basePath}${route}`;
}
