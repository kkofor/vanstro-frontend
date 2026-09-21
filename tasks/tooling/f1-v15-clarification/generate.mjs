#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VERSION = "1.0";
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
function contract(model, hashes) {
  return `<!--\nGENERATED — DO NOT EDIT\nmodel SHA-256: ${hashes.model}\nschema SHA-256: ${hashes.schema}\ngenerator SHA-256: ${hashes.generator}\nstatus: ${STATUS}\n-->\n# F1 v1.5 Implementation Authority Clarification v1.0\n\nThis frozen clarification extends the frozen parent manifest and adds no business capability. Every object reason is \`implementation_audit_missing_authority\`.\n\n${["parentAuthority","p09ReadAuthority","readinessTruthTable","p10AuditAuthority","p02ResolverAuthority","workerHeartbeats","workerLogin","uniqueRepresentation","frontendReplacement"].map(k => section(k, model[k])).join("\n")}`;
}
function jsonArtifact(model, hashes, key) { return pretty({ header: header(hashes), [key]: model[key] }); }
export function generate(input) {
  const { model, hashes } = input;
  if (model.package.version !== VERSION || model.package.status !== STATUS) fail("PACKAGE_IDENTITY_MISMATCH");
  const files = Object.fromEntries(GENERATED);
  const artifacts = new Map();
  artifacts.set(files.contract, contract(model, hashes));
  artifacts.set(files.sqlBodies, jsonArtifact(model, hashes, "sqlFunctionBodies"));
  artifacts.set(files.old68, jsonArtifact(model, hashes, "old68RuntimeSurface"));
  artifacts.set(files.acl, jsonArtifact(model, hashes, "aclDelta"));
  artifacts.set(files.wires, jsonArtifact(model, hashes, "wireDtos"));
  artifacts.set(files.ddl, pretty({ header: header(hashes), ddlNodes: model.ddlNodes, migration69Order: model.migration69Order, migration70Order: model.migration70Order }));
  artifacts.set(files.constraints, jsonArtifact(model, hashes, "constraintActions"));
  artifacts.set(files.frontend, jsonArtifact(model, hashes, "frontendReplacement"));
  const nodesById = new Map(model.ddlNodes.map(node => [node.id, node]));
  const renderNodeSql = order => order.flatMap(id => nodesById.get(id).sqlStatements ?? []).map(sql => sql.trim()).filter(Boolean).join("\n");
  const functionAcl = model.sqlFunctionBodies.map(item => {
    const identity = item.identitySignature;
    const owner = `ALTER FUNCTION ${identity} OWNER TO ${item.owner};`;
    const revoke = `REVOKE ALL ON FUNCTION ${identity} FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;`;
    const grant = item.callers.length ? `GRANT EXECUTE ON FUNCTION ${identity} TO ${item.callers.join(",")};` : "";
    return [owner,revoke,grant].filter(Boolean).join("\n");
  }).join("\n");
  const tableAcl = model.tableAcl.map(item => {
    const grants = Object.entries(item.grants).map(([role, verbs]) => `GRANT ${verbs.join(",")} ON TABLE ${item.object} TO ${role};`).join("\n");
    return `ALTER TABLE ${item.object} OWNER TO ${item.owner};\nREVOKE ALL ON TABLE ${item.object} FROM ${item.deny.join(",")};\n${grants}`;
  }).join("\n");
  const helperIndex = model.migration69Order.findIndex(id => nodesById.get(id).operation === "create_internal_helpers");
  const preFunctionNodes = model.migration69Order.slice(0, helperIndex);
  const postFunctionNodes = model.migration69Order.slice(helperIndex + 2);
  artifacts.set(files.migration69Sql, `-- GENERATED — DO NOT EDIT\n-- model SHA-256: ${hashes.model}\n-- schema SHA-256: ${hashes.schema}\n-- generator SHA-256: ${hashes.generator}\n-- status: ${STATUS}\nBEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='120s';\n${renderNodeSql(preFunctionNodes)}\n${model.sqlFunctionBodies.map(item => item.canonicalSql.trim()).join("\n")}\n${renderNodeSql(postFunctionNodes)}\n${functionAcl}\n${tableAcl}\nCOMMIT;\n`);
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
