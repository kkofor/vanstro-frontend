import { prisma, type Prisma } from "@vanstro/db";
import { Hono } from "hono";
import { type DashboardEnv, writeAudit } from "./access.js";
import { badRequest, notFound, optionalJson, optionalRecord, optionalString, readBody } from "./request.js";

const SUPPORTED_LOCALES = new Set(["en-CA", "fr-CA"]);
const CONTENT_STATUSES = new Set(["draft", "published", "archived"]);

const MODULE_KEY_MAP: Record<string, { moduleKey: string; path: string }> = {
  navigation: { moduleKey: "navigation", path: "/dashboard/navigation" },
  homeHero: { moduleKey: "home-page", path: "/dashboard/home-page" },
  homeCategories: { moduleKey: "catalog", path: "/dashboard/catalog" },
  catalogCategories: { moduleKey: "catalog", path: "/dashboard/catalog" },
  catalogFilters: { moduleKey: "catalog", path: "/dashboard/catalog" },
  footer: { moduleKey: "footer", path: "/dashboard/footer" },
  dealerProgram: { moduleKey: "dealer_portal", path: "/dashboard/dealer-portal/settings" },
  storefront: { moduleKey: "storefront_config", path: "/dashboard/storefront/config" }
};

function resolveLocale(value: string | undefined) {
  return value && SUPPORTED_LOCALES.has(value) ? value : "en-CA";
}

async function upsertSiteModule(
  moduleKey: string,
  locale: string,
  status: string,
  payload: Prisma.InputJsonObject,
  actorUserId: string
) {
  return prisma.siteContentModule.upsert({
    where: { moduleKey_locale: { moduleKey, locale } },
    update: { status, payload, updatedByUserId: actorUserId },
    create: { moduleKey, locale, status, payload, updatedByUserId: actorUserId }
  });
}

/** Pattern B module adapter over SiteContentModule (Pattern A). */
export function createDashboardModuleRoutes() {
  const routes = new Hono<DashboardEnv>();

  for (const path of ["/dashboard/catalog", "/dashboard/storefront/config", "/dashboard/dealer-portal/settings"] as const) {
    const moduleKey =
      path === "/dashboard/catalog"
        ? "catalog"
        : path === "/dashboard/storefront/config"
          ? "storefront_config"
          : "dealer_portal";

    routes.get(path, async (context) => {
      const locale = resolveLocale(context.req.query("locale"));
      const record = await prisma.siteContentModule.findUnique({
        where: { moduleKey_locale: { moduleKey, locale } }
      });
      return context.json({ data: record, meta: { locale, moduleKey } });
    });

    routes.put(path, async (context) => {
      const body = await readBody(context);
      if (!body) return badRequest(context, "JSON body is required.");
      const locale = resolveLocale(optionalString(body, "locale"));
      const status = optionalString(body, "status") ?? "draft";
      const payload = optionalRecord(body, "payload");
      if (!CONTENT_STATUSES.has(status)) return badRequest(context, "status must be draft, published or archived.");
      if (!payload) return badRequest(context, "payload object is required.");
      const record = await upsertSiteModule(moduleKey, locale, status, payload as Prisma.InputJsonObject, context.get("actorUserId"));
      await writeAudit(context, `dashboard.modules.${moduleKey}.upsert`, "site_content_module", record.id);
      return context.json({ data: record, meta: { locale, moduleKey } });
    });
  }

  routes.get("/dashboard/modules/readiness", async (context) => {
    const modules = await prisma.siteContentModule.findMany({
      where: { status: "published" },
      select: { moduleKey: true, locale: true, updatedAt: true }
    });
    const published = new Set(modules.map((module) => `${module.moduleKey}:${module.locale}`));
    const readiness = Object.entries(MODULE_KEY_MAP).map(([key, config]) => ({
      moduleKey: key,
      backendModuleKey: config.moduleKey,
      locales: ["en-CA", "fr-CA"].map((locale) => ({
        locale,
        published: published.has(`${config.moduleKey}:${locale}`),
        endpoint: config.path
      }))
    }));
    return context.json({ data: readiness });
  });

  routes.get("/dashboard/modules/:moduleKey", async (context) => {
    const config = MODULE_KEY_MAP[context.req.param("moduleKey")];
    if (!config) return notFound(context, "Unknown dashboard module key.");
    const locale = resolveLocale(context.req.query("locale"));
    const record = await prisma.siteContentModule.findUnique({
      where: { moduleKey_locale: { moduleKey: config.moduleKey, locale } }
    });
    return context.json({ data: record, meta: { moduleKey: context.req.param("moduleKey"), locale, backendModuleKey: config.moduleKey } });
  });

  routes.put("/dashboard/modules/:moduleKey", async (context) => {
    const config = MODULE_KEY_MAP[context.req.param("moduleKey")];
    if (!config) return notFound(context, "Unknown dashboard module key.");
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const locale = resolveLocale(optionalString(body, "locale"));
    const status = optionalString(body, "status") ?? "draft";
    const payload = optionalRecord(body, "payload") ?? (optionalJson(body, "payload") as Record<string, unknown> | undefined);
    if (!CONTENT_STATUSES.has(status)) return badRequest(context, "status must be draft, published or archived.");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return badRequest(context, "payload object is required.");
    const record = await upsertSiteModule(config.moduleKey, locale, status, payload as Prisma.InputJsonObject, context.get("actorUserId"));
    await writeAudit(context, `dashboard.modules.${context.req.param("moduleKey")}.upsert`, "site_content_module", record.id);
    return context.json({ data: record, meta: { moduleKey: context.req.param("moduleKey"), locale } });
  });

  return routes;
}
