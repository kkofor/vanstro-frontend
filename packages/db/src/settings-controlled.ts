import { Prisma, type PrismaClient, type RuntimeConfigVersion, type SettingsPublicationEvent } from "@prisma/client";

type Database = { $queryRaw: PrismaClient["$queryRaw"] };

export function settingsRows(database: Database, sessionTokenHash: string, actorId: string) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`SELECT * FROM public.s01_settings_rows_v2(${sessionTokenHash},${actorId})`);
}
export function settingsCreateDraft(database: Database, input: { sessionTokenHash:string;actorId:string;expectedPublishedVersion:number;value:number;changeReason:string;idempotencyHash:string;requestHash:string;requestId:string;rollbackSource?:string }) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`SELECT * FROM public.s01_settings_create_draft_v2(${input.sessionTokenHash},${input.actorId},${input.expectedPublishedVersion}::integer,${input.value}::integer,${input.changeReason},${input.idempotencyHash},${input.requestHash},${input.requestId},${input.rollbackSource ?? null}::uuid)`);
}
export function settingsUpdateDraft(database: Database, input: { sessionTokenHash:string;actorId:string;draftId:string;expectedVersion:number;value:number;changeReason:string;idempotencyHash:string;requestHash:string;requestId:string }) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`SELECT * FROM public.s01_settings_update_draft_v2(${input.sessionTokenHash},${input.actorId},${input.draftId}::uuid,${input.expectedVersion}::integer,${input.value}::integer,${input.changeReason},${input.idempotencyHash},${input.requestHash},${input.requestId})`);
}
export function settingsValidateDraft(database: Database, input: { sessionTokenHash:string;actorId:string;draftId:string;expectedVersion:number;idempotencyHash:string;requestHash:string;requestId:string }) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`SELECT * FROM public.s01_settings_validate_v2(${input.sessionTokenHash},${input.actorId},${input.draftId}::uuid,${input.expectedVersion}::integer,${input.idempotencyHash},${input.requestHash},${input.requestId})`);
}
export function settingsPublishDraft(database: Database, input: { sessionTokenHash:string;actorId:string;draftId:string;expectedVersion:number;idempotencyHash:string;requestHash:string;requestId:string }) {
  return database.$queryRaw<RuntimeConfigVersion[]>(Prisma.sql`SELECT * FROM public.s01_settings_publish_v2(${input.sessionTokenHash},${input.actorId},${input.draftId}::uuid,${input.expectedVersion}::integer,${input.idempotencyHash},${input.requestHash},${input.requestId})`);
}
export function settingsEvents(database: Database, sessionTokenHash: string, actorId: string) {
  return database.$queryRaw<SettingsPublicationEvent[]>(Prisma.sql`SELECT * FROM public.s01_settings_events_v2(${sessionTokenHash},${actorId})`);
}
