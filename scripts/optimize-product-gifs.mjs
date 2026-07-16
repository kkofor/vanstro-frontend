import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = process.cwd();
const productRoot = resolve(root, "public/assets/products");
const productDataPath = resolve(root, "src/lib/data/mb01-products.ts");
const sourceProvenancePath = resolve(
  root,
  "docs/goal-loop/frontend-full-audit/evidence/G3-implementation-2026-07-16/asset-provenance.json"
);
const outputProvenancePath = resolve(
  root,
  "docs/goal-loop/frontend-full-audit/evidence/G7-rework-2026-07-16/asset-provenance-derived.json"
);

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const gifFiles = (await walk(productRoot)).filter((path) => extname(path).toLowerCase() === ".gif");
if (gifFiles.length === 0) {
  const existing = JSON.parse(await readFile(outputProvenancePath, "utf8"));
  console.log(JSON.stringify({
    status: "already-optimized",
    convertedFiles: existing.conversions.length,
    outputProvenancePath
  }, null, 2));
  process.exit(0);
}

const sourceProvenance = JSON.parse(await readFile(sourceProvenancePath, "utf8"));
const sourceByLocalPath = new Map(sourceProvenance.sources.map((source) => [source.localAssetPath, source]));
const conversions = new Map();

for (const sourcePath of gifFiles) {
  const outputPath = sourcePath.replace(/\.gif$/i, ".webp");
  const result = spawnSync("magick", [sourcePath, "-quality", "82", outputPath], {
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(`ImageMagick failed for ${sourcePath}: ${result.stderr}`);

  const identify = spawnSync("identify", ["-format", "%m|%w|%h|%n", outputPath], {
    encoding: "utf8"
  });
  if (identify.status !== 0 || !identify.stdout.startsWith("WEBP|")) {
    throw new Error(`WebP verification failed for ${outputPath}: ${identify.stderr}`);
  }

  const sourceAssetPath = `/${relative(resolve(root, "public"), sourcePath).replaceAll("\\", "/")}`;
  const localAssetPath = sourceAssetPath.replace(/\.gif$/i, ".webp");
  const outputBuffer = await readFile(outputPath);
  conversions.set(sourceAssetPath, {
    sourceAssetPath,
    sourceBytes: sourceByLocalPath.get(sourceAssetPath)?.bytes,
    localAssetPath,
    bytes: outputBuffer.length,
    sha256: sha256(outputBuffer),
    contentType: "image/webp",
    identify: identify.stdout
  });
}

let productSource = await readFile(productDataPath, "utf8");
for (const conversion of conversions.values()) {
  if (!productSource.includes(conversion.sourceAssetPath)) {
    throw new Error(`Generated product data does not reference ${conversion.sourceAssetPath}`);
  }
  productSource = productSource.replaceAll(conversion.sourceAssetPath, conversion.localAssetPath);
}

const derivedSources = sourceProvenance.sources.map((source) => {
  const conversion = conversions.get(source.localAssetPath);
  if (!conversion) return source;
  return {
    ...source,
    sourceSha256: source.sha256,
    sourceContentType: source.contentType,
    sha256: conversion.sha256,
    bytes: conversion.bytes,
    contentType: conversion.contentType,
    localAssetPath: conversion.localAssetPath,
    transformation: {
      type: "static-gif-to-webp",
      quality: 82,
      converter: "ImageMagick",
      sourceAssetPath: conversion.sourceAssetPath
    }
  };
});

await writeFile(productDataPath, productSource, "utf8");
await writeFile(
  outputProvenancePath,
  `${JSON.stringify({
    observedAt: sourceProvenance.observedAt,
    generatedAt: new Date().toISOString(),
    parentProvenance: relative(root, sourceProvenancePath),
    conversions: [...conversions.values()],
    sources: derivedSources
  }, null, 2)}\n`,
  "utf8"
);

for (const sourcePath of gifFiles) await unlink(sourcePath);

console.log(JSON.stringify({
  convertedFiles: conversions.size,
  sourceBytes: [...conversions.values()].reduce((sum, conversion) => sum + conversion.sourceBytes, 0),
  outputBytes: [...conversions.values()].reduce((sum, conversion) => sum + conversion.bytes, 0),
  outputProvenancePath
}, null, 2));
