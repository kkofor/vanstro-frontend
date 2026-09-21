#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const PACKAGE_VERSION = "1.5";
export const CANDIDATE_STATUS = "FROZEN";
export const GENERATED_ARTIFACTS = Object.freeze([
  ["p02Contract", "01-dashboard-p02-resource-authority-clarification-v1.5.md"],
  ["p04Contract", "02-dashboard-p04-fact-audit-erratum-v1.5.md"],
  ["p05P08Contract", "03-dashboard-p05-p08-joint-erratum-v1.5.md"],
  ["p09Contract", "04-dashboard-p09-contract-v1.5.md"],
  ["p10Contract", "05-dashboard-p10-contract-v1.5.md"],
  ["migrationLedger", "06-dashboard-f1-migrations69-70-ledger-v1.5.md"],
  ["sqlCatalog", "07-dashboard-f1-closed-sql-authority-catalog-v1.5.md"],
  ["physicalInventory", "08-dashboard-f1-physical-object-inventory-v1.5.json"],
  ["wireRegistry", "09-dashboard-f1-wire-dto-registry-v1.5.json"],
  ["actionRegistry", "10-dashboard-f1-permission-action-reason-registry-v1.5.json"],
  ["rolloutMatrix", "11-dashboard-f1-rollout-upgrade-matrix-v1.5.md"],
  ["reviewChecklist", "12-dashboard-f1-review-checklist-v1.5.md"],
  ["manifestStaging", "MANIFEST.staging.json"]
]);

const PHYSICAL_COLLECTIONS = Object.freeze([
  "roles", "tables", "columns", "constraints", "indexes", "triggers", "functions"
]);
const CONTRACT_SECTIONS = Object.freeze({
  p02Contract: ["resolvers", "permissions", "resourceTypes"],
  p04Contract: ["auditRules"],
  p05P08Contract: ["stateMachines", "privacyRules"],
  p09Contract: ["roles", "actions", "results", "reasons"],
  p10Contract: ["privacyRules", "wireDtos"]
});

export class F1V15Error extends Error {
  constructor(code, detail) {
    super(`${code}${detail ? `: ${detail}` : ""}`);
    this.code = code;
  }
}

export function fail(code, detail) {
  throw new F1V15Error(code, detail);
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("NON_FINITE_NUMBER", String(value));
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  fail("UNSUPPORTED_JSON_VALUE", typeof value);
}

export function prettyCanonicalJson(value) {
  const normalized = JSON.parse(canonicalJson(value));
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

export function parseJsonCompatibleYaml(bytes, label = "input") {
  if (bytes.length === 0) fail("EMPTY_INPUT", label);
  if (bytes.includes(0x0d)) fail("CR_REJECTED", label);
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) fail("BOM_REJECTED", label);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes)) fail("INVALID_UTF8", label);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail("JSON_COMPATIBLE_YAML_REQUIRED", `${label}: ${error.message}`);
  }
}

function typeMatches(value, expected) {
  if (expected === "null") return value === null;
  if (expected === "array") return Array.isArray(value);
  if (expected === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (expected === "integer") return Number.isInteger(value);
  return typeof value === expected;
}

function pointer(root, ref) {
  if (!ref.startsWith("#/")) fail("SCHEMA_REF_UNSUPPORTED", ref);
  return ref.slice(2).split("/").reduce((value, token) => {
    const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
    if (value === undefined || value === null || !(key in value)) fail("SCHEMA_REF_MISSING", ref);
    return value[key];
  }, root);
}

export function validateJsonSchema(instance, schema) {
  const errors = [];
  const visit = (value, rule, path) => {
    if (rule === true) return;
    if (rule === false) {
      errors.push(`${path}: forbidden by schema`);
      return;
    }
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      errors.push(`${path}: invalid schema node`);
      return;
    }
    if (rule.$ref) return visit(value, pointer(schema, rule.$ref), path);
    if (rule.const !== undefined && canonicalJson(value) !== canonicalJson(rule.const)) errors.push(`${path}: const`);
    if (rule.enum && !rule.enum.some(item => canonicalJson(item) === canonicalJson(value))) errors.push(`${path}: enum`);
    if (rule.type) {
      const types = Array.isArray(rule.type) ? rule.type : [rule.type];
      if (!types.some(type => typeMatches(value, type))) {
        errors.push(`${path}: type ${types.join("|")}`);
        return;
      }
    }
    if (rule.allOf) for (const child of rule.allOf) visit(value, child, path);
    if (rule.anyOf && !rule.anyOf.some(child => {
      const before = errors.length;
      visit(value, child, path);
      const valid = errors.length === before;
      errors.splice(before);
      return valid;
    })) errors.push(`${path}: anyOf`);
    if (rule.oneOf) {
      let matches = 0;
      for (const child of rule.oneOf) {
        const before = errors.length;
        visit(value, child, path);
        if (errors.length === before) matches += 1;
        errors.splice(before);
      }
      if (matches !== 1) errors.push(`${path}: oneOf matched ${matches}`);
    }
    if (rule.not) {
      const before = errors.length;
      visit(value, rule.not, path);
      const matched = errors.length === before;
      errors.splice(before);
      if (matched) errors.push(`${path}: not`);
    }
    if (rule.if) {
      const before = errors.length;
      visit(value, rule.if, path);
      const matched = errors.length === before;
      errors.splice(before);
      if (matched && rule.then) visit(value, rule.then, path);
      if (!matched && rule.else) visit(value, rule.else, path);
    }
    if (typeof value === "string") {
      if (rule.minLength !== undefined && value.length < rule.minLength) errors.push(`${path}: minLength`);
      if (rule.maxLength !== undefined && value.length > rule.maxLength) errors.push(`${path}: maxLength`);
      if (rule.pattern && !(new RegExp(rule.pattern, "u")).test(value)) errors.push(`${path}: pattern`);
    }
    if (typeof value === "number") {
      if (rule.minimum !== undefined && value < rule.minimum) errors.push(`${path}: minimum`);
      if (rule.maximum !== undefined && value > rule.maximum) errors.push(`${path}: maximum`);
    }
    if (Array.isArray(value)) {
      if (rule.minItems !== undefined && value.length < rule.minItems) errors.push(`${path}: minItems`);
      if (rule.maxItems !== undefined && value.length > rule.maxItems) errors.push(`${path}: maxItems`);
      if (rule.uniqueItems) {
        const keys = value.map(canonicalJson);
        if (new Set(keys).size !== keys.length) errors.push(`${path}: uniqueItems`);
      }
      if (rule.items) value.forEach((item, index) => visit(item, rule.items, `${path}/${index}`));
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const required of rule.required ?? []) if (!(required in value)) errors.push(`${path}: missing ${required}`);
      for (const [key, child] of Object.entries(rule.properties ?? {})) if (key in value) visit(value[key], child, `${path}/${key}`);
      for (const [pattern, child] of Object.entries(rule.patternProperties ?? {})) {
        for (const [key, item] of Object.entries(value)) if (new RegExp(pattern, "u").test(key)) visit(item, child, `${path}/${key}`);
      }
      const declared = new Set(Object.keys(rule.properties ?? {}));
      for (const [key, item] of Object.entries(value)) {
        const patternMatch = Object.keys(rule.patternProperties ?? {}).some(pattern => new RegExp(pattern, "u").test(key));
        if (declared.has(key) || patternMatch) continue;
        if (rule.additionalProperties === false) errors.push(`${path}: additional property ${key}`);
        else if (rule.additionalProperties && typeof rule.additionalProperties === "object") visit(item, rule.additionalProperties, `${path}/${key}`);
      }
    }
  };
  visit(instance, schema, "#");
  if (errors.length) fail("SCHEMA_VALIDATION_FAILED", errors.sort().join("; "));
  return true;
}

export async function readInputs({ modelPath, schemaPath, baselinePath, generatorPath = fileURLToPath(import.meta.url) }) {
  const [modelBytes, schemaBytes, baselineBytes, generatorBytes] = await Promise.all([
    readFile(modelPath), readFile(schemaPath), readFile(baselinePath), readFile(generatorPath)
  ]);
  const model = parseJsonCompatibleYaml(modelBytes, modelPath);
  const schema = parseJsonCompatibleYaml(schemaBytes, schemaPath);
  const baseline = parseJsonCompatibleYaml(baselineBytes, baselinePath);
  validateJsonSchema(model, schema);
  return {
    model, schema, baseline,
    bytes: { model: modelBytes, schema: schemaBytes, baseline: baselineBytes, generator: generatorBytes },
    hashes: {
      model: sha256(modelBytes), schema: sha256(schemaBytes), baseline: sha256(baselineBytes), generator: sha256(generatorBytes)
    }
  };
}

function artifactPaths(model) {
  const overrides = model.package?.generatedFiles ?? {};
  const paths = Object.fromEntries(GENERATED_ARTIFACTS.map(([key, fallback]) => [key, overrides[key] ?? fallback]));
  const seen = new Set();
  for (const [key, path] of Object.entries(paths)) {
    validateRelativePath(path);
    if (seen.has(path)) fail("DUPLICATE_OUTPUT_PATH", `${key}: ${path}`);
    seen.add(path);
  }
  return paths;
}

export function validateRelativePath(path) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("\\") || path.includes("\0") ||
      path.startsWith("/") || path.endsWith("/") || path.includes("//") ||
      path.split("/").some(part => !part || part === "." || part === "..") || /[\0-\x1f\x7f]/u.test(path) ||
      path.normalize("NFC") !== path) fail("PATH_INVALID", String(path));
}

function generatedHeader(hashes, extension) {
  const values = [
    "GENERATED — DO NOT EDIT",
    `model SHA-256: ${hashes.model}`,
    `schema SHA-256: ${hashes.schema}`,
    `generator SHA-256: ${hashes.generator}`,
    `package: ${PACKAGE_VERSION}`,
    `status: ${CANDIDATE_STATUS}`
  ];
  if (extension === "json") return { generated: values[0], modelSha256: hashes.model, schemaSha256: hashes.schema, generatorSha256: hashes.generator, packageVersion: PACKAGE_VERSION, status: CANDIDATE_STATUS };
  return `<!--\n${values.join("\n")}\n-->\n`;
}

function byId(values) {
  return [...(values ?? [])].sort((a, b) => Buffer.compare(Buffer.from(a.id ?? ""), Buffer.from(b.id ?? "")));
}

function markdownTable(values) {
  const entries = Array.isArray(values) ? values : values && typeof values === "object" ? [values] : [];
  if (!entries.length) return "_None._\n";
  return `${byId(entries).map(value => `### ${value.id}\n\n\`\`\`json\n${JSON.stringify(JSON.parse(canonicalJson(value)), null, 2)}\n\`\`\`\n`).join("\n")}`;
}

function renderContract(title, collections, model, hashes) {
  return `${generatedHeader(hashes, "md")}# ${title}\n\n` + collections.map(collection => `## ${collection}\n\n${markdownTable(model[collection])}`).join("\n");
}

function renderP10Contract(model, hashes) {
  return renderContract("P10 v1.5 Contract", ["privacyRules", "wireDtos", "authenticatedSubjectAuthority"], model, hashes);
}

function selectPhysical(model) {
  return Object.fromEntries(PHYSICAL_COLLECTIONS.map(key => [key, byId(model[key])]));
}

function renderLedger(model, hashes) {
  return `${generatedHeader(hashes, "md")}# F1 migrations69–70 ledger\n\n## migration69Expand\n\n${markdownTable(model.migration69Expand)}\n## codeSwitch\n\n${markdownTable(model.codeSwitch)}\n## migration70Contract\n\n${markdownTable(model.migration70Contract)}`;
}

function renderCatalog(model, hashes) {
  return `${generatedHeader(hashes, "md")}# Closed SQL authority catalog\n\n${PHYSICAL_COLLECTIONS.map(key => `## ${key}\n\n${markdownTable(model[key])}`).join("\n")}`;
}

function renderMatrix(model, hashes) {
  return `${generatedHeader(hashes, "md")}# Rollout and upgrade matrix\n\n## Compatibility\n\n${markdownTable(model.compatibilityMatrix)}\n## Upgrade paths\n\n${markdownTable(model.upgradeMatrix)}`;
}

function renderChecklist(model, hashes) {
  const tests = byId(model.tests);
  return `${generatedHeader(hashes, "md")}# v1.5 authority review checklist\n\n- [ ] Schema validation passes.\n- [ ] Generator reproducibility passes.\n- [ ] Manifest envelope is externally authenticated.\n- [ ] Semantic verifier passes every prompt §101 rule.\n- [ ] Contract/architecture/rollout independent review has no Blocker or High.\n- [ ] Security/privacy/database independent review has no Blocker or High.\n\n## Model-defined tests\n\n${tests.map(item => `- [ ] \`${item.id}\`${item.description ? ` — ${item.description}` : ""}`).join("\n")}\n`;
}

function jsonArtifact(data, hashes) {
  return prettyCanonicalJson({ header: generatedHeader(hashes, "json"), ...data });
}

export function generateArtifacts(input) {
  const { model, baseline, hashes } = input;
  if (model.package?.version !== PACKAGE_VERSION) fail("PACKAGE_VERSION_MISMATCH", model.package?.version);
  if (model.package?.status !== CANDIDATE_STATUS) fail("PACKAGE_STATUS_MISMATCH", model.package?.status);
  const paths = artifactPaths(model);
  const artifacts = new Map();
  const titles = {
    p02Contract: "P02 resource authority clarification",
    p04Contract: "P04 fact-to-Audit erratum",
    p05P08Contract: "P05/P08 joint erratum",
    p09Contract: "P09 v1.5 Contract",
    p10Contract: "P10 v1.5 Contract"
  };
  for (const [key, collections] of Object.entries(CONTRACT_SECTIONS)) {
    artifacts.set(paths[key], key === "p10Contract" ? renderP10Contract(model, hashes) : renderContract(titles[key], collections, model, hashes));
  }
  artifacts.set(paths.migrationLedger, renderLedger(model, hashes));
  artifacts.set(paths.sqlCatalog, renderCatalog(model, hashes));
  artifacts.set(paths.physicalInventory, jsonArtifact({ baselineSha256: hashes.baseline, baselineObjects: byId(model.baselineObjects), objects: selectPhysical(model) }, hashes));
  artifacts.set(paths.wireRegistry, jsonArtifact({ wireDtos: byId(model.wireDtos), jobDescriptors: byId(model.jobDescriptors), payloadSchemas: byId(model.payloadSchemas) }, hashes));
  artifacts.set(paths.actionRegistry, jsonArtifact({ permissions: byId(model.permissions), actions: byId(model.actions), results: byId(model.results), reasons: byId(model.reasons) }, hashes));
  artifacts.set(paths.rolloutMatrix, renderMatrix(model, hashes));
  artifacts.set(paths.reviewChecklist, renderChecklist(model, hashes));

  const generatedRecords = [...artifacts].sort(([a], [b]) => Buffer.compare(Buffer.from(a), Buffer.from(b))).map(([path, text]) => ({ path, sha256: sha256(Buffer.from(text)), bytes: Buffer.byteLength(text), lfLines: [...text].filter(char => char === "\n").length }));
  const declaredStatic = [...(model.package?.manifestStaticMembers ?? [])].sort();
  for (const path of declaredStatic) validateRelativePath(path);
  if (new Set(declaredStatic).size !== declaredStatic.length) fail("DUPLICATE_STATIC_MEMBER");
  for (const path of declaredStatic) if (artifacts.has(path)) fail("STATIC_GENERATED_MEMBER_COLLISION", path);
  artifacts.set(paths.manifestStaging, jsonArtifact({ modelSha256: hashes.model, schemaSha256: hashes.schema, baselineSha256: hashes.baseline, generatorSha256: hashes.generator, generatedMembers: generatedRecords, staticMembers: declaredStatic }, hashes));
  return { artifacts, paths, baseline, staticMembers: declaredStatic };
}

async function writeAtomic(path, text) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, text, { encoding: "utf8", flag: "wx", mode: 0o644 });
  await rename(temporary, path).catch(async error => { await rm(temporary, { force: true }); throw error; });
}

export async function writeArtifacts(outputRoot, generated, { verifyOnly = false } = {}) {
  const root = resolve(outputRoot);
  await mkdir(root, { recursive: true });
  const expected = new Set([...generated.artifacts.keys(), ...(generated.staticMembers ?? [])]);
  const actual = await readdir(root, { recursive: true, withFileTypes: true });
  for (const entry of actual) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath ?? entry.path, entry.name);
    const rel = relative(root, full).split(sep).join("/");
    if (!expected.has(rel)) fail("EXTRA_OUTPUT_MEMBER", rel);
  }
  for (const [path, text] of generated.artifacts) {
    const absolute = join(root, ...path.split("/"));
    if (verifyOnly) {
      const info = await lstat(absolute).catch(() => fail("GENERATED_MEMBER_MISSING", path));
      if (!info.isFile() || info.isSymbolicLink()) fail("GENERATED_MEMBER_INVALID", path);
      const actualBytes = await readFile(absolute);
      if (!actualBytes.equals(Buffer.from(text))) fail("GENERATED_MEMBER_DRIFT", path);
    } else await writeAtomic(absolute, text);
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
  return { modelPath: resolve(values.model), schemaPath: resolve(values.schema), baselinePath: resolve(values.baseline), outputRoot: resolve(values.output), verifyOnly: values.mode === "verify" };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const input = await readInputs(args);
  const generated = generateArtifacts(input);
  await writeArtifacts(args.outputRoot, generated, { verifyOnly: args.verifyOnly });
  const summary = { ok: true, mode: args.verifyOnly ? "verify" : "generate", packageVersion: PACKAGE_VERSION, status: CANDIDATE_STATUS, generatedCount: generated.artifacts.size, hashes: input.hashes };
  process.stdout.write(`${canonicalJson(summary)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => {
    const code = error instanceof F1V15Error ? error.code : "UNEXPECTED_ERROR";
    process.stderr.write(`${code}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
