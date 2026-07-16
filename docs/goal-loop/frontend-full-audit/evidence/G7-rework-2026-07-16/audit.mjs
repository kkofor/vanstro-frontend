import { createHash } from "node:crypto";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));
const OUT = new URL("./", import.meta.url);
const PUBLIC_ROOT = resolve(ROOT, "public");
const EXPORT_ROOT = resolve(ROOT, "out");
const PROVENANCE_PATH = resolve(
  ROOT,
  "docs/goal-loop/frontend-full-audit/evidence/G7-rework-2026-07-16/asset-provenance-derived.json"
);
const PRODUCT_DATA_PATH = resolve(ROOT, "src/lib/data/mb01-products.ts");
const HOST_TOKEN = Buffer.from("mb01.vanstro.ca");

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function walk(root) {
  const files = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

function imageMetadata(buffer) {
  if (buffer.length >= 24 && buffer.subarray(1, 4).toString() === "PNG") {
    return { format: "png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 10 && buffer.subarray(0, 3).toString() === "GIF") {
    const frames = (buffer.toString("latin1").match(/\x00\x2c/g) || []).length;
    return { format: "gif", width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), frames, animated: frames > 1 };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return {
          format: "jpg",
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
          progressive: marker === 0xc2
        };
      }
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      offset += length + 2;
    }
    return { format: "jpg", width: null, height: null };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") {
    const chunkType = buffer.subarray(12, 16).toString();
    if (chunkType === "VP8X" && buffer.length >= 30) {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { format: "webp", width, height };
    }
    if (chunkType === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
      const width = 1 + buffer[21] + ((buffer[22] & 0x3f) << 8);
      const height = 1 + (buffer[22] >> 6) + (buffer[23] << 2) + ((buffer[24] & 0x0f) << 10);
      return { format: "webp", width, height };
    }
    if (chunkType === "VP8 " && buffer.length >= 30) {
      const frameStart = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
      if (frameStart >= 0 && frameStart + 7 <= buffer.length) {
        const width = buffer.readUInt16LE(frameStart + 3) & 0x3fff;
        const height = buffer.readUInt16LE(frameStart + 5) & 0x3fff;
        return { format: "webp", width, height };
      }
    }
    return { format: "webp", width: null, height: null };
  }
  return { format: "unknown", width: null, height: null };
}

function expectedExtension(format) {
  return format === "jpg" ? [".jpg", ".jpeg"] : [`.${format}`];
}

function mimeTypeForFormat(format) {
  return {
    gif: "image/gif",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
  }[format] ?? "application/octet-stream";
}

function parseLocalizedProducts(source) {
  const prefix = "const localizedProducts: ProductSummary[] = ";
  const start = source.indexOf(prefix);
  const terminator = "\n];\n\nconst localizeImage";
  const end = source.indexOf(terminator, start);
  if (start < 0 || end < 0) throw new Error("Unable to parse localizedProducts JSON literal");
  return JSON.parse(`${source.slice(start + prefix.length, end)}\n]`);
}

function htmlResources(html) {
  return [...new Set([
    ...[...html.matchAll(/<script\b[^>]*src="([^"]+)"/gi)].map((match) => match[1]),
    ...[...html.matchAll(/<link\b[^>]*href="([^"]+)"/gi)].map((match) => match[1]).filter((path) => /\.(?:css|js)(?:\?|$)/i.test(path))
  ])];
}

const provenance = JSON.parse(await readFile(PROVENANCE_PATH, "utf8"));
const localizedProducts = parseLocalizedProducts(await readFile(PRODUCT_DATA_PATH, "utf8"));
const pageRouteBySku = new Map();
for (const product of localizedProducts) {
  const route = `/products/${product.slug}/`;
  pageRouteBySku.set(product.sku, route);
  for (const option of product.finishOptions ?? []) pageRouteBySku.set(option.sku, route);
}
const provenanceIndexBySource = new Map(provenance.sources.map((source, index) => [source, index]));
const sourcesByLocalPath = new Map();
for (const source of provenance.sources) {
  const sources = sourcesByLocalPath.get(source.localAssetPath) ?? [];
  sources.push(source);
  sourcesByLocalPath.set(source.localAssetPath, sources);
}

const controlledAssets = [];
for (const [localAssetPath, sources] of sourcesByLocalPath) {
  const physicalPath = resolve(PUBLIC_ROOT, localAssetPath.replace(/^\//, ""));
  const buffer = await readFile(physicalPath);
  const metadata = imageMetadata(buffer);
  const actualHash = sha256(buffer);
  const sourceHashes = [...new Set(sources.map((source) => source.sha256))];
  const skus = [...new Set(sources.flatMap((source) => source.skus))].sort();
  const parentSkus = [...new Set(sources.flatMap((source) => source.occurrences.map((item) => item.parentSku)))].sort();
  const pageRoutes = [...new Set(parentSkus.map((sku) => pageRouteBySku.get(sku)).filter(Boolean))].sort();
  const roles = [...new Set(sources.flatMap((source) => source.occurrences.map((item) => item.role)))].sort();
  const provenanceContentTypes = [...new Set(sources.map((source) => source.contentType))].sort();
  const mimeType = mimeTypeForFormat(metadata.format);
  const extension = extname(physicalPath).toLowerCase();
  controlledAssets.push({
    localAssetPath,
    bytes: buffer.length,
    sha256: actualHash,
    format: metadata.format,
    mimeType,
    width: metadata.width,
    height: metadata.height,
    aspectRatio: metadata.width && metadata.height ? metadata.width / metadata.height : null,
    sourceUrlCount: sources.length,
    sourceUrls: sources.map((source) => source.sourceUrl).sort(),
    provenanceReferences: sources
      .map((source) => `asset-provenance-derived.json#/sources/${provenanceIndexBySource.get(source)}`)
      .sort(),
    provenanceContentTypes,
    provenanceSha256: sourceHashes,
    hashMatchesProvenance: sourceHashes.length === 1 && sourceHashes[0] === actualHash,
    mimeMatchesProvenance: provenanceContentTypes.length === 1 && provenanceContentTypes[0] === mimeType,
    skus,
    parentSkus,
    pageRoutes,
    pageExportsExist: await Promise.all(
      pageRoutes.map((route) => stat(resolve(EXPORT_ROOT, route.replace(/^\//, ""), "index.html")).then(() => true, () => false))
    ).then((results) => results.every(Boolean)),
    roles,
    occurrenceCount: sources.reduce((sum, source) => sum + source.occurrences.length, 0),
    filenameConforms: /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:gif|jpe?g|png|webp)$/.test(basename(physicalPath)),
    extensionMatchesFormat: expectedExtension(metadata.format).includes(extension),
    exportExists: await stat(resolve(EXPORT_ROOT, localAssetPath.replace(/^\//, ""))).then(() => true, () => false)
  });
}
controlledAssets.sort((a, b) => a.localAssetPath.localeCompare(b.localAssetPath));

const publicFiles = await walk(PUBLIC_ROOT);
const publicHashes = new Map();
for (const path of publicFiles) {
  const buffer = await readFile(path);
  const hash = sha256(buffer);
  const group = publicHashes.get(hash) ?? [];
  group.push({ path: relative(PUBLIC_ROOT, path), bytes: buffer.length });
  publicHashes.set(hash, group);
}
const duplicateGroups = [...publicHashes.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([hash, files]) => ({
    sha256: hash,
    bytesPerFile: files[0].bytes,
    files,
    redundantBytes: files[0].bytes * (files.length - 1),
    controlledProductFiles: files.filter((file) => file.path.startsWith("assets/products/")).length,
    classification: files.every((file) => file.path.startsWith("assets/products/"))
      ? "controlled-product-duplicate"
      : files.some((file) => file.path.startsWith("assets/products/"))
        ? "controlled-and-legacy-copy"
        : "legacy-or-shared-duplicate"
  }))
  .sort((a, b) => b.redundantBytes - a.redundantBytes);

const exportFiles = await walk(EXPORT_ROOT);
const htmlFiles = exportFiles.filter((path) => extname(path) === ".html");
const exportFileByUrl = new Map(
  exportFiles.map((path) => [`/${relative(EXPORT_ROOT, path).replaceAll("\\", "/")}`, path])
);
const staticMetricsByPath = new Map();
for (const path of exportFiles.filter((item) => /out\/_next\/static\/.*\.(?:js|css)$/.test(item))) {
  const buffer = await readFile(path);
  staticMetricsByPath.set(path, {
    bytes: buffer.length,
    gzipBytes: gzipSync(buffer).length,
    brotliBytes: brotliCompressSync(buffer).length
  });
}
const routeRows = [];
for (const path of htmlFiles) {
  const buffer = await readFile(path);
  const html = buffer.toString("utf8");
  const resources = htmlResources(html);
  const resourceFiles = resources
    .map((resource) => exportFileByUrl.get(new URL(resource, "https://local.invalid").pathname))
    .filter(Boolean);
  const resourceMetrics = resourceFiles.map((resourcePath) => staticMetricsByPath.get(resourcePath)).filter(Boolean);
  routeRows.push({
    path: `/${relative(EXPORT_ROOT, path).replace(/index\.html$/, "").replaceAll("\\", "/")}`,
    htmlBytes: buffer.length,
    htmlGzipBytes: gzipSync(buffer).length,
    htmlBrotliBytes: brotliCompressSync(buffer).length,
    linkedResources: resources,
    linkedResourceBytes: resourceMetrics.reduce((sum, item) => sum + item.bytes, 0),
    linkedResourceGzipBytes: resourceMetrics.reduce((sum, item) => sum + item.gzipBytes, 0),
    linkedResourceBrotliBytes: resourceMetrics.reduce((sum, item) => sum + item.brotliBytes, 0),
    imageTags: (html.match(/<img\b/g) || []).length,
    lazyImageTags: (html.match(/<img\b[^>]*\bloading="lazy"/g) || []).length,
    srcsetImageTags: (html.match(/<img\b[^>]*\bsrcset=/gi) || []).length,
    mb01Reference: buffer.includes(HOST_TOKEN)
  });
}
routeRows.sort((a, b) => a.path.localeCompare(b.path));

const sourceFiles = (await walk(resolve(ROOT, "src"))).filter((path) => /\.[cm]?[jt]sx?$/.test(path));
const clientModules = [];
const imageMarkup = [];
const sourceHostMatches = [];
for (const path of sourceFiles) {
  const source = await readFile(path, "utf8");
  const sourcePath = relative(ROOT, path);
  if (/^\s*["']use client["'];?/m.test(source.slice(0, 400))) {
    clientModules.push({ path: sourcePath, bytes: Buffer.byteLength(source), lines: source.split("\n").length });
  }
  const imageCount = (source.match(/<img\b/g) || []).length;
  if (imageCount) {
    imageMarkup.push({
      path: sourcePath,
      imageCount,
      loadingAttributes: (source.match(/\bloading\s*=/g) || []).length,
      srcSetAttributes: (source.match(/\bsrcSet\s*=/g) || []).length,
      sizesAttributes: (source.match(/\bsizes\s*=/g) || []).length,
      widthAttributes: (source.match(/\bwidth\s*=/g) || []).length,
      heightAttributes: (source.match(/\bheight\s*=/g) || []).length,
      onErrorAttributes: (source.match(/\bonError\s*=/g) || []).length
    });
  }
  if (Buffer.from(source).includes(HOST_TOKEN)) sourceHostMatches.push(sourcePath);
}

const buildHostMatches = [];
for (const path of exportFiles.filter((item) => /\.(?:css|html|js|json|map|txt|xml)$/.test(item))) {
  if ((await readFile(path)).includes(HOST_TOKEN)) buildHostMatches.push(relative(ROOT, path));
}

const chunks = [];
for (const path of exportFiles.filter((item) => /out\/_next\/static\/chunks\/.*\.js$/.test(item))) {
  const buffer = await readFile(path);
  const text = buffer.toString("utf8");
  const url = `/${relative(EXPORT_ROOT, path).replaceAll("\\", "/")}`;
  chunks.push({
    url,
    bytes: buffer.length,
    gzipBytes: gzipSync(buffer).length,
    brotliBytes: brotliCompressSync(buffer).length,
    controlledAssetPathOccurrences: (text.match(/\/assets\/products\//g) || []).length,
    routesLinking: routeRows.filter((route) => route.linkedResources.some((resource) => new URL(resource, "https://local.invalid").pathname === url)).length
  });
}
chunks.sort((a, b) => b.bytes - a.bytes);

const totalControlledBytes = controlledAssets.reduce((sum, asset) => sum + asset.bytes, 0);
const controlledDuplicateGroups = duplicateGroups.filter((group) => group.classification === "controlled-product-duplicate");
const summary = {
  observedAt: new Date().toISOString(),
  controlledAssets: controlledAssets.length,
  controlledBytes: totalControlledBytes,
  formats: Object.fromEntries([...new Set(controlledAssets.map((asset) => asset.format))].sort().map((format) => [format, controlledAssets.filter((asset) => asset.format === format).length])),
  missingExports: controlledAssets.filter((asset) => !asset.exportExists).length,
  provenanceHashFailures: controlledAssets.filter((asset) => !asset.hashMatchesProvenance).length,
  provenanceMimeFailures: controlledAssets.filter((asset) => !asset.mimeMatchesProvenance).length,
  provenanceReferenceFailures: controlledAssets.filter((asset) => asset.provenanceReferences.length !== asset.sourceUrlCount).length,
  pageOwnershipFailures: controlledAssets.filter((asset) => asset.pageRoutes.length === 0).length,
  pageRouteExportFailures: controlledAssets.filter((asset) => !asset.pageExportsExist).length,
  filenameFailures: controlledAssets.filter((asset) => !asset.filenameConforms).length,
  extensionFailures: controlledAssets.filter((asset) => !asset.extensionMatchesFormat).length,
  controlledDuplicateGroups: controlledDuplicateGroups.length,
  controlledDuplicateFiles: controlledDuplicateGroups.reduce((sum, group) => sum + group.files.length, 0),
  publicFiles: publicFiles.length,
  publicBytes: (await Promise.all(publicFiles.map((path) => stat(path)))).reduce((sum, item) => sum + item.size, 0),
  allPublicDuplicateGroups: duplicateGroups.length,
  allPublicRedundantBytes: duplicateGroups.reduce((sum, group) => sum + group.redundantBytes, 0),
  routes: routeRows.length,
  largestHtml: [...routeRows].sort((a, b) => b.htmlBytes - a.htmlBytes)[0],
  largestChunk: chunks[0],
  sourceHostMatches,
  buildHostMatches,
  clientModules: clientModules.length,
  imageMarkup: {
    sites: imageMarkup.length,
    images: imageMarkup.reduce((sum, item) => sum + item.imageCount, 0),
    loadingAttributes: imageMarkup.reduce((sum, item) => sum + item.loadingAttributes, 0),
    srcSetAttributes: imageMarkup.reduce((sum, item) => sum + item.srcSetAttributes, 0),
    sizesAttributes: imageMarkup.reduce((sum, item) => sum + item.sizesAttributes, 0),
    widthAttributes: imageMarkup.reduce((sum, item) => sum + item.widthAttributes, 0),
    heightAttributes: imageMarkup.reduce((sum, item) => sum + item.heightAttributes, 0),
    onErrorAttributes: imageMarkup.reduce((sum, item) => sum + item.onErrorAttributes, 0)
  }
};

await writeFile(new URL("controlled-assets.json", OUT), JSON.stringify({ observedAt: summary.observedAt, assets: controlledAssets }, null, 2));
await writeFile(new URL("duplicate-content.json", OUT), JSON.stringify({ observedAt: summary.observedAt, groups: duplicateGroups }, null, 2));
await writeFile(new URL("route-build-analysis.json", OUT), JSON.stringify({ observedAt: summary.observedAt, routes: routeRows, chunks }, null, 2));
await writeFile(new URL("source-analysis.json", OUT), JSON.stringify({ observedAt: summary.observedAt, clientModules, imageMarkup }, null, 2));
await writeFile(new URL("summary.json", OUT), JSON.stringify(summary, null, 2));

console.log(JSON.stringify(summary, null, 2));
