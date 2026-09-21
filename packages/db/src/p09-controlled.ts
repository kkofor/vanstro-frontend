import { Prisma, type PrismaClient } from "@prisma/client";

export type P09Scope = { kind: "global" | "dealer" | "location"; dealerIds: string[]; locationIds: string[] };
export type P09Binding = {
  actorId: string;
  sessionTokenHash: string;
  contextRevision: string;
  scopeFingerprint: string;
  fieldVisibilityFingerprint: string;
  scope: P09Scope;
};
type Database = PrismaClient | Prisma.TransactionClient;

export type P09WorkerObservation = {
  activeCount: bigint;
  drainingCount: bigint;
  shutdownCount: bigint;
  staleCount: bigint;
  totalCapacity: bigint;
  latestSucceededAt: Date | null;
  latestFailedAt: Date | null;
  latestErrorCode: "worker_error" | null;
  observedAt: Date;
};

type P09WorkerObservationRow = {
  active_count: bigint;
  draining_count: bigint;
  shutdown_count: bigint;
  stale_count: bigint;
  total_capacity: bigint;
  latest_succeeded_at: Date | null;
  latest_failed_at: Date | null;
  latest_error_code: string | null;
  observed_at: Date;
};

export async function p09WorkerObservation(database: Database): Promise<P09WorkerObservation> {
  const rows = await database.$queryRaw<P09WorkerObservationRow[]>(Prisma.sql`
    SELECT * FROM public.p09_worker_observation_v3()
  `);
  const row = rows[0];
  if (!row || row.latest_error_code !== null && row.latest_error_code !== "worker_error") {
    throw new Error("P09_WORKER_OBSERVATION_INVALID");
  }
  return {
    activeCount: row.active_count,
    drainingCount: row.draining_count,
    shutdownCount: row.shutdown_count,
    staleCount: row.stale_count,
    totalCapacity: row.total_capacity,
    latestSucceededAt: row.latest_succeeded_at,
    latestFailedAt: row.latest_failed_at,
    latestErrorCode: row.latest_error_code,
    observedAt: row.observed_at
  };
}

export async function p09ConfigList(database: Database, binding: P09Binding) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p09_config_list_v3(${binding.sessionTokenHash},${binding.contextRevision},${binding.scope.kind},${binding.scope.dealerIds}::text[],${binding.scope.locationIds}::text[])
  `);
}

export async function p09ConfigPropose(database: Database, input: P09Binding & {
  key: string; schemaVersion: string; desiredValue: Prisma.InputJsonValue; expectedVersion: number;
  idempotencyHash: string; requestHash: string; requestId: string;
}) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p09_config_propose(${input.sessionTokenHash},${input.actorId},${input.contextRevision},${input.scopeFingerprint},
      ${input.fieldVisibilityFingerprint},${input.scope.kind},${input.scope.dealerIds}::text[],${input.scope.locationIds}::text[],
      ${input.key},${input.schemaVersion},${JSON.stringify(input.desiredValue)}::jsonb,${input.expectedVersion},${input.idempotencyHash},${input.requestHash},${input.requestId})
  `);
}

export async function p09ConfigActivate(database: Database, input: P09Binding & {
  key: string; expectedVersion: number; idempotencyHash: string; requestHash: string; requestId: string; simulateFailure: boolean;
}) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p09_config_activate(${input.sessionTokenHash},${input.actorId},${input.contextRevision},${input.scopeFingerprint},
      ${input.fieldVisibilityFingerprint},${input.scope.kind},${input.scope.dealerIds}::text[],${input.scope.locationIds}::text[],
      ${input.key},${input.expectedVersion},${input.idempotencyHash},${input.requestHash},${input.requestId},${input.simulateFailure})
  `);
}

export async function p09ConfigRollback(database: Database, input: P09Binding & {
  key: string; expectedVersion: number; rollbackVersion: number; idempotencyHash: string; requestHash: string; requestId: string;
}) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p09_config_rollback(${input.sessionTokenHash},${input.actorId},${input.contextRevision},${input.scopeFingerprint},
      ${input.fieldVisibilityFingerprint},${input.scope.kind},${input.scope.dealerIds}::text[],${input.scope.locationIds}::text[],
      ${input.key},${input.expectedVersion},${input.rollbackVersion},${input.idempotencyHash},${input.requestHash},${input.requestId})
  `);
}

export async function p09FlagList(database: Database, binding: P09Binding) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p09_flag_list_v3(${binding.sessionTokenHash},${binding.contextRevision},${binding.scope.kind},${binding.scope.dealerIds}::text[],${binding.scope.locationIds}::text[])
  `);
}

export async function p09FlagPropose(database: Database, input: P09Binding & {
  key: string; desiredState: string; expectedVersion: number; idempotencyHash: string; requestHash: string; requestId: string;
}) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p09_flag_propose(${input.sessionTokenHash},${input.actorId},${input.contextRevision},${input.scopeFingerprint},
      ${input.fieldVisibilityFingerprint},${input.scope.kind},${input.scope.dealerIds}::text[],${input.scope.locationIds}::text[],
      ${input.key},${input.desiredState},${input.expectedVersion},${input.idempotencyHash},${input.requestHash},${input.requestId})
  `);
}

export async function p09FlagActivate(database: Database, input: P09Binding & {
  key: string; expectedVersion: number; kill: boolean; confirmation?: string; requestId: string;
}) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p09_flag_activate(${input.sessionTokenHash},${input.actorId},${input.contextRevision},${input.scopeFingerprint},
      ${input.fieldVisibilityFingerprint},${input.scope.kind},${input.scope.dealerIds}::text[],${input.scope.locationIds}::text[],
      ${input.key},${input.expectedVersion},${input.kill},${input.confirmation ?? null},${input.requestId})
  `);
}
