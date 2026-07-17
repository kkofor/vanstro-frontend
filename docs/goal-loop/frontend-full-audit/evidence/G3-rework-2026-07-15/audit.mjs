import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const OUT = resolve(
  process.env.VANSTRO_AUDIT_OUTPUT_DIR ??
    "docs/goal-loop/frontend-full-audit/evidence/G3-rework-2026-07-15"
);
const OLD_G3 = resolve("docs/goal-loop/frontend-full-audit/evidence/G3");
const OLD_G7 = resolve("docs/goal-loop/frontend-full-audit/evidence/G7");
const BASE = "https://mb01.vanstro.ca";
const OBSERVED_AT = new Date().toISOString();
const USER_AGENT = "VanStro frontend audit G3 rework/1.0 (anonymous public GET)";

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const absoluteUrl = (value) => /^https?:\/\//i.test(value) ? value : `${BASE}/${value.replace(/^\/+/, "")}`;
const normalizeSpaces = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

function decodeHtml(value) {
  const named = {
    amp: "&", apos: "'", gt: ">", hellip: "...", laquo: "«", ldquo: "“", lsquo: "‘",
    lt: "<", nbsp: " ", quot: '"', raquo: "»", rdquo: "”", rsquo: "’", times: "×"
  };
  return String(value ?? "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? match;
  });
}

function cleanText(value) {
  return normalizeSpaces(decodeHtml(String(value ?? "").replace(/<[^>]*>/g, " ")));
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "asset";
}

function mapCategory(sourceCategory) {
  if (/vanit/i.test(sourceCategory)) return "Bathroom Vanities";
  if (/baseboard|casing/i.test(sourceCategory)) return "Baseboards & Mouldings";
  return "Kitchen Cabinets";
}

function parseDescriptionFragment(fragment) {
  const lines = String(fragment ?? "")
    .split(/<br\s*\/?\s*>|<\/p>|<\/li>|\r?\n/i)
    .map(cleanText)
    .filter(Boolean);
  const specifications = {};
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator > 0) specifications[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return { lines, specifications, description: lines.join(" ") };
}

function parsePageDescription(html) {
  return parseDescriptionFragment(html.match(/<div id="product-desc"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "");
}

function parseListingCards(html, categoryUrl) {
  return [...html.matchAll(/<article class="card">([\s\S]*?)<\/article>/gi)].map((match) => {
    const card = match[1];
    const sourceUrl = card.match(/https:\/\/mb01\.vanstro\.ca\/product\/[^"'?\s<]+/)?.[0];
    const sku = cleanText(card.match(/<p class="muted">SKU:\s*([\s\S]*?)<\/p>/i)?.[1] ?? "");
    const optionId = card.match(/data-option-id="(\d+)"/i)?.[1];
    const priceMain = cleanText(card.match(/class="price-main">([\s\S]*?)<\/span>/i)?.[1] ?? "");
    const priceCents = cleanText(card.match(/class="price-cents">([\s\S]*?)<\/span>/i)?.[1] ?? "00");
    const primaryImage = card.match(/data-primary="([^"]+)"/i)?.[1];
    const hoverImage = card.match(/data-hover="([^"]+)"/i)?.[1];
    if (!sourceUrl || !sku || !optionId || !priceMain) throw new Error(`Incomplete listing card: ${categoryUrl}`);
    return {
      sourceUrl,
      categoryUrl,
      sku,
      optionId,
      price: Number(`${priceMain.replace(/,/g, "")}.${priceCents}`),
      cardImages: [primaryImage, hoverImage].filter(Boolean).map(absoluteUrl)
    };
  });
}

async function fetchBytes(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const startedAt = new Date().toISOString();
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(90_000)
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return {
        url,
        finalUrl: response.url,
        status: response.status,
        ok: true,
        startedAt,
        completedAt: new Date().toISOString(),
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        lastModified: response.headers.get("last-modified"),
        etag: response.headers.get("etag"),
        bytes: buffer.length,
        sha256: sha256(buffer),
        buffer
      };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(250 * attempt);
    }
  }
  return {
    url,
    finalUrl: null,
    status: null,
    ok: false,
    startedAt: null,
    completedAt: new Date().toISOString(),
    contentType: null,
    contentLength: null,
    lastModified: null,
    etag: null,
    bytes: 0,
    sha256: null,
    error: String(lastError?.message ?? lastError ?? "unknown fetch error")
  };
}

async function mapLimit(items, limit, task) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

function jsonEqual(a, b, { ordered = true } = {}) {
  const normalize = (value) => {
    if (Array.isArray(value)) {
      const rows = value.map(normalize);
      return ordered ? rows : rows.sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
    }
    return value;
  };
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function compareField(localValue, mb01Value, options) {
  return { localValue, mb01Value, result: jsonEqual(localValue, mb01Value, options) ? "Matched" : "Mismatch" };
}

function csvCell(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n") + "\n";
}

function extensionFor(asset) {
  const type = String(asset.contentType ?? "").toLowerCase();
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("webp")) return "webp";
  if (type.includes("avif")) return "avif";
  const sourceExt = extname(new URL(asset.url).pathname).slice(1).toLowerCase();
  return sourceExt || "bin";
}

function seoNamePass(path) {
  const name = path.split("/").at(-1) ?? "";
  return /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|gif|webp|avif|svg)$/.test(name) &&
    !/^\d{8,}/.test(name) && !/_[a-z0-9]/.test(name);
}

async function walkFiles(directory) {
  const output = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else output.push(full);
    }
  }
  await walk(directory);
  return output;
}

async function crawlMb01() {
  const httpRequests = [];
  const homeResponse = await fetchBytes(`${BASE}/`);
  if (!homeResponse.ok) throw new Error(`Homepage failed: ${homeResponse.error}`);
  const homeHtml = homeResponse.buffer.toString("utf8");
  httpRequests.push({ type: "homepage", ...homeResponse, buffer: undefined });
  const categoryUrls = [];
  const categoryQueue = [...new Set([...homeHtml.matchAll(/https:\/\/mb01\.vanstro\.ca\/category\/[^"'?\s<]+/g)].map((match) => match[0]))];
  const categorySeen = new Set();
  const categoryResponses = [];
  while (categoryQueue.length) {
    const url = categoryQueue.shift();
    if (categorySeen.has(url)) continue;
    categorySeen.add(url);
    const response = await fetchBytes(url, 5);
    categoryResponses.push(response);
    categoryUrls.push(url);
    if (!response.ok) throw new Error(`Category failed after retries: ${url}: ${response.error}`);
    const html = response.buffer.toString("utf8");
    const discovered = [...html.matchAll(/https:\/\/mb01\.vanstro\.ca\/category\/[^"'?\s<]+/g)].map((match) => match[0]);
    for (const child of discovered) if (!categorySeen.has(child)) categoryQueue.push(child);
  }
  const listings = [];
  for (const response of categoryResponses) {
    httpRequests.push({ type: "category", ...response, buffer: undefined });
    if (!response.ok) continue;
    listings.push(...parseListingCards(response.buffer.toString("utf8"), response.url));
  }

  const parentSources = new Map();
  for (const listing of listings) {
    const source = parentSources.get(listing.sourceUrl) ?? { listings: new Map(), categoryUrls: new Set() };
    source.listings.set(listing.sku, listing);
    source.categoryUrls.add(listing.categoryUrl);
    parentSources.set(listing.sourceUrl, source);
  }

  const productResponses = await mapLimit([...parentSources.keys()], 4, (url) => fetchBytes(url, 5));
  const failedProductResponses = productResponses.filter((response) => !response.ok);
  if (failedProductResponses.length) {
    throw new Error(`Product fetch failures: ${failedProductResponses.map((response) => `${response.url}: ${response.error}`).join(" | ")}`);
  }
  const parents = [];
  const variants = [];
  const assetOccurrences = [];

  for (const response of productResponses) {
    httpRequests.push({ type: "product", ...response, buffer: undefined });
    if (!response.ok) continue;
    const source = parentSources.get(response.url);
    const html = response.buffer.toString("utf8");
    const sourceSlug = new URL(response.url).pathname.split("/").filter(Boolean).at(-1);
    const sourceProductId = sourceSlug.match(/-(\d+)$/)?.[1] ?? sourceSlug;
    const name = cleanText(html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1] ?? sourceSlug);
    const subCategory = cleanText(html.match(/<p class="breadcrumb">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "");
    const category = mapCategory(subCategory);
    const optionJson = html.match(/var optionData=(\[[\s\S]*?\]);var dealerData=/)?.[1];
    if (!optionJson) throw new Error(`Missing optionData: ${response.url}`);
    const options = JSON.parse(optionJson);
    const pageDescription = parsePageDescription(html);
    const listed = [...source.listings.values()].sort((a, b) => a.sku.localeCompare(b.sku));
    const listedPrimary = listed[0];
    const selected = options.find((option) => String(option.id) === listedPrimary.optionId && option.sku === listedPrimary.sku);
    if (!selected) throw new Error(`Listed SKU/option mismatch: ${response.url}`);

    function optionTruth(option) {
      const parsed = option.desc ? parseDescriptionFragment(option.desc) : pageDescription;
      const images = (option.images?.length ? option.images : listedPrimary.cardImages).map(absoluteUrl);
      return {
        sku: option.sku,
        modelMpn: option.name,
        priceCad: { amount: Number(option.price), currency: "CAD" },
        description: parsed.description,
        highlights: parsed.lines,
        parametersSpecifications: {
          ...parsed.specifications,
          "Source category": subCategory,
          "Source product ID": sourceProductId,
          "Option name": option.name
        },
        images
      };
    }

    const optionRows = options.map((option) => optionTruth(option));
    const selectedTruth = optionTruth(selected);
    parents.push({
      sourceUrl: response.url,
      sourceProductId,
      sourceSlug,
      name,
      category,
      subCategory,
      categoryUrls: [...source.categoryUrls].sort(),
      listedSku: selected.sku,
      listedOptionId: String(selected.id),
      variants: optionRows.map((option) => ({ sku: option.sku, model: option.modelMpn, active: option.sku === selected.sku })),
      ...selectedTruth
    });

    for (const option of optionRows) {
      variants.push({
        sourceUrl: response.url,
        sourceProductId,
        parentSku: selected.sku,
        name,
        category,
        subCategory,
        categoryUrls: [...source.categoryUrls].sort(),
        ...option
      });
      option.images.forEach((url, index) => assetOccurrences.push({
        sourceUrl: url,
        productSourceUrl: response.url,
        sourceProductId,
        productName: name,
        category,
        subCategory,
        parentSku: selected.sku,
        sku: option.sku,
        modelMpn: option.modelMpn,
        role: index === 0 ? "primary" : "gallery",
        order: index + 1
      }));
    }
  }

  return {
    observedAt: OBSERVED_AT,
    categoryUrls,
    rawListingCount: listings.length,
    parents: parents.sort((a, b) => a.listedSku.localeCompare(b.listedSku)),
    variants: variants.sort((a, b) => a.sku.localeCompare(b.sku)),
    assetOccurrences,
    httpRequests
  };
}

function buildComparison(live, oldComparison) {
  const oldProducts = new Map(oldComparison.products.filter((row) => row.status !== "Missing Locally").map((row) => [row.sku, row]));
  const oldVariants = new Map(oldComparison.variants.filter((row) => row.status !== "Missing Locally").map((row) => [row.sku, row]));
  const liveProducts = new Map(live.parents.map((row) => [row.listedSku, row]));
  const liveVariants = new Map(live.variants.map((row) => [row.sku, row]));
  const productFields = ["status", "name", "sku", "modelMpn", "category", "subCategory", "variants", "parametersSpecifications", "priceCad", "description", "highlights", "primaryImage", "galleryImages", "galleryOrder"];
  const variantFields = ["status", "name", "sku", "modelMpn", "category", "subCategory", "priceCad", "primaryImage", "galleryImages", "galleryOrder", "parametersSpecifications", "description", "highlights"];

  const currentProductValue = (row, field) => ({
    status: { listed: true },
    name: row.name,
    sku: row.listedSku,
    modelMpn: row.modelMpn,
    category: row.category,
    subCategory: row.subCategory,
    variants: row.variants,
    parametersSpecifications: row.parametersSpecifications,
    priceCad: row.priceCad,
    description: row.description,
    highlights: row.highlights,
    primaryImage: row.images[0] ?? null,
    galleryImages: [...row.images].sort(),
    galleryOrder: row.images
  })[field];

  const currentVariantValue = (row, field) => ({
    status: { publicOption: true, listedOnCategoryCard: row.sku === row.parentSku },
    name: row.name,
    sku: row.sku,
    modelMpn: row.modelMpn,
    category: row.category,
    subCategory: row.subCategory,
    priceCad: row.priceCad,
    primaryImage: row.images[0] ?? null,
    galleryImages: [...row.images].sort(),
    galleryOrder: row.images,
    parametersSpecifications: row.parametersSpecifications,
    description: row.description,
    highlights: row.highlights
  })[field];

  const products = [...new Set([...oldProducts.keys(), ...liveProducts.keys()])].sort().map((sku) => {
    const old = oldProducts.get(sku);
    const current = liveProducts.get(sku);
    if (!old) return { entityType: "product", sku, status: "Missing Locally", sourceUrl: current.sourceUrl, fields: {} };
    if (!current) return { entityType: "product", sku, status: "Missing on MB01", localId: old.localId, fields: {} };
    const fields = {};
    for (const field of productFields) {
      const localValue = old.fields[field]?.localValue;
      const mb01Value = currentProductValue(current, field);
      fields[field] = field === "status"
        ? { localValue, mb01Value, result: "Matched" }
        : compareField(localValue, mb01Value, { ordered: field !== "galleryImages" });
    }
    const mismatchFields = productFields.filter((field) => fields[field].result !== "Matched");
    return {
      entityType: "product", sku, status: mismatchFields.length ? "Mismatch" : "Matched", matchMethod: "Exact SKU",
      localId: old.localId, sourceUrl: current.sourceUrl, sourceProductId: current.sourceProductId,
      categoryUrls: current.categoryUrls, observedAt: OBSERVED_AT, fields, mismatchFields,
      unresolvedReason: mismatchFields.length ? "Field-level differences are recorded in fields." : null
    };
  });

  const variants = [...new Set([...oldVariants.keys(), ...liveVariants.keys()])].sort().map((sku) => {
    const old = oldVariants.get(sku);
    const current = liveVariants.get(sku);
    if (!old) return {
      entityType: "variant", sku, status: "Missing Locally", parentSku: current.parentSku,
      sourceUrl: current.sourceUrl, sourceProductId: current.sourceProductId, fields: {}
    };
    if (!current) return {
      entityType: "variant", sku, status: "Missing on MB01", parentSku: old.parentSku,
      localParentId: old.localParentId, fields: {}
    };
    const fields = {};
    for (const field of variantFields) {
      const localValue = old.fields[field]?.localValue;
      const mb01Value = currentVariantValue(current, field);
      fields[field] = field === "status"
        ? { localValue, mb01Value, result: "Matched" }
        : compareField(localValue, mb01Value, { ordered: field !== "galleryImages" });
    }
    const mismatchFields = variantFields.filter((field) => fields[field].result !== "Matched");
    return {
      entityType: "variant", sku, status: mismatchFields.length ? "Mismatch" : "Matched", matchMethod: "Exact SKU",
      parentSku: current.parentSku, localParentId: old.localParentId, sourceUrl: current.sourceUrl,
      sourceProductId: current.sourceProductId, observedAt: OBSERVED_AT, fields, mismatchFields,
      unresolvedReason: mismatchFields.length ? "Field-level differences are recorded in fields." : null
    };
  });
  return { products, variants };
}

async function buildAssetEvidence(live) {
  const oldExternal = JSON.parse(await readFile(join(OLD_G7, "external-assets.json"), "utf8")).assets;
  const oldExternalByUrl = new Map(oldExternal.map((asset) => [asset.requestedUrl, asset]));
  const localAssets = JSON.parse(await readFile(join(OLD_G7, "local-assets.json"), "utf8")).assets;
  const localByHash = new Map();
  for (const asset of localAssets) {
    if (!asset.sha256) continue;
    const paths = localByHash.get(asset.sha256) ?? [];
    paths.push(asset.path ?? asset.publicPath ?? asset.requestedPath ?? asset.requestedUrl);
    localByHash.set(asset.sha256, paths);
  }

  const occurrenceByUrl = new Map();
  for (const occurrence of live.assetOccurrences) {
    const rows = occurrenceByUrl.get(occurrence.sourceUrl) ?? [];
    rows.push(occurrence);
    occurrenceByUrl.set(occurrence.sourceUrl, rows);
  }
  const urls = [...occurrenceByUrl.keys()].sort();
  const fetched = await mapLimit(urls, 10, async (url, index) => {
    if ((index + 1) % 100 === 0) console.error(`asset progress ${index + 1}/${urls.length}`);
    const result = await fetchBytes(url);
    return { ...result, buffer: undefined };
  });
  const hashGroups = new Map();
  for (const asset of fetched) {
    if (!asset.sha256) continue;
    const group = hashGroups.get(asset.sha256) ?? [];
    group.push(asset.url);
    hashGroups.set(asset.sha256, group);
  }
  const sharedHashes = [...hashGroups.entries()].filter(([, urlsInHash]) => {
    const groupSkus = new Set(urlsInHash.flatMap((url) => (occurrenceByUrl.get(url) ?? []).map((row) => row.sku)));
    return urlsInHash.length > 1 || groupSkus.size > 1;
  }).sort(([a], [b]) => a.localeCompare(b));
  const sharedIndex = new Map(sharedHashes.map(([hash], index) => [hash, index + 1]));

  const assets = fetched.map((asset) => {
    const occurrences = occurrenceByUrl.get(asset.url) ?? [];
    const exactDuplicateUrls = asset.sha256 ? (hashGroups.get(asset.sha256) ?? []) : [];
    const groupOccurrences = exactDuplicateUrls.flatMap((url) => occurrenceByUrl.get(url) ?? []);
    const skus = [...new Set(groupOccurrences.map((row) => row.sku))].sort();
    const categories = [...new Set(groupOccurrences.map((row) => row.category))].sort();
    const localPaths = asset.sha256 ? (localByHash.get(asset.sha256) ?? []).sort() : [];
    const old = oldExternalByUrl.get(asset.url);
    const extension = extensionFor(asset);
    const first = [...occurrences].sort((a, b) => a.sku.localeCompare(b.sku) || a.order - b.order)[0];
    let filename;
    if (sharedIndex.has(asset.sha256)) {
      const category = slugify(categories[0] ?? "product");
      filename = `vanstro-${category}-shared-product-detail-${String(sharedIndex.get(asset.sha256) ?? 1).padStart(3, "0")}.${extension}`;
    } else {
      const role = first?.role === "primary" ? "primary" : `gallery-${String(first?.order ?? 1).padStart(2, "0")}`;
      filename = `${slugify(first?.productName)}-${slugify(first?.sku)}-${slugify(first?.modelMpn)}-${role}.${extension}`;
    }
    const plannedCategory = sharedIndex.has(asset.sha256) ? slugify(categories[0] ?? "products") : slugify(first?.category ?? "products");
    const plannedLocalPath = `/assets/products/${plannedCategory}/${filename}`;
    const plannedPhysicalPath = join(ROOT, "public", plannedLocalPath.replace(/^\//, ""));
    let plannedPathExists = false;
    let plannedPathHash = null;
    return {
      sourceUrl: asset.url,
      status: asset.ok ? asset.status : null,
      ok: asset.ok,
      contentType: asset.contentType,
      bytes: asset.bytes,
      sha256: asset.sha256,
      oldObservationSha256: old?.sha256 ?? null,
      changedSinceG7Observation: Boolean(old?.sha256 && asset.sha256 && old.sha256 !== asset.sha256),
      width: old?.sha256 === asset.sha256 ? old.width ?? null : null,
      height: old?.sha256 === asset.sha256 ? old.height ?? null : null,
      skus,
      categories,
      occurrences,
      exactDuplicateUrls,
      localAssetPathsWithSameHash: localPaths,
      plannedFilename: filename,
      plannedLocalPath,
      plannedPathExists,
      plannedPathHash,
      plannedFilenameSeoPass: seoNamePass(filename),
      localizationStatus: !asset.ok
        ? "Blocked"
        : localPaths.length === 0
          ? "Missing Local Asset"
          : localPaths.some((path) => seoNamePass(path))
            ? "Missing Local Asset"
            : "Naming Failure",
      localizationNote: localPaths.length === 0
        ? "No byte-identical file exists in the controlled public tree."
        : "Byte-identical legacy/local files exist, but published product data still references MB01; this is not localized runtime delivery.",
      error: asset.error ?? null,
      plannedPhysicalPath
    };
  });

  return { assets, occurrences: live.assetOccurrences, localAssets, hashGroups };
}

async function scanRuntimeReferences() {
  const roots = [resolve("src"), resolve("scripts")];
  const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".md"]);
  const rows = [];
  for (const root of roots) {
    for (const file of await walkFiles(root)) {
      if (!allowedExtensions.has(extname(file).toLowerCase())) continue;
      const content = await readFile(file, "utf8");
      const matches = [...content.matchAll(/https:\/\/mb01\.vanstro\.ca\/[^"'\s)<>]+/g)].map((match) => match[0]);
      if (matches.length) rows.push({
        file: relative(ROOT, file),
        occurrences: matches.length,
        uniqueUrls: [...new Set(matches)].sort()
      });
    }
  }
  return {
    observedAt: OBSERVED_AT,
    host: "mb01.vanstro.ca",
    files: rows,
    totalOccurrences: rows.reduce((sum, row) => sum + row.occurrences, 0),
    uniqueUrls: [...new Set(rows.flatMap((row) => row.uniqueUrls))].sort(),
    zeroMb01RuntimeReferenceGate: rows.length === 0
  };
}

await mkdir(OUT, { recursive: true });
const oldComparison = JSON.parse(await readFile(join(OLD_G3, "comparison.json"), "utf8"));
const live = await crawlMb01();
const comparison = buildComparison(live, oldComparison);
const assetEvidence = await buildAssetEvidence(live);
const runtimeScan = await scanRuntimeReferences();

const productRows = comparison.products.map((row) => ({
  sku: row.sku,
  status: row.status,
  sourceUrl: row.sourceUrl ?? "",
  mismatchFields: row.mismatchFields ?? [],
  nameLocal: row.fields.name?.localValue ?? null,
  nameMb01: row.fields.name?.mb01Value ?? null,
  modelLocal: row.fields.modelMpn?.localValue ?? null,
  modelMb01: row.fields.modelMpn?.mb01Value ?? null,
  categoryLocal: row.fields.category?.localValue ?? null,
  categoryMb01: row.fields.category?.mb01Value ?? null,
  subCategoryLocal: row.fields.subCategory?.localValue ?? null,
  subCategoryMb01: row.fields.subCategory?.mb01Value ?? null,
  priceLocal: row.fields.priceCad?.localValue ?? null,
  priceMb01: row.fields.priceCad?.mb01Value ?? null,
  parametersResult: row.fields.parametersSpecifications?.result ?? null,
  descriptionResult: row.fields.description?.result ?? null,
  primaryImageResult: row.fields.primaryImage?.result ?? null,
  galleryImagesResult: row.fields.galleryImages?.result ?? null,
  galleryOrderResult: row.fields.galleryOrder?.result ?? null
}));
const variantRows = comparison.variants.map((row) => ({
  sku: row.sku,
  parentSku: row.parentSku ?? "",
  status: row.status,
  sourceUrl: row.sourceUrl ?? "",
  mismatchFields: row.mismatchFields ?? [],
  modelLocal: row.fields.modelMpn?.localValue ?? null,
  modelMb01: row.fields.modelMpn?.mb01Value ?? null,
  priceLocal: row.fields.priceCad?.localValue ?? null,
  priceMb01: row.fields.priceCad?.mb01Value ?? null,
  parametersResult: row.fields.parametersSpecifications?.result ?? null,
  descriptionResult: row.fields.description?.result ?? null,
  primaryImageResult: row.fields.primaryImage?.result ?? null,
  galleryImagesResult: row.fields.galleryImages?.result ?? null,
  galleryOrderResult: row.fields.galleryOrder?.result ?? null
}));
const assetRows = assetEvidence.assets.map((asset) => ({
  sourceUrl: asset.sourceUrl,
  sha256: asset.sha256,
  bytes: asset.bytes,
  contentType: asset.contentType,
  width: asset.width,
  height: asset.height,
  skus: asset.skus,
  occurrenceCount: asset.occurrences.length,
  exactDuplicateUrlCount: asset.exactDuplicateUrls.length,
  localAssetPathsWithSameHash: asset.localAssetPathsWithSameHash,
  plannedFilename: asset.plannedFilename,
  plannedLocalPath: asset.plannedLocalPath,
  plannedFilenameSeoPass: asset.plannedFilenameSeoPass,
  localizationStatus: asset.localizationStatus,
  localizationNote: asset.localizationNote,
  changedSinceG7Observation: asset.changedSinceG7Observation,
  error: asset.error
}));

const countBy = (rows, key) => Object.fromEntries([...new Set(rows.map((row) => row[key]))].sort().map((value) => [value, rows.filter((row) => row[key] === value).length]));
const hashGroups = [...assetEvidence.hashGroups.entries()].map(([hash, urls]) => ({
  sha256: hash,
  urlCount: urls.length,
  urls,
  skus: [...new Set(urls.flatMap((url) => assetEvidence.assets.find((asset) => asset.sourceUrl === url)?.skus ?? []))].sort()
})).filter((group) => group.urlCount > 1).sort((a, b) => b.urlCount - a.urlCount || a.sha256.localeCompare(b.sha256));

const summary = {
  observedAt: OBSERVED_AT,
  authority: BASE,
  sourceCommit: "b8f59ea91547979627be4307a0523a7c6125d129",
  catalog: {
    categoryCount: live.categoryUrls.length,
    rawListingCount: live.rawListingCount,
    parentCount: live.parents.length,
    variantCount: live.variants.length,
    uniqueParentSkus: new Set(live.parents.map((row) => row.listedSku)).size,
    uniqueVariantSkus: new Set(live.variants.map((row) => row.sku)).size
  },
  comparison: {
    productStatuses: countBy(comparison.products, "status"),
    variantStatuses: countBy(comparison.variants, "status")
  },
  assets: {
    occurrenceCount: live.assetOccurrences.length,
    uniqueSourceUrlCount: assetEvidence.assets.length,
    fetchedOk: assetEvidence.assets.filter((asset) => asset.ok).length,
    fetchedBlocked: assetEvidence.assets.filter((asset) => !asset.ok).length,
    totalBytes: assetEvidence.assets.reduce((sum, asset) => sum + asset.bytes, 0),
    uniqueContentHashes: new Set(assetEvidence.assets.map((asset) => asset.sha256).filter(Boolean)).size,
    exactDuplicateHashGroups: hashGroups.length,
    duplicateSourceUrls: hashGroups.reduce((sum, group) => sum + group.urlCount, 0),
    localizationStatuses: countBy(assetEvidence.assets, "localizationStatus"),
    seoPlannedFilenameFailures: assetEvidence.assets.filter((asset) => !asset.plannedFilenameSeoPass).length,
    changedSinceG7Observation: assetEvidence.assets.filter((asset) => asset.changedSinceG7Observation).length
  },
  runtimeReferences: {
    files: runtimeScan.files.length,
    occurrences: runtimeScan.totalOccurrences,
    uniqueUrls: runtimeScan.uniqueUrls.length,
    zeroMb01RuntimeReferenceGate: runtimeScan.zeroMb01RuntimeReferenceGate
  }
};

await writeFile(join(OUT, "mb01-current-inventory.json"), JSON.stringify({
  observedAt: OBSERVED_AT,
  authority: BASE,
  categoryUrls: live.categoryUrls,
  rawListingCount: live.rawListingCount,
  parents: live.parents,
  variants: live.variants
}, null, 2) + "\n");
await writeFile(join(OUT, "source-http-manifest.json"), JSON.stringify({ observedAt: OBSERVED_AT, requests: live.httpRequests }, null, 2) + "\n");
await writeFile(join(OUT, "comparison-current.json"), JSON.stringify({ observedAt: OBSERVED_AT, ...comparison }, null, 2) + "\n");
await writeFile(join(OUT, "product-field-matrix.csv"), toCsv(productRows, Object.keys(productRows[0])));
await writeFile(join(OUT, "variant-field-matrix.csv"), toCsv(variantRows, Object.keys(variantRows[0])));
await writeFile(join(OUT, "asset-source-local-mapping.json"), JSON.stringify({ observedAt: OBSERVED_AT, assets: assetEvidence.assets }, null, 2) + "\n");
await writeFile(join(OUT, "asset-source-local-mapping.csv"), toCsv(assetRows, Object.keys(assetRows[0])));
await writeFile(join(OUT, "asset-occurrences.csv"), toCsv(live.assetOccurrences, Object.keys(live.assetOccurrences[0])));
await writeFile(join(OUT, "unlocalized-assets.csv"), toCsv(assetRows.filter((row) => row.localizationStatus !== "Localized"), Object.keys(assetRows[0])));
await writeFile(join(OUT, "duplicate-content-groups.json"), JSON.stringify({ observedAt: OBSERVED_AT, groups: hashGroups }, null, 2) + "\n");
await writeFile(join(OUT, "runtime-reference-scan.json"), JSON.stringify(runtimeScan, null, 2) + "\n");
await writeFile(join(OUT, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
