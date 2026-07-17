import { prisma } from "@vanstro/db";
import { Hono } from "hono";

function isPreferences(value: unknown): value is {
  strictlyNecessary: true;
  functional: boolean;
  analytics: boolean;
  targeting: boolean;
} {
  return Boolean(value) && typeof value === "object" &&
    (value as Record<string, unknown>).strictlyNecessary === true &&
    typeof (value as Record<string, unknown>).functional === "boolean" &&
    typeof (value as Record<string, unknown>).analytics === "boolean" &&
    typeof (value as Record<string, unknown>).targeting === "boolean";
}

export function createPrivacyRoutes() {
  const routes = new Hono();

  routes.post("/privacy/consent-events", async (context) => {
    const body = await context.req.json().catch(() => null) as {
      anonymousId?: unknown;
      source?: unknown;
      preferences?: unknown;
    } | null;

    if (
      !body ||
      typeof body.anonymousId !== "string" ||
      !body.anonymousId.trim() ||
      typeof body.source !== "string" ||
      !body.source.trim() ||
      !isPreferences(body.preferences)
    ) {
      return context.json({ error: "anonymousId, source and cookie preferences are required." }, 400);
    }

    const event = await prisma.privacyConsentEvent.create({
      data: {
        anonymousId: body.anonymousId.trim(),
        source: body.source.trim(),
        preferences: body.preferences
      }
    });

    return context.json({ data: { id: event.id, createdAt: event.createdAt.toISOString() } }, 201);
  });

  return routes;
}
