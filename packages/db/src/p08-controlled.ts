import { Prisma, type PrismaClient } from "@prisma/client";

export type P08Scope = { kind: "global" | "dealer" | "location"; dealerIds: string[]; locationIds: string[] };
export type P08Binding = {
  actorId: string;
  sessionTokenHash: string;
  contextRevision: string;
  scopeFingerprint: string;
  fieldVisibilityFingerprint: string;
  scope: P08Scope;
};

type Database = PrismaClient | Prisma.TransactionClient;

export async function p08CreateImport(database: Database, input: P08Binding & {
  importId: string; filename: string; contentType: string; declaredBytes: number;
  uploadTokenHash: string; uploadTokenExpiresAt: Date; uploadIntentHash: string;
  registryVersion: string; schemaVersion: string; parserVersion: string; securityPolicyVersion: string;
}) {
  return database.$queryRaw<Array<{ id: string; status: string; version: number; replayed: boolean }>>(Prisma.sql`
    SELECT * FROM public.p08_create_import(
      ${input.sessionTokenHash},${input.actorId},${input.contextRevision},${input.scopeFingerprint},${input.fieldVisibilityFingerprint},
      ${input.scope.kind},${input.scope.dealerIds}::text[],${input.scope.locationIds}::text[],${input.importId}::uuid,
      ${input.filename},${input.contentType},${BigInt(input.declaredBytes)},${input.uploadTokenHash},${input.uploadTokenExpiresAt},${input.uploadIntentHash},
      ${input.registryVersion},${input.schemaVersion},${input.parserVersion},${input.securityPolicyVersion})
  `);
}

export async function p08ImportList(database: Database, binding: P08Binding, statuses: string[], limit = 50) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p08_import_list(${binding.sessionTokenHash},${binding.actorId},${binding.contextRevision},
      ${binding.scopeFingerprint},${binding.fieldVisibilityFingerprint},${binding.scope.kind},${binding.scope.dealerIds}::text[],
      ${binding.scope.locationIds}::text[],${statuses}::text[],${limit})
  `);
}

export async function p08ImportFinalizeContext(database: Database, importId: string, expectedVersion: number, binding: P08Binding) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p08_import_finalize_context(${binding.sessionTokenHash},${importId}::uuid,${binding.actorId},
      ${binding.contextRevision},${binding.scopeFingerprint},${binding.fieldVisibilityFingerprint},${expectedVersion})
  `);
}

export async function p08ImportDetail(database: Database, permission: string, importId: string, binding: P08Binding) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p08_import_detail(${binding.sessionTokenHash},${permission},${importId}::uuid,${binding.actorId},
      ${binding.contextRevision},${binding.scopeFingerprint},${binding.fieldVisibilityFingerprint})
  `);
}

export async function p08TransitionImport(database: Database, input: P08Binding & {
  permission: string; importId: string; expectedVersion: number; operation: "finalize_upload" | "queue_commit" | "cancel";
  targetStatus: "uploaded" | "commit_queued" | "cancelled"; sourceArtifactId?: string;
}) {
  return database.$queryRaw<Array<{ id: string; status: string; version: number }>>(Prisma.sql`
    SELECT * FROM public.p08_transition_import(${input.sessionTokenHash},${input.permission},${input.importId}::uuid,${input.actorId},
      ${input.contextRevision},${input.scopeFingerprint},${input.fieldVisibilityFingerprint},${input.expectedVersion},${input.operation},
      ${input.targetStatus},${input.sourceArtifactId ?? null}::uuid)
  `);
}

export async function p08ImportRows(database: Database, importId: string, binding: P08Binding, afterRow = 1, limit = 50) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p08_import_rows(${binding.sessionTokenHash},${importId}::uuid,${binding.actorId},${binding.contextRevision},
      ${binding.scopeFingerprint},${binding.fieldVisibilityFingerprint},${afterRow},${limit})
  `);
}

export async function p08CreateExport(database: Database, input: P08Binding & { exportId: string; querySnapshot: Prisma.InputJsonValue; jobId: string }) {
  return database.$queryRaw<Array<{ id: string; status: string; version: number }>>(Prisma.sql`
    SELECT * FROM public.p08_create_export(${input.sessionTokenHash},${input.actorId},${input.contextRevision},${input.scopeFingerprint},
      ${input.fieldVisibilityFingerprint},${input.scope.kind},${input.scope.dealerIds}::text[],${input.scope.locationIds}::text[],
      ${input.exportId}::uuid,${JSON.stringify(input.querySnapshot)}::jsonb,${input.jobId}::uuid)
  `);
}

export async function p08ExportList(database: Database, binding: P08Binding, statuses: string[], limit = 50) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p08_export_list(${binding.sessionTokenHash},${binding.actorId},${binding.contextRevision},
      ${binding.scopeFingerprint},${binding.fieldVisibilityFingerprint},${binding.scope.kind},${binding.scope.dealerIds}::text[],
      ${binding.scope.locationIds}::text[],${statuses}::text[],${limit})
  `);
}

export async function p08ExportDetail(database: Database, permission: string, exportId: string, binding: P08Binding) {
  return database.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT * FROM public.p08_export_detail(${binding.sessionTokenHash},${permission},${exportId}::uuid,${binding.actorId},
      ${binding.contextRevision},${binding.scopeFingerprint},${binding.fieldVisibilityFingerprint})
  `);
}

export async function p08TransitionExport(database: Database, input: P08Binding & {
  permission: string; exportId: string; expectedVersion: number; operation: "cancel"; targetStatus: "cancelled";
}) {
  return database.$queryRaw<Array<{ id: string; status: string; version: number }>>(Prisma.sql`
    SELECT * FROM public.p08_transition_export(${input.sessionTokenHash},${input.permission},${input.exportId}::uuid,${input.actorId},
      ${input.contextRevision},${input.scopeFingerprint},${input.fieldVisibilityFingerprint},${input.expectedVersion},${input.operation},${input.targetStatus})
  `);
}

export async function p08CommitSample(database: Database, input: {
  jobId: string; leaseOwner: string; leaseRevision: number; importId: string; expectedBatchVersion: number; rowNumber: number;
  expectedTargetVersion: number; externalKey: string; label: string; state: "active" | "inactive"; quantity: number;
  effectiveDate?: Date; note?: string;
}) {
  return database.$queryRaw<Array<{ target_id: string; target_version: bigint; replayed: boolean }>>(Prisma.sql`
    SELECT * FROM public.p08_commit_sample(${input.jobId}::uuid,${input.leaseOwner},${input.leaseRevision},${input.importId}::uuid,
      ${input.expectedBatchVersion},${input.rowNumber},${input.expectedTargetVersion},${input.externalKey},${input.label},${input.state},
      ${input.quantity},${input.effectiveDate ?? null}::date,${input.note ?? null})
  `);
}
