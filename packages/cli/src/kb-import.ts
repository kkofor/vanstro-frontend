import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";

export type KnowledgeLocale = "en-CA" | "fr-CA" | "zh-CN";

export type KnowledgeChunk = { ordinal: number; text: string };
export type PreparedKnowledgeDocument = {
  sourcePath: string;
  title: string;
  locale: KnowledgeLocale;
  audience: "public";
  checksum: string;
  chunks: KnowledgeChunk[];
  pricesFiltered: number;
  navLinesRemoved: number;
};

export type ImportSummary = {
  documents: number;
  chunks: number;
  prices_filtered: number;
  nav_lines_removed: number;
  skipped_unchanged: number;
};

type KnowledgeDatabase = {
  supportKnowledgeDocument: {
    findUnique(args: { where: { sourcePath: string } }): Promise<{ id: string; checksum: string } | null>;
    create(args: { data: { sourcePath: string; title: string; locale: string; audience: string; checksum: string; chunks: { create: Array<{ ordinal: number; text: string }> } } }): Promise<unknown>;
    update(args: { where: { sourcePath: string }; data: { title: string; locale: string; audience: string; checksum: string; chunks: { deleteMany: Record<string, never>; create: Array<{ ordinal: number; text: string }> } } }): Promise<unknown>;
  };
  $transaction: any;
};

const PRICE_PATTERN = /\$[0-9]+(?:\.[0-9]{2})?/g;
const NAV_PHRASES = [
  "Skip to main content", "Aller au contenu principal", "Swipe or use the arrow buttons",
  "Add to cart", "Save", "Write a Review", "No published reviews", "Current price",
  "Track order", "Choose a local dealer", "Sign in", "Saved", "Cart", "Partner login",
  "Products", "All Products", "Baseboards & Mouldings", "Baseboards and Mouldings",
  "Handle series", "Kitchen Cabinets", "Bathroom Vanities", "Home", "Resource Center",
  "Design Studio", "About us", "About", "Contact us", "Contact", "Become a dealer",
  "Search", "Apply", "Local fulfillment", "Distance pending"
];
const CITY_NAMES = ["Winnipeg", "Calgary", "Saanich", "Waterloo", "Pointe-Claire", "Saskatoon"];
const STORE_CITY_POSTAL_RE = /^\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,48}\s+[A-Z]\d[A-Z](?:\s?\d[A-Z]\d)?\s*$/i;
const ONLINE_ORDERING_BANNER_RE = /\bOnline ordering is available in participating service areas\b(?:[.!…]+)?/gi;
const FRENCH_ONLINE_ORDERING_BANNER_RE = /\b(?:La\s+)?commande en ligne est (?:offerte|disponible) dans les zones (?:desservies|de service)\b(?:[.!…]+)?/gi;
const MENU_LINK_RE = /\[([^\]]+)\]\([^)]*\)/g;

function localeFor(fileName: string, _body: string): KnowledgeLocale {
  // Locale is a property of the source path, not the article prose. Content may
  // legitimately contain translated examples or multilingual product copy.
  const normalizedPath = fileName.replace(/\\/g, "/");
  const file = normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
  if (/(?:^|\/)fr(?:\/|$)/i.test(normalizedPath) || /page-fr-/i.test(normalizedPath) || /(?:^|-)fr(?:-|\.|$)/i.test(file)) {
    return "fr-CA";
  }
  return "en-CA";
}

function titleFor(fileName: string, body: string): string {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || basename(fileName, ".md").replace(/[-_]+/g, " ").trim();
}

function isChromeOnly(line: string): boolean {
  const plain = line.replace(MENU_LINK_RE, "$1").replace(/[|/•,[\]()]/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return true;
  if (/^(?:CA\s*-\s*(?:EN|FR)|EN|FR|CA|Open\s+—\s+closes|Ouvert\s+—\s+ferme)\b/i.test(plain)) return true;
  const phraseHits = NAV_PHRASES.filter((phrase) => plain.toLowerCase().includes(phrase.toLowerCase())).length;
  const cityHits = CITY_NAMES.filter((city) => plain.toLowerCase().includes(city.toLowerCase())).length;
  // The store selector/menu is frequently flattened into one markdown line.
  return (cityHits >= 3 && (phraseHits >= 1 || /\b(?:postal|stock|dealer|détaillant)\b/i.test(plain))) ||
    (phraseHits > 0 && plain.length < 180 && !/^#+\s/.test(line));
}

function cleanLine(line: string): { line: string; removed: boolean } {
  let cleaned = line;
  // Remove whole online-ordering banner sentences, including the French equivalent.
  cleaned = cleaned.replace(ONLINE_ORDERING_BANNER_RE, "").replace(FRENCH_ONLINE_ORDERING_BANNER_RE, "");
  // Remove navigation links while retaining links in article content.
  cleaned = cleaned.replace(MENU_LINK_RE, (whole, label: string) =>
    NAV_PHRASES.some((phrase) => label.trim().toLowerCase() === phrase.toLowerCase()) ||
    /^skip to main content|aller au contenu principal$/i.test(label.trim()) ? "" : whole
  );
  for (const phrase of NAV_PHRASES) {
    cleaned = cleaned.replace(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "");
  }
  // Store selectors can leave a single city and Canadian postal prefix behind.
  if (STORE_CITY_POSTAL_RE.test(cleaned.trim())) return { line: "", removed: true };
  // Flattened store-selector lines contain the city/postal-code menu, not article content.
  if (CITY_NAMES.filter((city) => cleaned.toLowerCase().includes(city.toLowerCase())).length >= 3 &&
      /(?:dealer|détaillant|postal|stock|Open|Ouvert)/i.test(cleaned)) return { line: "", removed: true };
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
  if (isChromeOnly(cleaned)) return { line: "", removed: true };
  return { line: cleaned, removed: cleaned !== line };
}

function replacePrices(body: string, locale: KnowledgeLocale): { body: string; count: number } {
  let count = 0;
  const copy = locale === "fr-CA" ? "Prix selon la page produit" : locale === "zh-CN" ? "价格以商品页为准" : "Price as shown on the product page";
  const replaced = body.replace(PRICE_PATTERN, () => { count += 1; return copy; });
  return { body: replaced, count };
}

function tableRowChunks(lines: string[]): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  let headers: string[] | undefined;
  for (const line of lines) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (!cells.length || cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    if (!headers) { headers = cells; continue; }
    chunks.push({ ordinal: -1, text: headers.map((header, i) => `${header}: ${cells[i] ?? ""}`).join("; ") });
  }
  return chunks;
}

function makeChunks(body: string): KnowledgeChunk[] {
  const lines = body.split("\n");
  const chunks: string[] = [];
  const paragraphs: string[] = [];
  let index = 0;
  const addParagraph = () => {
    const text = paragraphs.join(" ").trim();
    paragraphs.length = 0;
    if (!text) return;
    let rest = text;
    while (rest.length > 800) {
      const cut = rest.slice(0, 800).lastIndexOf(" ");
      const at = cut >= 400 ? cut : 800;
      chunks.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) chunks.push(rest);
  };
  while (index < lines.length) {
    const line = lines[index]!;
    if (/^\s*\|/.test(line)) {
      addParagraph();
      const table: string[] = [];
      while (index < lines.length && /^\s*\|/.test(lines[index]!)) table.push(lines[index++]!);
      chunks.push(...tableRowChunks(table).map((chunk) => chunk.text));
      continue;
    }
    const block = line.trim();
    if (!block) { index += 1; continue; }
    paragraphs.push(block);
    const joinedLength = paragraphs.join(" ").length;
    // Keep heading/paragraph boundaries where possible, but meet the 400-character
    // lower bound by carrying short adjacent paragraphs into the same chunk.
    if (joinedLength >= 400) addParagraph();
    index += 1;
  }
  addParagraph();
  return chunks.filter(Boolean).map((text, ordinal) => ({ ordinal, text }));
}

export async function prepareKnowledgeDocument(filePath: string, rootDir: string): Promise<PreparedKnowledgeDocument> {
  return prepareKnowledgeDocumentForLocale(filePath, rootDir);
}

async function prepareKnowledgeDocumentForLocale(
  filePath: string,
  rootDir: string,
  localeOverride?: KnowledgeLocale,
): Promise<PreparedKnowledgeDocument> {
  const raw = await readFile(filePath, "utf8");
  const locale = localeOverride ?? localeFor(filePath, raw);
  const priced = replacePrices(raw, locale);
  let navLinesRemoved = 0;
  const cleanLines: string[] = [];
  for (const line of priced.body.replace(/\r\n?/g, "\n").split("\n")) {
    const result = cleanLine(line);
    if (result.removed && !result.line) navLinesRemoved += 1;
    if (result.line) cleanLines.push(result.line);
  }
  const sourcePath = relative(rootDir, filePath).split(sep).join("/");
  const cleanedBody = cleanLines.join("\n");
  const warrantyPrefix = sourcePath.includes("warranty-cabinet-vanity-2026") ? "Warranty / Garantie — " : "";
  const chunks = makeChunks(cleanedBody).map((chunk) => ({ ...chunk, text: `${warrantyPrefix}${chunk.text}` }));
  return {
    sourcePath,
    title: titleFor(filePath, cleanedBody), locale, audience: "public",
    // Hash transformed input so cleaning/prefix rule changes trigger re-import.
    checksum: createHash("sha256").update(`${locale}\n${cleanedBody}\n${warrantyPrefix}`).digest("hex"),
    chunks, pricesFiltered: priced.count, navLinesRemoved
  };
}

async function markdownFiles(rootDir: string): Promise<string[]> {
  const result: string[] = [];
  async function visit(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("._") || entry.name === "vanstro-kb-offsite-pack") continue;
      const file = resolve(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && entry.name !== "00-external-public-research.md") result.push(file);
    }
  }
  await visit(rootDir);
  return result.sort();
}

export async function prepareKnowledgeBase(dir: string): Promise<PreparedKnowledgeDocument[]> {
  const rootDir = resolve(dir);
  const documents = await Promise.all((await markdownFiles(rootDir)).map(async (file) => {
    const prepared = await prepareKnowledgeDocument(file, rootDir);
    if (!prepared.sourcePath.includes("warranty-cabinet-vanity-2026")) return [prepared];

    const localized = await Promise.all(([
      ["en-CA", "#en-CA"],
      ["fr-CA", "#fr-CA"],
    ] as const).map(async ([locale, suffix]) => {
      const document = await prepareKnowledgeDocumentForLocale(file, rootDir, locale);
      return { ...document, sourcePath: `${document.sourcePath}${suffix}` };
    }));
    return localized;
  }));
  return documents.flat();
}

export async function importKnowledgeBase(dir: string, options: { dryRun?: boolean; database?: KnowledgeDatabase } = {}): Promise<ImportSummary> {
  const documents = await prepareKnowledgeBase(dir);
  const summary: ImportSummary = {
    documents: documents.length, chunks: documents.reduce((n, doc) => n + doc.chunks.length, 0),
    prices_filtered: documents.reduce((n, doc) => n + doc.pricesFiltered, 0),
    nav_lines_removed: documents.reduce((n, doc) => n + doc.navLinesRemoved, 0), skipped_unchanged: 0
  };
  if (options.dryRun) return summary;
  if (!options.database) throw new Error("DATABASE_URL is required for a real knowledge-base import.");
  for (const document of documents) {
    const existing = await options.database.supportKnowledgeDocument.findUnique({ where: { sourcePath: document.sourcePath } });
    if (existing?.checksum === document.checksum) { summary.skipped_unchanged += 1; continue; }
    const data = {
      title: document.title, locale: document.locale, audience: document.audience, checksum: document.checksum,
      chunks: { create: document.chunks }
    };
    if (existing) {
      await options.database.$transaction((tx: KnowledgeDatabase) => tx.supportKnowledgeDocument.update({ where: { sourcePath: document.sourcePath }, data: { ...data, chunks: { deleteMany: {}, create: document.chunks } } }));
    } else {
      await options.database.supportKnowledgeDocument.create({ data: { sourcePath: document.sourcePath, ...data } });
    }
  }
  return summary;
}
