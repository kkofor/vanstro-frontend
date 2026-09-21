import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
const packaged = import.meta.url.includes("/tooling/");
const { generateArtifacts, readInputs, writeArtifacts } = await import(packaged ? "./f1-v15-generate.mjs" : "./scripts/f1-v15-generate.mjs");
const { verifyModel } = await import(packaged ? "./f1-v15-semantic-verify.mjs" : "./scripts/f1-v15-semantic-verify.mjs");

const sha = value => value.repeat(64).slice(0, 64);
const PHASE = "69_expand";

function role(id, name, domain = "shared") {
  return { id, name, domain, phase: PHASE, login: false, inherit: false, superuser: false, bypassRls: false };
}

function testAuthenticatedSubjectAuthority() {
  const domainAscii = "vanstro.analytics.authenticated-subject.v1";
  const realmAscii = "vanstro.authenticated-user.v1";
  const schemaVersion = "vanstro.analytics.authenticated-consent.v1";
  const frame = bytes => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    return Buffer.concat([length, bytes]);
  };
  const actors = ["123e4567-e89b-42d3-a456-426614174000", "6ba7b810-9dad-41d1-80b4-00c04fd430c8", "00000000-0000-4000-8000-000000000000"];
  const keys = [{ kid: "test-a", hex: "00".repeat(32) }, { kid: "test-b", hex: "11".repeat(32) }];
  const goldenVectors = [];
  for (let index = 0; index < 12; index += 1) {
    const actorUuid = actors[index % actors.length];
    const key = keys[Math.floor(index / 6)];
    const actor = Buffer.from(actorUuid.replaceAll("-", ""), "hex");
    const domain = Buffer.from(domainAscii, "ascii");
    const realm = Buffer.from(realmAscii, "ascii");
    const message = Buffer.concat([frame(domain), frame(realm), frame(actor)]);
    const digest = createHmac("sha256", Buffer.from(key.hex, "hex")).update(message).digest("hex");
    const identityEpoch = `vanstro.analytics.subject-epoch.v1:${key.kid}`;
    goldenVectors.push({ id: `vector.test.${index}`, kid: key.kid, actorUuid, testOnlyKeyHex: key.hex, actorRawUuidHex: actor.toString("hex"), domainHex: domain.toString("hex"), realmHex: realm.toString("hex"), framedMessageHex: message.toString("hex"), expectedDigestHex: digest, expectedIdentityEpoch: identityEpoch, expectedConsentTuple: { authenticatedSubjectDigestHex: digest, subjectKeyVersion: key.kid, identityRealmVersion: realmAscii, identityEpoch, consentSchemaVersion: schemaVersion } });
  }
  return {
    id: "authority.p10_authenticated_subject.v1", algorithm: "HMAC-SHA-256", digestBytes: 32, domainAscii, realmAscii,
    actorAuthority: { source: "backend_verified_session_user_id", encoding: "raw_16_bytes", callerSelectable: false },
    framing: { fieldOrder: ["domain", "realm", "actor_uuid_raw_16"], lengthPrefix: "u32_big_endian" },
    consent: { tupleFields: ["authenticatedSubjectDigest", "subjectKeyVersion", "identityRealmVersion", "identityEpoch", "consentSchemaVersion"], latestOrder: ["createdAt DESC", "id DESC"], lookup: "exact_full_tuple_only", anonymousIdAuthority: false, schemaVersion, activeActions: ["granted", "updated"], denialActions: ["withdrawn"], unknownActionBehavior: "fail_closed" },
    identityEpoch: { prefix: "vanstro.analytics.subject-epoch.v1:", derivation: "prefix_plus_subject_key_version" },
    rotation: { newWrites: "active_kid_only", oldConsentAuthorizesNewEpoch: false, previousKidNewConsent: false, previousKidNewEvent: false, retiredVerificationWindow: "P30DT10M", retiredVerificationWindowAnchor: "retiredAt", releaseSingleEpoch: true },
    release: { familyIdentityEpochCardinality: "exactly_one", crossEpochWindow: "forbidden", crossEpochDistinctSubjectMerge: false, crossEpochMetricMerge: false },
    digestStorage: { authoritySqlType: "bytea", authorityBytes: 32, legacyColumnInPlaceTypeChange: false },
    legacy: { newDigestSqlType: "bytea", legacyMirrorAuthority: false, anonymousConsentAuthorizesAuthenticatedIngestion: false, automaticBackfill: false, automaticPromotion: false },
    goldenVectors
  };
}

function baseModel() {
  const roles = [
    role("role.p09.owner", "vanstro_p09_guard_owner", "p09"),
    role("role.lifecycle", "vanstro_worker_lifecycle_cap", "p09"),
    { ...role("role.runtime", "vanstro_runtime", "p09"), login: true },
    { ...role("role.worker", "vanstro_worker_runtime", "p09"), login: true }
  ];
  const tables = [
    { id: "table.import", name: "dashboard_import_batch", domain: "p08", phase: "baseline" },
    { id: "table.audit", name: "audit_events", domain: "p04", phase: "baseline" },
    { id: "table.p10.release", name: "analytics_foundation_release", domain: "p10", phase: PHASE },
    { id: "table.p10.cell", name: "analytics_foundation_release_cell", domain: "p10", phase: PHASE }
  ];
  const columns = [
    { id: "column.import.audit", name: "successAuditEventId", tableId: "table.import", phase: PHASE },
    { id: "column.import.version", name: "authorityVersion", tableId: "table.import", phase: PHASE },
    { id: "column.consent.subject_digest", name: "authenticatedSubjectDigest", sqlType: "bytea", phase: PHASE },
    { id: "column.consent.identity_epoch", name: "identityEpoch", sqlType: "text", phase: PHASE },
    { id: "column.event.authenticated_subject_digest", name: "authenticatedSubjectDigest", sqlType: "bytea", phase: PHASE },
    { id: "column.event.subject_digest", name: "subjectDigest", sqlType: "text", disposition: "permanent", phase: "baseline" },
    { id: "column.release.identity_epoch", name: "identityEpoch", sqlType: "text", nullable: false, phase: PHASE },
    { id: "column.cell.denominator", name: "denominatorDistinct", sqlType: "bigint", nullable: true, tableId: "table.p10.cell", phase: PHASE },
    { id: "column.cell.numerator", name: "numeratorDistinct", sqlType: "bigint", nullable: true, tableId: "table.p10.cell", phase: PHASE },
    { id: "column.cell.complement", name: "complementDistinct", sqlType: "bigint", nullable: true, tableId: "table.p10.cell", phase: PHASE },
    { id: "column.cell.published_value", name: "publishedValue", sqlType: "numeric", nullable: true, tableId: "table.p10.cell", phase: PHASE }
  ];
  const constraints = [
    { id: "constraint.p08.status", name: "dashboard_import_batch_status_check_v2", tableId: "table.import", phase: PHASE, states: ["awaiting_upload", "uploaded", "cancelled", "expired", "failed"] },
    { id: "constraint.import.audit.fk", name: "dashboard_import_batch_success_audit_event_fkey", tableId: "table.import", phase: PHASE },
    { id: "constraint.import.audit.unique", name: "dashboard_import_batch_success_audit_event_key", tableId: "table.import", phase: PHASE }
  ];
  const functions = [
    {
      id: "function.p02.helper", name: "p02_resolve_persisted_authority_v2", kind: "p02_authority_helper", phase: PHASE,
      signature: "p02_resolve_persisted_authority_v2(bytea,text,uuid,text,text)",
      parameters: [{ name: "sessionTokenHash", type: "bytea" }, { name: "resourceType", type: "text" }, { name: "resourceId", type: "uuid" }, { name: "operation", type: "text" }, { name: "requiredPermission", type: "text" }],
      returnFields: [], ownerRoleId: "role.p09.owner", callerRoleIds: ["role.runtime"], volatility: "STABLE", strictness: "CALLED ON NULL INPUT", securityMode: "SECURITY DEFINER", searchPath: ["pg_catalog", "public"], outcomes: ["authorized", "denied", "not_found", "stale"], disposition: "permanent"
    },
    {
      id: "function.p09.action", name: "p09_config_propose_v2", phase: PHASE, signature: "p09_config_propose_v2(uuid)", parameters: [{ name: "id", type: "uuid" }], returnFields: [], ownerRoleId: "role.p09.owner", callerRoleIds: ["role.runtime"], volatility: "VOLATILE", strictness: "STRICT", securityMode: "SECURITY DEFINER", searchPath: ["pg_catalog", "public"], outcomes: ["success", "denied"], disposition: "permanent", actionId: "action.p09.propose"
    }
  ];
  const compatibilityMatrix = [
    { id: "compat.old68", codeVersion: "old", schemaVersion: 68, compatible: true, behaviorChanged: false },
    { id: "compat.old69", codeVersion: "old", schemaVersion: 69, compatible: true, behaviorChanged: false },
    { id: "compat.new68", codeVersion: "new", schemaVersion: 68, compatible: false, behaviorChanged: false, expected: "not_ready" },
    { id: "compat.new69", codeVersion: "new", schemaVersion: 69, compatible: true, behaviorChanged: false },
    { id: "compat.new70", codeVersion: "new", schemaVersion: 70, compatible: true, behaviorChanged: false },
    { id: "compat.old70", codeVersion: "old", schemaVersion: 70, compatible: false, behaviorChanged: true }
  ];
  const upgradeMatrix = [0, 41, 55, 62, 63, 64, 65, 66, 67, 68].map(source => ({ id: `upgrade.${source}.69`, from: source, to: 69 })).concat([
    { id: "upgrade.68.70", from: 68, to: 70 }, { id: "upgrade.69.70", from: 69, to: 70 }
  ]);
  const blockerIds = ["RA-01", "RA-02", "RA-03", "RA-04", "RA-05", "RA-06", "RA-07", "RA-08", "RA-09", "B-10"];
  for (const value of roles) {
    value.grants69 = functions.filter(fn => (fn.callerRoleIds ?? []).includes(value.id)).map(fn => fn.id);
    value.grants70 = functions.filter(fn => (fn.callerRoleIds ?? []).includes(value.id) && fn.disposition !== "revoke_in_70").map(fn => fn.id);
  }
  const model = {
    package: { version: "1.5", status: "FROZEN", generatedFiles: {}, manifestStaticMembers: [] },
    supersededAuthorities: [], rejectedCandidates: [],
    baselineObjects: [{ id: "baseline.import", inventoryObjectId: "inventory.import", sourceSha256: sha("a") }],
    roles,
    permissions: [{ id: "permission.p09.write", name: "config.write" }],
    resourceTypes: [{ id: "resource.import", name: "p08_import" }],
    actions: [{ id: "action.p09.propose", name: "config_propose", domain: "p09" }],
    results: [{ id: "result.success", name: "success" }], reasons: [{ id: "reason.denied", name: "denied" }],
    tables, columns, constraints,
    indexes: [{ id: "index.import.status", name: "dashboard_import_batch_status_idx", tableId: "table.import", phase: PHASE }],
    triggers: [{ id: "trigger.audit.append", name: "audit_events_append_only", tableId: "table.audit", phase: "baseline" }],
    functions,
    resolvers: [{ id: "resolver.import", resourceTypeId: "resource.import", tableId: "table.import" }],
    authenticatedSubjectAuthority: testAuthenticatedSubjectAuthority(),
    jobDescriptors: [{ id: "job.test.v1", jobType: "test.job", version: "v1", payloadWireRef: "wire.job", producerSchemaRef: "schema.test.producer.v1", validatorSchemaRef: "schema.test.validator.v1", consumerSchemaRef: "schema.test.consumer.v1", ownerModule: "test", enabledRuntimeBoundary: "test_only_application", description: "Test Job." }],
    payloadSchemas: ["producer", "validator", "consumer"].map(role => ({ id: `schema.test.${role}.v1`, role, jobDescriptorRef: "job.test.v1", fields: [{ id: `schemafield.test.${role}.id`, name: "jobId", type: "uuid", nullable: false, description: "Job ID." }], unknownFields: "reject", description: `Test ${role} schema.` })),
    wireDtos: [{ id: "wire.job", name: "JobPayload", kind: "job_payload", jobDescriptorId: "job.test.v1", producerSchemaId: "schema.test.producer.v1", validatorSchemaId: "schema.test.validator.v1", consumerSchemaId: "schema.test.consumer.v1", fields: [{ id: "wirefield.job.id", name: "jobId", type: "uuid", nullable: false, sourceRef: "table.import", description: "Job ID." }], closed: true, description: "Job payload." }],
    stateMachines: [{ id: "p08_import", domain: "p08", replacementConstraintId: "constraint.p08.status", states: ["awaiting_upload", "uploaded", "cancelled", "expired", "failed"], storageSaga: { requiresWorkerClaimForPublication: false, steps: ["provisional_write", "validate", "publish_final", "database_transaction", "worker_claim"] }, payloads: { parse: ["importId", "artifactId", "expectedVersion", "scopeFingerprint"], commit: ["importId", "expectedVersion", "commitMode", "scopeFingerprint"], export: ["exportId", "expectedVersion", "querySnapshotRef", "formulaVersion", "scopeFingerprint"] } }],
    auditRules: [{ id: "audit.import.success", kind: "fact_success_audit", tableId: "table.import", auditColumnId: "column.import.audit", authorityVersionColumnId: "column.import.version", foreignKeyConstraintId: "constraint.import.audit.fk", uniqueConstraintId: "constraint.import.audit.unique" }],
    privacyRules: [{ id: "privacy.p10.suppression", kind: "p10_suppression", suppressedNullFields: ["denominatorDistinct", "numeratorDistinct", "complementDistinct"], persistExactSuppressedCounts: false, thresholdDistinctSubjects: 3, suppressProtectedCounts: [1, 2], emptyProtectedCount: 0, publishedMinimum: 3, wholeFamily: true, suppressedNullColumnRefs: ["column.cell.denominator", "column.cell.numerator", "column.cell.complement", "column.cell.published_value"] }],
    migration69Expand: { id: "migration.69", objectRefs: [...roles, ...tables, ...columns, ...constraints, ...functions, { id: "index.import.status", phase: PHASE }].filter(item => item.phase === PHASE).map(item => item.id) }, codeSwitch: [], migration70Contract: { id: "migration.70", objectRefs: [] }, compatibilityMatrix, upgradeMatrix,
    tests: blockerIds.map(id => ({ id: `mutation.${id}`, description: `reject ${id}` })), exclusions: [],
    indexInventory: ["index.import.status"],
    v14BlockerResolutions: blockerIds.map(id => ({ blockerId: id, modelObjectIds: ["p08_import"], mutationTestIds: [`mutation.${id}`] }))
  };
  const closedCollections = ["roles", "permissions", "resourceTypes", "actions", "results", "reasons", "tables", "columns", "constraints", "indexes", "triggers", "functions", "resolvers", "wireDtos", "jobDescriptors", "payloadSchemas", "stateMachines", "auditRules", "privacyRules", "tests"];
  model.closedInventory = Object.fromEntries(closedCollections.map(key => [key, model[key].map(item => item.id)]));
  return model;
}

const schema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["package", ...["supersededAuthorities", "rejectedCandidates", "baselineObjects", "roles", "permissions", "resourceTypes", "actions", "results", "reasons", "tables", "columns", "constraints", "indexes", "triggers", "functions", "resolvers", "wireDtos", "jobDescriptors", "payloadSchemas", "stateMachines", "auditRules", "privacyRules", "migration69Expand", "codeSwitch", "migration70Contract", "compatibilityMatrix", "upgradeMatrix", "tests", "exclusions"]],
  properties: { package: { type: "object", required: ["version", "status"], properties: { version: { const: "1.5" }, status: { const: "FROZEN" } }, additionalProperties: true } },
  additionalProperties: true
};

const baseline = { objects: [{ id: "inventory.import", sourceSha256: sha("a") }], sourceFiles: [{ path: "migration.sql", sha256: sha("a") }] };

async function fixture(model = baseModel()) {
  const root = await mkdtemp(join(tmpdir(), "vanstro-f1-v15-"));
  const paths = { root, model: join(root, "authority-model.yaml"), schema: join(root, "authority-model.schema.json"), baseline: join(root, "baseline-physical-inventory.json"), output: join(root, "candidate") };
  await writeFile(paths.model, `${JSON.stringify(model, null, 2)}\n`);
  await writeFile(paths.schema, `${JSON.stringify(schema, null, 2)}\n`);
  await writeFile(paths.baseline, `${JSON.stringify(baseline, null, 2)}\n`);
  return paths;
}

async function inputFor(model) {
  const paths = await fixture(model);
  const input = await readInputs({ modelPath: paths.model, schemaPath: paths.schema, baselinePath: paths.baseline });
  return { paths, input };
}

async function expectMutation(name, mutate, code) {
  await test(name, async () => {
    const model = structuredClone(baseModel());
    mutate(model);
    const { paths, input } = await inputFor(model);
    try { assert.throws(() => verifyModel(input), new RegExp(code)); }
    finally { await rm(paths.root, { recursive: true, force: true }); }
  });
}

test("positive model verifies and generator is byte deterministic", async () => {
  const { paths, input } = await inputFor(baseModel());
  try {
    assert.ok(verifyModel(input).objectCount > 0);
    const generated = generateArtifacts(input);
    await writeArtifacts(paths.output, generated);
    const first = new Map();
    for (const path of generated.artifacts.keys()) first.set(path, await readFile(join(paths.output, path)));
    await writeArtifacts(paths.output, generated, { verifyOnly: true });
    for (const [path, bytes] of first) assert.deepEqual(await readFile(join(paths.output, path)), bytes);
    assert.equal(generated.artifacts.size, 13);
  } finally { await rm(paths.root, { recursive: true, force: true }); }
});

await expectMutation("HMAC authority rejects domain drift", model => { model.authenticatedSubjectAuthority.domainAscii += ".wrong"; }, "P10_HMAC_CONSTANT_MISMATCH");
await expectMutation("HMAC authority rejects field-order drift", model => { model.authenticatedSubjectAuthority.framing.fieldOrder.reverse(); }, "P10_HMAC_FRAMING_MISMATCH");
await expectMutation("HMAC authority rejects partial consent tuple", model => { model.authenticatedSubjectAuthority.consent.tupleFields.pop(); }, "P10_CONSENT_TUPLE_MISMATCH");
await expectMutation("HMAC authority rejects caller-selected identity", model => { model.authenticatedSubjectAuthority.actorAuthority.callerSelectable = true; }, "P10_HMAC_FRAMING_MISMATCH");
await expectMutation("HMAC authority rejects previous KID new writes", model => { model.authenticatedSubjectAuthority.rotation.previousKidNewEvent = true; }, "P10_ROTATION_AUTHORITY_MISMATCH");
await expectMutation("HMAC authority rejects anonymous consent authorization", model => { model.authenticatedSubjectAuthority.legacy.anonymousConsentAuthorizesAuthenticatedIngestion = true; }, "P10_LEGACY_AUTHORITY_MISMATCH");
await expectMutation("HMAC authority rejects golden-vector digest drift", model => { model.authenticatedSubjectAuthority.goldenVectors[0].expectedDigestHex = "ff".repeat(32); }, "P10_GOLDEN_VECTOR_MISMATCH");
await expectMutation("HMAC authority rejects noncanonical UUID", model => { model.authenticatedSubjectAuthority.goldenVectors[0].actorUuid = model.authenticatedSubjectAuthority.goldenVectors[0].actorUuid.toUpperCase(); }, "P10_UUID_NOT_CANONICAL");
await expectMutation("HMAC authority rejects legacy text promotion", model => { model.columns.find(item => item.id === "column.event.subject_digest").sqlType = "bytea"; }, "P10_LEGACY_TEXT_REWRITE_FORBIDDEN");
await expectMutation("RA-01 rejects an object outside the closed inventory", model => { model.closedInventory = { roles: model.roles.map(item => item.name).slice(1) }; }, "MODEL_OUTSIDE_OBJECT");
await expectMutation("physical ledger rejects an omitted migration object", model => { model.migration69Expand = { id: "migration.69", objectRefs: ["role.p09.owner"] }; }, "MIGRATION_LEDGER_OBJECT_MISMATCH");
await expectMutation("RA-02 rejects a P08 state missing from the replacement CHECK", model => { model.constraints[0].states.pop(); }, "P08_STATE_NOT_IN_CHECK");
await expectMutation("RA-03 rejects divergent P08 payload fields", model => { model.stateMachines[0].payloads.commit[2] = "mode"; }, "P08_PAYLOAD_MISMATCH");
await expectMutation("wire ontology rejects Job payload bound to SQL return", model => { model.wireDtos[0].sqlFunctionRef = "function.p09.action"; }, "WIRE_BINDING_INVALID");
await expectMutation("wire ontology rejects SQL return field mismatch", model => { model.wireDtos[0] = { ...model.wireDtos[0], kind: "sql_return", sqlFunctionRef: "function.p09.action" }; delete model.wireDtos[0].jobDescriptorId; delete model.wireDtos[0].producerSchemaId; delete model.wireDtos[0].validatorSchemaId; delete model.wireDtos[0].consumerSchemaId; }, "WIRE_SQL_RETURN_MISMATCH");
await expectMutation("wire ontology rejects producer validator consumer mismatch", model => { model.wireDtos[0].producerFields = [{ ...model.wireDtos[0].fields[0], name: "otherId" }]; }, "WIRE_JOB_SCHEMA_MISMATCH");
await expectMutation("wire ontology rejects unknown Job descriptor", model => { model.wireDtos[0].jobDescriptorId = "job.unknown.v1"; }, "DANGLING_REFERENCE");
await expectMutation("Job registry rejects missing descriptor-to-wire backref", model => { model.jobDescriptors[0].payloadWireRef = "wire.missing"; }, "DANGLING_REFERENCE");
await expectMutation("Job registry rejects cross-job schema backref", model => { model.jobDescriptors.push({ ...structuredClone(model.jobDescriptors[0]), id: "job.other.v1", jobType: "other.job" }); model.closedInventory.jobDescriptors.push("job.other.v1"); model.payloadSchemas[0].jobDescriptorRef = "job.other.v1"; }, "PAYLOAD_SCHEMA_BINDING_MISMATCH");
await expectMutation("reference inventory rejects unclassified reference fields", model => { model.actions[0].unknownAuthorityRef = "reason.denied"; }, "REFERENCE_EDGE_KIND_MISSING");
await expectMutation("reference inventory rejects dangling non-suffix grants", model => { model.roles[0].grants69 = ["function.missing"]; }, "DANGLING_REFERENCE");
await expectMutation("ownership parity rejects table child mismatch", model => { model.tables[0].columnRefs = ["column.import.version"]; }, "OWNERSHIP_PARITY_MISMATCH");
await expectMutation("state machine rejects local transition targets", model => { model.stateMachines[0].transitions = [{ id: "transition.bad", from: "awaiting_upload", to: "missing" }]; }, "STATE_REFERENCE_INVALID");
await expectMutation("RA-04 rejects incomplete fact-to-Audit mapping", model => { delete model.auditRules[0].uniqueConstraintId; }, "FACT_AUDIT_MAPPING_INCOMPLETE");
await expectMutation("RA-05 rejects caller-supplied P02 scope authority", model => { model.functions[0].parameters.push({ name: "requestedScopeKind", type: "text" }); }, "P02_CALLER_AUTHORITY_FORBIDDEN");
await expectMutation("RA-06 rejects inconsistent P09 role topology", model => { model.roles[0].name = "vanstro_p09_lifecycle_owner"; }, "P09_ROLE_TOPOLOGY_MISMATCH");
await expectMutation("RA-07 rejects exact suppressed count persistence", model => { model.privacyRules[0].persistExactSuppressedCounts = true; }, "P10_SUPPRESSED_COUNTS_PERSISTED");
await expectMutation("RA-08 rejects divergent index inventory", model => { model.indexInventory = []; }, "INDEX_INVENTORY_MISMATCH");
await expectMutation("RA-09 rejects missing source-to-69 rollout path", model => { model.upgradeMatrix = model.upgradeMatrix.filter(item => item.id !== "upgrade.41.69"); }, "UPGRADE_PATH_MISSING");
await expectMutation("B-10 rejects migration71 as a third rollout phase", model => { model.upgradeMatrix.push({ id: "upgrade.70.71", from: 70, to: 71 }); }, "MIGRATION71_FORBIDDEN");
await expectMutation("§101 rejects duplicate global IDs", model => { model.results[0].id = model.reasons[0].id; }, "DUPLICATE_GLOBAL_ID");
await expectMutation("§101 rejects dangling refs", model => { model.resolvers[0].tableId = "table.missing"; }, "DANGLING_REFERENCE");
await expectMutation("§101 rejects reference cycles", model => { model.actions[0].reasonId = "reason.denied"; model.reasons[0].actionId = "action.p09.propose"; }, "REFERENCE_CYCLE");
await expectMutation("§101 rejects duplicate function signatures", model => { model.functions.push({ ...structuredClone(model.functions[1]), id: "function.duplicate" }); }, "FUNCTION_SIGNATURE_DUPLICATE");
await expectMutation("§101 rejects migration69 revocation", model => { model.migration69Expand.operation = "revoke"; }, "MIGRATION69_REVOKES_OLD_ENTRY");
await expectMutation("§101 rejects old code behavior drift on schema69", model => { model.compatibilityMatrix.find(item => item.id === "compat.old69").behaviorChanged = true; }, "OLD_CODE_69_BEHAVIOR_CHANGE");
await expectMutation("§101 rejects forbidden open-ended language", model => { model.exclusions.push({ id: "exclusion.open", description: "future helper" }); }, "FORBIDDEN_AUTHORITY_LANGUAGE");
await expectMutation("§101 rejects weak SECURITY DEFINER owners", model => { model.roles[0].superuser = true; }, "SECURITY_DEFINER_OWNER_NOT_LEAST_PRIVILEGE");
await expectMutation("§101 rejects missing v1.4 Blocker mutation mapping", model => { model.v14BlockerResolutions.pop(); }, "V14_BLOCKER_RESOLUTION_MISSING");
