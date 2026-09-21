import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createAsyncJob, createMediaExecutionBinding, mediaExecutionBindingHash, mediaLeaseIsLive, mediaOperationWriteCasMatches, mediaProcessingWriteRoles, parseJobKeyset, parseMediaExecutionBinding, requiredMediaVariantRolesForBinding, validateMediaExecutionBindingState, validateMediaProcessSourceState } from "./async-jobs.js";
import { bindMediaSourceOperation } from "./media.js";

const roles = [
  { role: "original", status: "ready", version: 7 },
  { role: "thumbnail", status: "processing", version: 4 },
  { role: "small", status: "ready", version: 3 }
];

test("P07 Unit B binding canonicalizes every applicable role with status and version", () => {
  const binding = createMediaExecutionBinding({
    bindingRevision: 3,
    retryGeneration: 1,
    expectedAssetVersion: 11,
    variantSetState: "resolved",
    roles: [roles[2]!, roles[0]!, roles[1]!]
  });
  assert.deepEqual(binding.roles, roles);
  assert.deepEqual(parseMediaExecutionBinding(binding), binding);
  assert.equal(mediaExecutionBindingHash(binding), mediaExecutionBindingHash({ ...binding, roles }));
  assert.throws(() => createMediaExecutionBinding({ ...binding, roles: [roles[0]!, roles[0]!] }), /MEDIA_BINDING_INVALID/);
});

test("P07 Unit B binding preserves ready roles and rejects incomplete or stale state", () => {
  const binding = createMediaExecutionBinding({ bindingRevision: 4, retryGeneration: 1, expectedAssetVersion: 12, variantSetState: "resolved", roles });
  assert.equal(validateMediaExecutionBindingState(binding, { retryGeneration: 1, assetVersion: 12, variantSetState: "resolved", variants: roles }), binding);
  assert.deepEqual(mediaProcessingWriteRoles(binding, ["original", "thumbnail", "small"]), ["thumbnail"]);
  assert.throws(() => mediaProcessingWriteRoles(binding, ["thumbnail"]), /MEDIA_BINDING_INVALID/);
  for (const state of [
    { retryGeneration: 0, assetVersion: 12, variantSetState: "resolved", variants: roles },
    { retryGeneration: 1, assetVersion: 13, variantSetState: "resolved", variants: roles },
    { retryGeneration: 1, assetVersion: 12, variantSetState: "resolved", variants: roles.filter(x => x.role !== "small") },
    { retryGeneration: 1, assetVersion: 12, variantSetState: "resolved", variants: roles.map(x => x.role === "original" ? { ...x, version: 8 } : x) }
  ]) assert.throws(() => validateMediaExecutionBindingState(binding, state), /MEDIA_BINDING_INVALID/);
});

test("P07 Unit B unresolved binding requires the persisted original role", () => {
  assert.deepEqual(createMediaExecutionBinding({ bindingRevision: 0, retryGeneration: 0, expectedAssetVersion: 2, variantSetState: "unresolved", roles: [{ role: "original", status: "processing", version: 0 }] }).roles, [{ role: "original", status: "processing", version: 0 }]);
  assert.throws(() => createMediaExecutionBinding({ bindingRevision: 0, retryGeneration: 0, expectedAssetVersion: 2, variantSetState: "unresolved", roles: [] }), /MEDIA_BINDING_INVALID/);
});

test("P07 Unit B source binding is exact, idempotent and rejects divergent replay",async()=>{const operationId=randomUUID(),jobId=randomUUID(),otherJobId=randomUUID(),auditId=randomUUID(),base={id:operationId,version:2,state:"written",objectRole:"upload_staging",uploadIntentId:randomUUID(),jobId:null,authorizationScopeKind:"global",dealerIds:[],locationIds:[]},events:any[]=[],tx:any={$queryRaw:async()=>[{bound:true,operationVersion:3}],mediaStorageOperation:{findUnique:async()=>base,findUniqueOrThrow:async()=>({...base,jobId,version:3})}};const first=await bindMediaSourceOperation(tx,{operationId,jobId,expectedVersion:2,expectedJobVersion:0,audit:async(_tx,event)=>{events.push(event);return{id:auditId}}});assert.equal(first.replayed,false);assert.equal(first.operation.jobId,jobId);assert.deepEqual(events[0].metadata,{objectRole:"upload_staging",fromState:"written_unbound",toState:"written_bound"});tx.mediaStorageOperation.findUnique=async()=>({...base,jobId,version:3});assert.equal((await bindMediaSourceOperation(tx,{operationId,jobId,expectedVersion:2,expectedJobVersion:0,audit:async()=>{throw new Error("no audit on replay")}})).replayed,true);await assert.rejects(()=>bindMediaSourceOperation(tx,{operationId,jobId:otherJobId,expectedVersion:3,expectedJobVersion:0,audit:async()=>({id:auditId})}),/MEDIA_VERSION_CONFLICT/)});

test("P07 Unit B binding resolution rejects over-axis and over-pixel dimensions",()=>{for(const [width,height] of [[12001,1],[10000,5000]])assert.throws(()=>requiredMediaVariantRolesForBinding("image",width,height),/MEDIA_DIMENSIONS_INVALID/)});

test("P07 Unit B DB-time lease predicate rejects expired lease and deadline", () => {
  const now = new Date("2026-08-02T00:00:00Z");
  assert.equal(mediaLeaseIsLive({ leaseExpiresAt: new Date(now.getTime() + 1), attemptDeadline: new Date(now.getTime() + 1) }, now), true);
  assert.equal(mediaLeaseIsLive({ leaseExpiresAt: now, attemptDeadline: new Date(now.getTime() + 1) }, now), false);
  assert.equal(mediaLeaseIsLive({ leaseExpiresAt: new Date(now.getTime() + 1), attemptDeadline: now }, now), false);
});

test("P07 Unit B operation CAS rejects recovery state or version changes", () => {
  const id=randomUUID(),jobId=randomUUID(),operation={id,version:1,state:"writing",jobId,jobRetryGeneration:1,jobAttempt:2,leaseRevision:3},expected={id,version:1,state:"writing" as const,jobId,retryGeneration:1,attempt:2,leaseRevision:3};
  assert.equal(mediaOperationWriteCasMatches(operation,expected),true);
  assert.equal(mediaOperationWriteCasMatches({...operation,state:"cleanup_required"},expected),false);
  assert.equal(mediaOperationWriteCasMatches({...operation,version:2},expected),false);
});

test("P07 Unit B claim validates exact source job, intent, scope and immutable source dimensions", () => {
  const assetId=randomUUID(),operationId=randomUUID(),intentId=randomUUID(),jobId=randomUUID(),checksum="a".repeat(64),config="b".repeat(43),scope={authorizationScopeKind:"global",dealerIds:[],locationIds:[]};
  const fixture={job:{id:jobId,jobType:"media.process",jobTypeVersion:"media.process.v1",status:"queued",retryGeneration:0,generationAttempt:0,leaseRevision:0,contextRevision:"ctx",...scope},payload:{assetId,expectedAssetVersion:2,selectedUploadOperationId:operationId,sourceChecksum:checksum,processingConfigHash:config},asset:{id:assetId,status:"processing",version:2,processingConfigHash:config,contextRevision:"ctx",...scope},source:{id:operationId,assetId,uploadIntentId:intentId,jobId,objectRole:"upload_staging",state:"written",cleanupStatus:"none",jobRetryGeneration:null,jobAttempt:null,leaseRevision:null,expectedAssetVersion:1,sourceChecksum:checksum,checksum,processingConfigHash:config,...scope},intent:{id:intentId,assetId,status:"consumed",operationId,...scope}};
  assert.equal(validateMediaProcessSourceState(fixture),true);
  for(const changed of [{source:{...fixture.source,jobId:randomUUID()}},{source:{...fixture.source,jobAttempt:0}},{intent:{...fixture.intent,status:"claimed"}},{job:{...fixture.job,dealerIds:[randomUUID()]}},{payload:{...fixture.payload,sourceChecksum:"c".repeat(64)}}])assert.throws(()=>validateMediaProcessSourceState({...fixture,...changed} as never),/MEDIA_SOURCE_INVALID/);
});

test("P07 Unit B initial unresolved binding snapshots the persisted original version and status", async () => {
  let created: Record<string, any> | undefined;
  const tx = {
    $executeRaw: async () => 1,
    $queryRaw: async () => [{ now: new Date("2026-08-02T00:00:00Z") }],
    mediaVariant: { findMany: async () => [{ role: "original", status: "processing", version: 6 }] },
    asyncJob: {
      findFirst: async () => null,
      create: async ({ data }: any) => (created = { id: randomUUID(), version: 0, ...data })
    }
  };
  const assetId = randomUUID(), operationId = randomUUID(), keyset = parseJobKeyset(JSON.stringify({ activeKid: "unit", keys: [{ kid: "unit", key: randomBytes(32).toString("base64"), mode: "active" }] }));
  await createAsyncJob(tx as never, { runtimeMode: "test", typeKey: "media.process", payload: { assetId, expectedAssetVersion: 9, selectedUploadOperationId: operationId, sourceChecksum: "a".repeat(64), processingConfigHash: "b".repeat(43) }, idempotencyKey: `media-process:${assetId}:9`, authorization: { actorType: "system", effectiveRoles: [], permissionGrants: [{ permissionKey: "media.manage_variants", scope: { kind: "global" } }], scope: { kind: "global" }, contextRevision: "unit" }, requestId: "unit-binding", keyset });
  assert.deepEqual(created?.executionBinding, { schemaVersion: "media-process-binding.v1", bindingRevision: 0, retryGeneration: 0, expectedAssetVersion: 9, variantSetState: "unresolved", roles: [{ role: "original", status: "processing", version: 6 }] });
  assert.equal(created?.bindingHash, mediaExecutionBindingHash(created?.executionBinding));
});
