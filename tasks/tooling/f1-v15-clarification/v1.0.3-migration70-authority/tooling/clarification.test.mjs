import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  VERSION,
  STATUS,
  canonicalJson,
  parse,
  sha256,
  validateSchema,
  readInputs,
  generate,
} from "./generate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const modelPath = join(root, "source/clarification-model.yaml");
const schemaPath = join(root, "source/clarification-model.schema.json");
const generatedPath = join(root, "generated/10-migration70-executable-authority.sql");

test("package identity is v1.0.3 functional-first migration70", () => {
  assert.equal(VERSION, "1.0.3");
  assert.equal(STATUS, "FROZEN");
});

test("model parses as JSON-compatible YAML and validates against the schema", async () => {
  const input = await readInputs({ modelPath, schemaPath });
  assert.equal(input.model.package.version, "1.0.3");
  assert.equal(input.model.package.variant, "functional-first-migration70");
  assert.equal(input.model.f0Evidence.schemaVersion, "v11-r1-functional-first-run-1");
  assert.equal(input.model.migration70.migrationName, "20260804110000_f1_v15_phase_b");
  assert.equal(input.hashes.model.length, 64);
});

test("generate() renders a canonical functional-first M70 and rejects A+ closure", async () => {
  const input = await readInputs({ modelPath, schemaPath });
  const { artifacts, sql, hashes } = generate(input);
  // artifacts: 10-migration70-executable-authority.sql + MANIFEST.staging.json
  assert.equal(artifacts.size, 2);
  assert.ok(artifacts.has("10-migration70-executable-authority.sql"));
  assert.ok(artifacts.has("MANIFEST.staging.json"));
  // header carries the model SHA
  assert.match(sql, /^BEGIN;\n\n-- GENERATED — DO NOT EDIT\n-- model SHA-256: [0-9a-f]{64}\n-- status: FROZEN\n\n/);
  assert.ok(sql.includes(`-- model SHA-256: ${hashes.model}`));
  // functional-first contract: kept pieces
  assert.match(sql, /SET LOCAL lock_timeout='5s';/);
  assert.match(sql, /SET LOCAL statement_timeout='60s';/);
  assert.match(sql, /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;/);
  assert.match(sql, /SELECT public\.f1_consume_no_old_instances_v2\(/);
  assert.match(sql, /CONFIG_AUDIT_PRECHECK/);
  assert.equal((sql.match(/NOT VALID;/g) ?? []).length, 3);
  assert.equal((sql.match(/VALIDATE CONSTRAINT/g) ?? []).length, 3);
  assert.match(sql, /ATTESTATION_CONSUME_POSTASSERT/);
  assert.match(sql, /DO \$source_latest\$/);
  assert.match(sql, /F1_PHASE_B_SOURCE_LATEST_POSTASSERT/);
  // resolver: exactly two SET LOCAL ROLE vanstro_p02_guard_owner + two RESET ROLE
  assert.equal((sql.match(/SET LOCAL ROLE vanstro_p02_guard_owner;/g) ?? []).length, 2);
  assert.equal((sql.match(/^RESET ROLE;$/gm) ?? []).length, 2);
  const resolverStart = sql.indexOf("-- F1 v1.5 Phase B forward-only");
  const resolverEnd = sql.indexOf("CREATE OR REPLACE FUNCTION public.p09_config_list_v3");
  const resolverRegion = sql.slice(resolverStart, resolverEnd);
  assert.equal((resolverRegion.match(/SET LOCAL ROLE vanstro_p02_guard_owner;/g) ?? []).length, 2);
  assert.ok(resolverRegion.indexOf("SET LOCAL ROLE vanstro_p02_guard_owner;") < resolverRegion.indexOf("DROP CONSTRAINT"));
  assert.ok(resolverRegion.indexOf("RESET ROLE;") > resolverRegion.indexOf("DROP CONSTRAINT"));
  assert.ok(resolverRegion.indexOf("SET LOCAL ROLE vanstro_p02_guard_owner;", resolverRegion.indexOf("DROP CONSTRAINT")) < resolverRegion.indexOf("ADD CONSTRAINT"));
  // INSERTs run as migrator (no role wrap between RESET ROLE and INSERT)
  const afterAdd = resolverRegion.slice(resolverRegion.indexOf("ADD CONSTRAINT"));
  assert.ok(afterAdd.indexOf("RESET ROLE;") < afterAdd.indexOf("INSERT INTO public.f1_p02_resolver_registry"));
  assert.ok(afterAdd.indexOf("INSERT INTO public.f1_p02_resolver_registry") >= 0);
  assert.equal(afterAdd.indexOf("SET LOCAL ROLE"), -1, "no role wrap between ADD RESET ROLE and v3 functions");
  // v3 functions unchanged, owner stays migrator
  assert.equal((sql.match(/CREATE OR REPLACE FUNCTION public\.p09_config_list_v3\(/g) ?? []).length, 1);
  assert.equal((sql.match(/CREATE OR REPLACE FUNCTION public\.p09_flag_list_v3\(/g) ?? []).length, 1);
  assert.equal((sql.match(/CREATE OR REPLACE FUNCTION public\.p10_list_release_day_v3\(/g) ?? []).length, 1);
  assert.equal((sql.match(/ALTER FUNCTION/g) ?? []).length, 0);
  assert.equal((sql.match(/OWNER TO /g) ?? []).length, 0);
  // grants: exactly 3 GRANT EXECUTE to vanstro_runtime, no REVOKE anywhere
  assert.equal((sql.match(/GRANT EXECUTE ON FUNCTION public\.p09_config_list_v3\(text,text,text,text\[\],text\[\]\) TO vanstro_runtime;/g) ?? []).length, 1);
  assert.equal((sql.match(/GRANT EXECUTE ON FUNCTION public\.p09_flag_list_v3\(text,text,text,text\[\],text\[\]\) TO vanstro_runtime;/g) ?? []).length, 1);
  assert.equal((sql.match(/GRANT EXECUTE ON FUNCTION public\.p10_list_release_day_v3\(text,date,text\) TO vanstro_runtime;/g) ?? []).length, 1);
  assert.equal((sql.match(/REVOKE/g) ?? []).length, 0);
  // final postassert limited to the 4 functional checks; no A+ closure gates
  assert.equal((sql.match(/F1_PHASE_B_ATTESTATION_POSTASSERT/g) ?? []).length, 1);
  assert.equal((sql.match(/F1_PHASE_B_RESOLVER_POSTASSERT/g) ?? []).length, 1);
  assert.equal((sql.match(/F1_PHASE_B_FUNCTION_HARDENING_POSTASSERT/g) ?? []).length, 1);
  assert.equal((sql.match(/F1_PHASE_B_ACL_POSTASSERT/g) ?? []).length, 1);
  assert.equal((sql.match(/F1_PHASE_B_OWNER_POSTASSERT|F1_PHASE_B_OLD_EXECUTE_POSTASSERT|OLD_EXECUTE_REMAINS|M70_ROLE_RESET|M70_GRANTABLE_RECLAIM|M70_GUARD_SCHEMA_CREATE_DENIAL/g) ?? []).length, 0);
  assert.equal((sql.match(/aclexplode/g) ?? []).length, 0);
  assert.equal((sql.match(/vanstro_p08_guard_owner|vanstro_p09_guard_owner|vanstro_p10_guard_owner|vanstro_worker_runtime/g) ?? []).length, 0);
  // single BEGIN/COMMIT, trailing newline
  assert.equal((sql.match(/^BEGIN;$/gm) ?? []).length, 1);
  assert.equal((sql.match(/^COMMIT;$/gm) ?? []).length, 1);
  assert.ok(sql.endsWith("COMMIT;\n"));
  // determinism: same input → same output bytes
  const again = generate(input);
  assert.equal(sha256(again.artifacts.get("10-migration70-executable-authority.sql")), sha256(artifacts.get("10-migration70-executable-authority.sql")));
});

test("generated M70 is byte-identical to the shipped artifact and self-consistent", async () => {
  const input = await readInputs({ modelPath, schemaPath });
  const { artifacts } = generate(input);
  const shipped = await readFile(generatedPath);
  assert.equal(sha256(shipped), sha256(artifacts.get("10-migration70-executable-authority.sql")));
  const staging = JSON.parse(artifacts.get("MANIFEST.staging.json").toString("utf8"));
  assert.equal(staging.migration70Sha256, sha256(shipped));
  assert.equal(staging.packageVersion, "1.0.3");
});
