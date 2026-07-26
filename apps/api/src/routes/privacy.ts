import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { publicError } from "../public-errors.js";

const CONSENT_SOURCES = ["accept-all", "custom", "reject-all", "essential-only"] as const;
const MAX_ANONYMOUS_ID_LENGTH = 128;
const MAX_SOURCE_LENGTH = 32;

type ConsentSource = (typeof CONSENT_SOURCES)[number];
type CanonicalPreferences = {
  strictlyNecessary: true;
  functional: boolean;
  analytics: boolean;
  targeting: boolean;
};
type ConsentAction = "granted" | "updated" | "withdrawn";
type PrivacyConsentDatabase = Pick<typeof prisma, "privacyConsentEvent">;

function canonicalPreferences(value: unknown): CanonicalPreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    input.strictlyNecessary !== true ||
    typeof input.functional !== "boolean" ||
    typeof input.analytics !== "boolean" ||
    typeof input.targeting !== "boolean"
  ) {
    return null;
  }

  return {
    strictlyNecessary: true,
    functional: input.functional,
    analytics: input.analytics,
    targeting: input.targeting
  };
}

function isConsentSource(value: string): value is ConsentSource {
  return value.length <= MAX_SOURCE_LENGTH && CONSENT_SOURCES.includes(value as ConsentSource);
}

function preferencesMatchSource(source: ConsentSource, preferences: CanonicalPreferences) {
  const allEnabled = preferences.functional && preferences.analytics && preferences.targeting;
  const allDisabled = !preferences.functional && !preferences.analytics && !preferences.targeting;

  if (source === "accept-all") return allEnabled;
  if (source === "reject-all" || source === "essential-only") return allDisabled;
  return true;
}

function consentAction(source: ConsentSource, preferences: CanonicalPreferences): ConsentAction {
  if (!preferences.functional && !preferences.analytics && !preferences.targeting) {
    return "withdrawn";
  }
  return source === "custom" ? "updated" : "granted";
}

export function createPrivacyRoutes(database: PrivacyConsentDatabase = prisma) {
  const routes = new Hono();

  routes.post("/privacy/consent-events", async (context) => {
    const body = await context.req.json().catch(() => null) as {
      anonymousId?: unknown;
      source?: unknown;
      preferences?: unknown;
    } | null;
    const anonymousId = typeof body?.anonymousId === "string" ? body.anonymousId.trim() : "";
    const source = typeof body?.source === "string" ? body.source.trim() : "";
    const preferences = canonicalPreferences(body?.preferences);

    if (
      !anonymousId ||
      anonymousId.length > MAX_ANONYMOUS_ID_LENGTH ||
      !source ||
      !isConsentSource(source) ||
      !preferences ||
      !preferencesMatchSource(source, preferences)
    ) {
      return publicError(
        context,
        400,
        "PRIVACY_CONSENT_INVALID",
        "anonymousId, source and cookie preferences are required."
      );
    }

    try {
      const event = await database.privacyConsentEvent.create({
        data: {
          anonymousId,
          source,
          action: consentAction(source, preferences),
          preferences
        }
      });

      return context.json({ data: { id: event.id, createdAt: event.createdAt.toISOString() } }, 201);
    } catch {
      return publicError(
        context,
        500,
        "PRIVACY_CONSENT_FAILED",
        "Cookie preferences could not be recorded. Please try again."
      );
    }
  });

  return routes;
}
