import { Hono } from "hono";
import {
  Prisma,
  createInAppNotification,
  p06ApiCreateNotification,
  p06ApiMutateItem,
  p06ApiUpdateSourceState,
  markNotificationRead,
  queueKeyReadiness,
  serializeWorkItem,
  updateQueueSourceState,
  workReopenCandidates,
  workQueueScopeWhere,
  p02DashboardSubjectContext,
  p02LockDashboardPrincipals,
  p09WorkerObservation,
  type QueueScope,
  prisma
} from "@vanstro/db";
import type { DashboardEnv } from "./access.js";
import { permissionGrant, resolveDashboardAuthorization, type DashboardAuthorizationContext } from "./authorization.js";
import { dashboardCommonQueryReadiness, workQueueReadiness } from "../config.js";
import { createWorkCursorCodec } from "./work-queue-cursor.js";
import { domainFingerprint, enforceCommonQuerySize, rawCommonQueryParams } from "./common-query.js";
import { publicError } from "../public-errors.js";
import { recordAuditEvent, recordFailedAuditEvent } from "../audit/foundation.js";

const ACTIVE = ["open", "acknowledged"];
const TERMINAL = ["resolved", "dismissed", "expired"];
const STATUSES = [...ACTIVE, ...TERMINAL];
const SEVERITIES = ["critical", "warning", "info"];
const HEALTH = ["fresh", "stale", "orphaned"];
const ASSIGNMENTS = ["my", "unassigned", "any"];
const DUE = ["overdue", "due_soon", "any"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUEUE_KEYS = new Set(["queryVersion", "limit", "after", "status", "severity", "type", "source", "assignment", "due", "health", "resourceType", "resourceId", "createdFrom", "createdTo", "resolvedFrom", "resolvedTo", "includeSummary"]);
const NOTIFICATION_KEYS = new Set(["queryVersion", "limit", "after", "read", "severity", "type", "createdFrom", "createdTo", "includeUnread"]);
export const WORK_QUEUE_ADAPTER_SOURCES = ["runtime_alerts", "email_delivery", "erp_sync", "payment_reconciliation", "refund_attention", "low_inventory", "dealer_applications", "contact_leads", "product_reviews", "support_handoffs", "async_jobs", "readiness", "worker_heartbeat", "content_readiness"] as const;

type Grant = ReturnType<typeof permissionGrant>;
type QueueFilters = {
  statuses: string[];
  severities: string[];
  types: string[];
  sources: string[];
  assignment: string;
  due: string;
  health: string | null;
  resourceType: string | null;
  resourceId: string | null;
  createdFrom: string | null;
  createdTo: string | null;
  resolvedFrom: string | null;
  resolvedTo: string | null;
  includeSummary: boolean;
};

function scope(grant: Grant): QueueScope | undefined {
  if (!grant) return;
  if (grant.global) return { kind: "global" };
  if (!grant.dealerIds.length) return;
  return { kind: grant.locationIds.length ? "location" : "dealer", dealerIds: [...grant.dealerIds].sort(), locationIds: [...grant.locationIds].sort() };
}
function covers(grant: Grant, value: QueueScope) {
  if (!grant) return false;
  if (grant.global) return true;
  if (value.kind === "global") return false;
  return value.dealerIds.every((id) => grant.dealerIds.includes(id)) && (value.kind === "dealer" || value.locationIds.every((id) => grant.locationIds.includes(id)));
}
function same(a: Grant, b: Grant) {
  return Boolean(a && b && a.global === b.global && JSON.stringify([...a.dealerIds].sort()) === JSON.stringify([...b.dealerIds].sort()) && JSON.stringify([...a.locationIds].sort()) === JSON.stringify([...b.locationIds].sort()));
}
function profile(auth: DashboardAuthorizationContext) {
  const read = permissionGrant(auth, "work_queue.read");
  return same(read, permissionGrant(auth, "work_queue.read_sensitive")) && same(read, permissionGrant(auth, "users.read")) ? "sensitive" as const : "safe" as const;
}
function itemScope(item: { authorizationScopeKind: string; dealerIds: unknown; locationIds: unknown }): QueueScope {
  return item.authorizationScopeKind === "global" ? { kind: "global" } : { kind: item.authorizationScopeKind as "dealer" | "location", dealerIds: item.dealerIds as string[], locationIds: item.locationIds as string[] };
}
function writer(context: any, actorId?: string, permission?: string) {
  return async (tx: Prisma.TransactionClient, event: any) => {
    const current = context.get("p02Authorization");if(!current)throw new Error("AUDIT_PERSISTED_MACHINE_AUTHORITY_REQUIRED");
    const actualPermission=permission??"work_queue.read";const actor={...current,permissionGrants:[{permissionKey:actualPermission,global:event.scope.kind==="global",dealerIds:event.scope.kind==="global"?[]:event.scope.dealerIds,locationIds:event.scope.kind==="global"?[]:event.scope.locationIds}]};
    await recordAuditEvent(context, actor, { action: event.action, resource: { type: event.resource, id: event.resourceId }, result: event.result, reason: event.action === "archive" ? "operator_requested" : undefined, requiredPermissions: [actualPermission], primaryPermission: actualPermission, metadata: { schemaVersion: "audit-metadata.v1", entries: event.metadata } }, tx);
  };
}
async function authorize(actorId: string, sessionTokenHash: string, permission: string, value: QueueScope, sourcePermission: string, tx?: Prisma.TransactionClient) {
  if (!["jobs.read", "media.read"].includes(sourcePermission)) throw new Error("WORK_ITEM_SCOPE_CHANGED");
  const auth = await resolveDashboardAuthorization(actorId, tx, new Date(), sessionTokenHash);
  if (!covers(permissionGrant(auth, "dashboard.access"), value) || !covers(permissionGrant(auth, permission), value) || !covers(permissionGrant(auth, sourcePermission), value)) throw new Error("WORK_ITEM_SCOPE_CHANGED");
  return auth;
}
function serializeNotification(notification: any) {
  return { id: notification.id, contractVersion: notification.contractVersion, type: notification.type, typeVersion: notification.typeVersion, title: "工作队列通知", safeMessage: { schemaVersion: "work-queue-safe-summary.v1", entries: notification.safeMessageArgs }, severity: notification.severity, recipient: { userId: notification.recipientUserId }, workItem: { id: notification.workItemId, type: notification.type.startsWith("media.") ? "media.processing_failure" : "foundation.attention" }, resource: { type: notification.resourceType, id: notification.resourceId }, ...(notification.deepLink ? { deepLink: notification.deepLink } : {}), authorizationScope: itemScope(notification), createdAt: notification.createdAt.toISOString(), ...(notification.readAt ? { readAt: notification.readAt.toISOString() } : {}), expiresAt: notification.expiresAt.toISOString(), version: notification.version };
}
function exactBody(value: unknown, allowed: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !allowed.includes(key))) throw new Error("DASHBOARD_INVALID");
  return value as Record<string, unknown>;
}
function error(context: any, value: unknown) {
  const code = value instanceof Error ? value.message : "DASHBOARD_INVALID";
  return publicError(context, code.includes("NOT_FOUND") || code.includes("SCOPE_CHANGED") || code.includes("ASSIGNEE_INVALID") ? 404 : code.includes("CONFLICT") ? 409 : code.includes("UNAVAILABLE") ? 503 : 400, (code.startsWith("WORK_") || code.startsWith("NOTIFICATION_")) ? code as any : "DASHBOARD_INVALID", "Work Queue request failed.");
}
async function bestEffortMutationAudit(context:any,actorId:string,permission:string,action:string,resource:"work_queue_item"|"in_app_notification",resourceId:string,value:unknown){try{const auth=context.get("p02Authorization"),code=value instanceof Error?value.message:"DASHBOARD_INVALID",denied=code.includes("SCOPE")||code.includes("ASSIGNEE")||code.includes("ORPHAN")||code.includes("NOT_ACTIONABLE")||code.includes("NOT_FOUND");await recordFailedAuditEvent(context,auth,{action:action as any,resource:{type:resource,id:resourceId},result:denied?"denied":"failed",reason:denied?"permission_required":code.includes("CONFLICT")?"state_conflict":"validation_rejected",requiredPermissions:[permission],primaryPermission:permission})}catch{}}
function singleton(raw: Readonly<Record<string, readonly string[]>>, key: string) {
  if ((raw[key]?.length ?? 0) > 1) throw new Error("QUERY_INVALID");
  return raw[key]?.[0];
}
function dateValue(value: string | undefined) {
  if (!value) return null;
  if (!Number.isFinite(Date.parse(value))) throw new Error("QUERY_INVALID");
  return new Date(value).toISOString();
}
function parseQueue(raw: Readonly<Record<string, readonly string[]>>) {
  if (raw.queryVersion?.length !== 1 || raw.queryVersion[0] !== "common-query.v1") throw new Error("QUERY_VERSION_UNSUPPORTED");
  if (Object.keys(raw).some((key) => !QUEUE_KEYS.has(key))) throw new Error("QUERY_FILTER_UNSUPPORTED");
  for (const key of ["limit", "after", "assignment", "due", "health", "resourceType", "resourceId", "createdFrom", "createdTo", "resolvedFrom", "resolvedTo", "includeSummary"]) singleton(raw, key);
  const statuses = [...new Set(raw.status ?? [])].sort(), severities = [...new Set(raw.severity ?? [])].sort(), types = [...new Set(raw.type ?? [])].sort(), sources = [...new Set(raw.source ?? [])].sort();
  const assignment = singleton(raw, "assignment") ?? "any", due = singleton(raw, "due") ?? "any", health = singleton(raw, "health") ?? null, resourceType = singleton(raw, "resourceType") ?? null, resourceId = singleton(raw, "resourceId") ?? null;
  const createdFrom = dateValue(singleton(raw, "createdFrom")), createdTo = dateValue(singleton(raw, "createdTo")), resolvedFrom = dateValue(singleton(raw, "resolvedFrom")), resolvedTo = dateValue(singleton(raw, "resolvedTo"));
  const summary = singleton(raw, "includeSummary") ?? "false";
  if (statuses.some((x) => !STATUSES.includes(x)) || severities.some((x) => !SEVERITIES.includes(x)) || types.some((x) => !["foundation.attention","media.processing_failure"].includes(x)) || sources.some((x) => !["async_job","media_processing"].includes(x)) || !ASSIGNMENTS.includes(assignment) || !DUE.includes(due) || health && !HEALTH.includes(health) || (resourceId && !resourceType) || Boolean(createdFrom) !== Boolean(createdTo) || Boolean(resolvedFrom) !== Boolean(resolvedTo) || (resolvedFrom && (!statuses.includes("resolved") || statuses.some((x) => x !== "resolved"))) || !["true", "false"].includes(summary)) throw new Error("QUERY_FILTER_UNSUPPORTED");
  if (resourceId && !UUID.test(resourceId) || createdFrom && Date.parse(createdFrom) >= Date.parse(createdTo!) || resolvedFrom && Date.parse(resolvedFrom) >= Date.parse(resolvedTo!)) throw new Error("QUERY_INVALID");
  return { statuses, severities, types, sources, assignment, due, health, resourceType, resourceId, createdFrom, createdTo, resolvedFrom, resolvedTo, includeSummary: summary === "true" } satisfies QueueFilters;
}
function terminalWindow(from: Date, to: Date): Prisma.WorkQueueItemWhereInput {
  return { OR: [{ status: "resolved", resolvedAt: { gte: from, lt: to } }, { status: "dismissed", dismissedAt: { gte: from, lt: to } }, { status: "expired", updatedAt: { gte: from, lt: to } }] };
}
function filterWhere(filters: QueueFilters, actorId: string, capturedAt: Date, terminalFrom: Date, terminalTo: Date, omit?: "type" | "source", metric?: "active" | "critical" | "mine" | "unassigned" | "overdue"): Prisma.WorkQueueItemWhereInput {
  const clauses: Prisma.WorkQueueItemWhereInput[] = [];
  const forceActive = metric === "active" || metric === "overdue";
  if (forceActive) clauses.push({ status: { in: ACTIVE } });
  else if (filters.statuses.length) clauses.push({ status: { in: filters.statuses } });
  else if (!filters.createdFrom && !filters.resolvedFrom) clauses.push({ OR: [{ status: { in: ACTIVE } }, terminalWindow(terminalFrom, terminalTo)] });
  if (metric === "critical") clauses.push({ severity: "critical" }); else if (filters.severities.length) clauses.push({ severity: { in: filters.severities } });
  if (omit !== "type" && filters.types.length) clauses.push({ type: { in: filters.types } });
  if (omit !== "source" && filters.sources.length) clauses.push({ source: { in: filters.sources } });
  if (metric === "mine") clauses.push({ assignedToUserId: actorId });
  else if (metric === "unassigned") clauses.push({ assignedToUserId: null });
  else if (filters.assignment === "my") clauses.push({ assignedToUserId: actorId });
  else if (filters.assignment === "unassigned") clauses.push({ assignedToUserId: null });
  if (metric === "overdue") clauses.push({ status: { in: ACTIVE }, dueAt: { lt: capturedAt } });
  else if (filters.due === "overdue") clauses.push({ status: { in: ACTIVE }, dueAt: { lt: capturedAt } });
  else if (filters.due === "due_soon") clauses.push({ status: { in: ACTIVE }, dueAt: { gte: capturedAt, lt: new Date(capturedAt.getTime() + 86400000) } });
  if (filters.health) clauses.push({ health: filters.health });
  if (filters.resourceType) clauses.push({ resourceType: filters.resourceType, ...(filters.resourceId ? { resourceId: filters.resourceId } : {}) });
  if (filters.createdFrom) clauses.push({ createdAt: { gte: new Date(filters.createdFrom), lt: new Date(filters.createdTo!) } });
  if (filters.resolvedFrom) clauses.push({ status: "resolved", resolvedAt: { gte: new Date(filters.resolvedFrom), lt: new Date(filters.resolvedTo!) } });
  return { AND: clauses };
}
function sourceAuthorized(item: { type?: string; sourcePermission: string; authorizationScopeKind: string; dealerIds: unknown; locationIds: unknown }, auth: DashboardAuthorizationContext) {
  const registered = item.type === "foundation.attention" ? "jobs.read" : item.type === "media.processing_failure" ? "media.read" : undefined;
  return registered === item.sourcePermission && covers(permissionGrant(auth, registered), itemScope(item));
}
function rowAwareSourceWhere(auth:DashboardAuthorizationContext):Prisma.WorkQueueItemWhereInput{const clauses:Prisma.WorkQueueItemWhereInput[]=[];for(const permission of ["jobs.read","media.read"]){const value=scope(permissionGrant(auth,permission));if(value)clauses.push({sourcePermission:permission,...workQueueScopeWhere(value)})}return clauses.length?{OR:clauses}:{id:{in:[]}}}
async function assignmentStates(items:any[],caller?:DashboardAuthorizationContext,sessionTokenHash?:string){const ids=[...new Set<string>(items.flatMap(item=>item.assignedToUserId?[String(item.assignedToUserId)]:[]))],users=ids.length?await prisma.user.findMany({where:{id:{in:ids}},select:{id:true,kind:true,status:true}}):[],byUser=new Map(users.map(user=>[user.id,user])),activeIds=ids.filter(id=>{const user=byUser.get(id);return user?.kind==="admin"&&user.status==="active"}),contexts=new Map<string,DashboardAuthorizationContext>(await Promise.all(activeIds.map(async id=>[id,caller&&sessionTokenHash?await p02DashboardSubjectContext(prisma,sessionTokenHash,caller.actorId,id):{actorId:id,globalRoleKeys:[],scopedRoleKeys:[],permissionGrants:[],contextRevision:"unavailable"}] as const))),states=new Map<string,"valid"|"inactive"|"scope_lost">();for(const item of items){if(!item.assignedToUserId)continue;const user=byUser.get(item.assignedToUserId);if(!user||user.kind!=="admin"||user.status!=="active"){states.set(item.id,"inactive");continue}const current=contexts.get(item.assignedToUserId)!,value=itemScope(item),valid=covers(permissionGrant(current,"dashboard.access"),value)&&covers(permissionGrant(current,"work_queue.read"),value)&&sourceAuthorized(item,current);states.set(item.id,valid?"valid":"scope_lost")}return states}
function serializeAuthorized(item: any, auth: DashboardAuthorizationContext,assignmentState:"valid"|"inactive"|"scope_lost"="valid") {
  const dto = serializeWorkItem(item, profile(auth),assignmentState), value = itemScope(item),authorized=covers(permissionGrant(auth,"dashboard.access"),value)&&sourceAuthorized(item,auth),assignmentValid=!item.assignedToUserId||assignmentState==="valid";
  return { ...dto, capabilities: Object.fromEntries(Object.entries(dto.capabilities).map(([action, allowed]) => [action, Boolean(allowed)&&assignmentValid&&authorized&&(item.health!=="orphaned"||action==="dismiss")&&covers(permissionGrant(auth, `work_queue.${action}`), value)])) };
}

export function createDashboardWorkQueueRoutes() {
  const routes = new Hono<DashboardEnv>();
  routes.get("/dashboard/work-queue", async (context) => {
    context.header("Cache-Control", "private, no-store");
    try {
      const ready = workQueueReadiness();
      if (!ready.enabled || !ready.keyset || !await queueKeyReadiness(prisma, ready.keyset)) return publicError(context, 503, "QUERY_UNAVAILABLE", "Work Queue unavailable.");
      const rawText = context.req.url.includes("?") ? context.req.url.slice(context.req.url.indexOf("?") + 1) : "";
      enforceCommonQuerySize(rawText);
      const raw = rawCommonQueryParams(rawText), filters = parseQueue(raw), limit = Number(singleton(raw, "limit") ?? 50), after = singleton(raw, "after");
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("QUERY_INVALID");
      const auth = context.get("p02Authorization"), read = permissionGrant(auth, "work_queue.read"), actorScope = scope(read);
      if (!actorScope) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "work_queue.read required.");
      const selectedProfile = profile(auth), codec = createWorkCursorCodec(dashboardCommonQueryReadiness().keyset!);
      const fieldProfile = { selectedProfile, read, sensitive: permissionGrant(auth, "work_queue.read_sensitive"), users: permissionGrant(auth, "users.read") };
      const queryHash = domainFingerprint("wq:query", { ...filters, limit });
      const bindings = { resource: "work-queue" as const, profileVersion: "dashboard.work-queue.v1" as const, permissionKey: "work_queue.read" as const, actorId: auth.actorId, contextRevision: auth.contextRevision, grantFingerprint: domainFingerprint("wq:grant", read), profileFingerprint: domainFingerprint("wq:profile", fieldProfile), queryHash, order: [{ field: "createdAt", direction: "desc", nulls: "last" }, { field: "recordId", direction: "desc", nulls: "last" }] as const, registryVersion: "work-queue-registry.v1", schemaVersion: "work-queue-item.v1" };
      const restored = after ? codec.open(after, bindings) : undefined, rangeAnchor = restored?.rangeAnchor ?? new Date().toISOString(), terminalFrom = restored?.terminalFrom ?? new Date(Date.parse(rangeAnchor) - 30 * 86400000).toISOString(), terminalTo = restored?.terminalTo ?? rangeAnchor;
      const cursor = after ? codec.open(after, { ...bindings, rangeAnchor, terminalFrom, terminalTo }) : undefined;
      const capturedAt = new Date(rangeAnchor), authorizedScopeWhere = { AND: [workQueueScopeWhere(actorScope),rowAwareSourceWhere(auth)] } as Prisma.WorkQueueItemWhereInput, base = { AND: [authorizedScopeWhere, filterWhere(filters, auth.actorId, capturedAt, new Date(terminalFrom), new Date(terminalTo))] } as Prisma.WorkQueueItemWhereInput;
      const result = await prisma.$transaction(async (tx) => {
        const candidateRows = await tx.workQueueItem.findMany({ where: { AND: [base, ...(cursor ? [{ OR: [{ createdAt: { lt: new Date(cursor.position[0]) } }, { createdAt: new Date(cursor.position[0]), id: { lt: cursor.position[1] } }] }] : [])] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
        const visibleRows = candidateRows.filter((item) => sourceAuthorized(item, auth));
        const shown = visibleRows.slice(0, limit), hasMore = visibleRows.length > limit, last = shown.at(-1);
        let summary: Record<string, unknown> | undefined;
        if (filters.includeSummary) {
          const count = async (where: Prisma.WorkQueueItemWhereInput) => (await tx.workQueueItem.findMany({ where: { AND: [authorizedScopeWhere, where] } })).filter((item) => sourceAuthorized(item, auth)).length;
          const grouped = async (field: "type" | "source") => {
            const rows = (await tx.workQueueItem.findMany({ where: { AND: [authorizedScopeWhere, filterWhere(filters, auth.actorId, capturedAt, new Date(terminalFrom), new Date(terminalTo), field)] } })).filter((item) => sourceAuthorized(item, auth));
            return rows.reduce<Record<string, number>>((out, item) => { const key = item[field]; out[key] = (out[key] ?? 0) + 1; return out; }, {});
          };
          const [open, critical, assignedToMe, unassigned, overdue, byType, bySource, authorizedCriticalTotal, visibleCritical] = await Promise.all([
            count(filterWhere(filters, auth.actorId, capturedAt, new Date(terminalFrom), new Date(terminalTo), undefined, "active")),
            count(filterWhere(filters, auth.actorId, capturedAt, new Date(terminalFrom), new Date(terminalTo), undefined, "critical")),
            count(filterWhere(filters, auth.actorId, capturedAt, new Date(terminalFrom), new Date(terminalTo), undefined, "mine")),
            count(filterWhere(filters, auth.actorId, capturedAt, new Date(terminalFrom), new Date(terminalTo), undefined, "unassigned")),
            count(filterWhere(filters, auth.actorId, capturedAt, new Date(terminalFrom), new Date(terminalTo), undefined, "overdue")), grouped("type"), grouped("source"),
            count({ status: { in: ACTIVE }, severity: "critical" }), count({ AND: [filterWhere(filters, auth.actorId, capturedAt, new Date(terminalFrom), new Date(terminalTo)), { status: { in: ACTIVE }, severity: "critical" }] })
          ]);
          summary = { contractVersion: "work-queue-summary.v1", open, critical, assignedToMe, unassigned, overdue, byType, bySource, criticalOutsideFilter: Math.max(0, authorizedCriticalTotal - visibleCritical) };
        }
        return { shown, hasMore, nextCursor: hasMore && last ? codec.seal({ ...bindings, v: 1, position: [last.createdAt.toISOString(), last.id], rangeAnchor, terminalFrom, terminalTo }) : undefined, summary };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      const profileId = `dashboard.work-queue.${selectedProfile}.v1`,states=await assignmentStates(result.shown,auth,context.get("actorSessionTokenHash"));
      return context.json({ data: result.shown.map((item) => serializeAuthorized(item, auth,states.get(item.id)??"valid")), meta: { requestId: context.res.headers.get("X-Request-Id"), queryContractVersion: "common-query.v1", pagination: { mode: "cursor", limit, hasMore: result.hasMore, ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}) }, sort: bindings.order, snapshot: { consistency: "statement", capturedAt: rangeAnchor }, visibility: { profileId } }, ...(result.summary ? { summary: { data: result.summary, relation: "exact", capturedAt: rangeAnchor, profileId } } : {}) });
    } catch (value) { return error(context, value); }
  });

  routes.get("/dashboard/work-queue/adapters", async (context) => {
    const auth = context.get("p02Authorization"), global = permissionGrant(auth, "work_queue.read")?.global === true, capturedAt = new Date(), data: any[] = [];
    if (global) {
      const implemented = new Map<string, { permission: string; count: () => Promise<number>; deepLink: string }>([
        ["email_delivery", { permission: "email.outbox.read", count: () => prisma.emailOutbox.count({ where: { status: { in: ["pending", "retry_wait", "failed"] } } }), deepLink: "/dashboard/email" }],
        ["erp_sync", { permission: "erp.sync.read", count: () => prisma.erpSyncJob.count({ where: { status: { in: ["pending", "retry_wait", "failed"] } } }), deepLink: "/dashboard/erp" }],
        ["payment_reconciliation", { permission: "orders.read", count: () => prisma.paymentSession.count({ where: { status: "reconciliation_required" } }), deepLink: "/dashboard/payments" }],
        ["refund_attention", { permission: "orders.read", count: () => prisma.paymentSession.count({ where: { status: "refund_failed" } }), deepLink: "/dashboard/payments" }],
        ["dealer_applications", { permission: "dealer_applications.read", count: () => prisma.dealerApplication.count({ where: { status: { in: ["submitted", "under_review"] } } }), deepLink: "/dashboard/applications" }],
        ["contact_leads", { permission: "leads.read", count: () => prisma.contactLead.count({ where: { status: "new" } }), deepLink: "/dashboard/leads" }],
        ["product_reviews", { permission: "reviews.read", count: () => prisma.productReview.count({ where: { status: "pending" } }), deepLink: "/dashboard/reviews" }],
        ["support_handoffs", { permission: "support.read", count: () => prisma.supportHandoff.count({ where: { status: "new" } }), deepLink: "/dashboard/support" }],
        ["async_jobs", { permission: "jobs.read", count: () => prisma.asyncJob.count({ where: { status: { in: ["failed", "partially_succeeded"] } } }), deepLink: "/dashboard/operations?view=jobs" }],
        ["worker_heartbeat", { permission: "jobs.read", count: async () => Number((await p09WorkerObservation(prisma)).staleCount), deepLink: "/dashboard/operations" }]
      ]);
      const deferredPermissions: Record<string, string> = { runtime_alerts: "jobs.read", low_inventory: "inventory.read", readiness: "jobs.read", content_readiness: "content.read" };
      for (const source of WORK_QUEUE_ADAPTER_SOURCES) {
        const spec = implemented.get(source), permission = spec?.permission ?? deferredPermissions[source];
        if (!permissionGrant(auth, permission)?.global) continue;
        if (!spec) { data.push({ source, adapterVersion: `${source}.v1`, status: "unavailable", freshness: "unavailable", counts: {}, capturedAt: capturedAt.toISOString() }); continue; }
        let attention: number;
        try { attention = await spec.count(); }
        catch {
          try {
            await updateQueueSourceState(prisma, { adapterKey: source, adapterVersion: "v1", health: "unavailable", safeErrorCode: "ADAPTER_QUERY_FAILED", audit: writer(context),persist:tx=>p06ApiUpdateSourceState(tx,{adapterKey:source,adapterVersion:"v1",health:"unavailable",safeErrorCode:"ADAPTER_QUERY_FAILED"}) });
            data.push({ source, adapterVersion: `${source}.v1`, status: "unavailable", freshness: "unavailable", counts: {}, capturedAt: capturedAt.toISOString() });
            continue;
          } catch { return publicError(context, 503, "QUERY_UNAVAILABLE", "Work Queue adapter health unavailable."); }
        }
        try {
          await updateQueueSourceState(prisma, { adapterKey: source, adapterVersion: "v1", health: "ready", audit: writer(context),persist:tx=>p06ApiUpdateSourceState(tx,{adapterKey:source,adapterVersion:"v1",health:"ready"}) });
          data.push({ source, adapterVersion: `${source}.v1`, status: "ready", freshness: "fresh", counts: { attention }, deepLink: spec.deepLink, capturedAt: capturedAt.toISOString() });
        } catch { data.push({ source, adapterVersion: `${source}.v1`, status: "unavailable", freshness: "unavailable", counts: {}, capturedAt: capturedAt.toISOString() }); }
      }
    }
    return context.json({ contractVersion: "work-queue-adapters.v1", completion: data.some((item) => item.status !== "ready") ? "partial" : "complete", data });
  });

  routes.get("/dashboard/work-queue/:id", async (context) => {
    const params = new URL(context.req.url).searchParams;
    if ([...params.keys()].some((key) => key !== "queryVersion") || params.getAll("queryVersion").length !== 1 || params.get("queryVersion") !== "common-query.v1" || !UUID.test(context.req.param("id"))) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Not found.");
    const auth = context.get("p02Authorization"), actorScope = scope(permissionGrant(auth, "work_queue.read"));
    if (!actorScope) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Forbidden.");
    const item = await prisma.workQueueItem.findFirst({ where: { id: context.req.param("id"), ...workQueueScopeWhere(actorScope) } });
    if (!item || !sourceAuthorized(item, auth)) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Not found.");
    const states=await assignmentStates([item],auth,context.get("actorSessionTokenHash"));return context.json({ data: serializeAuthorized(item, auth,states.get(item.id)??"valid") });
  });

  for (const action of ["acknowledge", "resolve", "dismiss", "reopen"] as const) routes.post(`/dashboard/work-queue/:id/${action}`, async (context) => {
    try {
      const body = exactBody(await context.req.json(), ["version", "reason"]), actorId = context.get("actorUserId"), permission = `work_queue.${action}`, ready = workQueueReadiness();
      if (!ready.keyset || !await queueKeyReadiness(prisma, ready.keyset)) throw new Error("WORK_QUEUE_UNAVAILABLE");
      const preview=await prisma.workQueueItem.findUnique({where:{id:context.req.param("id")}});if(!preview)throw new Error("WORK_ITEM_STATE_CONFLICT");
      const item=await prisma.$transaction(async tx=>{const next=await p06ApiMutateItem(tx,{sessionTokenHash:context.get("actorSessionTokenHash"),actorId,itemId:preview.id,expectedVersion:Number(body.version),operation:action,...(typeof body.reason==="string"?{reason:body.reason}:{}),deduplicationCandidates:action==="reopen"?workReopenCandidates(preview,ready.keyset!):[]});if(!next)throw new Error("WORK_ITEM_STATE_CONFLICT");if(next.assignedToUserId){const recipient=await p02DashboardSubjectContext(tx,context.get("actorSessionTokenHash"),actorId,next.assignedToUserId),value=itemScope(next);if(covers(permissionGrant(recipient,"dashboard.access"),value)&&covers(permissionGrant(recipient,"notifications.read"),value)&&covers(permissionGrant(recipient,"work_queue.read"),value)&&covers(permissionGrant(recipient,next.sourcePermission),value))await createInAppNotification(tx,{recipientUserId:next.assignedToUserId,item:next,type:next.type==="media.processing_failure"?"media.processing.failed":"foundation.attention.terminal",transitionVersion:next.version,keyset:ready.keyset!,authorize:async()=>{},audit:writer(context,actorId,permission),persist:(inner,value)=>p06ApiCreateNotification(inner,{sessionTokenHash:context.get("actorSessionTokenHash"),actorId,recipientUserId:next.assignedToUserId!,itemId:next.id,type:next.type==="media.processing_failure"?"media.processing.failed":"foundation.attention.terminal",transitionVersion:next.version,deduplicationKid:value.kid,deduplicationHash:value.hash,deduplicationCandidates:value.candidates})})}await writer(context,actorId,permission)(tx,{resource:"work_queue_item",resourceId:next.id,action:action==="dismiss"?"archive":action==="reopen"?"restore":action,result:"succeeded",scope:itemScope(next),metadata:{type:next.type,source:next.source,fromStatus:preview.status,toStatus:next.status,reasonCode:typeof body.reason==="string"?body.reason:null,occurrence:next.occurrence}});return next});
      const current = context.get("p02Authorization");
      return context.json({ data: serializeAuthorized(item, current), meta: { domainMutation: false, replayed: false } });
    } catch (value) { await bestEffortMutationAudit(context,context.get("actorUserId"),`work_queue.${action}`,action==="dismiss"?"archive":action==="reopen"?"restore":action,"work_queue_item",context.req.param("id"),value);return error(context, value); }
  });

  for (const action of ["assign", "unassign"] as const) routes.post(`/dashboard/work-queue/:id/${action}`, async (context) => {
    try {
      const body = exactBody(await context.req.json(), ["version", "userId"]), actorId = context.get("actorUserId"), targetUserId = action === "assign" ? String(body.userId) : undefined, ready = workQueueReadiness();
      if (!ready.keyset || !await queueKeyReadiness(prisma, ready.keyset)) throw new Error("WORK_QUEUE_UNAVAILABLE");
      const preview=await prisma.workQueueItem.findUnique({where:{id:context.req.param("id")}});if(!preview)throw new Error("WORK_ITEM_STATE_CONFLICT");const result=await prisma.$transaction(async tx=>{const next=await p06ApiMutateItem(tx,{sessionTokenHash:context.get("actorSessionTokenHash"),actorId,itemId:preview.id,expectedVersion:Number(body.version),operation:action,...(targetUserId?{targetUserId}:{}),deduplicationCandidates:[]});if(!next)throw new Error("WORK_ITEM_STATE_CONFLICT");if(targetUserId){const recipient=await p02DashboardSubjectContext(tx,context.get("actorSessionTokenHash"),actorId,targetUserId),value=itemScope(next);if(covers(permissionGrant(recipient,"dashboard.access"),value)&&covers(permissionGrant(recipient,"notifications.read"),value)&&covers(permissionGrant(recipient,"work_queue.read"),value)&&covers(permissionGrant(recipient,next.sourcePermission),value))await createInAppNotification(tx,{recipientUserId:targetUserId,item:next,type:"foundation.attention.assigned",transitionVersion:next.version,keyset:ready.keyset!,authorize:async()=>{},audit:writer(context,actorId,"work_queue.assign"),persist:(inner,dedup)=>p06ApiCreateNotification(inner,{sessionTokenHash:context.get("actorSessionTokenHash"),actorId,recipientUserId:targetUserId,itemId:next.id,type:"foundation.attention.assigned",transitionVersion:next.version,deduplicationKid:dedup.kid,deduplicationHash:dedup.hash,deduplicationCandidates:dedup.candidates})})}await writer(context,actorId,"work_queue.assign")(tx,{resource:"work_queue_item",resourceId:next.id,action,result:"succeeded",scope:itemScope(next),metadata:{type:next.type,source:next.source,fromStatus:preview.status,toStatus:next.status,occurrence:next.occurrence}});return next});
      const current = context.get("p02Authorization");
      return context.json({ data: serializeAuthorized(result, current), meta: { domainMutation: false } });
    } catch (value) { await bestEffortMutationAudit(context,context.get("actorUserId"),"work_queue.assign",action,"work_queue_item",context.req.param("id"),value);return error(context, value); }
  });

  routes.get("/dashboard/notifications", async (context) => {
    try {
      const ready = workQueueReadiness();
      if (!ready.enabled || !ready.keyset || !await queueKeyReadiness(prisma, ready.keyset)) throw new Error("WORK_QUEUE_UNAVAILABLE");
      const rawText = context.req.url.includes("?") ? context.req.url.slice(context.req.url.indexOf("?") + 1) : "";
      enforceCommonQuerySize(rawText);
      const raw = rawCommonQueryParams(rawText);
      if (raw.queryVersion?.length !== 1 || raw.queryVersion[0] !== "common-query.v1") throw new Error("QUERY_VERSION_UNSUPPORTED");
      if (Object.keys(raw).some((key) => !NOTIFICATION_KEYS.has(key))) throw new Error("QUERY_FILTER_UNSUPPORTED");
      for (const key of ["limit", "after", "read", "createdFrom", "createdTo", "includeUnread"]) singleton(raw, key);
      const limit = Number(singleton(raw, "limit") ?? 50), read = singleton(raw, "read") ?? "any", severities = [...new Set(raw.severity ?? [])].sort(), types = [...new Set(raw.type ?? [])].sort(), requestedFrom = dateValue(singleton(raw, "createdFrom")), requestedTo = dateValue(singleton(raw, "createdTo")), includeUnread = (singleton(raw, "includeUnread") ?? "true") === "true";
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !["read", "unread", "any"].includes(read) || severities.some((x) => !SEVERITIES.includes(x)) || types.some((x) => !["foundation.attention.assigned", "foundation.attention.critical", "foundation.attention.terminal","media.processing.failed"].includes(x)) || Boolean(requestedFrom) !== Boolean(requestedTo) || requestedFrom && Date.parse(requestedFrom) >= Date.parse(requestedTo!) || !["true", "false"].includes(singleton(raw, "includeUnread") ?? "true")) throw new Error("QUERY_FILTER_UNSUPPORTED");
      const actorId = context.get("actorUserId"), auth = context.get("p02Authorization"), grant = permissionGrant(auth, "notifications.read");
      if (!grant) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Forbidden.");
      const notificationScope=scope(grant),readScope = scope(permissionGrant(auth, "work_queue.read")), authorizedScopeWhere = notificationScope&&readScope ? { AND: [workQueueScopeWhere(notificationScope),workQueueScopeWhere(readScope),rowAwareSourceWhere(auth)] } as Prisma.WorkQueueItemWhereInput : { id: { in: [] } } as Prisma.WorkQueueItemWhereInput;
      const codec = createWorkCursorCodec(dashboardCommonQueryReadiness().keyset!), queryHash = domainFingerprint("notification:query", { read, severities, types, requestedFrom, requestedTo, includeUnread, limit }), bindings = { resource: "notifications" as const, profileVersion: "dashboard.in-app-notifications.v1" as const, permissionKey: "notifications.read" as const, actorId, contextRevision: auth.contextRevision, grantFingerprint: domainFingerprint("notification:grant", { notifications: grant, workQueue: permissionGrant(auth, "work_queue.read"), sources: auth.permissionGrants.filter((item) => item.permissionKey.endsWith(".read")).sort((a, b) => a.permissionKey.localeCompare(b.permissionKey)) }), profileFingerprint: domainFingerprint("notification:profile", "recipient"), queryHash, order: [{ field: "createdAt", direction: "desc", nulls: "last" }, { field: "recordId", direction: "desc", nulls: "last" }] as const, registryVersion: "in-app-notification-registry.v1", schemaVersion: "in-app-notification.v1" };
      const restored = singleton(raw, "after") ? codec.open(singleton(raw, "after")!, bindings) : undefined, rangeAnchor = restored?.rangeAnchor ?? new Date().toISOString(), terminalFrom = restored?.terminalFrom ?? requestedFrom ?? new Date(Date.parse(rangeAnchor) - 30 * 86400000).toISOString(), terminalTo = restored?.terminalTo ?? requestedTo ?? rangeAnchor, cursor = singleton(raw, "after") ? codec.open(singleton(raw, "after")!, { ...bindings, rangeAnchor, terminalFrom, terminalTo }) : undefined;
      const where: Prisma.InAppNotificationWhereInput = { recipientUserId: actorId, expiresAt: { gt: new Date(rangeAnchor) }, createdAt: { gte: new Date(terminalFrom), lt: new Date(terminalTo) }, workItem: { is: authorizedScopeWhere }, ...(read === "read" ? { readAt: { not: null } } : read === "unread" ? { readAt: null } : {}), ...(severities.length ? { severity: { in: severities } } : {}), ...(types.length ? { type: { in: types } } : {}) };
      const result = await prisma.$transaction(async (tx) => {
        const candidates = await tx.inAppNotification.findMany({ where: { AND: [where, ...(cursor ? [{ OR: [{ createdAt: { lt: new Date(cursor.position[0]) } }, { createdAt: new Date(cursor.position[0]), id: { lt: cursor.position[1] } }] }] : [])] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
        const shown = candidates.slice(0, limit), hasMore = candidates.length > limit, last = shown.at(-1);
        let unread: number | undefined;
        if (includeUnread) {
          unread = await tx.inAppNotification.count({ where: { recipientUserId: actorId, readAt: null, expiresAt: { gt: new Date(rangeAnchor) }, createdAt: { gte: new Date(terminalFrom), lt: new Date(terminalTo) }, workItem: { is: authorizedScopeWhere } } });
        }
        return { shown, hasMore, unread, nextCursor: hasMore && last ? codec.seal({ ...bindings, v: 1, position: [last.createdAt.toISOString(), last.id], rangeAnchor, terminalFrom, terminalTo }) : undefined };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      return context.json({ data: result.shown.map(serializeNotification), meta: { requestId: context.res.headers.get("X-Request-Id"), queryContractVersion: "common-query.v1", pagination: { mode: "cursor", limit, hasMore: result.hasMore, ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}) }, sort: bindings.order, snapshot: { consistency: "statement", capturedAt: rangeAnchor }, visibility: { profileId: "dashboard.in-app-notifications.v1" } }, ...(result.unread !== undefined ? { unread: { data: result.unread, relation: "exact", capturedAt: rangeAnchor } } : {}) });
    } catch (value) { return error(context, value); }
  });

  routes.get("/dashboard/notifications/:id", async (context) => {
    const params = new URL(context.req.url).searchParams;
    if ([...params.keys()].some((key) => key !== "queryVersion") || params.getAll("queryVersion").length !== 1 || params.get("queryVersion") !== "common-query.v1" || !UUID.test(context.req.param("id"))) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Not found.");
    const actorId = context.get("actorUserId"), auth = context.get("p02Authorization");
    if (!permissionGrant(auth, "notifications.read")) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Forbidden.");
    const notification = await prisma.inAppNotification.findFirst({ where: { id: context.req.param("id"), recipientUserId: actorId, expiresAt: { gt: new Date() } } });
    if (!notification) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Not found.");
    const item = await prisma.workQueueItem.findUnique({ where: { id: notification.workItemId } });
    if (!item || !covers(permissionGrant(auth, "notifications.read"),itemScope(item)) || !covers(permissionGrant(auth, "work_queue.read"), itemScope(item)) || !sourceAuthorized(item, auth)) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Not found.");
    return context.json({ data: serializeNotification(notification) });
  });

  routes.post("/dashboard/notifications/:id/read", async (context) => {
    try {
      const actorId = context.get("actorUserId"), body = exactBody(await context.req.json(), ["version"]), result = await markNotificationRead(prisma, { id: context.req.param("id"), recipientUserId: actorId, expectedVersion: Number(body.version), authorize: async (tx, item) => { await authorize(actorId, context.get("actorSessionTokenHash"), "notifications.mark_read", itemScope(item), item.sourcePermission, tx); const current=await authorize(actorId, context.get("actorSessionTokenHash"), "work_queue.read", itemScope(item), item.sourcePermission, tx);if(!sourceAuthorized(item,current))throw new Error("NOTIFICATION_SCOPE_CHANGED"); }, audit: writer(context, actorId, "notifications.mark_read") });
      return context.json({ data: { id: result.notification.id, readAt: result.notification.readAt?.toISOString(), version: result.notification.version }, meta: { replayed: result.replayed } });
    } catch (value) { await bestEffortMutationAudit(context,context.get("actorUserId"),"notifications.mark_read","acknowledge","in_app_notification",context.req.param("id"),value);return error(context, value); }
  });
  return routes;
}
