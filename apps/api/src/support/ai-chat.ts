import { getInventoryStatus, type InventoryStatus } from "@vanstro/commerce";
import { prisma, Prisma } from "@vanstro/db";
import { Hono, type Context } from "hono";
import { getSessionFromRequest } from "../auth/session.js";
import { publicError } from "../public-errors.js";

type Locale = "en-CA" | "zh-CN" | "fr-CA";

type AzureConfig = {
  endpoint: string;
  apiKey: string;
  deployment: string;
};

type SupportDatabase = {
  $queryRaw<T = unknown>(...args: unknown[]): Promise<T>;
};

const AZURE_TIMEOUT_MS = 10_000;
const MAX_MESSAGE_LENGTH = 4_000;
const RAG_TOP_N = 3;
// pg_trgm's default similarity threshold (`show_limit`) is 0.3; the `%` operator uses that default.
const RAG_SIMILARITY_THRESHOLD = 0.3;
const WARRANTY_QUERY_RE = /warranty|garantie/i;
const RETURN_QUERY_RE = /return|refund|retour/i;
const DEALER_QUERY_RE = /dealer|détaillant|become a dealer/i;
const POLICY_SOURCE_PATTERNS = {
  warranty: "warranty-cabinet|/warranty/",
  return: "return|refund|retour",
  dealer: "dealer|détaillant"
} as const;
const POLICY_QUERY_RE = new RegExp(`${WARRANTY_QUERY_RE.source}|${RETURN_QUERY_RE.source}|${DEALER_QUERY_RE.source}`, "i");
const WARRANTY_SOURCE_RE = /warranty-cabinet|\/warranty\//i;
const RETURN_SOURCE_RE = /return|refund|retour/i;
const DEALER_SOURCE_RE = /dealer|détaillant/i;
// Azure OpenAI v1 is GA and no longer requires a dated api-version query parameter (retrieved 2026-08-20): https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle
const AI_SUPPORT_AZURE_API_VERSION = "v1";
const localeNames: Record<Locale, string> = {
  "en-CA": "English",
  "zh-CN": "Simplified Chinese",
  "fr-CA": "Canadian French"
};

type ArticleHit = { source: "article"; slug: string; title: string; text: string; similarity: number };
type ProductHit = { source: "product"; slug: string; name: string; text: string; similarity: number };
type ChunkHit = { source: "chunk"; slug: string; name: string; text: string; similarity: number };
export type SupportKnowledge = { articles: ArticleHit[]; products: ProductHit[]; chunks: ChunkHit[] };

const ARTICLE_BODY_CONTENT_KEYS = new Set(["blocks", "text", "content", "children", "items", "paragraph", "paragraphs", "body", "description"]);
const SENSITIVE_SPECIFICATION_KEY = /\b(?:cost|price|margin|internal|note|supplier|vendor|wholesale|secret|password|token|email|phone|address)\b/i;
const SENSITIVE_SPEC_PATTERN = "(cost|price|margin|internal|note|supplier|vendor|wholesale|secret|password|token|email|phone|address)";

export { getInventoryStatus };

export function inventoryBin(status: InventoryStatus, locale: Locale) {
  const copy: Record<Locale, Record<InventoryStatus, string>> = {
    "en-CA": { out_of_stock: "out of stock", low_stock: "limited", in_stock: "in stock" },
    "zh-CN": { out_of_stock: "暂无货", low_stock: "库存紧张", in_stock: "有货" },
    "fr-CA": { out_of_stock: "rupture de stock", low_stock: "stock limité", in_stock: "en stock" }
  };
  return copy[locale][status];
}

function configuredAzure(): AzureConfig | undefined {
  const values = [
    process.env.AI_SUPPORT_AZURE_ENDPOINT,
    process.env.AI_SUPPORT_AZURE_API_KEY,
    process.env.AI_SUPPORT_AZURE_DEPLOYMENT
  ];
  if (values.some((value) => !value?.trim())) return undefined;
  return {
    endpoint: values[0]!.trim().replace(/\/$/, ""),
    apiKey: values[1]!.trim(),
    deployment: values[2]!.trim()
  };
}

function localeOf(value: unknown): Locale {
  return value === "zh-CN" || value === "fr-CA" ? value : "en-CA";
}

function textValue(value: unknown, max = MAX_MESSAGE_LENGTH) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function isOrderQuery(message: string) {
  return /\b(order|commande|订单|order\s*(id|#)|tracking|track|suivi)\b/i.test(message);
}

/** Keep only customer-facing text leaves from an Article JSON body; never send JSON keys or metadata. */
function articleBodyText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(articleBodyText).filter(Boolean).join(" ");
  if (!value || typeof value !== "object") return "";
  return Object.entries(value)
    .filter(([key]) => ARTICLE_BODY_CONTENT_KEYS.has(key.toLowerCase()))
    .map(([, child]) => articleBodyText(child))
    .filter(Boolean)
    .join(" ");
}

function customerFacingSpecifications(value: string | null) {
  if (!value) return "";
  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry && !SENSITIVE_SPECIFICATION_KEY.test(entry.split(":", 1)[0] ?? ""))
    .slice(0, 8)
    .join("; ");
}

function hitText(value: unknown, max = 600) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type PolicyIntent = keyof typeof POLICY_SOURCE_PATTERNS;

function policyIntent(question: string): PolicyIntent | undefined {
  // Warranty is deliberately checked first so a warranty question cannot be
  // classified as a dealer question merely because a dealer chunk scores well.
  if (WARRANTY_QUERY_RE.test(question)) return "warranty";
  if (RETURN_QUERY_RE.test(question)) return "return";
  if (DEALER_QUERY_RE.test(question)) return "dealer";
  return undefined;
}

function policyPathPriority(sourcePath: string, intent: PolicyIntent | undefined) {
  if (!intent) return 0;
  const path = sourcePath.toLowerCase();
  if (intent === "warranty") return /dealer-services/i.test(path) ? 1 : WARRANTY_SOURCE_RE.test(path) ? -1 : 0;
  if (intent === "return") return RETURN_SOURCE_RE.test(path) ? -1 : 0;
  return DEALER_SOURCE_RE.test(path) ? -1 : 0;
}

/** Keep policy-path ordering deterministic even when a mocked/database driver returns rows unsorted. */
function sortPolicyChunks<T extends { sourcePath: string; title: string; similarity: number }>(chunks: T[], intent: PolicyIntent | undefined): T[] {
  if (!intent) return chunks;
  return [...chunks].sort((left, right) => {
    const priority = policyPathPriority(left.sourcePath, intent) - policyPathPriority(right.sourcePath, intent);
    if (priority !== 0) return priority;
    const similarity = Number(right.similarity) - Number(left.similarity);
    if (similarity !== 0) return similarity;
    return left.sourcePath.localeCompare(right.sourcePath) || left.title.localeCompare(right.title);
  });
}


/** Server-only read path for published, locale-scoped customer-facing knowledge. */
export async function searchSupportKnowledge(
  question: string,
  locale: Locale,
  database: SupportDatabase = prisma
): Promise<SupportKnowledge> {
  const policyIntentValue = policyIntent(question);
  const policyQuestion = POLICY_QUERY_RE.test(question);
  const policySourcePattern = policyIntentValue ? POLICY_SOURCE_PATTERNS[policyIntentValue] : "a^";
  const policySourceExclusion = policyIntentValue === "warranty" ? "dealer-services" : "a^";
  const [articles, initialProducts, chunks] = await Promise.all([
    database.$queryRaw<Array<{ slug: string; locale: string; status: string; title: string; excerpt: string | null; body: unknown; similarity: number }>>(Prisma.sql`
      WITH article_text AS (
        SELECT slug, locale, status, title, excerpt, body,
          coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body::text,'') AS searchable
        FROM articles
        WHERE status = 'published'
          AND locale = ${locale}
      )
      SELECT slug, locale, status, title, excerpt, body,
        GREATEST(similarity(searchable, ${question}), word_similarity(${question}, searchable)) AS similarity
      FROM article_text
      WHERE searchable % ${question}
         OR word_similarity(${question}, searchable) >= ${RAG_SIMILARITY_THRESHOLD}
         OR position(lower(${question}) in lower(searchable)) > 0
      ORDER BY similarity DESC, slug ASC
      LIMIT ${RAG_TOP_N}
    `),
    database.$queryRaw<Array<{ slug: string; status: string; name: string; shortDescription: string | null; description: string | null; specifications: string | null; similarity: number }>>(Prisma.sql`
      WITH product_text AS (
        SELECT p.slug, p.status, p.name, p."shortDescription", p.description,
          string_agg(concat_ws(': ', ps.key, ps.value), '; ' ORDER BY ps."sortOrder", ps.key)
            FILTER (WHERE ps.key !~* ${SENSITIVE_SPEC_PATTERN}) AS specifications,
          coalesce(p.name,'') || ' ' || coalesce(p."shortDescription",'') || ' ' || coalesce(p.description,'') || ' ' ||
          coalesce(
            string_agg(coalesce(ps.key,'') || ' ' || coalesce(ps.value,''), ' ' ORDER BY ps."sortOrder", ps.key)
              FILTER (WHERE ps.key !~* ${SENSITIVE_SPEC_PATTERN}),
            ''
          ) AS searchable
        FROM products p
        LEFT JOIN product_specifications ps ON ps."productId" = p.id
        WHERE p.status = 'active'
        GROUP BY p.id, p.slug, p.status, p.name, p."shortDescription", p.description
      )
      SELECT slug, status, name, "shortDescription", description, specifications,
        GREATEST(similarity(searchable, ${question}), word_similarity(${question}, searchable)) AS similarity
      FROM product_text
      WHERE searchable % ${question}
         OR word_similarity(${question}, searchable) >= ${RAG_SIMILARITY_THRESHOLD}
         OR position(lower(${question}) in lower(searchable)) > 0
      ORDER BY similarity DESC, slug ASC
      LIMIT ${RAG_TOP_N}
    `),
    database.$queryRaw<Array<{ sourcePath: string; title: string; locale: string; audience: string; text: string | null; similarity: number }>>(Prisma.sql`
      WITH chunk_text AS (
        SELECT d."sourcePath" AS "sourcePath", d.title, d.locale, d.audience, c.text,
          coalesce(text, '') || ' ' || coalesce(d.title, '') || ' ' || coalesce(d."sourcePath", '') AS searchable
        FROM support_knowledge_chunks c
        JOIN support_knowledge_documents d ON d.id = c."documentId"
        WHERE d.audience = 'public'
          AND d.locale = ${locale}
      )
      SELECT "sourcePath", title, locale, audience, text,
        GREATEST(similarity(searchable, ${question}), word_similarity(${question}, searchable)) AS similarity
      FROM chunk_text
      WHERE searchable % ${question}
         OR word_similarity(${question}, searchable) >= ${RAG_SIMILARITY_THRESHOLD}
         OR position(lower(${question}) in lower(searchable)) > 0
         OR (${policyQuestion} AND (("sourcePath" ~* ${policySourcePattern} OR title ~* ${policySourcePattern})
            AND "sourcePath" !~* ${policySourceExclusion}))
      ORDER BY
        CASE WHEN ${policyQuestion} AND (("sourcePath" ~* ${policySourcePattern} OR title ~* ${policySourcePattern})
            AND "sourcePath" !~* ${policySourceExclusion}) THEN 0 ELSE 1 END,
        similarity DESC, "sourcePath" ASC, title ASC
      LIMIT ${RAG_TOP_N}
    `)
  ]);
  let products = initialProducts;
  if (products.length === 0) {
    const tokens = [...new Set(question.split(/[^a-z0-9]+/i).filter((token) => token.length >= 2).map((token) => token.toLowerCase()))];
    if (tokens.length) {
      const tokenQueries = tokens.map((token) => Prisma.sql`
        SELECT p.id FROM products p
        WHERE p.status = 'active'
          AND (p.name ILIKE ${`%${token}%`} OR p.slug ILIKE ${`%${token}%`})
      `);
      const tokenUnion = tokenQueries.length === 1 ? tokenQueries[0]! : Prisma.join(tokenQueries, " UNION ");
      products = await database.$queryRaw<Array<{ slug: string; status: string; name: string; shortDescription: string | null; description: string | null; specifications: string | null; similarity: number }>>(Prisma.sql`
        WITH matched_products AS (${tokenUnion}), product_text AS (
          SELECT p.id, p.slug, p.status, p.name, p."shortDescription", p.description,
            string_agg(concat_ws(': ', ps.key, ps.value), '; ' ORDER BY ps."sortOrder", ps.key)
              FILTER (WHERE ps.key !~* ${SENSITIVE_SPEC_PATTERN}) AS specifications
          FROM products p
          LEFT JOIN product_specifications ps ON ps."productId" = p.id
          WHERE p.status = 'active' AND p.id IN (SELECT id FROM matched_products)
          GROUP BY p.id, p.slug, p.status, p.name, p."shortDescription", p.description
        )
        SELECT slug, status, name, "shortDescription", description, specifications, 0::real AS similarity
        FROM product_text
        ORDER BY slug ASC
        LIMIT ${RAG_TOP_N}
      `);
    }
  }
  return {
    articles: articles
      .filter((article) => article.status === "published" && article.locale === locale)
      .map((article) => ({
        source: "article",
        slug: article.slug,
        title: article.title,
        text: [article.title, article.excerpt, articleBodyText(article.body)].filter(Boolean).map((part) => hitText(part)).join("\n"),
        similarity: Number(article.similarity)
      })),
    products: products
      .filter((product) => product.status === "active")
      .map((product) => ({
        source: "product",
        slug: product.slug,
        name: product.name,
        text: [product.name, product.shortDescription, product.description, customerFacingSpecifications(product.specifications)].filter(Boolean).map((part) => hitText(part)).join("\n"),
        similarity: Number(product.similarity)
      })),
    chunks: sortPolicyChunks(chunks, policyIntentValue)
      .filter((chunk) => chunk.audience === "public" && chunk.locale === locale)
      .map((chunk) => ({
        source: "chunk",
        slug: chunk.sourcePath || chunk.title,
        name: chunk.title,
        text: hitText(chunk.text),
        similarity: Number(chunk.similarity)
      }))
  };
}

export function supportContextWithKnowledge(
  toolContext: { inventory?: unknown; order?: unknown },
  knowledge: SupportKnowledge
) {
  if (!knowledge.articles.length && !knowledge.products.length && !knowledge.chunks.length) return toolContext;
  return {
    ...toolContext,
    knowledge: {
      articles: knowledge.articles.map(({ slug, title, text }) => ({ slug, title, text })),
      products: knowledge.products.map(({ slug, name, text }) => ({ slug, name, text })),
      chunks: knowledge.chunks.map(({ slug, name, text }) => ({ slug, name, text }))
    }
  };
}

function groundingPrompt(locale: Locale, contextData: unknown) {
  return `You are VanStro's customer support assistant. Reply only in ${localeNames[locale]}. Be concise, accurate, and helpful. Never claim to change orders or write data. Report stock only as one of: in stock / limited / out of stock (and locale equivalents). Never say the words bin, bucket, 档位, or bac. Never state exact quantities. Use only the customer-facing material in Context to answer factual questions. If Context contains a policy page, quote the concrete conditions (time limits, who pays shipping, retail vs wholesale). Never answer only by pointing the customer to a policy page. If the answer is not in Context, say you don't know and direct the customer to the Contact page; never invent policies, specifications, prices, costs, internal notes, or personal information. Knowledge sources are identified by article or product slug.\nContext: ${JSON.stringify(contextData)}`;
}

async function inventoryTool(message: string, locale: Locale) {
  const products = await prisma.product.findMany({
    where: {
      status: "active",
      OR: [
        { name: { contains: message.slice(0, 120), mode: "insensitive" } },
        { slug: { contains: message.slice(0, 120), mode: "insensitive" } },
        { skus: { some: { status: "active", skuCode: { contains: message.slice(0, 80), mode: "insensitive" } } } }
      ]
    },
    select: {
      id: true,
      name: true,
      slug: true,
      skus: { where: { status: "active" }, select: { skuCode: true, inventorySnapshots: { select: { quantityOnHand: true, quantityReserved: true } } }, take: 5 }
    },
    take: 5
  });
  return products.map((product: { name: string; slug: string; skus: Array<{ skuCode: string; inventorySnapshots: Array<{ quantityOnHand: number; quantityReserved: number }> }> }) => ({
    product: product.name,
    slug: product.slug,
    skus: product.skus.map((sku: { skuCode: string; inventorySnapshots: Array<{ quantityOnHand: number; quantityReserved: number }> }) => ({
      sku: sku.skuCode,
      status: inventoryBin(getInventoryStatus(sku.inventorySnapshots.reduce((sum: number, row: { quantityOnHand: number; quantityReserved: number }) => sum + Math.max(0, row.quantityOnHand - row.quantityReserved), 0)), locale)
    }))
  }));
}

async function authorizedOrderContext(context: Context, orderId: string, guestToken?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, guestOrderToken: true, guestTokenExpiresAt: true, guestTokenRevokedAt: true, status: true, createdAt: true, fulfillment: true }
  });
  if (!order) return { kind: "not_found" as const };
  const session = await getSessionFromRequest(context);
  const ownerMatches = session?.user.kind === "customer" && session.user.id === order.userId;
  const tokenMatches = typeof guestToken === "string" && guestToken === order.guestOrderToken;
  const guestTokenUsable = tokenMatches && order.guestTokenRevokedAt === null && Boolean(order.guestTokenExpiresAt && order.guestTokenExpiresAt > new Date());
  if (!ownerMatches && !guestTokenUsable) return { kind: "denied" as const };
  return { kind: "ok" as const, data: { status: order.status, createdAt: order.createdAt.toISOString(), fulfillment: order.fulfillment } };
}

type AzureFailureReason = "timeout" | "upstream" | "empty";

type AzureReplyResult =
  | { content: string; reason?: undefined }
  | { content?: undefined; reason: AzureFailureReason };

function logAzureFailure(kind: "abort" | "network", status?: number) {
  if (status !== undefined) {
    console.warn("http status", status);
    return;
  }
  console.warn(kind);
}

async function azureReply(config: AzureConfig, message: string, locale: Locale, contextData: unknown, fetchImpl: typeof fetch): Promise<AzureReplyResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AZURE_TIMEOUT_MS);
  const url = `${config.endpoint}/openai/${AI_SUPPORT_AZURE_API_VERSION}/chat/completions`;
  const body = JSON.stringify({
    model: config.deployment,
    messages: [
      { role: "system", content: groundingPrompt(locale, contextData) },
      { role: "user", content: message }
    ],
    max_completion_tokens: 4000,
    reasoning_effort: "minimal"
  });
  try {
    const request = (headers: Record<string, string>) => fetchImpl(url, {
      method: "POST",
      signal: controller.signal,
      headers,
      body
    });
    let response = await request({ "api-key": config.apiKey, "content-type": "application/json" });
    if (!response.ok && (response.status === 401 || response.status === 404)) {
      logAzureFailure("network", response.status);
      response = await request({ Authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" });
    }
    if (!response.ok) {
      logAzureFailure("network", response.status);
      return { reason: "upstream" };
    }
    let payload: { choices?: Array<{ message?: { content?: unknown } }> };
    try {
      payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    } catch {
      // The HTTP status is the only safe upstream detail to log.
      logAzureFailure("network", response.status);
      return { reason: "upstream" };
    }
    const content = payload.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim()
      ? { content: content.trim() }
      : { reason: "empty" };
  } catch (error) {
    if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      logAzureFailure("abort");
      return { reason: "timeout" };
    }
    logAzureFailure("network");
    return { reason: "upstream" };
  } finally {
    clearTimeout(timer);
  }
}

export function createAiSupportRoutes(fetchImpl: typeof fetch = fetch, database: SupportDatabase = prisma) {
  const routes = new Hono();
  routes.post("/support/ai-chat", async (context) => {
    const body = await context.req.json().catch(() => null) as Record<string, unknown> | null;
    const message = textValue(body?.message);
    if (!message) return publicError(context, 400, "COMMERCE_INVALID", "message is required.");
    const locale = localeOf(body?.locale);
    const config = configuredAzure();
    if (!config) return context.json({ data: { fallback: true, reason: "unconfigured" } });

    const toolContext: { inventory?: unknown; order?: unknown } = {};
    if (/\b(product|sku|stock|inventory|available|货|库存|produit|stock)\b/i.test(message)) {
      toolContext.inventory = await inventoryTool(message, locale);
    }
    const orderId = textValue(body?.orderId, 128);
    if (orderId) {
      const order = await authorizedOrderContext(context, orderId, textValue(body?.guestToken, 256));
      if (order.kind === "denied") return publicError(context, 403, "COMMERCE_ACCESS_DENIED", "Order access is denied.");
      if (order.kind === "not_found") return publicError(context, 404, "COMMERCE_NOT_FOUND", "Order not found.");
      toolContext.order = order.data;
    }
    try {
      const knowledge = await searchSupportKnowledge(message, locale, database);
      Object.assign(toolContext, supportContextWithKnowledge(toolContext, knowledge));
    } catch {
      // RAG is additive: a database/index outage keeps the existing AI support path available.
    }
    const result = await azureReply(config, message, locale, toolContext, fetchImpl);
    if (!result.content) return context.json({ data: { fallback: true, reason: result.reason } });
    return context.json({ data: { fallback: false, reply: result.content, handoff: false } });
  });
  return routes;
}
