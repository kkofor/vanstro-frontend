import { createHash, randomUUID } from "node:crypto";
import { prisma, Prisma } from "@vanstro/db";
import { Hono } from "hono";
import type { DashboardEnv } from "./access.js";
import { permissionGrant } from "./authorization.js";
import { publicError } from "../public-errors.js";
import {
  createP10SubjectAssertionProvider,
  P10AssertionUnavailableError,
  type P10SubjectAssertionProvider,
} from "../p10-subject-assertion-provider.js";

export const P10_CONTRACT = "analytics-foundation.v1";
export const EVENT = "foundation.analytics.observed.v1";
export const EVENT_SCHEMA = "analytics-event-schema.v1";
export const EVENT_FINGERPRINT = createHash("sha256").update(`${EVENT}:${EVENT_SCHEMA}:category,value`).digest("hex");
export const METRICS_FOR_TEST = [
  { key: "foundation.events.count.v1", version: "metric-definition.v1", unit: "events", windows: ["24h", "7d"], dimensions: ["category"], freshnessSeconds: 60 },
  { key: "foundation.events.engagement_rate.v1", version: "metric-definition.v1", unit: "ratio", windows: ["24h", "7d"], dimensions: [], freshnessSeconds: 60 },
] as const;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sqlJson = (value: Record<string, unknown>) => `{"value": ${JSON.stringify(value.value)}, "category": ${JSON.stringify(value.category)}}`;
const ingestIntentHash = (input: { eventId: string; resourceId: string; occurred: Date; dimensions: Record<string, unknown>; subjectDigest: Buffer; kid: string; epoch: string; contextRevision: string; targetRevision: bigint; signerId: string; nonce: string; requestId: string }) => createHash("sha256").update([
  input.eventId, input.resourceId, String(Math.floor(input.occurred.getTime() / 1000)), sqlJson(input.dimensions), input.subjectDigest.toString("hex"), input.kid, input.epoch,
  "analytics.ingest", input.contextRevision, String(input.targetRevision), input.signerId, input.nonce, input.requestId,
].join("|"), "utf8").digest("hex");
const INGEST_BODY_KEYS = new Set(["eventName", "schemaVersion", "occurredAt", "resourceId", "category", "value"]);

function scope(context: any, permission: string) {
  const authorization = context.get("p02Authorization");
  const grant = permissionGrant(authorization, permission);
  if (!grant) return undefined;
  return {
    actorId: authorization.actorId,
    contextRevision: authorization.contextRevision,
    kind: grant.global ? "global" : grant.locationIds.length ? "location" : "dealer",
    dealerIds: grant.global ? [] : grant.dealerIds,
    locationIds: grant.global ? [] : grant.locationIds,
    sessionHash: context.get("actorSessionTokenHash"),
  };
}
function queryScope(row: any, value: any) {
  return row.authorizationScopeKind === value.kind && JSON.stringify(row.dealerIds) === JSON.stringify(value.dealerIds) && JSON.stringify(row.locationIds) === JSON.stringify(value.locationIds);
}
function releaseFamily(row: unknown) {
  if (row && typeof row === "object" && "p10_list_release_day_v3" in row) return (row as Record<string, unknown>).p10_list_release_day_v3;
  return row;
}

export function createDashboardAnalyticsFoundationRoutes(provider: P10SubjectAssertionProvider = createP10SubjectAssertionProvider()) {
  const routes = new Hono<DashboardEnv>();
  routes.get("/dashboard/analytics/foundation/registry", (context) => {
    const bound = scope(context, "analytics.registry.read");
    if (!bound) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Analytics resource unavailable.");
    return context.json({ data: { contractVersion: P10_CONTRACT, eventRegistryVersion: "analytics-event-registry.v1", metricRegistryVersion: "analytics-metric-registry.v1", events: [{ name: EVENT, version: EVENT_SCHEMA, owner: "P10", consentClass: "analytics", fields: { category: ["view", "engage"], value: { minimum: 0, maximum: 100 } }, retentionDays: 30 }], metrics: METRICS_FOR_TEST, providerSink: { state: provider.mode === "disabled" ? "disabled" : "owned", network: false }, contextRevision: bound.contextRevision, scope: { kind: bound.kind, dealerIds: bound.dealerIds, locationIds: bound.locationIds } } });
  });
  routes.post("/dashboard/analytics/events", async (context) => {
    const bound = scope(context, "analytics.ingest");
    const body = await context.req.json().catch(() => null) as Record<string, any> | null;
    const idempotency = context.req.header("Idempotency-Key");
    if (!bound || !body || !idempotency || Object.keys(body).length !== INGEST_BODY_KEYS.size || Object.keys(body).some((key) => !INGEST_BODY_KEYS.has(key)) || body.eventName !== EVENT || body.schemaVersion !== EVENT_SCHEMA || !["view", "engage"].includes(body.category) || !Number.isInteger(body.value) || body.value < 0 || body.value > 100 || typeof body.resourceId !== "string" || body.resourceId.length > 64) {
      return publicError(context, 400, "DASHBOARD_INVALID", "Analytics event is invalid.");
    }
    const occurredInput = new Date(body.occurredAt);
    if (!Number.isFinite(+occurredInput)) return publicError(context, 400, "DASHBOARD_INVALID", "Analytics time is invalid.");
    const occurred = new Date(Math.floor(occurredInput.getTime() / 1000) * 1000);
    const dimensions = { category: body.category, value: body.value };
    const idempotencyHash = hash(idempotency);
    let assertion;
    let eventId: string;
    let requestId: string;
    try {
      const prepared = provider.prepare(bound.actorId, idempotencyHash);
      eventId = prepared.eventId;
      requestId = prepared.requestId;
      const intentHash = ingestIntentHash({ eventId, resourceId: body.resourceId, occurred, dimensions, subjectDigest: prepared.subjectDigest, kid: prepared.signerKid, epoch: prepared.signerEpoch, contextRevision: bound.contextRevision, targetRevision: 0n, signerId: prepared.signerId, nonce: prepared.nonce, requestId });
      assertion = await provider.create({ userId: bound.actorId, sessionId: context.get("actorSessionId"), sessionTokenHash: bound.sessionHash, operation: "analytics.ingest", idempotencyHash, intentHash, subjectDigest: prepared.subjectDigest, nonce: prepared.nonce, expiresAt: prepared.expiresAt });
    } catch (error) {
      if (error instanceof P10AssertionUnavailableError) return publicError(context, 503, "ANALYTICS_INGESTION_UNAVAILABLE", "Analytics ingestion is unavailable.");
      throw error;
    }
    try {
      const rows = await prisma.$queryRaw<Array<{ fact_id: string | null; success_audit_event_id: string | null; outcome: string }>>(Prisma.sql`SELECT * FROM public.p10_ingest_event_v5(${bound.sessionHash},${body.resourceId},${bound.contextRevision},0::bigint,${eventId}::uuid,${occurred},${JSON.stringify(dimensions)}::jsonb,${idempotencyHash},${requestId},${assertion.subjectDigest},${assertion.signerKid},${assertion.signerEpoch},${assertion.expiresAt},${assertion.nonce},${assertion.signerId},${assertion.signature})`);
      const row = rows[0];
      if (!row) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Analytics resource unavailable.");
      if (row.outcome === "conflict") return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "Analytics replay conflicts.");
      if (row.outcome === "denied" || row.outcome === "invalid") return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Analytics resource unavailable.");
      return context.json({ data: { id: row.fact_id, replayed: row.outcome === "replay", auditId: row.success_audit_event_id } }, row.outcome === "replay" ? 200 : 201);
    } catch (error) {
      return String(error).includes("IDEMPOTENCY") ? publicError(context, 409, "IDEMPOTENCY_CONFLICT", "Analytics replay conflicts.") : publicError(context, 404, "DASHBOARD_NOT_FOUND", "Analytics resource unavailable.");
    }
  });
  routes.get("/dashboard/analytics/releases/:releaseDay", async (context) => {
    const bound = scope(context, "analytics.release.read");
    const releaseDay = context.req.param("releaseDay");
    if (!bound || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDay)) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Analytics release unavailable.");
    try {
      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM public.p10_list_release_day_v3(${bound.sessionHash},${releaseDay}::date,${bound.contextRevision})`);
      return context.json({ data: rows.map(releaseFamily) });
    } catch {
      return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Analytics release unavailable.");
    }
  });
  routes.get("/dashboard/analytics/foundation/metrics", (context) => { const bound = scope(context, "analytics.metrics.read"); if (!bound) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Analytics resource unavailable."); return context.json({ data: METRICS_FOR_TEST, meta: { registryVersion: "analytics-metric-registry.v1", contextRevision: bound.contextRevision } }); });
  routes.get("/dashboard/analytics/foundation/metrics/:key", async (context) => { const bound = scope(context, "analytics.metrics.read"), metric = METRICS_FOR_TEST.find((item) => item.key === context.req.param("key")), window = context.req.query("window") ?? "24h", category = context.req.query("category"); if (!bound || !metric || !metric.windows.includes(window as never) || category && !["view", "engage"].includes(category)) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Metric unavailable."); const since = new Date(Date.now() - (window === "24h" ? 86400000 : 7 * 86400000)), all = (await prisma.analyticsFoundationEvent.findMany({ where: { ingestedAt: { gte: since } }, orderBy: { ingestedAt: "desc" } })).filter((item) => queryScope(item, bound)), filtered = category ? all.filter((item) => (item.dimensions as any).category === category) : all, suppressed = filtered.length > 0 && filtered.length < 3, value = suppressed ? null : metric.key.endsWith("count.v1") ? filtered.length : all.length ? all.filter((item) => (item.dimensions as any).category === "engage").length / all.length : null; return context.json({ data: { key: metric.key, definitionVersion: metric.version, value, unit: metric.unit, window, scope: { kind: bound.kind }, asOf: new Date().toISOString(), freshness: "fresh", completeness: all.length ? "complete" : "empty", source: "analytics_foundation_event", provenance: "request-time.v1", suppressed } }); });
  routes.get("/dashboard/analytics/foundation/readiness", (context) => { const bound = scope(context, "analytics.operations.read"); if (!bound) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Analytics resource unavailable."); return context.json({ data: { state: provider.mode === "disabled" ? "not_ready" : "ready", reasonCode: provider.mode === "disabled" ? "subject_assertion_provider_disabled" : "registry_and_store_available", observedAt: new Date().toISOString(), staleAfter: new Date(Date.now() + 60000).toISOString(), ingestion: provider.mode, aggregation: "request_time", providerSink: "disabled" } }); });
  return routes;
}
