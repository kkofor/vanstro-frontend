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
    const consentAnonymousId = optionalString(body?.consentAnonymousId);
    const consentAnalytics = body?.consentAnalytics === true;
    if (!consentAnalytics || !consentAnonymousId) {
      return publicError(context, 400, "PRIVACY_CONSENT_INVALID", "Analytics consent is required.");
    }
    const consent = await prisma.privacyConsentEvent.findFirst({
      where: {
        anonymousId: consentAnonymousId,
        preferences: { path: ["analytics"], equals: true }
      },
      orderBy: { createdAt: "desc" }
    });
    if (!consent) {
      return publicError(context, 403, "PRIVACY_CONSENT_INVALID", "A recorded analytics consent is required.");
    }
    if (!path || !sessionId || !consentAnonymousId || path.length > 500 || sessionId.length > 128 || consentAnonymousId.length > 128) {
      return publicError(context, 400, "COMMERCE_INVALID", "path and sessionId are required.");
    }
    if (!path.startsWith("/")) {
      return publicError(context, 400, "COMMERCE_INVALID", "path must be a site-relative path.");
    }
    const sensitivePath = /^(\/dashboard|\/account|\/auth|\/checkout|\/orders|\/payment)/.test(path);
    if (sensitivePath) {
      return publicError(context, 400, "PRIVACY_CONSENT_INVALID", "Sensitive paths are not tracked.");
    }

    const event = await prisma.pageViewEvent.create({
      data: {
        path,
        sessionId,
        referrer: (() => {
          const raw = optionalString(body?.referrer);
          if (!raw) return undefined;
          try {
            const url = new URL(raw);
            return `${url.origin}${url.pathname}`.slice(0, 1000);
          } catch {
            return undefined;
          }
        })(),
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
