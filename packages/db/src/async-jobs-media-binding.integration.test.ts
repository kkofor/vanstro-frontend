import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "./index.js";
import { ownedRuntimeClient } from "./test-runtime-client.js";
import { assertMediaExecutionSnapshot, claimNextAsyncJob, completeAsyncJob, createAsyncJob, createMediaExecutionBinding, mediaExecutionBindingHash, parseJobKeyset, resolveMediaExecutionSnapshot, selectBoundMediaProcessingOutputs, type MediaExecutionSnapshot } from "./async-jobs.js";

function disposable(t:test.TestContext){const name=new URL(process.env.DATABASE_URL??"postgresql://localhost/unknown").pathname.slice(1);if(!/(test|smoke|disposable)/i.test(name)){t.skip("P07 Unit B requires owned disposable database");return false}return true}
beforeEach(async()=>{const name=new URL(process.env.DATABASE_URL??"postgresql://localhost/unknown").pathname.slice(1);if(/(test|smoke|disposable)/i.test(name))await prisma.$executeRawUnsafe(`TRUNCATE TABLE "audit_events","media_storage_operations","media_variants","media_upload_intents","media_retry_commands","media_hmac_kid_retirements","async_job_attempts","job_artifacts","async_jobs","media_assets" CASCADE`)})
const keyset=()=>parseJobKeyset(JSON.stringify({activeKid:"unit-b",keys:[{kid:"unit-b",key:randomBytes(32).toString("base64"),mode:"active"}]}));
async function fixture() {
  const assetId = randomUUID(), operationId = randomUUID(), intentId = randomUUID();
  const checksum = "a".repeat(64), configHash = "b".repeat(43), requestId = `unit-b-${randomUUID()}`;
  const asset = await prisma.mediaAsset.create({ data: {
    id: assetId, contractVersion: "media-asset.v1", schemaVersion: "media-asset-schema.v1", registryVersion: "media-registry.v1",
    kind: "image", status: "processing", originalFilename: "unit.jpg", safeDisplayName: "unit.jpg", declaredContentType: "image/jpeg",
    expectedBytes: 1n, source: "dashboard_upload", provenanceOrigin: "human_upload", storageProvider: "private_filesystem.v1",
    processingPolicyVersion: "media-processing.v1", securityPolicyVersion: "media-security.v1", processingConfigHash: configHash,
    variantSetState: "unresolved", tags: [], authorizationScopeKind: "global", dealerIds: [], locationIds: [], createdByActorType: "system",
    effectiveRoles: [], permissionGrants: [], contextRevision: "unit-b", retentionClass: "default", retentionPolicyVersion: "media-retention.v1",
    requestId, version: 1,
  } });
  await prisma.mediaUploadIntent.create({ data: {
    id: intentId, assetId, contractVersion: "media-upload-intent.v1", status: "claimed", actorId: randomUUID(), contextRevision: "unit-b",
    permissionGrantHash: "g".repeat(43), scopeHash: "s".repeat(43), authorizationScopeKind: "global", dealerIds: [], locationIds: [],
    expectedBytes: 1n, capabilityKid: "unit-b", capabilityHash: "c".repeat(43), intentHash: "i".repeat(43), nonceHash: "n".repeat(43),
    expiresAt: new Date(Date.now() + 60000), operationId, operationState: "claimed", cleanupState: "none", leaseOwner: "unit-b-fixture",
    leaseRevision: 1, leaseExpiresAt: new Date(Date.now() + 60000), heartbeatAt: new Date(),
  } });
  await prisma.mediaStorageOperation.create({ data: {
    id: operationId, assetId, uploadIntentId: intentId, contractVersion: "media-storage-operation.v1", provider: "private_filesystem.v1",
    objectKey: `unit-b/${operationId}`, objectRole: "upload_staging", state: "written", cleanupStatus: "none", expectedAssetVersion: 0,
    sourceChecksum: checksum, processingConfigHash: configHash, authorizationScopeKind: "global", dealerIds: [], locationIds: [], byteCount: 1n, checksum,
  } });
  const variant = await prisma.mediaVariant.create({ data: {
    assetId, storageOperationId: operationId, contractVersion: "media-variant.v1", role: "original", status: "processing",
    sourceAssetVersion: asset.version, contentType: "image/jpeg", configVersion: "media-processing.v1", configHash,
  } });
  const job = (await createAsyncJob(prisma, {
    id: operationId, runtimeMode: "test", typeKey: "media.process",
    payload: { assetId, expectedAssetVersion: asset.version, selectedUploadOperationId: operationId, sourceChecksum: checksum, processingConfigHash: configHash },
    idempotencyKey: `media-process:${assetId}:${asset.version}`,
    authorization: { actorType: "system", effectiveRoles: [], permissionGrants: [{ permissionKey: "media.manage_variants", scope: { kind: "global" } }], scope: { kind: "global" }, contextRevision: "unit-b" },
    requestId, keyset: keyset(),
  })).job;
  const auditAt = new Date(Date.now() - 2000);
  const runtime = ownedRuntimeClient();
  try {
    await runtime.$transaction(async tx => {
      const event = await tx.auditEvent.create({ data: {
        eventVersion: "audit-event.v1", occurredAt: auditAt, actorType: "system", actorDisplayClass: "machine", effectiveRoles: [], permissionGrants: [{ permissionKey: "media.create", scope: { kind: "global" } }],
        authorizationScopeKind: "global", dealerIds: [], locationIds: [], contextRevision: "unit-b", authorizationContractVersion: "system-authorization.v1",
        action: "update", resourceType: "media_storage_operation", resourceId: operationId, result: "succeeded", requestId, source: "system",
        metadata: { schemaVersion: "audit-metadata.v1", entries: { objectRole: "upload_staging", fromState: "written_unbound", toState: "written_bound" } }, sensitive: false, retentionClass: "default",
        retentionPolicyVersion: "audit-retention.v1", expiresAt: new Date(auditAt.getTime() + 730 * 86400000),
      } });
      await tx.$queryRaw`SELECT * FROM public.media_bind_source_operation_job(${operationId}::uuid,${job.id}::uuid,0::integer,${job.version}::integer,${event.id}::uuid)`;
    });
  } finally {
    await runtime.$disconnect();
  }
  await prisma.mediaUploadIntent.update({ where: { id: intentId }, data: { status: "consumed", consumedAt: new Date(), operationState: "consumed", version: { increment: 1 } } });
  const bound = await prisma.mediaStorageOperation.findUniqueOrThrow({ where: { id: operationId } });
  assert.equal(bound.jobId, job.id, "fixture must produce a legally bound source operation");
  return { asset, variant, job, checksum, configHash };
}
async function cleanup(_assetId:string,_jobId:string){}

test("P07 source operation jobId remains database-FK enforced without a Prisma relation graph",async t=>{if(!disposable(t))return;const retryRows=await prisma.$queryRaw<Array<{definition:string;validated:boolean}>>`SELECT pg_get_constraintdef(c.oid) AS definition,c.convalidated AS validated FROM pg_constraint c JOIN pg_class rel ON rel.oid=c.conrelid WHERE rel.relname='media_retry_commands' AND c.contype='f'`;assert.equal(retryRows.length,2);assert.ok(retryRows.every(row=>row.validated));assert.ok(retryRows.some(row=>/FOREIGN KEY \("assetId"\) REFERENCES media_assets\(id\) ON UPDATE CASCADE ON DELETE RESTRICT/.test(row.definition)));assert.ok(retryRows.some(row=>/FOREIGN KEY \("jobId"\) REFERENCES async_jobs\(id\) ON UPDATE CASCADE ON DELETE RESTRICT/.test(row.definition)));const rows=await prisma.$queryRaw<Array<{definition:string;validated:boolean}>>`SELECT pg_get_constraintdef(c.oid) AS definition,c.convalidated AS validated FROM pg_constraint c JOIN pg_class rel ON rel.oid=c.conrelid WHERE rel.relname='media_storage_operations' AND c.contype='f' AND pg_get_constraintdef(c.oid) LIKE '%("jobId") REFERENCES async_jobs(id)%'`;assert.equal(rows.length,1);assert.equal(rows[0]!.validated,true);assert.match(rows[0]!.definition,/FOREIGN KEY \("jobId"\) REFERENCES async_jobs\(id\) ON UPDATE CASCADE ON DELETE RESTRICT/);const assetId=randomUUID(),missingJobId=randomUUID(),configHash="b".repeat(43);await prisma.mediaAsset.create({data:{id:assetId,contractVersion:"media-asset.v1",schemaVersion:"media-asset-schema.v1",registryVersion:"media-registry.v1",kind:"image",status:"processing",originalFilename:"fk.jpg",safeDisplayName:"fk.jpg",declaredContentType:"image/jpeg",expectedBytes:1n,source:"dashboard_upload",provenanceOrigin:"human_upload",storageProvider:"private_filesystem.v1",processingPolicyVersion:"media-processing.v1",securityPolicyVersion:"media-security.v1",processingConfigHash:configHash,variantSetState:"unresolved",tags:[],authorizationScopeKind:"global",dealerIds:[],locationIds:[],createdByActorType:"system",effectiveRoles:[],permissionGrants:[],contextRevision:"fk",retentionClass:"default",retentionPolicyVersion:"media-retention.v1",requestId:`fk-${randomUUID()}`}});await assert.rejects(()=>prisma.$executeRaw`INSERT INTO "media_storage_operations" ("id","assetId","jobId","contractVersion","provider","objectKey","objectRole","state","cleanupStatus","expectedAssetVersion","processingConfigHash","authorizationScopeKind","dealerIds","locationIds","version","createdAt","updatedAt") VALUES (${randomUUID()}::uuid,${assetId}::uuid,${missingJobId}::uuid,'media-storage-operation.v1','private_filesystem.v1',${`fk/${randomUUID()}`} ,'attempt_original','prepared','none',0,${configHash},'global','[]'::jsonb,'[]'::jsonb,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,/foreign key|constraint/i)});

test("P07 Unit B expired lease selection and completion make zero writes",async t=>{if(!disposable(t))return;const f=await fixture();try{const claimed=await claimNextAsyncJob(prisma,{runtimeMode:"test",workerId:"unit-b-expired",typeKey:"media.process"});assert.ok(claimed?.executionSnapshot);assert.equal(claimed!.job.id,f.job.id);await prisma.$executeRaw`UPDATE "async_jobs" SET "leaseExpiresAt"=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE "id"=${f.job.id}::uuid`;const before=await prisma.mediaVariant.findUniqueOrThrow({where:{id:f.variant.id}});await assert.rejects(()=>assertMediaExecutionSnapshot(prisma,{jobId:f.job.id,assetId:f.asset.id,leaseOwner:"unit-b-expired",snapshot:claimed!.executionSnapshot!}),/JOB_LEASE_LOST/);await assert.rejects(()=>selectBoundMediaProcessingOutputs(prisma,{jobId:f.job.id,assetId:f.asset.id,leaseOwner:"unit-b-expired",snapshot:claimed!.executionSnapshot!,operations:[],audit:async()=>{},complete:{summary:{processed:1}}}),/JOB_LEASE_LOST/);await assert.rejects(()=>completeAsyncJob(prisma,claimed!.lease,{processed:1,failed:0,summary:{processed:1}}),/JOB_LEASE_LOST|MEDIA_BINDING_INVALID/);assert.deepEqual(await prisma.mediaVariant.findUniqueOrThrow({where:{id:f.variant.id}}),before)}finally{await cleanup(f.asset.id,f.job.id)}});

test("P07 publish selection atomically closes Asset Variants Job and Attempt",async t=>{if(!disposable(t))return;const f=await fixture();const claimed=await claimNextAsyncJob(prisma,{runtimeMode:"test",workerId:"unit-b-atomic",typeKey:"media.process"}),snapshot=claimed!.executionSnapshot!,output=await prisma.mediaStorageOperation.create({data:{assetId:f.asset.id,variantId:f.variant.id,jobId:f.job.id,contractVersion:"media-storage-operation.v1",provider:"private_filesystem.v1",objectKey:`unit-b/output-${randomUUID()}`,objectRole:"attempt_original",state:"written",cleanupStatus:"none",jobRetryGeneration:snapshot.retryGeneration,jobAttempt:snapshot.generationAttempt,leaseRevision:snapshot.leaseRevision,expectedAssetVersion:snapshot.binding.expectedAssetVersion,sourceChecksum:f.checksum,processingConfigHash:f.configHash,authorizationScopeKind:"global",dealerIds:[],locationIds:[],byteCount:1n,checksum:f.checksum}});await selectBoundMediaProcessingOutputs(prisma,{jobId:f.job.id,assetId:f.asset.id,leaseOwner:"unit-b-atomic",snapshot,operations:[{operationId:output.id,variantId:f.variant.id,expectedVariantVersion:f.variant.version,contentType:"image/jpeg",width:1,height:1,bytes:1,checksum:f.checksum}],audit:async()=>{},complete:{summary:{processed:1}}});const [asset,variant,job,attempt]=await Promise.all([prisma.mediaAsset.findUniqueOrThrow({where:{id:f.asset.id}}),prisma.mediaVariant.findUniqueOrThrow({where:{id:f.variant.id}}),prisma.asyncJob.findUniqueOrThrow({where:{id:f.job.id}}),prisma.asyncJobAttempt.findFirstOrThrow({where:{jobId:f.job.id}})]);assert.equal(asset.status,"ready");assert.equal(variant.status,"ready");assert.equal(job.status,"succeeded");assert.equal(attempt.outcome,"succeeded")});

test("P07 Unit B R to R+1 lost-response replay creates no duplicate variants",async t=>{if(!disposable(t))return;const f=await fixture();try{const claimed=await claimNextAsyncJob(prisma,{runtimeMode:"test",workerId:"unit-b-replay",typeKey:"media.process"}),s=claimed!.executionSnapshot!;assert.equal(claimed!.job.id,f.job.id);const input={jobId:f.job.id,assetId:f.asset.id,leaseOwner:"unit-b-replay",leaseRevision:s.leaseRevision,retryGeneration:s.retryGeneration,generationAttempt:s.generationAttempt,expectedBindingRevision:s.binding.bindingRevision,expectedBindingHash:s.bindingHash,expectedAssetVersion:s.binding.expectedAssetVersion,width:641,height:400,roles:["original","thumbnail","small"]};const first=await resolveMediaExecutionSnapshot(prisma,input),count=await prisma.mediaVariant.count({where:{assetId:f.asset.id}}),replay=await resolveMediaExecutionSnapshot(prisma,input);assert.equal(first.replayed,false);const resolvedJob=await prisma.asyncJob.findUniqueOrThrow({where:{id:f.job.id}});assert.equal(resolvedJob.progressTotal,3);assert.equal(resolvedJob.totalCount,3);assert.equal(replay.replayed,true);assert.equal(replay.hash,first.hash);for(const divergent of [{...input,width:642},{...input,roles:["original","thumbnail"]}])await assert.rejects(()=>resolveMediaExecutionSnapshot(prisma,divergent),/MEDIA_PROCESSING_FAILED/);assert.equal(await prisma.mediaVariant.count({where:{assetId:f.asset.id}}),count)}finally{await cleanup(f.asset.id,f.job.id)}});

test("P07 Unit B ready-role mismatch and stale snapshot fail without rewrites",async t=>{if(!disposable(t))return;const f=await fixture();try{const claimed=await claimNextAsyncJob(prisma,{runtimeMode:"test",workerId:"unit-b-ready",typeKey:"media.process"}),s=claimed!.executionSnapshot!,forged={...s,binding:{...s.binding,roles:[{role:"original" as const,status:"ready" as const,version:f.variant.version}]}};forged.bindingHash=mediaExecutionBindingHash(forged.binding);const before=await prisma.mediaVariant.findUniqueOrThrow({where:{id:f.variant.id}});await assert.rejects(()=>assertMediaExecutionSnapshot(prisma,{jobId:f.job.id,assetId:f.asset.id,leaseOwner:"unit-b-ready",snapshot:forged as MediaExecutionSnapshot}),/JOB_LEASE_LOST|MEDIA_BINDING_INVALID/);await prisma.mediaStorageOperation.updateMany({where:{assetId:f.asset.id,objectRole:"upload_staging"},data:{state:"cleanup_required",cleanupStatus:"required",cleanupReason:"race",version:{increment:1}}});await assertMediaExecutionSnapshot(prisma,{jobId:f.job.id,assetId:f.asset.id,leaseOwner:"unit-b-ready",snapshot:s});assert.deepEqual(await prisma.mediaVariant.findUniqueOrThrow({where:{id:f.variant.id}}),before)}finally{await cleanup(f.asset.id,f.job.id)}});
