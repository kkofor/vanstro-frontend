#!/usr/bin/env node

import { createHmac } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  CANDIDATE_STATUS,
  F1V15Error,
  GENERATED_ARTIFACTS,
  PACKAGE_VERSION,
  canonicalJson,
  fail,
  generateArtifacts,
  readInputs,
  sha256,
  validateJsonSchema,
  writeArtifacts
} from "./f1-v15-generate.mjs";

const COLLECTIONS = Object.freeze([
  "supersededAuthorities", "rejectedCandidates", "baselineObjects", "roles", "permissions",
  "resourceTypes", "actions", "results", "reasons", "tables", "columns", "constraints", "indexes",
  "triggers", "functions", "resolvers", "wireDtos", "jobDescriptors", "payloadSchemas", "stateMachines", "auditRules", "privacyRules", "authenticatedSubjectAuthority",
  "migration69Expand", "codeSwitch", "migration70Contract", "compatibilityMatrix", "upgradeMatrix", "tests", "exclusions", "schemaAuthorities", "sequences", "roleMemberships", "aclOperations", "defaultPrivileges", "databaseAcl", "p08CancelCompatibility"
]);
const PHYSICAL = new Set(["roles", "tables", "columns", "constraints", "indexes", "triggers", "functions"]);
const REQUIRED_UPGRADE_SOURCES = Object.freeze([0, 41, 55, 62, 63, 64, 65, 66, 67, 68]);
const FORBIDDEN_LANGUAGE = /\b(?:TBD|MAY|implementation[- ]defined|future helper|may choose|one of)\b/iu;
const REF_KEY = /(?:Id|Ids|Ref|Refs)$/u;
const REFERENCE_LIST_KEYS = new Set(["grants69", "grants70", "members"]);
const REFERENCE_EDGE_KINDS = Object.freeze({
  actionId: "dependency",
  actionRef: "dependency",
  actionRefs: "dependency",
  appliesToRefs: "dependency",
  auditColumnId: "dependency",
  auditRuleRef: "dependency",
  authorityVersionColumnId: "dependency",
  blockerId: "provenance",
  callerRoleId: "dependency",
  callerRoleIds: "dependency",
  callerRoleRef: "dependency",
  callerRoleRefs: "dependency",
  columnRefs: "integrity_backref",
  constraintRefs: "integrity_backref",
  consumerSchemaId: "integrity_backref",
  consumerSchemaRef: "ownership",
  coversRefs: "provenance",
  denialReasonRefs: "dependency",
  denialResultRef: "dependency",
  deniedResultRef: "dependency",
  factTableRefs: "dependency",
  failureReasonRefs: "dependency",
  failureResultRef: "dependency",
  foreignKeyConstraintId: "dependency",
  functionRef: "dependency",
  grants69: "integrity_backref",
  grants70: "integrity_backref",
  idColumnRef: "dependency",
  indexRefs: "integrity_backref",
  inventoryObjectId: "provenance",
  inventoryObjectIds: "provenance",
  jobDescriptorId: "ownership",
  modelObjectIds: "provenance",
  mutationTestIds: "provenance",
  jobDescriptorRef: "integrity_backref",
  members: "ownership",
  notFoundResultRef: "dependency",
  objectRef: "provenance",
  objectRefs: "dependency",
  outcomeResultRefs: "dependency",
  ownerColumnRef: "dependency",
  ownerRoleId: "dependency",
  ownerRoleRef: "dependency",
  grantedRoleRef: "dependency",
  memberRoleRef: "dependency",
  roleRef: "dependency",
  schemaRef: "dependency",
  createRoleRefs: "dependency",
  usageRoleRefs: "dependency",
  executeRoleRefs: "integrity_backref",
  revokedCreateRoleRefs: "dependency",
  payloadWireRef: "integrity_backref",
  permissionRefs: "dependency",
  producerSchemaId: "integrity_backref",
  producerSchemaRef: "ownership",
  projectionAuthorityId: "dependency",
  reasonId: "dependency",
  reasonRef: "dependency",
  referencedColumnRefs: "dependency",
  referencedTableRef: "dependency",
  replacementConstraintId: "dependency",
  replacementConstraintRef: "dependency",
  migration69ConstraintRef: "dependency",
  migration70ConstraintRef: "dependency",
  revokeFunctionRef: "dependency",
  revokeRoleRefs: "dependency",
  requiredRefs: "dependency",
  requiredTransitionIds: "integrity_backref",
  resolverRef: "dependency",
  resourceTypeId: "dependency",
  resourceTypeRef: "dependency",
  resourceTypeRefs: "dependency",
  revisionColumnRefs: "dependency",
  revokedFunctionRefs: "dependency",
  scopeColumnRefs: "dependency",
  sourceRef: "provenance",
  sqlFunctionRef: "dependency",
  staleResultRef: "dependency",
  successReasonRefs: "dependency",
  successResultRef: "dependency",
  suppressedNullColumnRefs: "dependency",
  tableId: "ownership",
  tableRef: "ownership",
  testRef: "provenance",
  triggerRefs: "integrity_backref",
  uniqueConstraintId: "dependency",
  validatorSchemaId: "integrity_backref",
  validatorSchemaRef: "ownership"
});

function values(model, key) {
  if (Array.isArray(model[key])) return model[key];
  if (model[key] && typeof model[key] === "object") return [model[key]];
  return [];
}

function ids(model) {
  const map = new Map();
  for (const collection of COLLECTIONS) for (const item of values(model, collection)) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.id !== "string" || !item.id) fail("ID_REQUIRED", collection);
    if (map.has(item.id)) fail("DUPLICATE_GLOBAL_ID", item.id);
    map.set(item.id, { collection, item });
  }
  return map;
}

function refValues(value, key) {
  if (!REF_KEY.test(key) && !REFERENCE_LIST_KEYS.has(key)) return [];
  const kind = REFERENCE_EDGE_KINDS[key];
  if (!kind) fail("REFERENCE_EDGE_KIND_MISSING", key);
  const targets = typeof value === "string"
    ? [value]
    : Array.isArray(value) && value.every(item => typeof item === "string")
      ? value
      : [];
  return targets.map(target => ({ key, kind, target }));
}

function references(item) {
  const result = [];
  const walk = value => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(walk);
    for (const [key, child] of Object.entries(value)) {
      result.push(...refValues(child, key));
      walk(child);
    }
  };
  walk(item);
  return result;
}

function checkReferences(model, index) {
  const graph = new Map();
  const rootIds = new Set([
    model.package?.id,
    model.migration69Expand?.id,
    model.migration70Contract?.id
  ].filter(Boolean));
  const externalIds = new Set([
    ...values(model, "baselineObjects").flatMap(item => [item.inventoryObjectId, ...(item.inventoryObjectIds ?? [])]),
    ...values(model, "baselineObjects").map(item => item.objectRef),
    ...values(model, "stateMachines").flatMap(item => (item.transitions ?? []).map(transition => transition.id))
  ].filter(Boolean));
  for (const { item } of index.values()) {
    const refs = references(item);
    for (const edge of refs) {
      if (!index.has(edge.target) && !rootIds.has(edge.target) && !(["provenance", "integrity_backref"].includes(edge.kind) && externalIds.has(edge.target))) {
        fail("DANGLING_REFERENCE", `${item.id} -> ${edge.target}`);
      }
    }
    graph.set(item.id, refs.filter(edge => edge.kind === "dependency").map(edge => edge.target));
  }
  const visiting = new Set(); const visited = new Set();
  const visit = id => {
    if (visiting.has(id)) fail("REFERENCE_CYCLE", id);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const ref of graph.get(id) ?? []) {
      if (graph.has(ref)) visit(ref);
    }
    visiting.delete(id); visited.add(id);
  };
  for (const id of graph.keys()) visit(id);
}

function checkBaseline(model, baseline, inputHashes) {
  const inventoryObjects = new Map(values(baseline, "objects").map(item => [item.id, item]));
  const baselineSources = [...values(baseline, "sourceFiles"), ...values(baseline, "sources")];
  const sourceHashes = new Set([...baselineSources.map(item => item.sha256), ...(baseline.sourceHashes ? Object.values(baseline.sourceHashes) : [])]);
  const sourceByPath = new Map(baselineSources.map(item => [item.path, item.sha256]));
  for (const object of values(model, "baselineObjects")) {
    const objectId = object.inventoryObjectId ?? object.objectRef;
    const expected = object.sourceSha256 ?? object.sourceHash;
    if (objectId) {
      if (!inventoryObjects.has(objectId)) fail("BASELINE_OBJECT_MISSING", `${object.id}: ${objectId}`);
      const actual = inventoryObjects.get(objectId).sourceSha256 ?? inventoryObjects.get(objectId).sourceHash;
      if (!expected || expected !== actual) fail("BASELINE_SOURCE_HASH_MISMATCH", object.id);
    } else {
      const relativePath = object.sourcePath?.split("/packages/db/")[1];
      const normalizedPath = relativePath ? `packages/db/${relativePath}` : object.sourcePath;
      if (!expected || sourceByPath.get(normalizedPath) !== expected) fail("BASELINE_SOURCE_HASH_MISMATCH", object.id);
    }
  }
  const immutable = model.package?.immutableBaselineSha256 ?? model.package?.baselineInventorySha256;
  if (immutable && immutable !== inputHashes.baseline) fail("BASELINE_INVENTORY_HASH_MISMATCH", immutable);
  const migrationRefs = model.package?.immutableMigrationRefs ?? baseline.migrations ?? [];
  for (const migration of migrationRefs) {
    const number = Number(migration.number ?? migration.id);
    if (number >= 1 && number <= 68 && !/^[0-9a-f]{64}$/u.test(migration.sha256 ?? "")) fail("IMMUTABLE_MIGRATION_REF_INVALID", String(number));
  }
  const required = new Set(Array.from({ length: 68 }, (_, index) => index + 1));
  for (const migration of migrationRefs) required.delete(Number(migration.number ?? migration.id));
  if (migrationRefs.length && required.size) fail("IMMUTABLE_MIGRATION_REF_MISSING", [...required].join(","));
}

function phaseOf(item) {
  return item.phase ?? item.migrationPhase;
}

function checkPhysical(model) {
  const signatures = new Map();
  for (const collection of PHYSICAL) for (const item of values(model, collection)) {
    const phase = phaseOf(item);
    if (!["baseline", "69_expand", "70_contract"].includes(phase)) fail("PHYSICAL_PHASE_INVALID", item.id);
    if (collection === "functions") {
      const signature = item.signature ?? `${item.name}(${(item.parameters ?? item.arguments ?? []).filter(value => value.mode !== "OUT").map(value => value.type ?? value.sqlType).join(",")})`;
      if (!signature || signatures.has(signature)) fail("FUNCTION_SIGNATURE_DUPLICATE", signature || item.id);
      signatures.set(signature, item.id);
      const ownerRoleId = item.ownerRoleId ?? item.ownerRoleRef;
      const callerRoleIds = item.callerRoleIds ?? item.callerRoleRefs;
      const outcomes = item.outcomes ?? item.outcomeResultRefs;
      for (const [field, value] of Object.entries({
        ownerRoleId,
        callerRoleIds,
        volatility: item.volatility,
        strictness: item.strictness,
        securityMode: item.securityMode,
        searchPath: item.searchPath,
        outcomes,
        disposition: item.disposition
      })) {
        if (value === undefined) fail("FUNCTION_FIELD_MISSING", `${item.id}.${field}`);
      }
      if (["SECURITY DEFINER", "DEFINER"].includes(item.securityMode)) {
        const owner = values(model, "roles").find(role => role.id === ownerRoleId);
        if (!owner || owner.login !== false || owner.superuser !== false || owner.bypassRls !== false) fail("SECURITY_DEFINER_OWNER_NOT_LEAST_PRIVILEGE", item.id);
        if ((callerRoleIds ?? []).includes(ownerRoleId) && !item.description?.includes("Owner-only")) {
          fail("SECURITY_DEFINER_OWNER_IS_CALLER", item.id);
        }
      }
      if (item.disposition === undefined) fail("OLD_OVERLOAD_DISPOSITION_MISSING", item.id);
    }
  }
}

function checkExactChecks(model, baseline) {
  const checks = values(model, "constraints").filter(item => item.kind === "check");
  for (const check of checks) {
    if (!check.sqlPredicate || !check.sqlPredicate.trim().endsWith("IS TRUE") || /\bCHECK\b|;|TBD|MAY|implementation[- ]defined|future helper/iu.test(check.sqlPredicate)) fail("CHECK_PREDICATE_INVALID", check.id);
    if (sha256(Buffer.from(check.sqlPredicate)) !== check.predicateSha256) fail("CHECK_PREDICATE_HASH_MISMATCH", check.id);
    if (!check.tupleVectors?.length) fail("CHECK_VECTOR_MISSING", check.id);
    const table = values(model, "tables").find(item => item.id === check.tableRef);
    const names = new Set([
      ...values(model, "columns").filter(item => (item.tableRef ?? item.tableId) === check.tableRef).map(item => item.name),
      ...values(baseline, "columns").filter(item => item.table === table?.name).map(item => item.name)
    ]);
    const quoted = [...check.sqlPredicate.matchAll(/"([A-Za-z][A-Za-z0-9]*)"/gu)].map(match => match[1]);
    for (const name of quoted) if (!names.has(name)) fail("CHECK_COLUMN_UNREGISTERED", `${check.id}.${name}`);
    const outcomes = new Set(check.tupleVectors.map(item => item.expected));
    if (!outcomes.has("allow") || !outcomes.has("reject")) fail("CHECK_VECTOR_COVERAGE", check.id);
  }
}

function checkOwnershipParity(model) {
  const childCollections = [
    ["columnRefs", "columns"],
    ["constraintRefs", "constraints"],
    ["indexRefs", "indexes"],
    ["triggerRefs", "triggers"]
  ];
  for (const table of values(model, "tables")) for (const [backrefs, collection] of childCollections) {
    if (!(backrefs in table)) continue;
    const declared = new Set(table[backrefs]);
    const owned = new Set(values(model, collection).filter(item => item.tableRef === table.id || item.tableId === table.id).map(item => item.id));
    equalSets(declared, owned, "OWNERSHIP_PARITY_MISMATCH");
  }
  for (const machine of values(model, "stateMachines")) {
    const states = new Set((machine.states ?? []).map(state => typeof state === "string" ? state : state.id));
    if (machine.initial !== undefined && !states.has(machine.initial)) fail("STATE_REFERENCE_INVALID", `${machine.id}.initial`);
    for (const transition of machine.transitions ?? []) for (const key of ["from", "to"]) {
      if (!states.has(transition[key])) fail("STATE_REFERENCE_INVALID", `${transition.id}.${key}`);
    }
  }
}

function namedSet(model, key, projection = item => item.name ?? item.id) {
  return new Set(values(model, key).map(projection));
}

function equalSets(left, right, code) {
  const a = [...left].sort(); const b = [...right].sort();
  if (canonicalJson(a) !== canonicalJson(b)) fail(code, `${a.join(",")} != ${b.join(",")}`);
}

function checkClosedRegistries(model) {
  const inventory = model.closedInventory;
  const closedCollections = ["roles", "permissions", "resourceTypes", "actions", "results", "reasons", "tables", "columns", "constraints", "indexes", "triggers", "functions", "resolvers", "wireDtos", "jobDescriptors", "payloadSchemas", "stateMachines", "auditRules", "privacyRules", "tests"];
  if (!inventory) fail("CLOSED_INVENTORY_MISSING");
  for (const key of closedCollections) {
    if (!inventory[key]) fail("CLOSED_INVENTORY_MISSING", key);
    equalSets(new Set(values(model, key).map(item => item.id)), new Set(inventory[key]), "MODEL_OUTSIDE_OBJECT");
  }
  const physicalCollections = ["roles", "tables", "columns", "constraints", "indexes", "triggers", "functions"];
  for (const [phase, ledgerKey] of [["69_expand", "migration69Expand"], ["70_contract", "migration70Contract"]]) {
    const physicalIds = new Set(physicalCollections.flatMap(key => values(model, key).filter(item => phaseOf(item) === phase).map(item => item.id)));
    const ledgerIds = new Set(values(model, ledgerKey).flatMap(item => item.objectRefs ?? []));
    equalSets(physicalIds, ledgerIds, "MIGRATION_LEDGER_OBJECT_MISMATCH");
  }
  const functions = values(model, "functions");
  for (const role of values(model, "roles")) {
    const expected69 = new Set(functions.filter(fn => (fn.callerRoleRefs ?? fn.callerRoleIds ?? []).includes(role.id)).map(fn => fn.id));
    const expected70 = new Set(functions.filter(fn => (fn.callerRoleRefs ?? fn.callerRoleIds ?? []).includes(role.id) && fn.disposition !== "revoke_in_70").map(fn => fn.id));
    equalSets(new Set(role.grants69 ?? []), expected69, "ROLE_GRANT69_MISMATCH");
    equalSets(new Set(role.grants70 ?? []), expected70, "ROLE_GRANT70_MISMATCH");
  }
  const ledgerRevokes = new Set(values(model, "migration70Contract").flatMap(item => item.revokeFunctionIds ?? item.revokedFunctionRefs ?? []));
  const functionRevokes = new Set(values(model, "functions").filter(item => item.disposition === "revoke_in_70").map(item => item.id));
  equalSets(ledgerRevokes, functionRevokes, "MIGRATION70_REVOKE_MISMATCH");
  for (const item of values(model, "migration69Expand")) if (item.operation === "revoke" || item.revoke === true || (item.revokeFunctionIds?.length ?? 0) > 0) fail("MIGRATION69_REVOKES_OLD_ENTRY", item.id);
}

function dtoFields(dto) {
  return (dto.fields ?? []).map(field => ({ name: field.name, type: field.type, nullable: Boolean(field.nullable) }));
}

function returnFields(fn) {
  const fields = fn.returnFields ?? (Array.isArray(fn.returns) ? fn.returns : fn.returns?.fields) ?? [];
  return fields.map(field => ({ name: field.name, type: field.type ?? field.sqlType, nullable: Boolean(field.nullable) }));
}

function checkAclAuthority(model) {
  const roles = new Map(values(model, "roles").map(item => [item.id, item]));
  const migrator = roles.get("role.migrator");
  if (!migrator) {
    if (model.schemaAuthorities || model.aclOperations) fail("ACL_MIGRATOR_INVALID");
    return;
  }
  if (migrator.inherit !== false) fail("ACL_MIGRATOR_INVALID");
  const schema = values(model, "schemaAuthorities");
  if (schema.length !== 1 || schema[0].name !== "public" || schema[0].ownerRoleRef !== "role.migrator" || schema[0].publicCreate !== false || canonicalJson(schema[0].createRoleRefs) !== canonicalJson(["role.migrator"])) fail("ACL_SCHEMA_MISMATCH");
  const memberships = values(model, "roleMemberships");
  const workerMembership = memberships.filter(item => item.memberRoleRef === "role.worker_runtime");
  if (workerMembership.length !== 1 || workerMembership[0].grantedRoleRef !== "role.worker_lifecycle_cap" || workerMembership[0].inheritMode !== "explicit_set_role_then_reset") fail("ACL_WORKER_MEMBERSHIP_MISMATCH");
  for (const table of values(model, "tables")) {
    if (table.ownerRoleRef !== "role.migrator" || table.publicVerbs?.length) fail("ACL_TABLE_OWNER_MISMATCH", table.id);
    const byRole = new Map((table.acl ?? []).map(item => [item.roleRef, item.verbs]));
    for (const role of ["role.runtime", "role.worker_runtime"]) if ((byRole.get(role) ?? []).some(verb => ["SELECT", "INSERT", "UPDATE", "DELETE"].includes(verb))) fail("ACL_DIRECT_CRUD_FORBIDDEN", `${table.id}.${role}`);
  }
  for (const item of [...values(model, "constraints"), ...values(model, "indexes"), ...values(model, "triggers")]) if (item.ownerRoleRef !== "role.migrator") fail("ACL_OBJECT_OWNER_MISMATCH", item.id);
  for (const fn of values(model, "functions")) {
    if (fn.publicExecute !== false || canonicalJson([...(fn.executeRoleRefs ?? [])].sort()) !== canonicalJson([...(fn.callerRoleRefs ?? [])].sort())) fail("ACL_FUNCTION_EXECUTE_MISMATCH", fn.id);
  }
  if (model.databaseAcl?.publicCreate !== false || canonicalJson(model.databaseAcl?.createRoleRefs) !== canonicalJson(["role.migrator"])) fail("ACL_DATABASE_MISMATCH");
  if (model.defaultPrivileges?.publicFunctionExecute !== false || model.defaultPrivileges?.publicTablePrivileges?.length || model.defaultPrivileges?.publicSequencePrivileges?.length || model.defaultPrivileges?.automaticRuntimePrivileges !== false) fail("ACL_DEFAULT_PRIVILEGE_MISMATCH");
  const operations = values(model, "aclOperations");
  if (!operations.some(item => item.phase === "69_expand" && item.sql === "REVOKE CREATE ON SCHEMA public FROM PUBLIC")) fail("ACL_OPERATION_MISSING", "public schema create revoke");
  for (const fn of values(model, "functions").filter(item => item.disposition === "revoke_in_70")) if (!operations.some(item => item.phase === "70_contract" && item.objectRefs?.includes(fn.id) && item.sql.startsWith("REVOKE EXECUTE ON FUNCTION"))) fail("ACL_OPERATION_MISSING", fn.id);
}

function checkWire(model) {
  const functions = new Map(values(model, "functions").map(item => [item.id, item]));
  const validKinds = new Set(["job_payload", "sql_return", "api_request", "api_response", "safe_projection"]);
  for (const dto of values(model, "wireDtos")) {
    if (!validKinds.has(dto.kind)) fail("WIRE_KIND_INVALID", dto.id);
    if (dto.kind === "sql_return") {
      if (!dto.sqlFunctionRef || dto.jobDescriptorId || dto.producerSchemaId || dto.validatorSchemaId || dto.consumerSchemaId) fail("WIRE_BINDING_INVALID", dto.id);
      const fn = functions.get(dto.sqlFunctionRef);
      if (!fn) fail("WIRE_SQL_FUNCTION_MISSING", dto.id);
      if (canonicalJson(dtoFields(dto)) !== canonicalJson(returnFields(fn))) fail("WIRE_SQL_RETURN_MISMATCH", dto.id);
    } else if (dto.kind === "job_payload") {
      if (dto.sqlFunctionRef || !dto.jobDescriptorId || !dto.producerSchemaId || !dto.validatorSchemaId || !dto.consumerSchemaId) fail("WIRE_BINDING_INVALID", dto.id);
      const fields = canonicalJson(dtoFields(dto));
      for (const view of [dto.producerFields, dto.validatorFields, dto.consumerFields]) {
        if (view && canonicalJson(dtoFields({ fields: view })) !== fields) fail("WIRE_JOB_SCHEMA_MISMATCH", dto.id);
      }
    } else if (["api_request", "api_response"].includes(dto.kind)) {
      if (!dto.routeOperationId || dto.sqlFunctionRef) fail("WIRE_BINDING_INVALID", dto.id);
    } else if (!dto.projectionAuthorityId || dto.sqlFunctionRef) fail("WIRE_BINDING_INVALID", dto.id);
    const contractFields = dto.contractFields ?? dto.fields;
    if (canonicalJson(dtoFields({ fields: contractFields })) !== canonicalJson(dtoFields(dto))) fail("CONTRACT_WIRE_MISMATCH", dto.id);
  }
}

function checkJobSchemas(model) {
  const wires = new Map(values(model, "wireDtos").map(item => [item.id, item]));
  const descriptors = new Map(values(model, "jobDescriptors").map(item => [item.id, item]));
  const schemas = new Map(values(model, "payloadSchemas").map(item => [item.id, item]));
  const referencedSchemas = new Set();
  for (const wire of values(model, "wireDtos").filter(item => item.kind === "job_payload")) {
    const descriptor = descriptors.get(wire.jobDescriptorId);
    if (!descriptor) fail("JOB_DESCRIPTOR_MISSING", wire.id);
    if (descriptor.payloadWireRef !== wire.id) fail("JOB_DESCRIPTOR_WIRE_MISMATCH", wire.id);
    const bindings = [["producer", wire.producerSchemaId, descriptor.producerSchemaRef], ["validator", wire.validatorSchemaId, descriptor.validatorSchemaRef], ["consumer", wire.consumerSchemaId, descriptor.consumerSchemaRef]];
    for (const [role, wireRef, descriptorRef] of bindings) {
      if (wireRef !== descriptorRef) fail("JOB_DESCRIPTOR_SCHEMA_MISMATCH", `${wire.id}.${role}`);
      const schema = schemas.get(wireRef);
      if (!schema) fail("PAYLOAD_SCHEMA_MISSING", wireRef);
      referencedSchemas.add(wireRef);
      if (schema.role !== role || schema.jobDescriptorRef !== descriptor.id) fail("PAYLOAD_SCHEMA_BINDING_MISMATCH", wireRef);
      if (schema.unknownFields !== "reject") fail("PAYLOAD_SCHEMA_UNKNOWN_FIELDS", wireRef);
      if (canonicalJson(dtoFields(schema)) !== canonicalJson(dtoFields(wire))) fail("WIRE_JOB_SCHEMA_MISMATCH", wire.id);
    }
  }
  const dispatch = new Set();
  for (const descriptor of descriptors.values()) {
    if (!wires.has(descriptor.payloadWireRef)) fail("JOB_DESCRIPTOR_ORPHAN", descriptor.id);
    const key = `${descriptor.jobType}@${descriptor.version}`;
    if (dispatch.has(key)) fail("JOB_DISPATCH_DUPLICATE", key);
    dispatch.add(key);
  }
  for (const schema of schemas.values()) {
    if (!referencedSchemas.has(schema.id)) fail("PAYLOAD_SCHEMA_ORPHAN", schema.id);
  }
}

function checkP08CancelCompatibility(model) {
  const authority = model.p08CancelCompatibility;
  if (!authority) return;
  if (authority.expiredSourceBound !== false || authority.legacyException?.authorityVersion !== 1 || authority.legacyException?.newWriterAllowed !== false) fail("P08_CANCEL_COMPATIBILITY_MISSING");
  const expand = values(model, "constraints").find(item => item.id === authority.migration69ConstraintRef);
  const contract = values(model, "constraints").find(item => item.id === authority.migration70ConstraintRef);
  if (!expand || !contract || expand.phase !== "69_expand" || contract.phase !== "70_contract" || expand.sqlPredicate !== contract.sqlPredicate) fail("P08_CANCEL_CHECK_PHASE_MISMATCH");
  const vectors = expand.tupleVectors ?? [];
  const match = (status, artifact, consumed, version, expected) => vectors.some(item => item.values?.status === status && Boolean(item.values?.sourceArtifactIdValue) === artifact && Boolean(item.values?.uploadTokenConsumedAt) === consumed && item.values?.authorityVersion === version && item.expected === expected);
  if (!match("cancelled", true, true, 1, "allow") || !match("cancelled", true, true, 2, "reject") || !match("expired", true, true, 1, "reject") || !match("expired", true, true, 2, "reject")) fail("P08_CANCEL_VECTOR_MISMATCH");
  if (authority.newV2?.sourceBoundCancel !== "request_job_cancellation_then_failed" || authority.newV2?.reason !== "cancelled_after_source_bound" || authority.newV2?.preserveArtifact !== true || authority.newV2?.unlinkArtifact !== false) fail("P08_V2_CANCEL_SEMANTICS_MISMATCH");
  if (authority.migration70?.revokeFunctionRef !== "function.old.p08_transition_import" || authority.migration70?.preserveLegacyRows !== true) fail("P08_CANCEL_CONTRACT70_MISMATCH");
}

function checkP08(model) {
  const machine = values(model, "stateMachines").find(item => item.domain === "p08" || item.id === "p08_import" || item.id === "state.import");
  if (!machine) fail("P08_STATE_MACHINE_MISSING");
  const replacementConstraintId = machine.replacementConstraintId ?? machine.replacementConstraintRef;
  const check = values(model, "constraints").find(item => item.id === replacementConstraintId);
  if (!check) fail("P08_REPLACEMENT_CHECK_MISSING", replacementConstraintId);
  const checkStates = check.allowedValues ?? check.states;
  if (!checkStates) fail("P08_CHECK_STATE_METADATA_MISSING", check.id);
  const allowed = new Set(checkStates);
  equalSets(allowed, new Set((machine.states ?? []).map(state => typeof state === "string" ? state : state.id)), "P08_STATE_NOT_IN_CHECK");
  const transitions = machine.transitions ?? [];
  if (machine.requiredTransitionIds) equalSets(new Set(transitions.map(item => item.id)), new Set(machine.requiredTransitionIds), "P08_TRANSITION_SET_MISMATCH");
  const publication = transitions.find(item => item.from === "awaiting_upload" && item.to === "uploaded");
  if (transitions.length && (!publication || publication.requiresArtifact !== true || publication.requiresJob !== true)) fail("P08_CLAIM_PUBLICATION_CYCLE");
  const saga = machine.storageSaga ?? model.p08StorageSaga;
  if (saga) {
    const order = saga.steps?.map(step => step.id ?? step) ?? [];
    const publish = order.findIndex(value => /publish/iu.test(value));
    const claim = order.findIndex(value => /claim/iu.test(value));
    if (publish < 0 || (claim >= 0 && claim < publish) || saga.requiresWorkerClaimForPublication === true) fail("P08_CLAIM_PUBLICATION_CYCLE");
  }
  const wires = new Map(values(model, "wireDtos").map(item => [item.id, item]));
  const expected = {
    parse: ["importId", "artifactId", "expectedVersion", "scopeFingerprint"],
    commit: ["importId", "expectedVersion", "commitMode", "scopeFingerprint"],
    export: ["exportId", "expectedVersion", "querySnapshotRef", "formulaVersion", "scopeFingerprint"]
  };
  const payloads = machine.payloads ?? model.p08Payloads;
  for (const [key, fields] of Object.entries(expected)) {
    const actual = payloads?.[key] ?? dtoFields(wires.get(`wire.p08_${key}_payload`)).map(field => field.name);
    if (canonicalJson(actual ?? []) !== canonicalJson(fields)) fail("P08_PAYLOAD_MISMATCH", key);
  }
}

function checkP04(model) {
  const rules = values(model, "auditRules").filter(item => item.kind === "fact_success_audit" || item.id === "audit.fact_success");
  if (rules.length !== 1) fail("FACT_AUDIT_MAPPING_INCOMPLETE", `rule count ${rules.length}`);
  const tables = new Set(values(model, "tables").map(item => item.id));
  const objectIds = new Set([...values(model, "columns"), ...values(model, "constraints")].map(item => item.id));
  for (const rule of rules) {
    if (rule.tableId) {
      for (const key of ["tableId", "auditColumnId", "authorityVersionColumnId", "foreignKeyConstraintId", "uniqueConstraintId"]) {
        if (!rule[key]) fail("FACT_AUDIT_MAPPING_INCOMPLETE", `${rule.id}.${key}`);
        if (key !== "tableId" && !objectIds.has(rule[key])) fail("FACT_AUDIT_OBJECT_MISSING", `${rule.id}.${key}`);
      }
      continue;
    }
    if (rule.exactReplay !== "return_original_fact_and_audit_no_new_success_audit") fail("FACT_AUDIT_MAPPING_INCOMPLETE", `${rule.id}.exactReplay`);
    const factTables = rule.factTableRefs ?? [];
    if (!factTables.length) fail("FACT_AUDIT_MAPPING_INCOMPLETE", `${rule.id}.factTableRefs`);
    for (const tableId of factTables) {
      if (!tables.has(tableId)) fail("FACT_AUDIT_OBJECT_MISSING", tableId);
      const suffix = tableId.replace(/^table\.(?:dashboard_)?/u, "").replace("analytics_foundation_", "");
      const family = suffix === "import_batch" ? "import" : suffix === "export_request" ? "export" : suffix === "runtime_config_version" ? "config" : suffix === "feature_flag_version" ? "flag" : suffix;
      for (const id of [
        `column.${family}.authority_version`, `column.${family}.success_audit_id`,
        `constraint.${family}.success_audit_fk`, `constraint.${family}.success_audit_unique`
      ]) if (!objectIds.has(id)) fail("FACT_AUDIT_OBJECT_MISSING", id);
      const fk = values(model, "constraints").find(item => item.id === `constraint.${family}.success_audit_fk`);
      if (fk?.kind !== "foreign_key" || canonicalJson(fk.columnRefs) !== canonicalJson([`column.${family}.success_audit_id`]) || fk.referencedTableRef !== "table.audit_events" || canonicalJson(fk.referencedColumnRefs) !== canonicalJson(["column.audit_events.id"])) fail("FACT_AUDIT_FK_MISMATCH", family);
      const unique = values(model, "constraints").find(item => item.id === `constraint.${family}.success_audit_unique`);
      if (unique?.kind !== "unique" || canonicalJson(unique.columnRefs) !== canonicalJson([`column.${family}.success_audit_id`])) fail("FACT_AUDIT_UNIQUE_MISMATCH", family);
    }
  }
}

function checkP02(model) {
  const resolvers = new Set(values(model, "resolvers").map(item => item.resourceTypeId ?? item.resourceTypeRef));
  const required = values(model, "resourceTypes").filter(item => item.requiresResolver !== false).map(item => item.id);
  for (const id of required) if (!resolvers.has(id)) fail("P02_RESOLVER_MISSING", id);
  const helpers = values(model, "functions").filter(item => item.kind === "p02_authority_helper" || item.id === "function.p02_resolve_persisted_authority_v1");
  if (helpers.length !== 1) fail("P02_HELPER_COUNT", String(helpers.length));
  const forbidden = new Set(["requestedScope", "requestedScopeKind", "contextFingerprint", "scopeFingerprint"]);
  for (const parameter of helpers[0].parameters ?? helpers[0].arguments ?? []) if (forbidden.has(parameter.name)) fail("P02_CALLER_AUTHORITY_FORBIDDEN", parameter.name);
}

function checkP09(model) {
  const expected = ["vanstro_p09_guard_owner", "vanstro_runtime", "vanstro_worker_lifecycle_cap", "vanstro_worker_runtime"].sort();
  const expectedSet = new Set(expected);
  const roles = values(model, "roles").filter(item => item.domain === "p09" || expectedSet.has(item.name)).map(item => item.name).sort();
  if (canonicalJson(roles) !== canonicalJson(expected)) fail("P09_ROLE_TOPOLOGY_MISMATCH", roles.join(","));
  const functions = values(model, "functions");
  const cataloged = new Set(functions.flatMap(fn => fn.actionIds ?? fn.actionRefs ?? (fn.actionId ? [fn.actionId] : [])));
  const registry = values(model, "actions").filter(item => item.domain === "p09" || cataloged.has(item.id));
  for (const action of registry) if (!cataloged.has(action.id)) fail("P09_ACTION_NOT_CATALOGED", action.id);
}

function checkP10(model) {
  const requiredTables = new Set(["analytics_foundation_release", "analytics_foundation_release_cell"]);
  const releaseTables = values(model, "tables").filter(item => requiredTables.has(item.name));
  if (releaseTables.length !== requiredTables.size) fail("P10_RELEASE_TABLE_SET_MISMATCH", String(releaseTables.length));
  const rule = values(model, "privacyRules").find(item => item.kind === "p10_suppression" || item.kind === "threshold_suppression");
  if (!rule) fail("P10_SUPPRESSION_RULE_MISSING");
  if (rule.thresholdDistinctSubjects !== 3 || canonicalJson(rule.suppressProtectedCounts) !== canonicalJson([1, 2]) || rule.emptyProtectedCount !== 0 || rule.publishedMinimum !== 3 || rule.wholeFamily !== true) fail("P10_SUPPRESSION_POLICY_MISMATCH");
  const numericTypes = /^(?:smallint|integer|bigint|numeric(?:\(.+\))?)$/u;
  const releaseCellTable = values(model, "tables").find(item => item.name === "analytics_foundation_release_cell");
  const requiredNullRefs = values(model, "columns").filter(item => (item.tableRef ?? item.tableId) === releaseCellTable?.id && numericTypes.test(item.sqlType)).map(item => item.id).sort();
  if (canonicalJson([...(rule.suppressedNullColumnRefs ?? [])].sort()) !== canonicalJson(requiredNullRefs)) fail("P10_SUPPRESSED_COUNTS_NOT_NULL");
  const canonicalSuppressedFields = ["complement", "denominator", "numerator"];
  const acceptedSuppressedFields = [
    canonicalSuppressedFields,
    ["complementDistinct", "denominatorDistinct", "numeratorDistinct"]
  ].map(fields => canonicalJson([...fields].sort()));
  const nullFields = rule.suppressedNullFields ?? canonicalSuppressedFields.filter(name => rule.invariant?.includes("every persisted numeric field is NULL"));
  if (!acceptedSuppressedFields.includes(canonicalJson([...nullFields].sort()))) fail("P10_SUPPRESSED_COUNTS_NOT_NULL", nullFields.join(","));
  if (rule.persistExactSuppressedCounts === true || /persist exact suppressed/iu.test(rule.invariant ?? "")) fail("P10_SUPPRESSED_COUNTS_PERSISTED");
}

function strictUuidBytes(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value ?? "")) fail("P10_UUID_NOT_CANONICAL", String(value));
  return Buffer.from(value.replaceAll("-", ""), "hex");
}

function hmacFrame(bytes) {
  if (!bytes.length) fail("P10_HMAC_EMPTY_FRAME");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  return Buffer.concat([length, bytes]);
}

function deriveSubjectVector(authority, vector) {
  const domain = Buffer.from(authority.domainAscii, "ascii");
  const realm = Buffer.from(authority.realmAscii, "ascii");
  const uuid = strictUuidBytes(vector.actorUuid);
  const message = Buffer.concat([hmacFrame(domain), hmacFrame(realm), hmacFrame(uuid)]);
  const digest = createHmac("sha256", Buffer.from(vector.testOnlyKeyHex, "hex")).update(message).digest("hex");
  return { domain, realm, uuid, message, digest, epoch: `${authority.identityEpoch.prefix}${vector.kid}` };
}

function checkAuthenticatedSubjectAuthority(model) {
  const authority = model.authenticatedSubjectAuthority;
  if (!authority || authority.id !== "authority.p10_authenticated_subject.v1") fail("P10_HMAC_AUTHORITY_MISSING");
  const exact = {
    algorithm: "HMAC-SHA-256", digestBytes: 32,
    domainAscii: "vanstro.analytics.authenticated-subject.v1",
    realmAscii: "vanstro.authenticated-user.v1"
  };
  for (const [key, value] of Object.entries(exact)) if (authority[key] !== value) fail("P10_HMAC_CONSTANT_MISMATCH", key);
  if (canonicalJson(authority.framing?.fieldOrder) !== canonicalJson(["domain", "realm", "actor_uuid_raw_16"]) ||
      authority.framing?.lengthPrefix !== "u32_big_endian" || authority.actorAuthority?.encoding !== "raw_16_bytes" ||
      authority.actorAuthority?.source !== "backend_verified_session_user_id" || authority.actorAuthority?.callerSelectable !== false) {
    fail("P10_HMAC_FRAMING_MISMATCH");
  }
  const tuple = ["authenticatedSubjectDigest", "subjectKeyVersion", "identityRealmVersion", "identityEpoch", "consentSchemaVersion"];
  if (canonicalJson(authority.consent?.tupleFields) !== canonicalJson(tuple) || authority.consent?.lookup !== "exact_full_tuple_only" ||
      canonicalJson(authority.consent?.latestOrder) !== canonicalJson(["createdAt DESC", "id DESC"]) || authority.consent?.anonymousIdAuthority !== false ||
      canonicalJson(authority.consent?.activeActions) !== canonicalJson(["granted", "updated"]) || canonicalJson(authority.consent?.denialActions) !== canonicalJson(["withdrawn"]) || authority.consent?.unknownActionBehavior !== "fail_closed") {
    fail("P10_CONSENT_TUPLE_MISMATCH");
  }
  if (authority.identityEpoch?.derivation !== "prefix_plus_subject_key_version" || authority.identityEpoch?.prefix !== "vanstro.analytics.subject-epoch.v1:" ||
      authority.rotation?.newWrites !== "active_kid_only" || authority.rotation?.oldConsentAuthorizesNewEpoch !== false ||
      authority.rotation?.previousKidNewConsent !== false || authority.rotation?.previousKidNewEvent !== false ||
      authority.rotation?.retiredVerificationWindow !== "P30DT10M" || authority.rotation?.retiredVerificationWindowAnchor !== "retiredAt" || authority.rotation?.releaseSingleEpoch !== true ||
      authority.release?.familyIdentityEpochCardinality !== "exactly_one" || authority.release?.crossEpochWindow !== "forbidden" || authority.release?.crossEpochDistinctSubjectMerge !== false || authority.release?.crossEpochMetricMerge !== false) {
    fail("P10_ROTATION_AUTHORITY_MISMATCH");
  }
  if (authority.digestStorage?.authoritySqlType !== "bytea" || authority.digestStorage?.authorityBytes !== 32 || authority.digestStorage?.legacyColumnInPlaceTypeChange !== false ||
      authority.legacy?.newDigestSqlType !== "bytea" || authority.legacy?.legacyMirrorAuthority !== false ||
      authority.legacy?.anonymousConsentAuthorizesAuthenticatedIngestion !== false || authority.legacy?.automaticBackfill !== false || authority.legacy?.automaticPromotion !== false) {
    fail("P10_LEGACY_AUTHORITY_MISMATCH");
  }
  const vectors = authority.goldenVectors ?? [];
  if (vectors.length < 12 || new Set(vectors.map(item => item.id)).size !== vectors.length || new Set(vectors.map(item => item.kid)).size < 2 || new Set(vectors.map(item => item.actorUuid)).size < 3) fail("P10_GOLDEN_VECTOR_COVERAGE");
  for (const vector of vectors) {
    const derived = deriveSubjectVector(authority, vector);
    if (vector.actorRawUuidHex !== derived.uuid.toString("hex") || vector.domainHex !== derived.domain.toString("hex") ||
        vector.realmHex !== derived.realm.toString("hex") || vector.framedMessageHex !== derived.message.toString("hex") ||
        vector.expectedDigestHex !== derived.digest || vector.expectedIdentityEpoch !== derived.epoch) fail("P10_GOLDEN_VECTOR_MISMATCH", vector.id);
    const expectedTuple = { authenticatedSubjectDigestHex: derived.digest, subjectKeyVersion: vector.kid, identityRealmVersion: authority.realmAscii, identityEpoch: derived.epoch, consentSchemaVersion: authority.consent.schemaVersion };
    if (canonicalJson(vector.expectedConsentTuple) !== canonicalJson(expectedTuple)) fail("P10_GOLDEN_VECTOR_TUPLE_MISMATCH", vector.id);
  }
  const columns = new Map(values(model, "columns").map(item => [item.id, item]));
  for (const [id, type] of [["column.consent.subject_digest", "bytea"], ["column.event.authenticated_subject_digest", "bytea"], ["column.consent.identity_epoch", "text"]]) {
    if (columns.get(id)?.sqlType !== type) fail("P10_DIGEST_STORAGE_MISMATCH", id);
  }
  if (columns.get("column.event.subject_digest")?.sqlType !== "text" || columns.get("column.event.subject_digest")?.disposition !== "permanent") fail("P10_LEGACY_TEXT_REWRITE_FORBIDDEN");
  const releases = columns.get("column.release.identity_epoch");
  if (!releases || releases.nullable !== false) fail("P10_RELEASE_EPOCH_MISSING");
}

function checkOwnedProbe(model, inputHashes) {
  const evidence = model.ownedProbeEvidence;
  if (!evidence) return;
  if (evidence.schemaVersion !== "vanstro.f1-v1.5-owned-pg16-probe.v1" || evidence.engine !== "PostgreSQL 16" || evidence.migrationCount !== 68 || evidence.productionEvidence !== false || evidence.unknownFactsResolved !== true) fail("OWNED_PROBE_EVIDENCE_INVALID");
  if (!/^[0-9a-f]{64}$/u.test(evidence.sha256)) fail("OWNED_PROBE_HASH_INVALID");
}

function checkIndexes(model) {
  const inventory = model.indexInventory ?? values(model, "indexes").map(item => item.id);
  equalSets(new Set(values(model, "indexes").map(item => item.id)), new Set(inventory), "INDEX_INVENTORY_MISMATCH");
  if (values(model, "indexes").some(item => item.conditional === true || item.when || item.alternatives)) fail("CONDITIONAL_INDEX_FORBIDDEN");
}

function checkUpgrade(model) {
  const paths = values(model, "upgradeMatrix");
  const covered = new Set(paths.filter(item => Number(item.to ?? item.target) === 69).map(item => Number(item.from ?? item.source)));
  for (const source of REQUIRED_UPGRADE_SOURCES) if (!covered.has(source)) fail("UPGRADE_PATH_MISSING", `${source}->69`);
  const pairs = new Set(paths.map(item => `${item.from ?? item.source}->${item.to ?? item.target}`));
  for (const pair of ["68->70", "69->70"]) if (!pairs.has(pair)) fail("UPGRADE_PATH_MISSING", pair);
  if (paths.some(item => Number(item.to ?? item.target) === 71) || values(model, "migration70Contract").some(item => item.requiresMigration71)) fail("MIGRATION71_FORBIDDEN");
  const compatibility = new Map(values(model, "compatibilityMatrix").map(item => {
    const code = item.codeVersion ?? (item.code === "old68" ? "old" : item.code === "new15" ? "new" : item.code);
    return [`${code}+${item.schemaVersion ?? item.schema}`, item];
  }));
  for (const key of ["old+68", "old+69", "new+68", "new+69", "new+70", "old+70"]) if (!compatibility.has(key)) fail("COMPATIBILITY_MATRIX_MISSING", key);
  const new68 = compatibility.get("new+68");
  if (new68?.expected && new68.expected !== "not_ready") fail("NEW_CODE_68_NOT_FAIL_CLOSED");
  const new69 = compatibility.get("new+69");
  if (new69?.compatible === false || (new69?.expected && new69.expected !== "fully_healthy")) fail("NEW_CODE_69_NOT_HEALTHY");
  const new70 = compatibility.get("new+70");
  if (new70?.compatible === false || (new70?.expected && new70.expected !== "fully_healthy")) fail("NEW_CODE_70_NOT_HEALTHY");
  const old69 = compatibility.get("old+69");
  if (old69?.behaviorChanged === true || old69?.compatible === false || (old69.expected && old69.expected !== "operational")) fail("OLD_CODE_69_BEHAVIOR_CHANGE");
  const old70 = compatibility.get("old+70");
  if (old70?.compatible === true || (old70.expected && old70.expected !== "incompatible")) fail("OLD_CODE_70_NOT_INCOMPATIBLE");
}

function checkLanguage(model) {
  const text = canonicalJson(model);
  const match = text.match(FORBIDDEN_LANGUAGE);
  if (match) fail("FORBIDDEN_AUTHORITY_LANGUAGE", match[0]);
}

function checkV14BlockerClosure(model) {
  if (model.v14BlockerResolutions) {
    const required = ["RA-01", "RA-02", "RA-03", "RA-04", "RA-05", "RA-06", "RA-07", "RA-08", "RA-09", "B-10"];
    const entries = new Map(model.v14BlockerResolutions.map(item => [item.blockerId ?? item.id, item]));
    for (const id of required) {
      const item = entries.get(id);
      if (!item || !item.modelObjectIds?.length || !item.mutationTestIds?.length) fail("V14_BLOCKER_RESOLUTION_MISSING", id);
    }
    return;
  }
  const required = [
    "membership_consistency", "p08_state_saga", "p08_token_payload_query", "p04_fact_audit",
    "p02_helper_resolver", "p09_roles_audit_readiness", "p10_privacy_release_wire",
    "index_inventory", "migration70_attestation"
  ];
  const mutations = values(model, "tests").filter(item => item.kind === "semantic_mutation");
  if (mutations.some(item => item.expected !== "fail")) fail("SEMANTIC_MUTATION_EXPECTATION_INVALID");
  const declared = new Set(mutations.map(item => item.id));
  for (const id of required) if (!declared.has(`test.mutation.${id}`)) fail("V14_BLOCKER_RESOLUTION_MISSING", id);
}

export function verifyModel(input) {
  const { model, schema, baseline, hashes } = input;
  validateJsonSchema(model, schema);
  if (model.package?.version !== PACKAGE_VERSION || model.package?.status !== CANDIDATE_STATUS) fail("PACKAGE_IDENTITY_INVALID");
  const index = ids(model);
  checkReferences(model, index);
  checkBaseline(model, baseline, hashes);
  checkPhysical(model);
  checkExactChecks(model, baseline);
  checkOwnershipParity(model);
  checkClosedRegistries(model);
  checkAclAuthority(model);
  checkWire(model);
  checkJobSchemas(model);
  checkP08CancelCompatibility(model);
  checkP08(model);
  checkP04(model);
  checkP02(model);
  checkP09(model);
  checkP10(model);
  checkAuthenticatedSubjectAuthority(model);
  checkOwnedProbe(model, hashes);
  checkIndexes(model);
  checkUpgrade(model);
  checkLanguage(model);
  checkV14BlockerClosure(model);
  return { objectCount: index.size };
}

async function listFiles(root) {
  const result = [];
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) if (entry.isFile()) {
    const full = join(entry.parentPath ?? entry.path, entry.name);
    result.push(relative(root, full).split(sep).join("/"));
  }
  return result.sort();
}

async function checkPackageMembers(outputRoot, model, generated) {
  const expected = new Set([...generated.artifacts.keys(), ...(generated.staticMembers ?? [])]);
  const actual = new Set(await listFiles(outputRoot));
  equalSets(actual, expected, "PACKAGE_MEMBER_SET_MISMATCH");
  const stagingPath = generated.paths.manifestStaging;
  const staging = JSON.parse(await readFile(join(outputRoot, stagingPath), "utf8"));
  const staged = new Set(staging.generatedMembers.map(item => item.path));
  const withoutManifest = new Set([...expected].filter(path => path !== stagingPath));
  equalSets(staged, withoutManifest, "MANIFEST_STAGING_MEMBER_MISMATCH");
  const declared = new Set(Object.values(model.package.generatedFiles ?? {}));
  if (declared.size) equalSets(declared, new Set(GENERATED_ARTIFACTS.map(([key, fallback]) => model.package.generatedFiles[key] ?? fallback)), "PACKAGE_SCHEMA_MEMBER_MISMATCH");
}

async function checkManifestStaticMembers(model, outputRoot) {
  const staticMembers = model.package?.manifestStaticMembers ?? [];
  for (const member of staticMembers) {
    const bytes = await readFile(join(outputRoot, ...member.split("/"))).catch(() => fail("MANIFEST_STATIC_MEMBER_MISSING", member));
    const expected = model.package?.manifestStaticHashes?.[member];
    if (expected && sha256(bytes) !== expected) fail("MANIFEST_STATIC_MEMBER_HASH_MISMATCH", member);
  }
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) fail("USAGE", "arguments must be --key value pairs");
    values[key.slice(2)] = value;
  }
  for (const key of ["model", "schema", "baseline", "output"]) if (!values[key]) fail("USAGE", `--${key} is required`);
  return { modelPath: resolve(values.model), schemaPath: resolve(values.schema), baselinePath: resolve(values.baseline), outputRoot: resolve(values.output) };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const input = await readInputs(args);
  const result = verifyModel(input);
  const generated = generateArtifacts(input);
  await writeArtifacts(args.outputRoot, generated, { verifyOnly: true });
  await checkPackageMembers(args.outputRoot, input.model, generated);
  await checkManifestStaticMembers(input.model, args.outputRoot);
  process.stdout.write(`${canonicalJson({ ok: true, packageVersion: PACKAGE_VERSION, status: CANDIDATE_STATUS, generatedCount: generated.artifacts.size, objectCount: result.objectCount, hashes: input.hashes })}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => {
    const code = error instanceof F1V15Error ? error.code : "UNEXPECTED_ERROR";
    process.stderr.write(`${code}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
