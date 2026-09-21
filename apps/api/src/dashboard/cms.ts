import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { type DashboardEnv, writeAudit } from "./access.js";
import {
  badRequest,
  notFound,
  optionalJson,
  optionalRecord,
  optionalString,
  pageMeta,
  parsePagination,
  readBody
} from "./request.js";

const SUPPORTED_LOCALES = new Set(["en-CA", "fr-CA"]);
const CONTENT_STATUSES = new Set(["draft", "published", "archived"]);

function resolveLocale(value: string | undefined) {
  return value && SUPPORTED_LOCALES.has(value) ? value : "en-CA";
}

/** Dashboard-managed content (CMS). Single source of truth per Pattern A. */
export function createDashboardCmsRoutes() {
  const routes = new Hono<DashboardEnv>();

  // --- Single-instance modules: navigation, home-page, footer ---
  for (const moduleKey of ["navigation", "home-page", "footer"] as const) {
    routes.get(`/dashboard/${moduleKey}`, async (context) => {
      const locale = resolveLocale(context.req.query("locale"));
      const record = await prisma.siteContentModule.findUnique({
        where: { moduleKey_locale: { moduleKey, locale } }
      });
      return context.json({ data: record, meta: { locale } });
    });

    routes.put(`/dashboard/${moduleKey}`, async (context) => {
      const body = await readBody(context);
      if (!body) return badRequest(context, "JSON body is required.");
      const locale = resolveLocale(optionalString(body, "locale"));
      const status = optionalString(body, "status") ?? "draft";
      const payload = optionalRecord(body, "payload");
      if (!CONTENT_STATUSES.has(status)) return badRequest(context, "status must be draft, published or archived.");
      if (!payload) return badRequest(context, "payload object is required.");

      const record = await prisma.siteContentModule.upsert({
        where: { moduleKey_locale: { moduleKey, locale } },
        update: { status, payload, updatedByUserId: context.get("actorUserId") },
        create: { moduleKey, locale, status, payload, updatedByUserId: context.get("actorUserId") }
      });
      await writeAudit(context, `dashboard.content.${moduleKey}.upsert`, "site_content_module", record.id);
      return context.json({ data: record });
    });
  }

  // --- Legal pages ---
  routes.get("/dashboard/legal-pages", async (context) => {
    const pagination = parsePagination(context);
    const [pages, total] = await Promise.all([
      prisma.legalPage.findMany({ orderBy: [{ slug: "asc" }, { locale: "asc" }], skip: pagination.skip, take: pagination.take }),
      prisma.legalPage.count()
    ]);
    return context.json({ data: pages, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/legal-pages/:slug", async (context) => {
    const locale = resolveLocale(context.req.query("locale"));
    const record = await prisma.legalPage.findUnique({
      where: { slug_locale: { slug: context.req.param("slug"), locale } }
    });
    if (!record) return notFound(context, "Legal page not found.");
    return context.json({ data: record, meta: { locale } });
  });

  routes.put("/dashboard/legal-pages/:slug", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const slug = context.req.param("slug");
    const locale = resolveLocale(optionalString(body, "locale"));
    const title = optionalString(body, "title");
    const status = optionalString(body, "status") ?? "draft";
    const summary = optionalString(body, "summary");
    const sections = optionalJson(body, "sections");
    if (!title) return badRequest(context, "title is required.");
    if (!CONTENT_STATUSES.has(status)) return badRequest(context, "status must be draft, published or archived.");
    if (sections === undefined) return badRequest(context, "sections array is required.");

    const record = await prisma.legalPage.upsert({
      where: { slug_locale: { slug, locale } },
      update: { title, summary, sections, status, updatedByUserId: context.get("actorUserId") },
      create: { slug, locale, title, summary, sections, status, updatedByUserId: context.get("actorUserId") }
    });
    await writeAudit(context, "dashboard.content.legal_pages.upsert", "legal_page", record.id);
    return context.json({ data: record });
  });

  // --- Articles ---
  routes.get("/dashboard/articles", async (context) => {
    const pagination = parsePagination(context);
    const [articles, total] = await Promise.all([
      prisma.article.findMany({ orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      prisma.article.count()
    ]);
    return context.json({ data: articles, meta: pageMeta(pagination, total) });
  });

  routes.post("/dashboard/articles", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const slug = optionalString(body, "slug");
    const locale = resolveLocale(optionalString(body, "locale"));
    const title = optionalString(body, "title");
    const status = optionalString(body, "status") ?? "draft";
    const excerpt = optionalString(body, "excerpt");
    const category = optionalString(body, "category");
    const bodyContent = optionalRecord(body, "body");
    if (!slug || !title) return badRequest(context, "slug and title are required.");
    if (!CONTENT_STATUSES.has(status)) return badRequest(context, "status must be draft, published or archived.");
    if (!bodyContent) return badRequest(context, "body object is required.");

    const article = await prisma.article.create({
      data: {
        slug,
        locale,
        title,
        excerpt,
        category,
        body: bodyContent,
        status,
        publishedAt: status === "published" ? new Date() : null,
        updatedByUserId: context.get("actorUserId")
      }
    });
    await writeAudit(context, "dashboard.content.articles.create", "article", article.id);
    return context.json({ data: article }, 201);
  });

  routes.patch("/dashboard/articles/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const status = optionalString(body, "status");
    if (status && !CONTENT_STATUSES.has(status)) return badRequest(context, "status must be draft, published or archived.");

    const article = await prisma.article.update({
      where: { id: context.req.param("id") },
      data: {
        title: optionalString(body, "title"),
        excerpt: optionalString(body, "excerpt"),
        category: optionalString(body, "category"),
        body: optionalRecord(body, "body"),
        status,
        publishedAt: status === "published" ? new Date() : undefined,
        updatedByUserId: context.get("actorUserId")
      }
    });
    await writeAudit(context, "dashboard.content.articles.update", "article", article.id);
    return context.json({ data: article });
  });

  routes.delete("/dashboard/articles/:id", async (context) => {
    const article = await prisma.article.update({
      where: { id: context.req.param("id") },
      data: { status: "archived", updatedByUserId: context.get("actorUserId") }
    });
    await writeAudit(context, "dashboard.content.articles.archive", "article", article.id);
    return context.json({ data: { id: article.id, status: article.status } });
  });

  return routes;
}
