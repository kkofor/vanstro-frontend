import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const BASE_URL = "https://mb01.vanstro.ca";
const OUTPUT_PATH = resolve("src/lib/data/mb01-products.ts");

function decodeHtml(value) {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "...",
    laquo: "\u00ab",
    ldquo: "\u201c",
    lsquo: "\u2018",
    lt: "<",
    nbsp: " ",
    quot: "\"",
    raquo: "\u00bb",
    rdquo: "\u201d",
    rsquo: "\u2019",
    times: "\u00d7"
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity.toLowerCase()] ?? match;
  });
}

function cleanText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function absoluteUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}/${path.replace(/^\/+/, "")}`;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "VanStro catalog sync/1.0" }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function extractUrls(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[0]);
}

function parseDescription(html) {
  const body = html.match(/<div id="product-desc"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
  const lines = body
    .split(/<br\s*\/?\s*>/i)
    .map(cleanText)
    .filter(Boolean);
  const specifications = {};

  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    specifications[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return { lines, specifications };
}

function mapCategory(sourceCategory) {
  if (/vanit/i.test(sourceCategory)) return "Bathroom Vanities";
  if (/baseboard|casing/i.test(sourceCategory)) return "Baseboards & Mouldings";
  return "Kitchen Cabinets";
}

function selectWhiteOptions(options, category) {
  if (!/Cabinets|Vanities/.test(category)) return options;
  const hasWhiteCodes = options.some((option) => /(?:^|-)(?:WH|WHITE)(?:-|$)/i.test(option.name));
  if (!hasWhiteCodes) return options;
  return options.filter((option) => /(?:^|-)(?:WH|WHITE)(?:-|$)/i.test(option.name));
}

function displayName(productName, option, siblingOptions) {
  const hasTopChoice = siblingOptions.some((item) => /(?:^|-)TOP(?:-|$)/i.test(item.name));
  if (!hasTopChoice) return productName;
  return /(?:^|-)TOP(?:-|$)/i.test(option.name)
    ? `${productName} with Top`
    : `${productName} Cabinet Only`;
}

async function crawl() {
  const homeHtml = await fetchHtml(`${BASE_URL}/`);
  const categoryUrls = [...new Set(extractUrls(homeHtml, /https:\/\/mb01\.vanstro\.ca\/category\/[^"'?\s<]+/g))];
  const productSources = new Map();

  for (const categoryUrl of categoryUrls) {
    const html = await fetchHtml(categoryUrl);
    for (const productUrl of extractUrls(html, /https:\/\/mb01\.vanstro\.ca\/product\/[^"'?\s<]+/g)) {
      if (!productSources.has(productUrl)) productSources.set(productUrl, categoryUrl);
    }
  }

  const products = [];
  const details = {};

  for (const [sourceUrl] of productSources) {
    const html = await fetchHtml(sourceUrl);
    const sourceSlug = new URL(sourceUrl).pathname.split("/").filter(Boolean).at(-1);
    const sourceProductId = sourceSlug.match(/-(\d+)$/)?.[1] ?? sourceSlug;
    const productName = cleanText(html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1] ?? sourceSlug);
    const breadcrumb = cleanText(html.match(/<p class="breadcrumb">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "");
    const category = mapCategory(breadcrumb);
    const { lines, specifications } = parseDescription(html);
    const optionJson = html.match(/var optionData=(\[[\s\S]*?\]);var dealerData=/)?.[1];
    if (!optionJson) throw new Error(`Missing optionData: ${sourceUrl}`);

    const allOptions = JSON.parse(optionJson);
    const selectedOptions = selectWhiteOptions(allOptions, category);

    for (const option of selectedOptions) {
      const id = `mb01-${option.id}`;
      const multiple = selectedOptions.length > 1;
      const slug = multiple ? `${sourceSlug}-${slugify(option.name)}` : sourceSlug;
      const images = [...new Set(option.images.map(absoluteUrl))].map((url, index) => ({
        url,
        alt: index === 0 ? displayName(productName, option, selectedOptions) : `${productName} alternate view ${index + 1}`
      }));
      const length = option.name.match(/(\d+)FT/i)?.[1];
      const dimensions =
        specifications.Dimensions ??
        (length ? `${length} ft length` : undefined) ??
        (specifications["Center-to-Center"]
          ? `${specifications["Center-to-Center"]} center-to-center`
          : "See product specifications");
      const finish = specifications.Door ?? specifications.Material ?? "White finish";
      const name = displayName(productName, option, selectedOptions);

      products.push({
        id,
        slug,
        sku: option.sku,
        manufacturerPartNumber: option.name,
        name,
        category,
        price: { amount: option.price, currency: "CAD" },
        unit: "each",
        dimensions,
        finish,
        colorName: /Cabinets|Vanities/.test(category) ? "White" : undefined,
        colorHex: /Cabinets|Vanities/.test(category) ? "#f7f6f2" : undefined,
        dealerStock: { winnipeg: 0 },
        availability: {
          productId: id,
          sku: option.sku,
          locations: [
            {
              dealerId: "winnipeg",
              quantity: 0,
              quantityKnown: false,
              status: "in_stock",
              pickupAvailable: true,
              deliveryAvailable: true,
              updatedAt: "source-catalog"
            }
          ],
          totalAvailable: 0,
          status: "in_stock",
          availabilityMessage: "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
          updatedAt: "source-catalog"
        },
        images,
        inStock: true
      });

      details[id] = {
        sourceUrl,
        sourceProductId,
        sourceProductName: productName,
        sourceCategory: breadcrumb,
        description: lines.join(" "),
        productHighlights: lines,
        specifications: {
          ...specifications,
          "Source category": breadcrumb,
          "Source product ID": sourceProductId,
          "Option name": option.name
        }
      };
    }
  }

  const categoryOrder = {
    "Kitchen Cabinets": 0,
    "Bathroom Vanities": 1,
    "Baseboards & Mouldings": 2
  };
  products.sort(
    (a, b) =>
      (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99) ||
      a.name.localeCompare(b.name) ||
      a.sku.localeCompare(b.sku)
  );
  const sortedDetails = Object.fromEntries(products.map((product) => [product.id, details[product.id]]));
  return { categoryCount: categoryUrls.length, parentProductCount: productSources.size, products, details: sortedDetails };
}

const result = await crawl();
const generatedAt = new Date().toISOString();
const output = `import type { ProductSummary } from "@/lib/api/api-contract";\n\n` +
  `export type Mb01ProductMetadata = {\n` +
  `  sourceUrl: string;\n  sourceProductId: string;\n  sourceProductName: string;\n  sourceCategory: string;\n` +
  `  description: string;\n  productHighlights: string[];\n  specifications: Record<string, string>;\n};\n\n` +
  `// Generated from ${BASE_URL} at ${generatedAt}.\n` +
  `// ${result.parentProductCount} source products expanded to ${result.products.length} purchasable white-cabinet/trim SKUs.\n` +
  `export const mb01Products: ProductSummary[] = ${JSON.stringify(result.products, null, 2)};\n\n` +
  `export const mb01ProductMetadataById: Record<string, Mb01ProductMetadata> = ${JSON.stringify(result.details, null, 2)};\n`;

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, output, "utf8");
console.log(JSON.stringify({
  categories: result.categoryCount,
  sourceProducts: result.parentProductCount,
  syncedSkus: result.products.length,
  output: OUTPUT_PATH
}, null, 2));
