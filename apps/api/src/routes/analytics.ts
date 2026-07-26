import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { publicError } from "../public-errors.js";

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function createAnalyticsRoutes() {
  const routes = new Hono();

  routes.post("/analytics/pageviews", async (context) => {
    const body = (await context.req.json().catch(() => null)) as Record<string, unknown> | null;
    const path = optionalString(body?.path);
    const sessionId = optionalString(body?.sessionId);
    const consentAnalytics = body?.consentAnalytics === true;
    if (!consentAnalytics) {
      return publicError(context, 400, "PRIVACY_CONSENT_INVALID", "Analytics consent is required.");
    }
    if (!path || !sessionId || path.length > 500 || sessionId.length > 128) {
      return publicError(context, 400, "COMMERCE_INVALID", "path and sessionId are required.");
    }
    if (!path.startsWith("/")) {
      return publicError(context, 400, "COMMERCE_INVALID", "path must be a site-relative path.");
    }

    const event = await prisma.pageViewEvent.create({
      data: {
        path,
        sessionId,
        referrer: optionalString(body?.referrer)?.slice(0, 1000),
        locale: optionalString(body?.locale)?.slice(0, 16),
        utmSource: optionalString(body?.utmSource)?.slice(0, 100),
        utmMedium: optionalString(body?.utmMedium)?.slice(0, 100),
        utmCampaign: optionalString(body?.utmCampaign)?.slice(0, 100)
      }
    });

    return context.json({ data: { id: event.id, createdAt: event.createdAt.toISOString() } }, 201);
  });

  return routes;
}
