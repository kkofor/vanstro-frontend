import { Prisma, type AsyncJob, type AuditEvent, type InAppNotification, type JobArtifact, type PrismaClient, type WorkQueueItem, type WorkQueueSourceState } from "@prisma/client";
import { INITIAL_PERMISSIONS } from "./permissions.js";

type Database = { $queryRaw: PrismaClient["$queryRaw"] };

export async function authIssuePasswordReset(database: Database, email: string, tokenHash: string, expiresAt: Date) { await database.$queryRaw(Prisma.sql`SELECT public.auth_issue_password_reset_v1(${email},${tokenHash},${expiresAt})::text`); }
export async function authConsumePasswordReset(database: Database, input: { tokenHash: string; algorithm: string; passwordHash: string; passwordSalt: string; iterations: number }) { const rows=await database.$queryRaw<Array<{ userId: string | null }>>(Prisma.sql`SELECT public.auth_consume_password_reset_v1(${input.tokenHash},${input.algorithm},${input.passwordHash},${input.passwordSalt},${input.iterations}::integer) AS "userId"`);return rows[0]?.userId ?? null; }
export async function authRegisterCustomerSession(database:Database,input:{userId:string;email:string;firstName:string;lastName:string;algorithm:string;passwordHash:string;passwordSalt:string;iterations:number;tokenHash:string;userAgent?:string;ipAddress?:string;expiresAt:Date}){await database.$queryRaw(Prisma.sql`SELECT public.auth_register_customer_session_v1(${input.userId},${input.email},${input.firstName},${input.lastName},${input.algorithm},${input.passwordHash},${input.passwordSalt},${input.iterations}::integer,${input.tokenHash},${input.userAgent??null},${input.ipAddress??null},${input.expiresAt})`)}
export async function authPasswordChallenge(database:Database,email:string){const rows=await database.$queryRaw<Array<{user_id:string;algorithm:string;password_salt:string;iterations:number}>>(Prisma.sql`SELECT * FROM public.auth_password_challenge_v1(${email})`);return rows[0]}
export async function authAuthenticateCreateSession(database:Database,input:{email:string;candidateHash:string;tokenHash:string;userAgent?:string;ipAddress?:string;expiresAt:Date}){const rows=await database.$queryRaw<Array<{userId:string|null}>>(Prisma.sql`SELECT public.auth_authenticate_create_session_v1(${input.email},${input.candidateHash},${input.tokenHash},${input.userAgent??null},${input.ipAddress??null},${input.expiresAt}) AS "userId"`);return rows[0]?.userId??null}
export async function authRotateSession(database:Database,input:{oldTokenHash:string;newTokenHash:string;userAgent?:string;ipAddress?:string;expiresAt:Date}){const rows=await database.$queryRaw<Array<{userId:string|null}>>(Prisma.sql`SELECT public.auth_rotate_session_v1(${input.oldTokenHash},${input.newTokenHash},${input.userAgent??null},${input.ipAddress??null},${input.expiresAt}) AS "userId"`);return rows[0]?.userId??null}
export async function authSessionProjection(database:Database,tokenHash:string){const rows=await database.$queryRaw<Array<{session_id:string;session_token_hash:string;user_id:string;email:string;kind:string;status:string;roles:string[];permissions:string[]}>>(Prisma.sql`SELECT * FROM public.auth_session_projection_v1(${tokenHash})`);return rows[0]}
export async function authRevokeSelfSession(database:Database,tokenHash:string){await database.$queryRaw(Prisma.sql`SELECT public.auth_revoke_self_session_v1(${tokenHash})`)}
export async function authRevokeAllSelfSessions(database:Database,tokenHash:string){await database.$queryRaw(Prisma.sql`SELECT public.auth_revoke_all_self_sessions_v1(${tokenHash})`)}
export async function authAdminRevokeUserSessions(database:Database,input:{sessionTokenHash:string;actorId:string;targetUserId:string}){await database.$queryRaw(Prisma.sql`SELECT public.auth_admin_revoke_user_sessions_v1(${input.sessionTokenHash},${input.actorId},${input.targetUserId})`)}

export type ControlledDashboardAuthorization = {
  actorId: string;
  globalRoleKeys: string[];
  scopedRoleKeys: string[];
  permissionGrants: Array<{ permissionKey: string; global: boolean; dealerIds: string[]; locationIds: string[] }>;
  contextRevision: string;
};

function strings(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string") || JSON.stringify(value) !== JSON.stringify([...new Set(value)].sort())) throw new Error("P02_DASHBOARD_CONTEXT_INVALID");
  return value as string[];
}

export async function p02DashboardAuthorizationContext(database: Database, sessionTokenHash: string, actorId: string): Promise<ControlledDashboardAuthorization> {
  const rows = await database.$queryRaw<Array<{ value: unknown }>>(Prisma.sql`SELECT public.p02_dashboard_authorization_context_v1(${sessionTokenHash},${actorId}) AS value`);
  const value = rows[0]?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("P02_DASHBOARD_CONTEXT_INVALID");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join() !== "actorId,contextRevision,globalRoleKeys,permissionGrants,scopedRoleKeys" || record.actorId !== actorId || typeof record.contextRevision !== "string" || record.contextRevision !== "unavailable" && !/^[0-9a-f]{64}$/.test(record.contextRevision) || !Array.isArray(record.permissionGrants)) throw new Error("P02_DASHBOARD_CONTEXT_INVALID");
  return {
    actorId,
    globalRoleKeys: strings(record.globalRoleKeys),
    scopedRoleKeys: strings(record.scopedRoleKeys),
    permissionGrants: record.permissionGrants.map(item => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("P02_DASHBOARD_CONTEXT_INVALID");
      const grant = item as Record<string, unknown>;
      if (Object.keys(grant).sort().join() !== "dealerIds,global,locationIds,permissionKey" || typeof grant.permissionKey !== "string" || !(INITIAL_PERMISSIONS as readonly string[]).includes(grant.permissionKey) || typeof grant.global !== "boolean") throw new Error("P02_DASHBOARD_CONTEXT_INVALID");
      return { permissionKey: grant.permissionKey, global: grant.global, dealerIds: strings(grant.dealerIds), locationIds: strings(grant.locationIds) };
    }).sort((a, b) => a.permissionKey.localeCompare(b.permissionKey)),
    contextRevision: record.contextRevision
  };
}

export async function p02DashboardSubjectContext(database: Database, sessionTokenHash: string, actorId: string, subjectActorId: string): Promise<ControlledDashboardAuthorization> {
  const rows = await database.$queryRaw<Array<{ value: unknown }>>(Prisma.sql`SELECT public.p02_dashboard_subject_context_v1(${sessionTokenHash},${actorId},${subjectActorId}) AS value`);
  const value=rows[0]?.value;if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("P02_SUBJECT_CONTEXT_INVALID");const record=value as Record<string,unknown>;if(Object.keys(record).sort().join()!=="actorId,contextRevision,globalRoleKeys,permissionGrants,scopedRoleKeys"||record.actorId!==subjectActorId||typeof record.contextRevision!=="string"||record.contextRevision!=="unavailable"&&!/^[0-9a-f]{64}$/.test(record.contextRevision)||!Array.isArray(record.permissionGrants))throw new Error("P02_SUBJECT_CONTEXT_INVALID");return{actorId:subjectActorId,globalRoleKeys:strings(record.globalRoleKeys),scopedRoleKeys:strings(record.scopedRoleKeys),permissionGrants:record.permissionGrants.map(item=>{if(!item||typeof item!=="object"||Array.isArray(item))throw new Error("P02_SUBJECT_CONTEXT_INVALID");const grant=item as Record<string,unknown>;if(Object.keys(grant).sort().join()!=="dealerIds,global,locationIds,permissionKey"||typeof grant.permissionKey!=="string"||!(INITIAL_PERMISSIONS as readonly string[]).includes(grant.permissionKey)||typeof grant.global!=="boolean")throw new Error("P02_SUBJECT_CONTEXT_INVALID");return{permissionKey:grant.permissionKey,global:grant.global,dealerIds:strings(grant.dealerIds),locationIds:strings(grant.locationIds)}}).sort((a,b)=>a.permissionKey.localeCompare(b.permissionKey)),contextRevision:record.contextRevision};
}

export async function p02LockDashboardPrincipals(database: Database, sessionTokenHash: string, actorId: string, principalIds: string[]) {
  await database.$queryRaw(Prisma.sql`SELECT public.p02_lock_dashboard_principals_v1(${sessionTokenHash},${actorId},${principalIds}::text[])`);
}

export async function p02LockMembership(database: Database, sessionTokenHash: string, actorId: string, membershipId: string) {
  return database.$queryRaw<Array<{ id: string; revision: number }>>(Prisma.sql`SELECT * FROM public.p02_lock_membership_v1(${sessionTokenHash},${actorId},${membershipId})`);
}

export async function p02UpdateMembership(database: Database, input: { sessionTokenHash: string; actorId: string; membershipId: string; expectedRevision: number; status?: string; roleKeys?: string[]; locationIds?: string[] }) {
  return database.$queryRaw<Array<{ value: unknown }>>(Prisma.sql`SELECT public.p02_update_membership_v1(${input.sessionTokenHash},${input.actorId},${input.membershipId},${input.expectedRevision}::integer,${input.status ?? null},${input.roleKeys ?? null}::text[],${input.locationIds ?? null}::text[]) AS value`);
}

export async function p04AppendAuditEvent(database: Database, sessionTokenHash: string, actorId: string, event: Prisma.InputJsonObject): Promise<AuditEvent> {
  let rows: AuditEvent[];
  try { rows = await database.$queryRaw<AuditEvent[]>(Prisma.sql`SELECT * FROM public.p04_append_audit_event_v1(${sessionTokenHash},${actorId},${JSON.stringify(event)}::jsonb)`); }
  catch (error) { if (error instanceof Error && (error.message.includes("P04_IDEMPOTENCY_CONFLICT") || error.message.includes("23505"))) throw new Error("P04_IDEMPOTENCY_CONFLICT"); throw error; }
  if (rows.length !== 1) throw new Error("P04_AUDIT_WRITE_INVALID");
  return rows[0]!;
}

export type ControlledAuditListInput = {
  sessionTokenHash: string; actorId: string; occurredFrom: Date; occurredTo: Date; rangeAnchor: Date; limit: number;
  afterOccurredAt?: Date; afterId?: string; actorType?: string; filterActorId?: string; actions: string[]; resourceTypes: string[];
  resourceId?: string; results: string[]; requestId?: string; sources: string[]; sensitive?: boolean;
};
export async function p04AuditList(database: Database, input: ControlledAuditListInput): Promise<AuditEvent[]> {
  return database.$queryRaw<AuditEvent[]>(Prisma.sql`SELECT * FROM public.p04_audit_list_v1(${input.sessionTokenHash},${input.actorId},${input.occurredFrom},${input.occurredTo},${input.rangeAnchor},${input.limit}::integer,${input.afterOccurredAt ?? null},${input.afterId ?? null}::uuid,${input.actorType ?? null},${input.filterActorId ?? null},${input.actions}::text[],${input.resourceTypes}::text[],${input.resourceId ?? null},${input.results}::text[],${input.requestId ?? null},${input.sources}::text[],${input.sensitive ?? null})`);
}
export async function p05CreateApplicationJob(database: Database, input: { sessionTokenHash: string; actorId: string; job: Prisma.InputJsonObject; candidates: string[]; eventIntentHash: string }) {
  const rows=await database.$queryRaw<Array<{job_id:string;replayed:boolean}>>(Prisma.sql`SELECT * FROM public.p05_api_create_probe_v1(${input.sessionTokenHash},${input.actorId},${JSON.stringify(input.job)}::jsonb,${input.candidates}::text[],${input.eventIntentHash})`);return rows[0];
}
export async function p05ApiList(database: Database, input: { sessionTokenHash: string; actorId: string; scopeKind: string; dealerIds: string[]; locationIds: string[]; createdFrom: Date; createdTo: Date; limit: number; afterCreatedAt?: Date; afterId?: string; statuses: string[]; jobTypes: string[]; createdByActorType?: string; cancellable?: boolean; retryable?: boolean }) { return database.$queryRaw<AsyncJob[]>(Prisma.sql`SELECT * FROM public.p05_api_list_v1(${input.sessionTokenHash},${input.actorId},${input.scopeKind},${input.dealerIds}::text[],${input.locationIds}::text[],${input.createdFrom},${input.createdTo},${input.limit}::integer,${input.afterCreatedAt ?? null},${input.afterId ?? null}::uuid,${input.statuses}::text[],${input.jobTypes}::text[],${input.createdByActorType ?? null},${input.cancellable ?? null}::boolean,${input.retryable ?? null}::boolean)`); }
export async function p05ApiDetail(database: Database, sessionTokenHash:string, actorId:string, jobId:string) { const rows=await database.$queryRaw<AsyncJob[]>(Prisma.sql`SELECT * FROM public.p05_api_detail_v1(${sessionTokenHash},${actorId},${jobId}::uuid)`);return rows[0]; }
export async function p05ApiArtifacts(database: Database, sessionTokenHash:string, actorId:string, jobId:string) { return database.$queryRaw<JobArtifact[]>(Prisma.sql`SELECT * FROM public.p05_api_artifacts_v1(${sessionTokenHash},${actorId},${jobId}::uuid)`); }
export async function p05ApiCancel(database: Database, input: { sessionTokenHash: string; actorId: string; jobId: string; expectedVersion: number }) { const rows=await database.$queryRaw<AsyncJob[]>(Prisma.sql`SELECT * FROM public.p05_api_cancel_v1(${input.sessionTokenHash},${input.actorId},${input.jobId}::uuid,${input.expectedVersion}::integer)`);return rows[0]; }
export async function p05ApiRetry(database: Database, input: { sessionTokenHash: string; actorId: string; jobId: string; expectedVersion: number }) { const rows=await database.$queryRaw<AsyncJob[]>(Prisma.sql`SELECT * FROM public.p05_api_retry_v1(${input.sessionTokenHash},${input.actorId},${input.jobId}::uuid,${input.expectedVersion}::integer)`);return rows[0]; }
export async function p06ApiMutateItem(database: Database, input: { sessionTokenHash: string; actorId: string; itemId: string; expectedVersion: number; operation: "assign"|"unassign"|"acknowledge"|"resolve"|"dismiss"|"reopen"; reason?: string; targetUserId?: string; deduplicationCandidates?: string[] }) { const rows=await database.$queryRaw<WorkQueueItem[]>(Prisma.sql`SELECT * FROM public.p06_api_mutate_item_v1(${input.sessionTokenHash},${input.actorId},${input.itemId}::uuid,${input.expectedVersion}::integer,${input.operation},${input.reason ?? null},${input.targetUserId ?? null}::text,${input.deduplicationCandidates ?? []}::text[])`);return rows[0]; }
export async function p06ApiCreateNotification(database: Database,input:{sessionTokenHash:string;actorId:string;recipientUserId:string;itemId:string;type:string;transitionVersion:number;deduplicationKid:string;deduplicationHash:string;deduplicationCandidates:string[]}){const rows=await database.$queryRaw<InAppNotification[]>(Prisma.sql`SELECT * FROM public.p06_api_create_notification_v1(${input.sessionTokenHash},${input.actorId},${input.recipientUserId},${input.itemId}::uuid,${input.type},${input.transitionVersion}::integer,${input.deduplicationKid},${input.deduplicationHash},${input.deduplicationCandidates}::text[])`);return rows[0]}
export async function p06ApiUpdateSourceState(database:Database,input:{adapterKey:string;adapterVersion:string;health:string;safeErrorCode?:string}){const rows=await database.$queryRaw<WorkQueueSourceState[]>(Prisma.sql`SELECT * FROM public.p06_api_update_source_state_v1(${input.adapterKey},${input.adapterVersion},${input.health},${input.safeErrorCode??null})`);if(rows[0])return{state:rows[0],changed:true};const current=await database.$queryRaw<WorkQueueSourceState[]>(Prisma.sql`SELECT * FROM public.p06_api_get_source_state_v1(${input.adapterKey},${input.adapterVersion})`);if(!current[0])throw new Error("WORK_QUEUE_SOURCE_INVALID");return{state:current[0],changed:false}}
export async function p07ApiCreateMediaJob(database:Database,input:{sessionTokenHash:string;actorId:string;job:Record<string,unknown>;candidates:string[];eventIntentHash:string}){const rows=await database.$queryRaw<Array<{job_id:string;replayed:boolean}>>(Prisma.sql`SELECT * FROM public.p07_api_create_media_job_v1(${input.sessionTokenHash},${input.actorId},${JSON.stringify(input.job)}::jsonb,${input.candidates}::text[],${input.eventIntentHash})`);return rows[0]}
export async function p07ApiMediaJobDetail(database:Database,input:{sessionTokenHash:string;actorId:string;assetId:string;jobId:string;permission:"media.read"|"media.manage_variants"|"media.create"}){const rows=await database.$queryRaw<AsyncJob[]>(Prisma.sql`SELECT * FROM public.p07_api_media_job_detail_v1(${input.sessionTokenHash},${input.actorId},${input.assetId}::uuid,${input.jobId}::uuid,${input.permission})`);return rows[0]}
export async function p07ApiLockMediaJob(database:Database,input:{sessionTokenHash:string;actorId:string;assetId:string;jobId:string}){const rows=await database.$queryRaw<Array<{locked:boolean}>>(Prisma.sql`SELECT public.p07_api_lock_media_job_v1(${input.sessionTokenHash},${input.actorId},${input.assetId}::uuid,${input.jobId}::uuid) AS locked`);return rows[0]?.locked===true}
export async function p07ApiRetryMediaJob(database:Database,input:{sessionTokenHash:string;actorId:string;assetId:string;jobId:string;expectedJobVersion:number;expectedRetryGeneration:number;binding:Prisma.InputJsonValue;bindingRevision:number;bindingHash:string}){const rows=await database.$queryRaw<AsyncJob[]>(Prisma.sql`SELECT * FROM public.p07_api_retry_media_job_v1(${input.sessionTokenHash},${input.actorId},${input.assetId}::uuid,${input.jobId}::uuid,${input.expectedJobVersion}::integer,${input.expectedRetryGeneration}::integer,${JSON.stringify(input.binding)}::jsonb,${input.bindingRevision}::integer,${input.bindingHash})`);return rows[0]}
export async function p10HasAnonymousAnalyticsConsent(database: Database, anonymousId: string): Promise<boolean> {
  const rows = await database.$queryRaw<Array<{ allowed: boolean }>>(Prisma.sql`SELECT public.p10_has_anonymous_analytics_consent_v1(${anonymousId}) AS allowed`);
  return rows[0]?.allowed === true;
}

export async function p04AuditDetail(database: Database, sessionTokenHash: string, actorId: string, auditId: string, observedAt: Date): Promise<AuditEvent | null> {
  const rows = await database.$queryRaw<AuditEvent[]>(Prisma.sql`SELECT * FROM public.p04_audit_detail_v1(${sessionTokenHash},${actorId},${auditId}::uuid,${observedAt})`);
  if (rows.length > 1) throw new Error("P04_AUDIT_DETAIL_INVALID");
  return rows[0] ?? null;
}
