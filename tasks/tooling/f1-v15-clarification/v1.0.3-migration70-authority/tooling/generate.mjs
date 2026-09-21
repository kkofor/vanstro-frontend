#!/usr/bin/env node
// V11-R1 Functional-First F1 — v1.0.3 successor generator.
//
// Canonically generates the functional-first Migration70 from the v1.0.3
// clarification model:
//
//   generated/10-migration70-executable-authority.sql
//   generated/MANIFEST.staging.json
//
// The generated file IS the complete migration (BEGIN … COMMIT), byte-stable
// and self-describing: its header carries the model SHA-256, and the repo
// migration.sql must be byte-identical to it (verified by the repo focused
// static tests). The generator rejects any A+ multi-role ACL closure shape
// (REVOKE ALL ON FUNCTION … FROM guard owner groups, ALTER OWNER to guard
// owners, OLD_EXECUTE_REMAINS / ROLE_RESET postasserts) by construction: the
// functional-first contract keeps owner=vanstro_migrator for the 3 v3
// functions, wraps ONLY the resolver DROP/ADD constraint in
// SET LOCAL ROLE vanstro_p02_guard_owner + RESET ROLE, and the final
// postassert is limited to attestation / resolver rows / v3
// SECURITY DEFINER+search_path / runtime EXECUTE.
//
// Usage:
//   node tooling/generate.mjs --model source/clarification-model.yaml \
//     --schema source/clarification-model.schema.json --output generated [--mode verify]
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VERSION = "1.0.3";
export const STATUS = "FROZEN";

export class ClarificationError extends Error {
  constructor(code, detail = "") {
    super(`${code}${detail ? `: ${detail}` : ""}`);
    this.code = code;
  }
}
export const fail = (code, detail) => {
  throw new ClarificationError(code, detail);
};
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function canonicalJson(value) {
  if (value === null || ["boolean", "string"].includes(typeof value)) return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("NON_FINITE_NUMBER");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object")
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  fail("UNSUPPORTED_JSON_VALUE", typeof value);
}
export const pretty = (value) => `${JSON.stringify(JSON.parse(canonicalJson(value)), null, 2)}\n`;

export function parse(bytes, label) {
  if (!bytes.length) fail("EMPTY_INPUT", label);
  if (bytes.includes(0x0d)) fail("CR_REJECTED", label);
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) fail("BOM_REJECTED", label);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text).equals(bytes)) fail("INVALID_UTF8", label);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail("JSON_COMPATIBLE_YAML_REQUIRED", `${label}: ${error.message}`);
  }
}

function pointer(schema, ref) {
  return ref.slice(2).split("/").reduce((v, k) => v[k.replaceAll("~1", "/").replaceAll("~0", "~")], schema);
}
export function validateSchema(value, schema) {
  const errors = [];
  const visit = (v, r, p) => {
    if (r.$ref) return visit(v, pointer(schema, r.$ref), p);
    if (r.const !== undefined && canonicalJson(v) !== canonicalJson(r.const)) errors.push(`${p}: const`);
    if (r.enum && !r.enum.some((x) => canonicalJson(x) === canonicalJson(v))) errors.push(`${p}: enum`);
    if (r.type) {
      const ok =
        r.type === "array"
          ? Array.isArray(v)
          : r.type === "object"
            ? v !== null && typeof v === "object" && !Array.isArray(v)
            : r.type === "integer"
              ? Number.isInteger(v)
              : typeof v === r.type;
      if (!ok) {
        errors.push(`${p}: type ${r.type}`);
        return;
      }
    }
    if (typeof v === "string" && r.pattern && !new RegExp(r.pattern, "u").test(v)) errors.push(`${p}: pattern`);
    if (Array.isArray(v)) {
      if (r.minItems !== undefined && v.length < r.minItems) errors.push(`${p}: minItems`);
      if (r.uniqueItems && new Set(v.map(canonicalJson)).size !== v.length) errors.push(`${p}: uniqueItems`);
      v.forEach((x, i) => r.items && visit(x, r.items, `${p}/${i}`));
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const k of r.required ?? []) if (!(k in v)) errors.push(`${p}: missing ${k}`);
      for (const [k, child] of Object.entries(r.properties ?? {})) if (k in v) visit(v[k], child, `${p}/${k}`);
      if (r.additionalProperties === false)
        for (const k of Object.keys(v)) if (!(k in (r.properties ?? {}))) errors.push(`${p}: additional ${k}`);
    }
  };
  visit(value, schema, "#");
  if (errors.length) fail("SCHEMA_VALIDATION_FAILED", errors.sort().join("; "));
}

export async function readInputs({ modelPath, schemaPath, generatorPath = fileURLToPath(import.meta.url) }) {
  const [mb, sb, gb] = await Promise.all([readFile(modelPath), readFile(schemaPath), readFile(generatorPath)]);
  const model = parse(mb, modelPath);
  const schema = parse(sb, schemaPath);
  validateSchema(model, schema);
  return {
    model,
    schema,
    bytes: { model: mb, schema: sb, generator: gb },
    hashes: { model: sha256(mb), schema: sha256(sb), generator: sha256(gb) },
  };
}

const tupleLiteral = (tuple) => `('${tuple.join("','")}')`;
const FUNCTIONAL_FIRST_FORBIDDEN = [
  /^REVOKE ALL ON FUNCTION /m,
  /ALTER FUNCTION .* OWNER TO /m,
  /ALTER DEFAULT PRIVILEGES FOR ROLE vanstro_migrator IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/m,
  /OLD_EXECUTE_REMAINS/,
  /M70_ROLE_RESET/,
  /vanstro_p08_guard_owner/,
  /vanstro_p09_guard_owner/,
  /vanstro_p10_guard_owner/,
  /aclexplode/,
];
const REQUIRED_FUNCTIONAL_FIRST = [
  /^BEGIN;$/m,
  /^COMMIT;$/m,
  /SET LOCAL lock_timeout='5s';/,
  /SET LOCAL statement_timeout='60s';/,
  /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;/,
  /SELECT public\.f1_consume_no_old_instances_v2\(/,
  /CONFIG_AUDIT_PRECHECK/,
  /runtime_config_version_authority2_audit_required CHECK \("authorityVersion"<2 OR "successAuditEventId" IS NOT NULL\) NOT VALID;/,
  /feature_flag_version_authority2_audit_required CHECK \("authorityVersion"<2 OR "successAuditEventId" IS NOT NULL\) NOT VALID;/,
  /analytics_foundation_event_authority2_audit_required CHECK \("authorityVersion"<2 OR "successAuditEventId" IS NOT NULL\) NOT VALID;/,
  /ATTESTATION_CONSUME_POSTASSERT/,
  /DO \$source_latest\$/,
  /F1_PHASE_B_SOURCE_LATEST_POSTASSERT/,
  /SET LOCAL ROLE vanstro_p02_guard_owner;/,
  /RESET ROLE;/,
  /CREATE OR REPLACE FUNCTION public\.p09_config_list_v3\(/,
  /CREATE OR REPLACE FUNCTION public\.p09_flag_list_v3\(/,
  /CREATE OR REPLACE FUNCTION public\.p10_list_release_day_v3\(/,
  /GRANT EXECUTE ON FUNCTION public\.p09_config_list_v3\(text,text,text,text\[\],text\[\]\) TO vanstro_runtime;/,
  /GRANT EXECUTE ON FUNCTION public\.p09_flag_list_v3\(text,text,text,text\[\],text\[\]\) TO vanstro_runtime;/,
  /GRANT EXECUTE ON FUNCTION public\.p10_list_release_day_v3\(text,date,text\) TO vanstro_runtime;/,
  /F1_PHASE_B_ATTESTATION_POSTASSERT/,
  /F1_PHASE_B_RESOLVER_POSTASSERT/,
  /F1_PHASE_B_FUNCTION_HARDENING_POSTASSERT/,
  /F1_PHASE_B_ACL_POSTASSERT/,
];

function migration70Body(model) {
  const m = model.migration70;
  const lines = [];
  const push = (block) => lines.push(block);

  // Preamble (kept verbatim from the frozen parent, functional-first form)
  for (const timeout of m.timeouts) push(timeout);
  push(m.isolation);
  push(m.consume);
  push(m.configAuditPrecheck);
  for (const constraint of m.constraints) push(constraint);
  push(m.attestationConsumeCheck);
  push("");
  push(m.sourceLatest);
  push("");
  // Resolver: DROP/ADD constraint under the p02 guard owner role only;
  // INSERTs run as migrator.
  for (const comment of m.resolver.comment) push(comment);
  push("SET LOCAL ROLE vanstro_p02_guard_owner;");
  push(m.resolver.dropConstraint);
  push("RESET ROLE;");
  push("");
  push("SET LOCAL ROLE vanstro_p02_guard_owner;");
  push(m.resolver.addConstraint);
  push("RESET ROLE;");
  push("");
  push(
    `INSERT INTO public.f1_p02_resolver_registry\n  (${m.resolver.insertColumns.map((c) => `"${c}"`).join(", ")})\nVALUES\n  ${m.resolver.insertRows.map(tupleLiteral).join(",\n  ")};`
  );
  push("");
  // 3 v3 functions, verbatim, owner stays migrator (no ALTER OWNER, no REVOKE)
  const v3 = m.v3Functions.map((f) => f.sql);
  for (let i = 0; i < v3.length; i++) {
    push(v3[i]);
    if (i < v3.length - 1) push("");
  }
  push("");
  for (const grant of m.grants) push(grant);
  push("");
  // Final postassert: attestation, resolver rows, v3 hardening, runtime EXECUTE only
  push("DO $postassert$");
  push("BEGIN");
  push(m.postassert.attestation);
  push("");
  push(m.postassert.resolverRows);
  push("");
  push(m.postassert.v3Hardening);
  push("");
  push(m.postassert.runtimeExecute);
  push("END;");
  push("$postassert$;");
  return lines.join("\n");
}

export function generate(input) {
  const { model, hashes } = input;
  const header = [
    "-- GENERATED — DO NOT EDIT",
    `-- model SHA-256: ${hashes.model}`,
    `-- status: ${STATUS}`,
  ];
  const body = migration70Body(model);
  const sql = `BEGIN;\n\n${header.join("\n")}\n\n${body}\n\nCOMMIT;\n`;
  for (const forbidden of FUNCTIONAL_FIRST_FORBIDDEN) {
    if (forbidden.test(sql)) fail("FUNCTIONAL_FIRST_VIOLATION", `forbidden pattern ${forbidden}`);
  }
  for (const required of REQUIRED_FUNCTIONAL_FIRST) {
    if (!required.test(sql)) fail("FUNCTIONAL_FIRST_MISSING", `required pattern ${required}`);
  }
  if ((sql.match(/^BEGIN;$/gm) ?? []).length !== 1) fail("SINGLE_BEGIN_REQUIRED");
  if ((sql.match(/^COMMIT;$/gm) ?? []).length !== 1) fail("SINGLE_COMMIT_REQUIRED");
  if ((sql.match(/SET LOCAL ROLE vanstro_p02_guard_owner;/g) ?? []).length !== 2) fail("RESOLVER_ROLE_WRAP_EXACTLY_TWO");
  if ((sql.match(/^RESET ROLE;$/gm) ?? []).length !== 2) fail("RESET_ROLE_EXACTLY_TWO");
  const artifacts = new Map([
    ["10-migration70-executable-authority.sql", Buffer.from(sql, "utf8")],
    [
      "MANIFEST.staging.json",
      Buffer.from(
        pretty({
          packageVersion: VERSION,
          status: STATUS,
          modelSha256: hashes.model,
          schemaSha256: hashes.schema,
          generatorSha256: hashes.generator,
          migration70Sha256: sha256(Buffer.from(sql, "utf8")),
          generatedAt: new Date().toISOString(),
        }),
        "utf8"
      ),
    ],
  ]);
  return { artifacts, hashes, sql };
}

async function atomic(path, text) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, text, { flag: "wx", mode: 0o644 });
  await rename(tmp, path).catch(async (e) => {
    await rm(tmp, { force: true });
    throw e;
  });
}

export async function writeArtifacts(root, generated, verify = false) {
  for (const [name, bytes] of generated.artifacts) {
    const target = join(root, name);
    if (verify) {
      let existing;
      try {
        existing = await readFile(target);
      } catch (error) {
        fail("VERIFY_MISSING", target);
      }
      if (!existing.equals(bytes)) fail("VERIFY_DRIFT", target);
      continue;
    }
    await atomic(target, bytes);
  }
}

function args(argv) {
  const x = {};
  for (let i = 0; i < argv.length; i += 2) x[argv[i].replace(/^--/, "")] = argv[i + 1];
  for (const k of ["model", "schema", "output"]) if (!x[k] || !isAbsolute(x[k])) fail("USAGE", k);
  return x;
}

export async function main(argv = process.argv.slice(2)) {
  const a = args(argv);
  const input = await readInputs({ modelPath: a.model, schemaPath: a.schema });
  const generated = generate(input);
  await writeArtifacts(a.output, generated, a.mode === "verify");
  process.stdout.write(
    `${canonicalJson({
      ok: true,
      mode: a.mode === "verify" ? "verify" : "generate",
      generatedCount: generated.artifacts.size,
      hashes: input.hashes,
      migration70Sha256: sha256(generated.sql),
    })}\n`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((e) => {
    process.stderr.write(`${e.code ?? "UNEXPECTED_ERROR"}: ${e.message}\n`);
    process.exitCode = 1;
  });
}
