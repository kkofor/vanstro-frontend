import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAiSupportRoutes, getInventoryStatus, inventoryBin, searchSupportKnowledge, supportContextWithKnowledge, type SupportKnowledge } from "./ai-chat.js";

const envKeys = [
  "AI_SUPPORT_AZURE_ENDPOINT",
  "AI_SUPPORT_AZURE_API_KEY",
  "AI_SUPPORT_AZURE_DEPLOYMENT"
] as const;

function restoreEnvironment(previous: Record<string, string | undefined>) {
  for (const key of envKeys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
}

function sqlText(query: unknown): string {
  if (query && typeof query === "object" && "text" in query && typeof (query as { text: unknown }).text === "string") {
    return (query as { text: string }).text;
  }
  if (query && typeof query === "object" && Array.isArray((query as { strings?: unknown }).strings)) {
    return (query as { strings: string[] }).strings.join("?");
  }
  return String(query ?? "");
}

function emptyDatabase(onQuery?: (sql: string, call: number) => unknown[]) {
  let call = 0;
  return {
    $queryRaw: async <T = unknown[]>(...args: unknown[]): Promise<T> => {
      call += 1;
      return (onQuery?.(sqlText(args[0]), call) ?? []) as T;
    }
  };
}

function publishedArticleRow(overrides: Record<string, unknown> = {}) {
  return {
    slug: "shipping-policy",
    locale: "en-CA",
    status: "published",
    title: "Shipping policy",
    excerpt: "Delivery coverage by region.",
    body: { blocks: [{ type: "paragraph", text: "Delivery coverage is listed by region." }], internalNote: "never expose this" },
    similarity: 0.81,
    ...overrides
  };
}

function activeProductRow(overrides: Record<string, unknown> = {}) {
  return {
    slug: "oak-cabinet",
    status: "active",
    name: "Oak cabinet",
    shortDescription: "Solid oak cabinet",
    description: "A durable cabinet.",
    specifications: "Width: 30 in; Internal note: hidden",
    similarity: 0.69,
    ...overrides
  };
}

test("inventory bins use the shared thresholds and never expose quantities", () => {
  assert.equal(getInventoryStatus(0), "out_of_stock");
  assert.equal(getInventoryStatus(3), "low_stock");
  assert.equal(getInventoryStatus(4), "in_stock");
  assert.equal(inventoryBin("out_of_stock", "en-CA"), "out of stock");
  assert.equal(inventoryBin("low_stock", "en-CA"), "limited");
  assert.equal(inventoryBin("low_stock", "zh-CN"), "库存紧张");
  assert.equal(inventoryBin("in_stock", "fr-CA"), "en stock");
});

test("unconfigured AI support returns a frontend fallback signal without network access", async () => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  for (const key of envKeys) delete process.env[key];
  let networkCalled = false;
  const app = new Hono().route("/", createAiSupportRoutes(async () => {
    networkCalled = true;
    throw new Error("network must not be called");
  }));
  try {
    const response = await app.request("/support/ai-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Where is my order?", locale: "en-CA" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: { fallback: true, reason: "unconfigured" } });
    assert.equal(networkCalled, false);
  } finally {
    restoreEnvironment(previous);
  }
});

test("RAG context is additive and never injects an empty knowledge block", () => {
  const empty: SupportKnowledge = { articles: [], products: [], chunks: [] };
  const tools = { inventory: [{ product: "Cabinet" }] };
  assert.deepEqual(supportContextWithKnowledge(tools, empty), tools);
  assert.ok(!("knowledge" in supportContextWithKnowledge({}, empty)));
  assert.deepEqual(supportContextWithKnowledge({}, {
    articles: [{ source: "article", slug: "shipping-policy", title: "Shipping policy", text: "Delivery coverage is listed by region.", similarity: 0.72 }],
    products: [],
    chunks: []
  }), {
    knowledge: {
      articles: [{ slug: "shipping-policy", title: "Shipping policy", text: "Delivery coverage is listed by region." }],
      products: [],
      chunks: []
    }
  });
  assert.deepEqual(supportContextWithKnowledge({}, {
    articles: [],
    products: [],
    chunks: [{ source: "chunk", slug: "docs/shipping.md", name: "Shipping", text: "Delivery coverage.", similarity: 0.8 }]
  }), {
    knowledge: {
      articles: [],
      products: [],
      chunks: [{ slug: "docs/shipping.md", name: "Shipping", text: "Delivery coverage." }]
    }
  });
});

test("RAG retrieval keeps published locale-matched articles and active product specifications", async () => {
  const queries: string[] = [];
  const database = emptyDatabase((sql, call) => {
    queries.push(sql);
    if (call === 1) return [publishedArticleRow()];
    if (call === 2) return [activeProductRow()];
    return [{ sourcePath: "docs/shipping.md", title: "Shipping", locale: "en-CA", audience: "public", text: "Delivery coverage is listed by region.", similarity: 0.77 }];
  });
  // Contract: topN=3 and pg_trgm `%` uses its default similarity threshold of 0.3.
  const result = await searchSupportKnowledge("shipping cabinet width", "en-CA", database);
  assert.equal(queries.length, 3);
  assert.match(queries[0] ?? "", /status = 'published'/);
  assert.match(queries[0] ?? "", /locale =/);
  assert.match(queries[0] ?? "", /%/);
  assert.match(queries[0] ?? "", /LIMIT/i);
  assert.match(queries[1] ?? "", /p\.status = 'active'/);
  assert.match(queries[2] ?? "", /support_knowledge_chunks/);
  assert.match(queries[2] ?? "", /audience = 'public'/);
  assert.match(queries[2] ?? "", /locale =/);
  assert.match(queries[2] ?? "", /coalesce\(text, ''\) \|\|/);
  assert.equal(result.chunks[0]?.slug, "docs/shipping.md");
  assert.equal(result.chunks[0]?.text, "Delivery coverage is listed by region.");

  assert.match(result.articles[0]?.text ?? "", /Delivery coverage is listed by region/);
  assert.doesNotMatch(result.articles[0]?.text ?? "", /never expose/);
  assert.equal(result.products[0]?.slug, "oak-cabinet");
  assert.match(result.products[0]?.text ?? "", /Width: 30 in/);
  assert.doesNotMatch(result.products[0]?.text ?? "", /Internal note/);
});

test("policy RAG ordering prioritizes warranty and return paths over product-like chunks", async () => {
  const queries: string[] = [];
  const database = emptyDatabase((sql, call) => {
    queries.push(sql);
    if (call === 1 || call === 2) return [];
    return [
      { sourcePath: "vanstro-kb-pack/dealer-services.md", title: "Dealer services", locale: "en-CA", audience: "public", text: "Dealer details", similarity: 0.99 },
      { sourcePath: "vanstro-kb-pack/return-policy.md", title: "Return policy", locale: "en-CA", audience: "public", text: "Returns within 30 days", similarity: 0.62 },
      { sourcePath: "vanstro-kb-ext-pack/warranty-cabinet-vanity-2026.md", title: "12-Month Warranty", locale: "en-CA", audience: "public", text: "Warranty coverage", similarity: 0.58 }
    ];
  });
  const result = await searchSupportKnowledge("Do you have a warranty?", "en-CA", database);
  const chunkSql = queries[2] ?? "";
  assert.match(chunkSql, /sourcePath.*~\*/i);
  assert.match(chunkSql, /title.*~\*/i);
  assert.match(chunkSql, /ORDER BY[\s\S]*CASE WHEN/i);
  assert.match(chunkSql, /LIMIT/i);
  assert.equal(result.chunks[0]?.slug, "vanstro-kb-ext-pack/warranty-cabinet-vanity-2026.md");
  assert.notEqual(result.chunks[0]?.slug, "vanstro-kb-pack/dealer-services.md");
  assert.equal(result.chunks.some((chunk) => chunk.slug.includes("warranty-cabinet-vanity-2026")), true);
});
test("RAG product fallback searches question tokens with ILIKE after no trgm hits", async () => {
  const queries: string[] = [];
  const database = emptyDatabase((sql, call) => {
    queries.push(sql);
    if (call === 1) return [];
    if (call === 2) return [];
    if (call === 3) return [];
    return [activeProductRow({ slug: "oak-cabinet-fallback" })];
  });
  const result = await searchSupportKnowledge("oak cabinet", "en-CA", database);
  assert.equal(queries.length, 4);
  assert.match(queries[1] ?? "", /p\.status = 'active'/);
  assert.match(queries[2] ?? "", /support_knowledge_chunks/);
  assert.match(queries[3] ?? "", /ILIKE/i);
  assert.match(queries[3] ?? "", /name|slug/i);
  assert.match(queries[3] ?? "", /LIMIT/i);
  assert.equal(result.products[0]?.slug, "oak-cabinet-fallback");
});
test("RAG hit text is capped at 600 characters and specifications keep first eight safe entries", async () => {
  const database = emptyDatabase((sql, call) => call === 1
    ? [publishedArticleRow({ title: "A".repeat(800), excerpt: null, body: null })]
    : [activeProductRow({ specifications: "One: 1; Two: 2; Three: 3; Four: 4; Five: 5; Six: 6; Seven: 7; Eight: 8; Nine: 9; Internal note: hidden" })]);
  const result = await searchSupportKnowledge("cabinet", "en-CA", database);
  assert.equal(result.articles[0]?.text.length, 600);
  assert.match(result.products[0]?.text ?? "", /Eight: 8/);
  assert.doesNotMatch(result.products[0]?.text ?? "", /Nine: 9|Internal note/);
});

test("unpublished and other-locale articles miss RAG even if the driver returns them", async () => {
  const queries: string[] = [];
  const database = emptyDatabase((sql, call) => {
    queries.push(sql);
    if (call === 1) {
      return [
        publishedArticleRow({ slug: "draft-shipping", status: "draft" }),
        publishedArticleRow({ slug: "fr-shipping", locale: "fr-CA" })
      ];
    }
    return [activeProductRow({ slug: "archived-cabinet", status: "archived" })];
  });
  const result = await searchSupportKnowledge("shipping policy", "en-CA", database);
  assert.match(queries[0] ?? "", /status = 'published'/);
  assert.match(queries[0] ?? "", /locale =/);
  assert.deepEqual(result, { articles: [], products: [], chunks: [] });
});

test("RAG route assembles shipping-policy Article context and product-spec Product context", async () => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.AI_SUPPORT_AZURE_ENDPOINT = "https://fixture.invalid";
  process.env.AI_SUPPORT_AZURE_API_KEY = "fixture-key";
  process.env.AI_SUPPORT_AZURE_DEPLOYMENT = "fixture-deployment";
  const prompts: string[] = [];
  const contexts: unknown[] = [];
  let query = 0;
  const database = emptyDatabase((_sql, _call) => {
    query += 1;
    if (query % 3 === 1) return [publishedArticleRow()];
    if (query % 3 === 2) return [activeProductRow({ specifications: "Width: 30 in" })];
    return [];
  });
  const app = new Hono().route("/", createAiSupportRoutes(async (_input, init) => {
    const request = new Request(_input, init);
    const payload = await request.json() as { messages: Array<{ content: string }> };
    const content = payload.messages[0]!.content;
    prompts.push(content);
    contexts.push(JSON.parse(content.split("Context: ")[1]!));
    return new Response(JSON.stringify({ choices: [{ message: { content: "Fixture reply" } }] }), { status: 200 });
  }, database));
  try {
    for (const message of ["What is the shipping policy?", "What is the cabinet width?"]) {
      const response = await app.request("/support/ai-chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, locale: "en-CA" }) });
      assert.equal(response.status, 200);
    }
    assert.match(prompts[0] ?? "", /don't know/i);
    assert.match(prompts[0] ?? "", /Contact page/);
    assert.match(prompts[0] ?? "", /policy page.*quote the concrete conditions/i);
    assert.equal((contexts[0] as { knowledge: { articles: Array<Record<string, unknown>> } }).knowledge.articles[0]?.slug, "shipping-policy");
    assert.equal((contexts[0] as { knowledge: { articles: Array<Record<string, unknown>> } }).knowledge.articles[0]?.similarity, undefined);
    assert.equal((contexts[1] as { knowledge: { products: Array<{ slug: string }> } }).knowledge.products[0]?.slug, "oak-cabinet");
  } finally {
    restoreEnvironment(previous);
  }
});

test("RAG route omits the knowledge block when there are no hits", async () => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.AI_SUPPORT_AZURE_ENDPOINT = "https://fixture.invalid";
  process.env.AI_SUPPORT_AZURE_API_KEY = "fixture-key";
  process.env.AI_SUPPORT_AZURE_DEPLOYMENT = "fixture-deployment";
  let system = "";
  const app = new Hono().route("/", createAiSupportRoutes(async (_input, init) => {
    const request = new Request(_input, init);
    const payload = await request.json() as { messages: Array<{ content: string }> };
    system = payload.messages[0]!.content;
    return new Response(JSON.stringify({ choices: [{ message: { content: "I don't know. Please use the Contact page." } }] }), { status: 200 });
  }, emptyDatabase()));
  try {
    const response = await app.request("/support/ai-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "What is the warranty on undocumented items?", locale: "en-CA" })
    });
    assert.equal(response.status, 200);
    assert.match(system, /don't know/i);
    assert.match(system, /Contact page/);
    const context = JSON.parse(system.split("Context: ")[1]!) as Record<string, unknown>;
    assert.equal("knowledge" in context, false);
  } finally {
    restoreEnvironment(previous);
  }
});

test("Azure support uses server-side configuration and returns only model text", async () => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.AI_SUPPORT_AZURE_ENDPOINT = "https://fixture.invalid/";
  process.env.AI_SUPPORT_AZURE_API_KEY = "fixture-key";
  process.env.AI_SUPPORT_AZURE_DEPLOYMENT = "fixture-deployment";
  let request: Request | undefined;
  const app = new Hono().route("/", createAiSupportRoutes(async (input, init) => {
    request = new Request(input, init);
    return new Response(JSON.stringify({ choices: [{ message: { content: "Fixture reply" } }] }), { status: 200 });
  }, emptyDatabase()));
  try {
    const response = await app.request("/support/ai-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "What is delivery?", locale: "fr-CA" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: { fallback: false, reply: "Fixture reply", handoff: false } });
    assert.equal(request?.url, "https://fixture.invalid/openai/v1/chat/completions");
    assert.equal(request?.headers.get("api-key"), "fixture-key");
    const requestBody = JSON.parse(await request!.clone().text()) as Record<string, unknown>;
    assert.equal(requestBody.max_completion_tokens, 4000);
    assert.equal(requestBody.reasoning_effort, "minimal");
  } finally {
    restoreEnvironment(previous);
  }
});

test("Azure 401 retries with the documented bearer header variant", async () => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.AI_SUPPORT_AZURE_ENDPOINT = "https://fixture.invalid";
  process.env.AI_SUPPORT_AZURE_API_KEY = "fixture-key";
  process.env.AI_SUPPORT_AZURE_DEPLOYMENT = "fixture-deployment";
  const requests: Request[] = [];
  const app = new Hono().route("/", createAiSupportRoutes(async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    return requests.length === 1
      ? new Response("upstream failure", { status: 401 })
      : new Response(JSON.stringify({ choices: [{ message: { content: "Retried reply" } }] }), { status: 200 });
  }, emptyDatabase()));
  try {
    const response = await app.request("/support/ai-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "What is delivery?", locale: "en-CA" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: { fallback: false, reply: "Retried reply", handoff: false } });
    assert.equal(requests.length, 2);
    assert.equal(requests[0]?.headers.get("api-key"), "fixture-key");
    assert.equal(requests[1]?.headers.get("authorization"), "Bearer fixture-key");
    assert.equal(requests[1]?.headers.get("api-key"), null);
  } finally {
    restoreEnvironment(previous);
  }
});

test("Azure failures expose stable reasons and never log credentials or response bodies", async () => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.AI_SUPPORT_AZURE_ENDPOINT = "https://fixture.invalid";
  process.env.AI_SUPPORT_AZURE_API_KEY = "fixture-secret-key";
  process.env.AI_SUPPORT_AZURE_DEPLOYMENT = "fixture-deployment";
  const originalWarn = console.warn;
  const logs: unknown[][] = [];
  console.warn = (...args: unknown[]) => logs.push(args);
  try {
    const app = new Hono().route("/", createAiSupportRoutes(async () => new Response("response-secret-body", { status: 500 }), emptyDatabase() as any));
    const response = await app.request("/support/ai-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "What is delivery?", locale: "en-CA" })
    });
    assert.deepEqual(await response.json(), { data: { fallback: true, reason: "upstream" } });
    assert.ok(logs.some((entry) => entry[0] === "http status" && entry[1] === 500));
    assert.ok(!JSON.stringify(logs).includes("fixture-secret-key"));
    assert.ok(!JSON.stringify(logs).includes("response-secret-body"));
  } finally {
    console.warn = originalWarn;
    restoreEnvironment(previous);
  }
});

test("Azure empty content and aborts have distinct public reasons", async () => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.AI_SUPPORT_AZURE_ENDPOINT = "https://fixture.invalid";
  process.env.AI_SUPPORT_AZURE_API_KEY = "fixture-key";
  process.env.AI_SUPPORT_AZURE_DEPLOYMENT = "fixture-deployment";
  const originalWarn = console.warn;
  const logs: unknown[][] = [];
  console.warn = (...args: unknown[]) => logs.push(args);
  try {
    const emptyApp = new Hono().route("/", createAiSupportRoutes(async () => new Response(JSON.stringify({ choices: [{ message: { content: "   " } }] }), { status: 200 }), emptyDatabase() as any));
    const emptyResponse = await emptyApp.request("/support/ai-chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "hello", locale: "en-CA" }) });
    assert.deepEqual(await emptyResponse.json(), { data: { fallback: true, reason: "empty" } });

    const abortApp = new Hono().route("/", createAiSupportRoutes(async () => { throw new DOMException("timed out", "AbortError"); }, emptyDatabase() as any));
    const abortResponse = await abortApp.request("/support/ai-chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "hello", locale: "en-CA" }) });
    assert.deepEqual(await abortResponse.json(), { data: { fallback: true, reason: "timeout" } });
    assert.ok(logs.some((entry) => entry[0] === "abort"));
  } finally {
    console.warn = originalWarn;
    restoreEnvironment(previous);
  }
});
test("pg_trgm RAG hits published locale content and misses unpublished or other-locale rows", { skip: !process.env.DATABASE_URL }, async () => {
  const { prisma, Prisma } = await import("@vanstro/db");
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const publishedSlug = `shipping-policy-${suffix}`;
  const draftSlug = `draft-shipping-${suffix}`;
  const otherLocaleSlug = `shipping-policy-fr-${suffix}`;
  const productSlug = `oak-cabinet-${suffix}`;
  const archivedSlug = `archived-cabinet-${suffix}`;
  const articleIds: string[] = [];
  const productIds: string[] = [];
  await prisma.$executeRaw(Prisma.sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  try {
    const published = await prisma.article.create({
      data: {
        slug: publishedSlug,
        locale: "en-CA",
        title: "Shipping policy",
        excerpt: "VanStroRagShippingCoverage by region.",
        body: { blocks: [{ text: "VanStroRagShippingCoverage is listed by region." }], internalNote: "never expose this" },
        status: "published",
        publishedAt: new Date()
      }
    });
    articleIds.push(published.id);
    const draft = await prisma.article.create({
      data: {
        slug: draftSlug,
        locale: "en-CA",
        title: "Draft shipping policy",
        excerpt: "VanStroRagShippingCoverage draft only.",
        body: { blocks: [{ text: "VanStroRagShippingCoverage unpublished draft." }] },
        status: "draft"
      }
    });
    articleIds.push(draft.id);
    const otherLocale = await prisma.article.create({
      data: {
        slug: otherLocaleSlug,
        locale: "fr-CA",
        title: "Politique d'expedition",
        excerpt: "VanStroRagShippingCoverage en francais.",
        body: { blocks: [{ text: "VanStroRagShippingCoverage pour le Quebec." }] },
        status: "published",
        publishedAt: new Date()
      }
    });
    articleIds.push(otherLocale.id);
    const product = await prisma.product.create({
      data: {
        slug: productSlug,
        name: "Oak cabinet VanStroRagOakCabinetWidth",
        shortDescription: "Solid oak cabinet",
        description: "A durable cabinet.",
        status: "active",
        specifications: {
          create: [
            { key: "Width", value: "30 in", sortOrder: 0 },
            { key: "Internal note", value: "hidden cost", sortOrder: 1 }
          ]
        }
      }
    });
    productIds.push(product.id);
    const archived = await prisma.product.create({
      data: {
        slug: archivedSlug,
        name: "Archived VanStroRagOakCabinetWidth",
        shortDescription: "Should not be retrieved",
        description: "Archived cabinet.",
        status: "archived"
      }
    });
    productIds.push(archived.id);

    // Contract: topN=5 and pg_trgm `%` uses its default similarity threshold of 0.3.
    const articleHit = await searchSupportKnowledge("VanStroRagShippingCoverage", "en-CA", prisma);
    assert.equal(articleHit.articles.some((row) => row.slug === publishedSlug), true);
    assert.equal(articleHit.articles.some((row) => row.slug === draftSlug), false);
    assert.equal(articleHit.articles.some((row) => row.slug === otherLocaleSlug), false);
    assert.doesNotMatch(articleHit.articles.find((row) => row.slug === publishedSlug)?.text ?? "", /never expose/);

    const otherLocaleMiss = await searchSupportKnowledge("VanStroRagShippingCoverage", "zh-CN", prisma);
    assert.equal(otherLocaleMiss.articles.some((row) => row.slug === publishedSlug), false);
    assert.equal(otherLocaleMiss.articles.some((row) => row.slug === otherLocaleSlug), false);

    const productHit = await searchSupportKnowledge("VanStroRagOakCabinetWidth", "en-CA", prisma);
    assert.equal(productHit.products.some((row) => row.slug === productSlug), true);
    assert.equal(productHit.products.some((row) => row.slug === archivedSlug), false);
    assert.match(productHit.products.find((row) => row.slug === productSlug)?.text ?? "", /Width: 30 in/);
    assert.doesNotMatch(productHit.products.find((row) => row.slug === productSlug)?.text ?? "", /hidden cost/);
  } finally {
    if (productIds.length) await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    if (articleIds.length) await prisma.article.deleteMany({ where: { id: { in: articleIds } } });
  }
});
