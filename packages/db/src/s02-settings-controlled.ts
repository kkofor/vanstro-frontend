import { Prisma, type PrismaClient, type RuntimeConfigVersion, type SettingsPublicationEvent } from "@prisma/client";

type Database = { $queryRaw: PrismaClient["$queryRaw"] };

/** S02 descriptor-scoped controlled functions (settings.general-storefront). */

export function s02SettingsRows(database: Database, sessionTokenHash: string, actorId: string) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`SELECT * FROM public.s02_settings_rows_v2(${sessionTokenHash},${actorId})`);
}

export function s02SettingsCreateDraft(database: Database, input: {
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
    SELECT * FROM public.s02_settings_create_draft_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.expectedPublishedVersion}::integer,
      ${JSON.stringify(input.value)}::jsonb, ${input.changeReason}, ${input.idempotencyHash},
      ${input.requestHash}, ${input.requestId}, ${input.rollbackSource ?? null}::uuid
    )`);
}

export function s02SettingsUpdateDraft(database: Database, input: {
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
    SELECT * FROM public.s02_settings_update_draft_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.draftId}::uuid, ${input.expectedVersion}::integer,
      ${JSON.stringify(input.value)}::jsonb, ${input.changeReason}, ${input.idempotencyHash},
      ${input.requestHash}, ${input.requestId}
    )`);
}

export function s02SettingsValidateDraft(database: Database, input: {
  sessionTokenHash: string;
  actorId: string;
  draftId: string;
  expectedVersion: number;
  idempotencyHash: string;
  requestHash: string;
  requestId: string;
}) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`
    SELECT * FROM public.s02_settings_validate_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.draftId}::uuid, ${input.expectedVersion}::integer,
      ${input.idempotencyHash}, ${input.requestHash}, ${input.requestId}
    )`);
}

export function s02SettingsPublishDraft(database: Database, input: {
  sessionTokenHash: string;
  actorId: string;
  draftId: string;
  expectedVersion: number;
  idempotencyHash: string;
  requestHash: string;
  requestId: string;
}) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`
    SELECT * FROM public.s02_settings_publish_v2(
      ${input.sessionTokenHash}, ${input.actorId}, ${input.draftId}::uuid, ${input.expectedVersion}::integer,
      ${input.idempotencyHash}, ${input.requestHash}, ${input.requestId}
    )`);
}

export function s02SettingsEvents(database: Database, sessionTokenHash: string, actorId: string) {
  return database.$queryRaw<SettingsPublicationEvent[]>(Prisma.sql`SELECT * FROM public.s02_settings_events_v2(${sessionTokenHash},${actorId})`);
}

export function s02SettingsPublicProjection(database: Database, locale: "en-CA" | "fr-CA") {
  return database.$queryRaw<Array<{ s02_settings_public_projection_v1: string }>>(Prisma.sql`
    SELECT public.s02_settings_public_projection_v1(${locale}) AS s02_settings_public_projection_v1`);
}
