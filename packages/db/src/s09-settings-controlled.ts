import { Prisma, type PrismaClient, type RuntimeConfigVersion, type SettingsPublicationEvent } from "@prisma/client";

type Database = { $queryRaw: PrismaClient["$queryRaw"] };

/** S09 descriptor-scoped controlled functions (settings.auth-rbac). */

export function s09SettingsRows(database: Database, sessionTokenHash: string, actorId: string) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`SELECT * FROM public.s09_settings_rows_v2(${sessionTokenHash},${actorId})`);
}

export function s09SettingsCreateDraft(database: Database, input: {
  sessionTokenHash: string;
  actorId: string;
  expectedPublishedVersion: number;
  value: unknown;
  changeReason: string;
  idempotencyHash: string;
  requestHash: string;
  requestId: string;
  rollbackSource?: string;
}) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`
    SELECT * FROM public.s09_settings_create_draft_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.expectedPublishedVersion}::integer,
      ${JSON.stringify(input.value)}::jsonb, ${input.changeReason}, ${input.idempotencyHash},
      ${input.requestHash}, ${input.requestId}, ${input.rollbackSource ?? null}::uuid
    )`);
}

export function s09SettingsUpdateDraft(database: Database, input: {
  sessionTokenHash: string;
  actorId: string;
  draftId: string;
  expectedVersion: number;
  value: unknown;
  changeReason: string;
  idempotencyHash: string;
  requestHash: string;
  requestId: string;
}) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`
    SELECT * FROM public.s09_settings_update_draft_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.draftId}::uuid, ${input.expectedVersion}::integer,
      ${JSON.stringify(input.value)}::jsonb, ${input.changeReason}, ${input.idempotencyHash},
      ${input.requestHash}, ${input.requestId}
    )`);
}

export function s09SettingsValidateDraft(database: Database, input: {
  sessionTokenHash: string;
  actorId: string;
  draftId: string;
  expectedVersion: number;
  idempotencyHash: string;
  requestHash: string;
  requestId: string;
}) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`
    SELECT * FROM public.s09_settings_validate_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.draftId}::uuid, ${input.expectedVersion}::integer,
      ${input.idempotencyHash}, ${input.requestHash}, ${input.requestId}
    )`);
}

export function s09SettingsPublishDraft(database: Database, input: {
  sessionTokenHash: string;
  actorId: string;
  draftId: string;
  expectedVersion: number;
  idempotencyHash: string;
  requestHash: string;
  requestId: string;
}) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`
    SELECT * FROM public.s09_settings_publish_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.draftId}::uuid, ${input.expectedVersion}::integer,
      ${input.idempotencyHash}, ${input.requestHash}, ${input.requestId}
    )`);
}

export function s09SettingsEvents(database: Database, sessionTokenHash: string, actorId: string) {
  return database.$queryRaw<SettingsPublicationEvent[]>(Prisma.sql`SELECT * FROM public.s09_settings_events_v2(${sessionTokenHash},${actorId})`);
}

/** Read-only effective auth policy (compiled defaults when unpublished). */
export type EffectiveAuthPolicy = {
  projectionState: "published" | "compiled_default";
  publishedGeneration: number;
  passwordPolicy: { minimumLength: number; resetTokenTtlMinutes: number };
  sessionPolicy: { sessionLifetimeMinutes: number };
};

export function s09SettingsEffectivePolicy(database: Database) {
  return database.$queryRaw<Array<{ s09_settings_effective_policy_v1: string }>>(Prisma.sql`
    SELECT public.s09_settings_effective_policy_v1() AS s09_settings_effective_policy_v1`);
}
