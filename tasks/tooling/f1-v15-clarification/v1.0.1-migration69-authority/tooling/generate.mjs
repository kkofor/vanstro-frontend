#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VERSION = "1.0.1";
export const STATUS = "FROZEN";
export const GENERATED = Object.freeze([
  ["contract", "01-f1-v15-implementation-authority-clarification-v1.0.md"],
  ["sqlBodies", "02-canonical-sql-function-bodies.json"],
  ["old68", "03-old68-runtime-surface.json"],
  ["acl", "04-acl-delta.json"],
  ["wires", "05-wire-dto-registry.json"],
  ["ddl", "06-ddl-dependency-order.json"],
  ["constraints", "07-constraint-actions.json"],
  ["frontend", "08-frontend-replacement-authority.json"],
  ["migration69Sql", "09-migration69-executable-authority.sql"],
  ["migration70Sql", "10-migration70-executable-authority.sql"],
  ["bootstrapSql", "11-privileged-bootstrap-authority.sql"],
  ["concurrentSql", "12-migration69-concurrent-indexes.sql"],
  ["staging", "MANIFEST.staging.json"]
]);

export class ClarificationError extends Error {
  constructor(code, detail = "") { super(`${code}${detail ? `: ${detail}` : ""}`); this.code = code; }
}
export const fail = (code, detail) => { throw new ClarificationError(code, detail); };
export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export function canonicalJson(value) {
  if (value === null || ["boolean", "string"].includes(typeof value)) return JSON.stringify(value);
  if (typeof value === "number") { if (!Number.isFinite(value)) fail("NON_FINITE_NUMBER"); return JSON.stringify(Object.is(value, -0) ? 0 : value); }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  fail("UNSUPPORTED_JSON_VALUE", typeof value);
}
export const pretty = value => `${JSON.stringify(JSON.parse(canonicalJson(value)), null, 2)}\n`;
export function parse(bytes, label) {
  if (!bytes.length) fail("EMPTY_INPUT", label);
  if (bytes.includes(0x0d)) fail("CR_REJECTED", label);
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) fail("BOM_REJECTED", label);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text).equals(bytes)) fail("INVALID_UTF8", label);
  try { return JSON.parse(text); } catch (error) { fail("JSON_COMPATIBLE_YAML_REQUIRED", `${label}: ${error.message}`); }
}
function pointer(schema, ref) { return ref.slice(2).split("/").reduce((v, k) => v[k.replaceAll("~1", "/").replaceAll("~0", "~")], schema); }
export function validateSchema(value, schema) {
  const errors = [];
  const visit = (v, r, p) => {
    if (r.$ref) return visit(v, pointer(schema, r.$ref), p);
    if (r.const !== undefined && canonicalJson(v) !== canonicalJson(r.const)) errors.push(`${p}: const`);
    if (r.enum && !r.enum.some(x => canonicalJson(x) === canonicalJson(v))) errors.push(`${p}: enum`);
    if (r.type) {
      const ok = r.type === "array" ? Array.isArray(v) : r.type === "object" ? v !== null && typeof v === "object" && !Array.isArray(v) : r.type === "integer" ? Number.isInteger(v) : typeof v === r.type;
      if (!ok) { errors.push(`${p}: type ${r.type}`); return; }
    }
    if (typeof v === "string" && r.pattern && !(new RegExp(r.pattern, "u")).test(v)) errors.push(`${p}: pattern`);
    if (Array.isArray(v)) { if (r.minItems !== undefined && v.length < r.minItems) errors.push(`${p}: minItems`); if (r.uniqueItems && new Set(v.map(canonicalJson)).size !== v.length) errors.push(`${p}: uniqueItems`); v.forEach((x, i) => r.items && visit(x, r.items, `${p}/${i}`)); }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const k of r.required ?? []) if (!(k in v)) errors.push(`${p}: missing ${k}`);
      for (const [k, child] of Object.entries(r.properties ?? {})) if (k in v) visit(v[k], child, `${p}/${k}`);
      if (r.additionalProperties === false) for (const k of Object.keys(v)) if (!(k in (r.properties ?? {}))) errors.push(`${p}: additional ${k}`);
    }
  };
  visit(value, schema, "#");
  if (errors.length) fail("SCHEMA_VALIDATION_FAILED", errors.sort().join("; "));
}
export async function readInputs({ modelPath, schemaPath, generatorPath = fileURLToPath(import.meta.url) }) {
  const [mb, sb, gb] = await Promise.all([readFile(modelPath), readFile(schemaPath), readFile(generatorPath)]);
  const model = parse(mb, modelPath); const schema = parse(sb, schemaPath); validateSchema(model, schema);
  return { model, schema, bytes: { model: mb, schema: sb, generator: gb }, hashes: { model: sha256(mb), schema: sha256(sb), generator: sha256(gb) } };
}
function header(h) { return { generated: "GENERATED — DO NOT EDIT", packageVersion: VERSION, status: STATUS, modelSha256: h.model, schemaSha256: h.schema, generatorSha256: h.generator, parentFrozenManifestSha256: "e6c3cb275b3ecee17022418586613f6739757802b705bd17444b5c95be5a6e8f" }; }
function section(title, value) { return `## ${title}\n\n\`\`\`json\n${JSON.stringify(JSON.parse(canonicalJson(value)), null, 2)}\n\`\`\`\n`; }
export const SUCCESSOR = Object.freeze({
  version: "1.0.1",
  decision: "Plan A: for all 40 non-migrator ownership handoffs generated by migration69 (29 functions + 11 tables, 0 sequences), the exact REVOKE/GRANT precedes ALTER OWNER (ACL-before-owner) so the NOINHERIT non-superuser vanstro_migrator still holds grant options at GRANT time; a closed-set direct-ACL post-assert (grantor/grantee/privilege/grant option via aclexplode on proacl/relacl) runs inside the same transaction; 32 migrator-owned sites keep their original order; no sequence handoff. Gate4 revision (real PG16): PostgreSQL 16 ALTER OWNER rewrites every ACL entry granted by the old owner with the NEW owner as grantor but DROPS the old owner's explicit grant option, so ACL-before-owner alone cannot produce the post-assert's (grantor=new owner, grantee=vanstro_migrator, grantable=true) tuples and the first p02 direct-ACL post-assert fails. The successor therefore also emits, immediately after each of the 40 ALTER OWNER statements and while the temporary schema CREATE grant is still in effect, a restore block 'SET ROLE <target owner>; GRANT EXECUTE (functions) / SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER (tables) TO vanstro_migrator WITH GRANT OPTION; RESET ROLE;' so the new owner re-establishes the target ACL as grantor; caller REVOKE/GRANT stays pre-owner; the final REVOKE CREATE + denial and the 40-site post-assert are unchanged except the owner implicit row grantable, now taken from a disposable real PG16 catalog probe instead of inferred: the probe ran the full migration69 to its first failing post-assert (function p02) and compared the aclexplode(proacl) actual against the generated expected tuples — the ONLY actual/expected difference was owner self is_grantable actual=false vs expected=true, with the actual proacl {owner=X/owner,...,migrator=X*/owner}; PostgreSQL 16 acldefault('f') grants the function owner EXECUTE WITHOUT grant option and acldefault('r') likewise grants the table owner all seven privileges WITHOUT grant option — the second disposable PG16 catalog probe (tableacl.p02.registry) ran migration69 past the function asserts to the first failing table post-assert and found the ONLY actual/expected difference was 7 owner-self tuples actual=is_grantable false vs expected=true, actual relacl={owner=arwdDxt/owner,migrator=a*r*w*d*D*x*t*/owner} — so every non-migrator function expected owner row is (grantor=new owner, grantee=new owner, EXECUTE, grantable=false) and every non-migrator table expected owner row is (grantor=new owner, grantee=new owner, each of SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER, grantable=false); expected tuples per site are owner row first (functions and tables grantable=false), then the migrator restore row (grantor=new owner, grantee=vanstro_migrator, grantable=true), then the pre-owner caller/grants rows (grantable=false); caller rows whose grantee equals the owner are excluded before appending so the authoritative owner-self false can never be promoted by normalize's true-dominant duplicate rule; the symmetric EXCEPT stays exact and is not relaxed. ALTER FUNCTION/TABLE OWNER requires the new owner to hold CREATE on the object's schema, which earlier security migrations attempted to revoke with ineffective SET ROLE self-revokes (the guard was neither grantor nor schema owner, so real PG16 leaves CREATE residue); migration69 therefore self-provisions a temporary closed-set GRANT CREATE ON SCHEMA public (unique non-migrator target-owner set mechanically derived from the 40 handoff sites) inside the same transaction: a precondition DO asserts only that every target owner exists (starting CREATE is not required to be absent — the unified GRANT is idempotent for existing holders), GRANT CREATE precedes the first ALTER OWNER, REVOKE CREATE follows the last ALTER OWNER (before all 40 post-asserts), and a final denial DO re-asserts every target owner lacks CREATE — any failure rolls back the whole migration; no GRANT ALL/USAGE is emitted and the final schema ACL is unchanged. The final zero-CREATE denial closes the historical self-revoke residue as part of the migration69 owner-transfer security closure; it changes no object ACL or grantor. Gate4 search_path probe: the disposable PG16 probe ran the migration to its first failing post-assert (function p02) and recorded the catalog-canonical proconfig entry 'search_path=pg_catalog, public' for the canonical SQL SET search_path=pg_catalog,public — PostgreSQL 16 normalizes the stored value by trimming each comma-separated component and joining with ', ' — so the SECURITY DEFINER post-assert normalizes every proconfig search_path entry the same way (btrim each component, join with ', ') and compares it exactly against the model-derived canonical 'search_path=pg_catalog, public'; prosecdef=true, PUBLIC EXECUTE denial and the full direct-ACL tuples are still asserted per site. Gate5 revision (real PG16): the SECURITY DEFINER post-assert's catalog normalization expression (unnest/string_agg/btrim/string_to_array over proconfig) failed to compile on PostgreSQL 16 with mismatched parentheses; a real probe confirmed proconfig stores exactly 'search_path=pg_catalog, public', so the post-assert now uses the fixed direct ANY equality 'search_path=pg_catalog, public' = ANY(COALESCE(proconfig,'{}'::text[])) — same semantics, no regexp/array normalization; canonical bodies, ACL tuples, owner and schema protocol unchanged.",
  schemaCreateProtocol: {
    object: "public",
    privilege: "CREATE",
    grantType: "GRANT CREATE ON SCHEMA public TO <unique non-migrator target-owner closed set>",
    revokeType: "REVOKE CREATE ON SCHEMA public FROM <same closed set>",
    ownerSetSource: "mechanically derived: unique owners of sqlFunctionBodies/tableAcl sites whose owner is not vanstro_migrator",
    grantBefore: "first ALTER FUNCTION OWNER of the 40 handoff sites",
    revokeAfter: "last ALTER TABLE OWNER of the 40 handoff sites, before every 40-site post-assert",
    precheck: "DO: each target owner exists (role existence only — starting CREATE=false is NOT required: historical ineffective self-revokes leave residue and the unified GRANT is idempotent; final denial re-asserts zero CREATE after the owner transfer)",
    finalDenial: "DO: each target owner has_schema_privilege(owner,'public','CREATE')=false",
    rollback: "same transaction as migration69; any RAISE or statement failure rolls back GRANT and ALL OWNER transfers",
    finalAcl: "schema public ACL unchanged by migration69 (no GRANT ALL/USAGE emitted)"
  },
  conditionalAuthorization: "User-authorized on 2026-08-10 via tasks/plans/v11-r1-migration69-authorized-implementation-prompt.md after Gate0=A (no persistent environment holds a successful old-69 record). Excludes deployment, staging/production writes, P8-P10, WAL operations, and any migration other than 69.",
  gate0Matrix: [
    { environment: "PROD-REMOTE", persistence: "persistent", currentMigrations: "41 successful / 0 failed", migration69: "absent", checksum: "n/a", conclusion: "no old-69 applied; new 69 only enters the 41→81 drill" },
    { environment: "STG-REMOTE", persistence: "persistent", currentMigrations: "38 successful / 0 failed / 0 rolled-back", migration69: "absent", checksum: "n/a", conclusion: "Gate0=A: ledger proven read-only, no old-69 applied" },
    { environment: "LOCAL-DEV-3659", persistence: "persistent", currentMigrations: "60 successful + 4 rolled_back (none 69)", migration69: "absent", checksum: "n/a", conclusion: "no old-69 applied (not production evidence)" },
    { environment: "LOCAL-G10-c141", persistence: "persistent", currentMigrations: "8 successful", migration69: "absent", checksum: "n/a", conclusion: "no old-69 applied (not production evidence)" },
    { environment: "DISPOSABLE-*", persistence: "rebuildable", currentMigrations: "various, incl. failed old-69 rolled back", migration69: "failed old-69 only", checksum: "old 442e8bd5...", conclusion: "rebuild with new 69" }
  ],
  allowedClosedSet: [
    "successor package (this directory)",
    "packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql",
    "scripts/f1-migration69-authority.test.mjs",
    "scripts/f1-migration70-static.test.mjs",
    "scripts/f1-migration71-static.test.mjs",
    "scripts/test-f1-migration69.sh",
    "scripts/test-f1-migration70.sh",
    "scripts/test-f1-migration71.sh",
    "tasks/tooling/f1-v15-clarification/owned-pg16-conformance.mjs",
    "qa/v11-auth-browser/run-v11-r1-p7-migration-drill.sh (+ directly sourced test, only if required)"
  ],
  dualTopologyMatrix: {
    fresh: { path: "real prisma migrate deploy 1→81", runner: "vanstro_migrator LOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS", sites: "40 ACL-before-owner + post-owner restore (SET ROLE/GRANT WITH GRANT OPTION/RESET ROLE) exact; 32 migrator-owned exact; 0 sequences", stderr: "0 'no privileges could be revoked'; 0 'no privileges were granted'", ledger: "81 successful / 0 failed / 0 active rolled-back", repeat: "second deploy no-op" },
    production: { path: "real prisma migrate deploy 1→41 then 42→81", runner: "vanstro_migrator (same attributes)", sites: "same 40+restore/32/0", stderr: "same 0/0", ledger: "81 successful / 0 failed", repeat: "second deploy no-op" }
  },
  oldMigration69Sha256: "442e8bd564ebf7f787e41a830d720428310c69ae928ab17bef4d9f4fc2a4d21a",
  newMigration69Sha256: null
});
function contract(model, hashes, new69Sha) {
  const successor = { ...SUCCESSOR, newMigration69Sha256: new69Sha };
  return `<!--\nGENERATED — DO NOT EDIT\nmodel SHA-256: ${hashes.model}\nschema SHA-256: ${hashes.schema}\ngenerator SHA-256: ${hashes.generator}\nstatus: ${STATUS}\n-->\n# F1 v1.5 Implementation Authority Clarification v1.0.1\n\nThis frozen clarification extends the frozen parent manifest and adds no business capability. Every object reason is \`implementation_audit_missing_authority\`. This v1.0.1 successor records the user-authorized Plan A revision of migration 69 (ACL-before-owner for the 40 non-migrator handoff sites plus a closed-set owner/ACL/grantor post-assert); the old v1.0 package and its SHA history are preserved unmodified. Gate4 revision: real PG16 proved ALTER OWNER rewrites old-owner ACL entries to the new owner as grantor but drops the explicit grant option, so each of the 40 ALTER OWNER statements is followed by a restore block 'SET ROLE <target owner>; GRANT EXECUTE (functions) / SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER (tables) TO vanstro_migrator WITH GRANT OPTION; RESET ROLE;' (still inside the temporary schema CREATE window); the direct-ACL post-assert is unchanged and not relaxed, except that its expected closed set additionally includes the new owner's own implicit ACL row (grantor=new owner, grantee=new owner) with per-kind grantable taken from the disposable real PG16 catalog probe instead of inferred: the probe ran migration69 to its first failing post-assert (function p02) and found owner self is_grantable actual=false vs expected=true as the ONLY actual/expected difference (actual proacl {owner=X/owner,...,migrator=X*/owner}); PG16 acldefault('f') grants the function owner EXECUTE without grant option and acldefault('r') likewise grants the table owner the seven table privileges without grant option (probe-verified on f1_p02_resolver_registry: actual relacl {owner=arwdDxt/owner, migrator=a*r*w*d*D*x*t*/owner}, the ONLY actual/expected difference was 7 owner-self tuples actual=false vs expected=true), so both function owner rows (EXECUTE) and table owner rows (SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER) are grantable=false — each site's expected tuples are: owner row first (functions and tables grantable=false), then the migrator restore row (grantor=new owner, grantee=vanstro_migrator, grantable=true), then the pre-owner caller/grants rows (grantable=false); caller rows whose grantee equals the owner are excluded before appending so the authoritative owner-self false is never promoted by the duplicate normalize rule; duplicate (o,g,p) rows otherwise stay normalized grantable=true-dominant and the symmetric EXCEPT is kept exact.\n\n${["parentAuthority","p09ReadAuthority","readinessTruthTable","p10AuditAuthority","p02ResolverAuthority","workerHeartbeats","workerLogin","uniqueRepresentation","frontendReplacement","successor"].map(k => section(k, k === "successor" ? successor : model[k])).join("\n")}`;
}
function jsonArtifact(model, hashes, key) { return pretty({ header: header(hashes), [key]: model[key] }); }
const MIGRATOR_ROLE = "vanstro_migrator";
const ACL_VERBS = Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]);
const POST_ASSERT_EXCLUDED_FUNCTIONS = new Set(["f1_consume_no_old_instances_v2"]);
export function normalizeAclTuples(tuples) {
  const byKey = new Map();
  for (const tuple of tuples) {
    const key = `${tuple.o}\0${tuple.g}\0${tuple.p}`;
    const existing = byKey.get(key);
    if (existing === undefined) byKey.set(key, tuple);
    else if (!existing.gr && tuple.gr) byKey.set(key, { ...existing, gr: true });
  }
  return [...byKey.values()];
}
const aclTuple = tuple => `('${tuple.o}','${tuple.g}','${tuple.p}',${tuple.gr})`;
const aclValues = tuples => tuples.map(aclTuple).join(",");
function aclMismatchExpr(objectExpr, tuples) {
  const values = aclValues(tuples);
  const explode = `SELECT CASE WHEN a.grantor=0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END o,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END g,a.privilege_type p,a.is_grantable gr FROM aclexplode(${objectExpr}) a`;
  return `(SELECT count(*) FROM (${explode} EXCEPT SELECT * FROM (VALUES ${values}) v(o,g,p,gr)) x)<>0 OR (SELECT count(*) FROM (SELECT * FROM (VALUES ${values}) v(o,g,p,gr) EXCEPT ${explode}) x)<>0`;
}
const catalogSearchPath = value => {
  const entries = Array.isArray(value) ? value : [value];
  return [...new Set(entries.map(entry => {
    const eq = entry.indexOf("=");
    const key = eq < 0 ? "search_path=" : entry.slice(0, eq + 1);
    const body = eq < 0 ? entry : entry.slice(eq + 1);
    return `${key}${body.split(",").map(component => component.trim()).join(", ")}`;
  }))];
};
function functionPostAsserts(model) {
  return model.sqlFunctionBodies.filter(item => !POST_ASSERT_EXCLUDED_FUNCTIONS.has(item.name)).map(item => {
    const regproc = item.identitySignature;
    const tuples = normalizeAclTuples([{ o: item.owner, g: item.owner, p: "EXECUTE", gr: false }, { o: item.owner, g: "vanstro_migrator", p: "EXECUTE", gr: true }, ...item.callers.filter(caller => caller !== item.owner).map(caller => ({ o: item.owner, g: caller, p: "EXECUTE", gr: false }))]);
    const expectedSearchPaths = catalogSearchPath(item.searchPath);
    const searchPathAssert = expectedSearchPaths.length
      ? `IF NOT (SELECT prosecdef AND '${expectedSearchPaths[0]}' = ANY(COALESCE(proconfig,'{}'::text[])) FROM pg_proc WHERE oid='${regproc}'::regprocedure) THEN RAISE EXCEPTION 'M69_POST_ASSERT_SECURITY_DEFINER function.${item.name}'; END IF;`
      : `IF NOT (SELECT prosecdef FROM pg_proc WHERE oid='${regproc}'::regprocedure) THEN RAISE EXCEPTION 'M69_POST_ASSERT_SECURITY_DEFINER function.${item.name}'; END IF;`;
    return `-- post-assert function.${item.name}\nDO $m69_assert$\nDECLARE _owner text;\nBEGIN\nSELECT r.rolname INTO _owner FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid='${regproc}'::regprocedure;\nIF _owner IS DISTINCT FROM '${item.owner}' THEN RAISE EXCEPTION 'M69_POST_ASSERT_OWNER function.${item.name} expected=${item.owner} actual=%',_owner; END IF;\nIF ${aclMismatchExpr(`(SELECT proacl FROM pg_proc WHERE oid='${regproc}'::regprocedure)`, tuples)} THEN RAISE EXCEPTION 'M69_POST_ASSERT_ACL function.${item.name}'; END IF;\n${searchPathAssert}\nEND $m69_assert$;`;
  }).join("\n");
}
function tablePostAsserts(model) {
  return model.tableAcl.filter(item => item.owner !== "vanstro_migrator").map(item => {
    const tuples = normalizeAclTuples([...ACL_VERBS.map(verb => ({ o: item.owner, g: item.owner, p: verb, gr: false })), ...ACL_VERBS.map(verb => ({ o: item.owner, g: "vanstro_migrator", p: verb, gr: true })), ...Object.entries(item.grants).filter(([grantee]) => grantee !== item.owner).flatMap(([grantee, verbs]) => verbs.map(verb => ({ o: item.owner, g: grantee, p: verb, gr: false })))]);
    return `-- post-assert ${item.id}\nDO $m69_assert$\nDECLARE _owner text;\nBEGIN\nSELECT r.rolname INTO _owner FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE c.oid='${item.object}'::regclass;\nIF _owner IS DISTINCT FROM '${item.owner}' THEN RAISE EXCEPTION 'M69_POST_ASSERT_OWNER ${item.id} expected=${item.owner} actual=%',_owner; END IF;\nIF ${aclMismatchExpr(`(SELECT relacl FROM pg_class WHERE oid='${item.object}'::regclass)`, tuples)} THEN RAISE EXCEPTION 'M69_POST_ASSERT_ACL ${item.id}'; END IF;\nEND $m69_assert$;`;
  }).join("\n");
}
export function generate(input) {
  const { model, hashes } = input;
  if (model.package.version !== VERSION || model.package.status !== STATUS) fail("PACKAGE_IDENTITY_MISMATCH");
  const files = Object.fromEntries(GENERATED);
  const artifacts = new Map();
  const nodesById = new Map(model.ddlNodes.map(node => [node.id, node]));
  const renderNodeSql = order => order.flatMap(id => nodesById.get(id).sqlStatements ?? []).map(sql => sql.trim()).filter(Boolean).join("\n");
  const functionAcl = model.sqlFunctionBodies.map(item => {
    const identity = item.identitySignature;
    const owner = `ALTER FUNCTION ${identity} OWNER TO ${item.owner};`;
    const revoke = `REVOKE ALL ON FUNCTION ${identity} FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;`;
    const grant = item.callers.length ? `GRANT EXECUTE ON FUNCTION ${identity} TO ${item.callers.join(",")};` : "";
    const restore = [`SET ROLE ${item.owner};`, `GRANT EXECUTE ON FUNCTION ${identity} TO ${MIGRATOR_ROLE} WITH GRANT OPTION;`, "RESET ROLE;"].join("\n");
    return item.owner === MIGRATOR_ROLE ? [owner, revoke, grant].filter(Boolean).join("\n") : [revoke, grant, owner, restore].filter(Boolean).join("\n");
  }).join("\n");
  const tableAcl = model.tableAcl.map(item => {
    const grants = Object.entries(item.grants).map(([role, verbs]) => `GRANT ${verbs.join(",")} ON TABLE ${item.object} TO ${role};`).join("\n");
    const revoke = `REVOKE ALL ON TABLE ${item.object} FROM ${item.deny.join(",")};`;
    const owner = `ALTER TABLE ${item.object} OWNER TO ${item.owner};`;
    const restore = `SET ROLE ${item.owner};\nGRANT ${ACL_VERBS.join(",")} ON TABLE ${item.object} TO ${MIGRATOR_ROLE} WITH GRANT OPTION;\nRESET ROLE;`;
    return item.owner === MIGRATOR_ROLE ? `${owner}\n${revoke}\n${grants}` : `${revoke}\n${grants}\n${owner}\n${restore}`;
  }).join("\n");
  const postAssertSql = `${functionPostAsserts(model)}\n${tablePostAsserts(model)}`;
  const handoffOwners = [...new Set([...model.sqlFunctionBodies.filter(item => item.owner !== MIGRATOR_ROLE).map(item => item.owner), ...model.tableAcl.filter(item => item.owner !== MIGRATOR_ROLE).map(item => item.owner)])];
  if (!handoffOwners.length) fail("SCHEMA_CREATE_PROTOCOL_EMPTY_OWNER_SET");
  const ownerList = handoffOwners.join(",");
  const schemaCreatePrecheckSql = `DO $m69_schema_create_pre$\nDECLARE\nBEGIN\n${handoffOwners.map(owner => `IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${owner}') THEN RAISE EXCEPTION 'M69_SCHEMA_CREATE_PRECONDITION_ROLE_MISSING:${owner}'; END IF;`).join("\n")}\nEND $m69_schema_create_pre$;`;
  const schemaCreateGrantSql = `GRANT CREATE ON SCHEMA public TO ${ownerList};`;
  const schemaCreateRevokeSql = `REVOKE CREATE ON SCHEMA public FROM ${ownerList};`;
  const schemaCreateDenialSql = `DO $m69_schema_create_deny$\nDECLARE\nBEGIN\n${handoffOwners.map(owner => `IF has_schema_privilege('${owner}','public','CREATE') THEN RAISE EXCEPTION 'M69_SCHEMA_CREATE_DENIAL_FAILED:${owner}'; END IF;`).join("\n")}\nEND $m69_schema_create_deny$;`;
  const helperIndex = model.migration69Order.findIndex(id => nodesById.get(id).operation === "create_internal_helpers");
  const preFunctionNodes = model.migration69Order.slice(0, helperIndex);
  const postFunctionNodes = model.migration69Order.slice(helperIndex + 2);
  const migration69Text = `-- GENERATED — DO NOT EDIT\n-- model SHA-256: ${hashes.model}\n-- schema SHA-256: ${hashes.schema}\n-- generator SHA-256: ${hashes.generator}\n-- status: ${STATUS}\nBEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='120s';\n${renderNodeSql(preFunctionNodes)}\n${model.sqlFunctionBodies.map(item => item.canonicalSql.trim()).join("\n")}\n${renderNodeSql(postFunctionNodes)}\n${schemaCreatePrecheckSql}\n${schemaCreateGrantSql}\n${functionAcl}\n${tableAcl}\n${schemaCreateRevokeSql}\n${schemaCreateDenialSql}\n${postAssertSql}\nCOMMIT;\n`;
  const new69Sha = sha256(Buffer.from(migration69Text));
  artifacts.set(files.contract, contract(model, hashes, new69Sha));
  artifacts.set(files.sqlBodies, jsonArtifact(model, hashes, "sqlFunctionBodies"));
  artifacts.set(files.old68, jsonArtifact(model, hashes, "old68RuntimeSurface"));
  artifacts.set(files.acl, jsonArtifact(model, hashes, "aclDelta"));
  artifacts.set(files.wires, jsonArtifact(model, hashes, "wireDtos"));
  artifacts.set(files.ddl, pretty({ header: header(hashes), ddlNodes: model.ddlNodes, migration69Order: model.migration69Order, migration70Order: model.migration70Order }));
  artifacts.set(files.constraints, jsonArtifact(model, hashes, "constraintActions"));
  artifacts.set(files.frontend, jsonArtifact(model, hashes, "frontendReplacement"));
  artifacts.set(files.migration69Sql, migration69Text);
  const revokeNodeId = model.migration70Order.find(id => nodesById.get(id).operation === "revoke_exact_old_signatures");
  const generatedRevokes = model.old68RuntimeSurface.filter(item => item.disposition === "revoke_in_70").map(item => `REVOKE ALL ON FUNCTION ${item.identitySignature} FROM PUBLIC${item.effectiveExecuteAuthority.length ? `,${item.effectiveExecuteAuthority.join(",")}` : ""};`).join("\n");
  const regprocedureIdentity = item => `${item.schema}.${item.name}(${item.identityArguments.split(",").map(argument => argument.trim().replace(/^[a-z_][a-z0-9_]*\s+/iu, "")).join(",")})`;
  const generatedRevokeAssertions = model.old68RuntimeSurface.filter(item => item.disposition === "revoke_in_70").flatMap(item => item.effectiveExecuteAuthority.map(role => `IF has_function_privilege('${role}','${regprocedureIdentity(item)}','EXECUTE') THEN RAISE EXCEPTION 'OLD_EXECUTE_REMAINS:${item.name}:${role}'; END IF;`)).join("\n");
  const migration70Body = model.migration70Order.map(id => id === revokeNodeId ? generatedRevokes : renderNodeSql([id])).join("\n");
  artifacts.set(files.bootstrapSql, `-- GENERATED — PRIVILEGED PRECONDITION, NOT A PRISMA MIGRATION\n-- model SHA-256: ${hashes.model}\n-- schema SHA-256: ${hashes.schema}\n-- generator SHA-256: ${hashes.generator}\n-- status: ${STATUS}\n${model.bootstrapSql.trim()}\n`);
  artifacts.set(files.concurrentSql, `-- GENERATED — POST-COMMIT CONCURRENT PHASE, NOT TRANSACTIONAL\n-- model SHA-256: ${hashes.model}\n-- schema SHA-256: ${hashes.schema}\n-- generator SHA-256: ${hashes.generator}\n-- status: ${STATUS}\n${model.concurrentSql.trim()}\n`);
  artifacts.set(files.migration70Sql, `-- GENERATED — DO NOT EDIT\n-- model SHA-256: ${hashes.model}\n-- status: ${STATUS}\nBEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='60s';\nSET TRANSACTION ISOLATION LEVEL SERIALIZABLE;\n${migration70Body}\nDO $$ BEGIN ${generatedRevokeAssertions} END $$;\nCOMMIT;\n`);
  const records = [...artifacts].sort(([a],[b]) => Buffer.compare(Buffer.from(a), Buffer.from(b))).map(([path,text]) => ({ path, sha256: sha256(Buffer.from(text)), bytes: Buffer.byteLength(text), lfLines: [...text].filter(c => c === "\n").length }));
  artifacts.set(files.staging, pretty({ header: header(hashes), generatedMembers: records, staticMembers: model.package.staticMembers }));
  return { artifacts };
}
async function atomic(path, text) { await mkdir(dirname(path), { recursive: true }); const tmp = `${path}.tmp-${process.pid}`; await writeFile(tmp, text, { flag: "wx", mode: 0o644 }); await rename(tmp, path).catch(async e => { await rm(tmp, { force: true }); throw e; }); }
export async function writeArtifacts(root, generated, verify = false) {
  await mkdir(root, { recursive: true });
  const expected = new Set(generated.artifacts.keys());
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) if (entry.isFile()) { const rel = relative(root, join(entry.parentPath ?? entry.path, entry.name)).split(sep).join("/"); if (!expected.has(rel)) fail("EXTRA_OUTPUT_MEMBER", rel); }
  for (const [path, text] of generated.artifacts) { const full = join(root, path); if (verify) { if (!(await readFile(full)).equals(Buffer.from(text))) fail("GENERATED_MEMBER_DRIFT", path); } else await atomic(full, text); }
}
function args(argv) { const x={}; for(let i=0;i<argv.length;i+=2)x[argv[i].replace(/^--/,"")]=argv[i+1]; for(const k of ["model","schema","output"])if(!x[k]||!isAbsolute(x[k]))fail("USAGE",k); return x; }
export async function main(argv=process.argv.slice(2)) { const a=args(argv); const input=await readInputs({modelPath:a.model,schemaPath:a.schema}); const generated=generate(input); await writeArtifacts(a.output,generated,a.mode==="verify"); process.stdout.write(`${canonicalJson({ok:true,mode:a.mode==="verify"?"verify":"generate",generatedCount:generated.artifacts.size,hashes:input.hashes})}\n`); }
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url)))main().catch(e=>{process.stderr.write(`${e.code??"UNEXPECTED_ERROR"}: ${e.message}\n`);process.exitCode=1;});
