import { createHash } from "node:crypto";
import { access, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const outRoot = resolve(here, "artifact-extracted");
const publicRoot = resolve(repoRoot, "public");
const g7ManifestPath = resolve(repoRoot, "docs/goal-loop/frontend-full-audit/evidence/G7-rework-2026-07-16/controlled-assets.json");
const logsRoot = resolve(here, "logs");
const matricesRoot = resolve(here, "matrices");
const basePath = "/vanstro-frontend";
const mb01Pattern = /(?:https?:)?\/\/mb01\.vanstro\.ca/gi;
const mb01UrlPattern = /https?:\/\/mb01\.vanstro\.ca\/[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]+/gi;
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".mjs", ".ts", ".tsx", ".txt", ".xml"]);

async function walk(root) {
  const files = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else files.push(path);
    }
  }
  await visit(root);
  return files;
}

function csv(rows, columns) {
  const quote = (value) => {
    const normalized = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
    return `"${normalized.replaceAll('"', '""')}"`;
  };
  return [columns.map(quote).join(","), ...rows.map((row) => columns.map((column) => quote(row[column])).join(","))].join("\n") + "\n";
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

async function hash(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function scanLayer(layer, roots) {
  const rows = [];
  const uniqueUrls = new Set();
  let scannedFiles = 0;
  let scannedBytes = 0;
  for (const root of roots) {
    for (const path of await walk(root)) {
      const extension = extname(path).toLowerCase();
      if (!textExtensions.has(extension)) continue;
      const source = await readFile(path, "utf8");
      scannedFiles += 1;
      scannedBytes += Buffer.byteLength(source);
      const matches = countMatches(source, mb01Pattern);
      if (!matches) continue;
      for (const url of source.match(mb01UrlPattern) ?? []) uniqueUrls.add(url);
      rows.push({
        layer,
        file: relative(repoRoot, path).split(sep).join("/"),
        extension,
        occurrences: matches,
        uniqueUrlsInFile: new Set(source.match(mb01UrlPattern) ?? []).size
      });
    }
  }
  return {
    layer,
    scannedFiles,
    scannedBytes,
    matchingFiles: rows.length,
    occurrences: rows.reduce((sum, row) => sum + row.occurrences, 0),
    uniqueUrls: uniqueUrls.size,
    rows
  };
}

function routeFromHtml(path) {
  const relativePath = relative(outRoot, path).split(sep).join("/");
  if (relativePath === "index.html") return "/";
  if (relativePath.endsWith("/index.html")) return `/${relativePath.slice(0, -"index.html".length)}`;
  if (relativePath === "404.html") return "/404/";
  return `/${relativePath}`;
}

function tagAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
  }
  return attributes;
}

function metaValue(metas, key, value) {
  return metas.find((item) => item[key] === value)?.content ?? "";
}

function firstTagContent(html, tag) {
  return html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

const sourceScan = await scanLayer("deployed-commit-1eaf29e-source", [resolve(repoRoot, "src")]);
const deployedArtifactScan = await scanLayer("deployed-commit-1eaf29e-pages-artifact", [outRoot]);
const layerScans = [sourceScan, deployedArtifactScan];

const g7Manifest = JSON.parse(await readFile(g7ManifestPath, "utf8"));
const controlledAssetRows = [];
for (const asset of g7Manifest.assets) {
  const publicPath = resolve(publicRoot, asset.localAssetPath.slice(1));
  const outPath = resolve(outRoot, asset.localAssetPath.slice(1));
  const publicExists = await exists(publicPath);
  const outExists = await exists(outPath);
  const publicHash = publicExists ? await hash(publicPath) : "";
  const outHash = outExists ? await hash(outPath) : "";
  controlledAssetRows.push({
    localAssetPath: asset.localAssetPath,
    requestPath: `${basePath}${asset.localAssetPath}`,
    sourceUrl: asset.sourceUrl,
    expectedSha256: asset.sha256,
    publicExists,
    publicHash,
    publicHashMatches: publicHash === asset.sha256,
    exportExists: outExists,
    exportHash: outHash,
    exportHashMatches: outHash === asset.sha256,
    publicExportParity: publicHash && publicHash === outHash
  });
}

const outFiles = await walk(outRoot);
const textOutFiles = outFiles.filter((path) => textExtensions.has(extname(path).toLowerCase()));
const htmlFiles = outFiles.filter((path) => extname(path).toLowerCase() === ".html");
const allOutText = (await Promise.all(textOutFiles.map((path) => readFile(path, "utf8")))).join("\n");
const controlledReferences = new Set(allOutText.match(/\/vanstro-frontend\/assets\/products\/[a-z0-9/._-]+\.(?:gif|jpe?g|png|webp)/gi) ?? []);
for (const row of controlledAssetRows) row.exportReferencePresent = controlledReferences.has(row.requestPath);

const metadataRows = [];
const basePathRows = [];
for (const path of htmlFiles) {
  const html = await readFile(path, "utf8");
  const route = routeFromHtml(path);
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => tagAttributes(match[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => tagAttributes(match[0]));
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => tagAttributes(match[0]));
  const schemas = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      schemas.push(JSON.parse(match[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&")));
    } catch {
      schemas.push({ "@type": "InvalidJSON" });
    }
  }
  const networkTags = [...html.matchAll(/<(?:a|img|link|script|source)\b[^>]*>/gi)].map((match) => ({ tag: match[0].slice(0, match[0].indexOf(" ")).slice(1), ...tagAttributes(match[0]) }));
  for (const tag of networkTags) {
    for (const attribute of ["href", "src", "poster"]) {
      const value = tag[attribute];
      if (!value?.startsWith("/")) continue;
      const isStatic = value.startsWith("/assets/") || value.startsWith("/_next/") || value === "/favicon.ico";
      const isInternalLink = attribute === "href" && tag.tag === "a";
      const prefixed = value === basePath || value.startsWith(`${basePath}/`);
      if ((isStatic || isInternalLink) && !prefixed) {
        basePathRows.push({ route, file: relative(outRoot, path).split(sep).join("/"), tag: tag.tag, attribute, value, status: "Fail: missing base path" });
      }
    }
  }
  const embeddedRootAssetReferences = [...html.matchAll(/["'](\/(?:assets|_next)\/[^"']+)["']/g)].map((match) => match[1]);
  metadataRows.push({
    route,
    title: firstTagContent(html, "title"),
    metaDescription: metaValue(metas, "name", "description"),
    canonical: links.find((item) => item.rel?.split(/\s+/).includes("canonical"))?.href ?? "",
    schemaTypes: schemas.map((schema) => schema["@type"] ?? "Unknown").join("|"),
    invalidSchemaCount: schemas.filter((schema) => schema["@type"] === "InvalidJSON").length,
    ogTitle: metaValue(metas, "property", "og:title"),
    ogDescription: metaValue(metas, "property", "og:description"),
    ogImage: metaValue(metas, "property", "og:image"),
    twitterCard: metaValue(metas, "name", "twitter:card"),
    twitterImage: metaValue(metas, "name", "twitter:image"),
    imageCount: images.length,
    missingAltCount: images.filter((image) => !("alt" in image)).length,
    emptyAltCount: images.filter((image) => image.alt === "").length,
    mb01Occurrences: countMatches(html, mb01Pattern),
    embeddedRootAssetReferences: embeddedRootAssetReferences.length
  });
}

const extensionCounts = {};
let outBytes = 0;
for (const path of outFiles) {
  const extension = extname(path).toLowerCase() || "[none]";
  extensionCounts[extension] = (extensionCounts[extension] ?? 0) + 1;
  outBytes += (await stat(path)).size;
}

const summary = {
  generatedAt: new Date().toISOString(),
  deployedArtifact: {
    files: outFiles.length,
    bytes: outBytes,
    htmlFiles: htmlFiles.length,
    textFiles: textOutFiles.length,
    extensionCounts
  },
  layerScans: layerScans.map(({ rows: _rows, ...scan }) => scan),
  controlledAssets: {
    expected: controlledAssetRows.length,
    missingPublic: controlledAssetRows.filter((row) => !row.publicExists).length,
    publicHashFailures: controlledAssetRows.filter((row) => !row.publicHashMatches).length,
    missingExport: controlledAssetRows.filter((row) => !row.exportExists).length,
    exportHashFailures: controlledAssetRows.filter((row) => !row.exportHashMatches).length,
    publicExportParityFailures: controlledAssetRows.filter((row) => !row.publicExportParity).length,
    unreferencedInExport: controlledAssetRows.filter((row) => !row.exportReferencePresent).length
  },
  basePath: {
    value: basePath,
    missingNetworkPathOccurrences: basePathRows.length,
    routesWithMissingNetworkPaths: new Set(basePathRows.map((row) => row.route)).size,
    embeddedRootAssetReferences: metadataRows.reduce((sum, row) => sum + row.embeddedRootAssetReferences, 0)
  },
  finalMetadata: {
    routes: metadataRows.length,
    missingTitles: metadataRows.filter((row) => !row.title).length,
    missingDescriptions: metadataRows.filter((row) => !row.metaDescription).length,
    missingCanonicals: metadataRows.filter((row) => !row.canonical).length,
    invalidSchemas: metadataRows.reduce((sum, row) => sum + row.invalidSchemaCount, 0),
    routesWithSchema: metadataRows.filter((row) => row.schemaTypes).length,
    missingOgTitle: metadataRows.filter((row) => !row.ogTitle).length,
    missingOgDescription: metadataRows.filter((row) => !row.ogDescription).length,
    missingOgImage: metadataRows.filter((row) => !row.ogImage).length,
    missingTwitterCard: metadataRows.filter((row) => !row.twitterCard).length,
    missingTwitterImage: metadataRows.filter((row) => !row.twitterImage).length,
    missingImageAlt: metadataRows.reduce((sum, row) => sum + row.missingAltCount, 0),
    mb01Occurrences: metadataRows.reduce((sum, row) => sum + row.mb01Occurrences, 0)
  },
  gate: {
    deployedSourceZeroMb01: sourceScan.occurrences === 0,
    deployedArtifactZeroMb01: deployedArtifactScan.occurrences === 0,
    controlledAssetParity: controlledAssetRows.every((row) => row.publicHashMatches && row.exportHashMatches && row.publicExportParity),
    basePathNetworkPaths: basePathRows.length === 0,
    releaseReady: false
  }
};
summary.gate.releaseReady = summary.gate.deployedSourceZeroMb01
  && summary.gate.deployedArtifactZeroMb01
  && summary.gate.controlledAssetParity
  && summary.gate.basePathNetworkPaths;

await Promise.all([
  writeFile(resolve(logsRoot, "build-layer-summary.json"), JSON.stringify(summary, null, 2) + "\n"),
  writeFile(resolve(matricesRoot, "mb01-runtime-reference-scan.csv"), csv(layerScans.flatMap((scan) => scan.rows), ["layer", "file", "extension", "occurrences", "uniqueUrlsInFile"])),
  writeFile(resolve(matricesRoot, "controlled-asset-export-parity.csv"), csv(controlledAssetRows, Object.keys(controlledAssetRows[0]))),
  writeFile(resolve(matricesRoot, "basepath-reference-failures.csv"), csv(basePathRows, ["route", "file", "tag", "attribute", "value", "status"])),
  writeFile(resolve(matricesRoot, "final-metadata-export.csv"), csv(metadataRows, Object.keys(metadataRows[0])))
]);

console.log(JSON.stringify(summary, null, 2));
