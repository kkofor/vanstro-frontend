import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("./", import.meta.url);
const read = async (name) => JSON.parse(await readFile(new URL(name, OUT), "utf8"));
const browser = await read("browser-performance.json");
const audit = await read("summary.json");
const controlled = await read("controlled-assets.json");
const duplicates = await read("duplicate-content.json");
const routes = await read("route-build-analysis.json");

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)] ?? null;
};

const browserSummary = browser.results.map((result) => ({
  profile: result.profile.name,
  route: result.route.name,
  path: result.route.path,
  fcpMs: Math.round(result.paints["first-contentful-paint"] || 0),
  lcpMs: Math.round(result.lcp?.startTime || 0),
  lcpUrl: result.lcp?.url || null,
  lcpElement: result.lcp?.element || null,
  cls: round(result.cls, 4),
  tbtMs: Math.round(result.totalBlockingTime),
  loadMs: Math.round(result.nav?.loadEventEnd || 0),
  requests: result.network.requestCount,
  encodedBytes: result.network.encodedBytes,
  failedRequests: result.network.requests.filter((request) => request.status >= 400 || request.status === 0).length,
  mb01Requests: result.network.requests.filter((request) => request.url.includes("mb01.vanstro.ca")).length,
  domImages: result.images.length,
  eagerOrAutoImages: result.images.filter((image) => image.loading !== "lazy").length,
  lazyImages: result.images.filter((image) => image.loading === "lazy").length,
  deferredLazyImages: result.images.filter((image) => image.loading === "lazy" && !image.complete).length,
  aboveFoldImages: result.images.filter((image) => image.aboveFold).length,
  oversizedAtLeast2x: result.images.filter((image) => image.renderedWidth && image.naturalWidth / image.renderedWidth >= 2).length,
  brokenImages: result.images.filter((image) => image.complete && !image.naturalWidth).length,
  fontFaces: result.fontFaces.length,
  fontStatus: result.fontStatus
}));

const assetBytes = controlled.assets.map((asset) => asset.bytes);
const pixels = controlled.assets.map((asset) => asset.width * asset.height).filter(Boolean);
const formatSummary = Object.fromEntries(
  [...new Set(controlled.assets.map((asset) => asset.format))].sort().map((format) => {
    const assets = controlled.assets.filter((asset) => asset.format === format);
    return [format, {
      files: assets.length,
      bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
      animated: assets.filter((asset) => asset.animated).length
    }];
  })
);

const summary = {
  observedAt: new Date().toISOString(),
  method: browser.method,
  limitations: browser.limitations,
  controlledLibrary: {
    files: audit.controlledAssets,
    bytes: audit.controlledBytes,
    formats: formatSummary,
    minBytes: Math.min(...assetBytes),
    medianBytes: percentile(assetBytes, 0.5),
    p90Bytes: percentile(assetBytes, 0.9),
    maxBytes: Math.max(...assetBytes),
    medianPixels: percentile(pixels, 0.5),
    p90Pixels: percentile(pixels, 0.9),
    maxPixels: Math.max(...pixels),
    missingExports: audit.missingExports,
    hashFailures: audit.provenanceHashFailures,
    mimeFailures: audit.provenanceMimeFailures,
    provenanceReferenceFailures: audit.provenanceReferenceFailures,
    pageOwnershipFailures: audit.pageOwnershipFailures,
    pageRouteExportFailures: audit.pageRouteExportFailures,
    filenameFailures: audit.filenameFailures,
    extensionFailures: audit.extensionFailures,
    duplicateFilesInsideControlledLibrary: audit.controlledDuplicateFiles,
    intentionallySharedAcrossSkus: controlled.assets.filter((asset) => asset.skus.length > 1).length,
    intentionallySharedAcrossPages: controlled.assets.filter((asset) => asset.pageRoutes.length > 1).length,
    maxSkuOwnersForOneAsset: Math.max(...controlled.assets.map((asset) => asset.skus.length)),
    maxPageOwnersForOneAsset: Math.max(...controlled.assets.map((asset) => asset.pageRoutes.length))
  },
  publicTree: {
    files: audit.publicFiles,
    bytes: audit.publicBytes,
    duplicateGroups: audit.allPublicDuplicateGroups,
    redundantBytes: audit.allPublicRedundantBytes,
    controlledAndLegacyDuplicateGroups: duplicates.groups.filter((group) => group.classification === "controlled-and-legacy-copy").length,
    legacyOrSharedDuplicateGroups: duplicates.groups.filter((group) => group.classification === "legacy-or-shared-duplicate").length
  },
  build: {
    routes: audit.routes,
    largestHtml: audit.largestHtml,
    largestChunk: audit.largestChunk,
    sourceHostMatches: audit.sourceHostMatches,
    buildHostMatches: audit.buildHostMatches,
    clientModules: audit.clientModules,
    imageMarkup: audit.imageMarkup,
    catalogRoute: routes.routes.find((route) => route.path === "/products/")
  },
  browserSummary
};

await writeFile(new URL("measurement-summary.json", OUT), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
