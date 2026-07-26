import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { publicError } from "../public-errors.js";

const SUPPORTED_LOCALES = new Set(["en-CA", "fr-CA"]);

function resolveLocale(context: { req: { query: (key: string) => string | undefined } }) {
  const requested = context.req.query("locale");
  return requested && SUPPORTED_LOCALES.has(requested) ? requested : "en-CA";
}

async function readPublishedModule(moduleKey: string, locale: string) {
  const record = await prisma.siteContentModule.findFirst({
    where: { moduleKey, locale, status: "published" }
  });
  if (record) return record;
  // Fall back to en-CA published content when a locale-specific version is absent.
  return prisma.siteContentModule.findFirst({ where: { moduleKey, locale: "en-CA", status: "published" } });
}

/**
 * Public, read-only CMS endpoints consumed by the storefront at build time.
 * Only `published` content is ever returned. Locale falls back to en-CA.
 */
export function createCmsRoutes() {
  const routes = new Hono();

  routes.get("/navigation", async (context) => {
    const locale = resolveLocale(context);
    const record = await readPublishedModule("navigation", locale);
    return context.json({ data: record?.payload ?? { primaryItems: [], productMenuItems: [], utilityItems: [] }, meta: { locale } });
  });

  routes.get("/footer", async (context) => {
    const locale = resolveLocale(context);
    const record = await readPublishedModule("footer", locale);
    return context.json({ data: record?.payload ?? { contactLines: [], linkGroups: [], socialChannels: [], legalLinks: [] }, meta: { locale } });
  });

  routes.get("/legal-pages/:slug", async (context) => {
    const locale = resolveLocale(context);
    const slug = context.req.param("slug");
    const page =
      (await prisma.legalPage.findFirst({ where: { slug, locale, status: "published" } })) ??
      (await prisma.legalPage.findFirst({ where: { slug, locale: "en-CA", status: "published" } }));
    if (!page) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Legal page not found.");
    return context.json({
      data: { slug: page.slug, locale: page.locale, title: page.title, summary: page.summary, sections: page.sections },
      meta: { locale }
    });
  });

  routes.get("/articles", async (context) => {
    const locale = resolveLocale(context);
    const articles = await prisma.article.findMany({
      where: { locale, status: "published" },
      orderBy: { publishedAt: "desc" }
    });
    return context.json({
      data: articles.map((article) => ({
        slug: article.slug,
        locale: article.locale,
        title: article.title,
        excerpt: article.excerpt,
        category: article.category,
        publishedAt: article.publishedAt?.toISOString() ?? null
      })),
      meta: { locale }
    });
  });

  routes.get("/articles/:slug", async (context) => {
    const locale = resolveLocale(context);
    const slug = context.req.param("slug");
    const article =
      (await prisma.article.findFirst({ where: { slug, locale, status: "published" } })) ??
      (await prisma.article.findFirst({ where: { slug, locale: "en-CA", status: "published" } }));
    if (!article) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Article not found.");
    return context.json({
      data: {
        slug: article.slug,
        locale: article.locale,
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        category: article.category,
        publishedAt: article.publishedAt?.toISOString() ?? null
      },
      meta: { locale }
    });
  });

  return routes;
}
