import { Prisma, type PrismaClient, type RuntimeConfigVersion, type SettingsPublicationEvent } from "@prisma/client";

type Database = { $queryRaw: PrismaClient["$queryRaw"] };

/** S10 descriptor-scoped controlled functions (settings.privacy-retention). */

export function s10SettingsRows(database: Database, sessionTokenHash: string, actorId: string) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`SELECT * FROM public.s10_settings_rows_v2(${sessionTokenHash},${actorId})`);
}

export function s10SettingsCreateDraft(database: Database, input: {
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
    SELECT * FROM public.s10_settings_create_draft_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.expectedPublishedVersion}::integer,
      ${JSON.stringify(input.value)}::jsonb, ${input.changeReason}, ${input.idempotencyHash},
      ${input.requestHash}, ${input.requestId}, ${input.rollbackSource ?? null}::uuid
    )`);
}

export function s10SettingsUpdateDraft(database: Database, input: {
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
    SELECT * FROM public.s10_settings_update_draft_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.draftId}::uuid, ${input.expectedVersion}::integer,
      ${JSON.stringify(input.value)}::jsonb, ${input.changeReason}, ${input.idempotencyHash},
      ${input.requestHash}, ${input.requestId}
    )`);
}

export function s10SettingsValidateDraft(database: Database, input: {
  sessionTokenHash: string;
  actorId: string;
  draftId: string;
  expectedVersion: number;
  idempotencyHash: string;
  requestHash: string;
  requestId: string;
}) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`
    SELECT * FROM public.s10_settings_validate_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.draftId}::uuid, ${input.expectedVersion}::integer,
      ${input.idempotencyHash}, ${input.requestHash}, ${input.requestId}
    )`);
}

export function s10SettingsPublishDraft(database: Database, input: {
  sessionTokenHash: string;
  actorId: string;
  draftId: string;
  expectedVersion: number;
  idempotencyHash: string;
  requestHash: string;
  requestId: string;
}) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`
    SELECT * FROM public.s10_settings_publish_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.draftId}::uuid, ${input.expectedVersion}::integer,
      ${input.idempotencyHash}, ${input.requestHash}, ${input.requestId}
    )`);
}

export function s10SettingsEvents(database: Database, sessionTokenHash: string, actorId: string) {
  return database.$queryRaw<SettingsPublicationEvent[]>(Prisma.sql`SELECT * FROM public.s10_settings_events_v2(${sessionTokenHash},${actorId})`);
}
