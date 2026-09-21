#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, realpath, rename, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const INVENTORY_SCHEMA = "vanstro.f1-v1.5-baseline-physical-inventory.v1";
const OUTPUT_NAME = "baseline-physical-inventory.json";
const EXPECTED_MIGRATIONS = 68;
const SHA256 = /^[0-9a-f]{64}$/;

class ExtractorError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const byteSort = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const sorted = values => [...values].sort((left, right) => byteSort(JSON.stringify(left), JSON.stringify(right)));
const compact = value => value.replace(/\s+/g, " ").trim();
const unquote = value => value.replace(/^"|"$/g, "");

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new ExtractorError("USAGE", "arguments must be --key value pairs");
    values[key.slice(2)] = value;
  }
  const inferredRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const root = resolve(values.root ?? inferredRoot);
  const output = values.output ? resolve(values.output) : undefined;
  if (values.root && !isAbsolute(values.root)) throw new ExtractorError("USAGE", "--root must be absolute");
  if (values.output && !isAbsolute(values.output)) throw new ExtractorError("USAGE", "--output must be absolute");
  if (Object.keys(values).some(key => !["root", "output"].includes(key))) throw new ExtractorError("USAGE", "unknown argument");
  return { root, output };
}

async function loadSource(root, path) {
  const absolute = join(root, ...path.split("/"));
  const rootReal = await realpath(root), fileReal = await realpath(absolute).catch(() => { throw new ExtractorError("SOURCE_MISSING", path); });
  const escaped = relative(rootReal, fileReal);
  if (!escaped || escaped === ".." || escaped.startsWith(`..${sep}`) || isAbsolute(escaped)) throw new ExtractorError("SOURCE_OUTSIDE_ROOT", path);
  const bytes = await readFile(fileReal);
  if (bytes.includes(0x0d)) throw new ExtractorError("SOURCE_CR_REJECTED", path);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text).equals(bytes)) throw new ExtractorError("SOURCE_UTF8_INVALID", path);
  return { path, text, lines: text.split("\n"), sha256: sha256(bytes) };
}

function provenance(source, startLine, endLine = startLine) {
  return { sourcePath: source.path, startLine, endLine, sourceSha256: source.sha256 };
}

function lineForOffset(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (text.charCodeAt(index) === 10) line += 1;
  return line;
}

function factsFromRegex(source, regex, map) {
  const facts = [];
  for (const match of source.text.matchAll(regex)) {
    const startLine = lineForOffset(source.text, match.index ?? 0);
    const endLine = startLine + match[0].split("\n").length - 1;
    facts.push({ ...map(match), provenance: provenance(source, startLine, endLine) });
  }
  return facts;
}

function splitSqlItems(body) {
  const items = [];
  let start = 0, depth = 0, single = false, double = false;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index], next = body[index + 1];
    if (single) { if (char === "'" && next === "'") index += 1; else if (char === "'") single = false; continue; }
    if (double) { if (char === '"' && next === '"') index += 1; else if (char === '"') double = false; continue; }
    if (char === "'") single = true;
    else if (char === '"') double = true;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) { items.push({ text: body.slice(start, index).trim(), offset: start }); start = index + 1; }
  }
  const final = body.slice(start).trim();
  if (final) items.push({ text: final, offset: start });
  return items;
}

function normalizeArgs(raw) {
  return splitSqlItems(raw).map(item => compact(item.text).replace(/\s+DEFAULT\s+.+$/i, "")).join(", ");
}

function parseMigration(source, migration) {
  const out = { tables: [], columns: [], constraints: [], indexes: [], functions: [], owners: [], security: [], searchPaths: [], triggers: [], roles: [], grants: [], statusChecks: [], oldOverloads: [] };
  for (const match of source.text.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:public\.)?"?[A-Za-z_][\w$]*"?)\s*\(([\s\S]*?)\n\);/gi)) {
    const table = unquote(match[1].replace(/^public\./, "")), startLine = lineForOffset(source.text, match.index ?? 0);
    out.tables.push({ name: table, migration, provenance: provenance(source, startLine, startLine + match[0].split("\n").length - 1) });
    const bodyOffset = (match.index ?? 0) + match[0].indexOf(match[2]);
    for (const item of splitSqlItems(match[2])) {
      const line = lineForOffset(source.text, bodyOffset + item.offset), text = compact(item.text);
      const constraint = text.match(/^(?:CONSTRAINT\s+"?([^"\s]+)"?\s+)?(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)\s*(.*)$/i);
      if (constraint) {
        const fact = { table, name: constraint[1] ?? null, kind: compact(constraint[2]).toLowerCase().replaceAll(" ", "_"), definition: text, migration, provenance: provenance(source, line) };
        out.constraints.push(fact);
        if (/\bstatus\b/i.test(text) && /\bCHECK\b/i.test(text)) out.statusChecks.push(fact);
        continue;
      }
      const column = text.match(/^"?([A-Za-z_][\w$]*)"?\s+([^\s,]+(?:\s*\([^)]*\))?)([\s\S]*)$/);
      if (column) out.columns.push({ table, name: column[1], dataType: compact(column[2]), modifiers: compact(column[3]), migration, provenance: provenance(source, line) });
    }
  }
  out.indexes.push(...factsFromRegex(source, /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([^"\s]+)"?\s+ON\s+(?:public\.)?"?([^"\s(]+)"?\s*([\s\S]*?);/gi, match => ({ name: match[2], table: match[3], unique: Boolean(match[1]), definition: compact(match[0]), migration })));
  out.functions.push(...factsFromRegex(source, /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+((?:public\.)?"?[A-Za-z_][\w$]*"?)\s*\(([\s\S]*?)\)\s*RETURNS\s+([\s\S]*?)(?=\bLANGUAGE\b)([\s\S]*?)(?:\$\$|;)/gi, match => {
    const name = unquote(match[1].replace(/^public\./, "")), argumentsText = normalizeArgs(match[2]), attributes = compact(match[4]);
    return { name, signature: `${name}(${argumentsText})`, arguments: argumentsText, returns: compact(match[3]), securityDefiner: /SECURITY\s+DEFINER/i.test(attributes), searchPath: attributes.match(/SET\s+search_path\s*=\s*([^;]+)/i)?.[1]?.trim() ?? null, migration };
  }));
  out.oldOverloads.push(...factsFromRegex(source, /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?((?:public\.)?"?[A-Za-z_][\w$]*"?)\s*\(([^;]*)\)\s*;/gi, match => { const name = unquote(match[1].replace(/^public\./, "")), argumentsText = normalizeArgs(match[2]); return { name, signature: `${name}(${argumentsText})`, disposition: "dropped_by_source_migration", migration }; }));
  out.owners.push(...factsFromRegex(source, /ALTER\s+(TABLE|FUNCTION|SEQUENCE|VIEW)\s+([^;]+?)\s+OWNER\s+TO\s+"?([^";\s]+)"?\s*;/gi, match => ({ objectType: match[1].toLowerCase(), objectIdentity: compact(match[2]), owner: match[3], migration })));
  out.security.push(...factsFromRegex(source, /ALTER\s+FUNCTION\s+([^;]+?)\s+(SECURITY\s+DEFINER|SECURITY\s+INVOKER)\s*;/gi, match => ({ functionIdentity: compact(match[1]), mode: compact(match[2]).toLowerCase().replace(" ", "_"), migration })));
  out.searchPaths.push(...factsFromRegex(source, /ALTER\s+FUNCTION\s+([^;]+?)\s+SET\s+search_path\s*=\s*([^;]+);/gi, match => ({ functionIdentity: compact(match[1]), searchPath: compact(match[2]), migration })));
  for (const fn of out.functions) {
    if (fn.securityDefiner) out.security.push({ functionIdentity: fn.signature, mode: "security_definer", migration, provenance: fn.provenance });
    if (fn.searchPath) out.searchPaths.push({ functionIdentity: fn.signature, searchPath: fn.searchPath, migration, provenance: fn.provenance });
  }
  out.triggers.push(...factsFromRegex(source, /CREATE\s+(?:CONSTRAINT\s+)?TRIGGER\s+"?([^"\s]+)"?([\s\S]*?)\bON\s+(?:public\.)?"?([^"\s]+)"?([\s\S]*?);/gi, match => ({ name: match[1], table: match[3], definition: compact(match[0]), migration })));
  out.roles.push(...factsFromRegex(source, /CREATE\s+ROLE\s+"?([^"\s;]+)"?([^;]*);/gi, match => ({ name: match[1], attributes: compact(match[2]), migration })));
  out.grants.push(...factsFromRegex(source, /(GRANT|REVOKE)\s+([\s\S]*?)\s+(?:TO|FROM)\s+([^;]+);/gi, match => ({ operation: match[1].toLowerCase(), statement: compact(match[0]), principals: compact(match[3]), migration })));
  return out;
}

function parsePrisma(source) {
  const tables = [], columns = [], constraints = [], indexes = [];
  for (const match of source.text.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const model = match[1], body = match[2], mapped = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? model;
    const startLine = lineForOffset(source.text, match.index ?? 0);
    tables.push({ name: mapped, prismaModel: model, provenance: provenance(source, startLine, startLine + match[0].split("\n").length - 1) });
    const bodyStart = (match.index ?? 0) + match[0].indexOf(body);
    for (const line of body.split("\n").map((text, index) => ({ text: text.trim(), index }))) {
      if (!line.text || line.text.startsWith("//")) continue;
      const at = lineForOffset(source.text, bodyStart) + line.index;
      const field = line.text.match(/^(\w+)\s+([\w\[\]?]+)(.*)$/);
      if (field && !field[1].startsWith("@@")) columns.push({ table: mapped, prismaModel: model, name: field[1], prismaType: field[2], attributes: compact(field[3]), provenance: provenance(source, at) });
      const index = line.text.match(/^@@(index|unique|id)\((.*)\)(?:\s*)$/);
      if (index) indexes.push({ table: mapped, kind: index[1], definition: line.text, provenance: provenance(source, at) });
    }
  }
  return { tables, columns, constraints, indexes };
}

function anchoredFacts(source, responsibility, anchors) {
  const facts = [];
  for (const anchor of anchors) {
    const index = source.lines.findIndex(line => line.includes(anchor.text));
    if (index < 0) throw new ExtractorError("ANCHOR_MISSING", `${source.path}: ${anchor.text}`);
    facts.push({ responsibility, representation: anchor.representation, exactText: compact(source.lines[index]), provenance: provenance(source, index + 1) });
  }
  return facts;
}

async function buildInventory(root) {
  const migrationRoot = join(root, "packages/db/prisma/migrations");
  const migrationNames = (await readdir(migrationRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort(byteSort);
  if (migrationNames.length !== EXPECTED_MIGRATIONS) throw new ExtractorError("MIGRATION_COUNT_MISMATCH", `expected ${EXPECTED_MIGRATIONS}, found ${migrationNames.length}`);
  const all = { tables: [], columns: [], constraints: [], indexes: [], functions: [], owners: [], security: [], searchPaths: [], triggers: [], roles: [], grants: [], statusChecks: [], oldOverloads: [] };
  const sources = [];
  for (const migration of migrationNames) {
    const source = await loadSource(root, `packages/db/prisma/migrations/${migration}/migration.sql`);
    sources.push({ path: source.path, sha256: source.sha256 });
    const parsed = parseMigration(source, migration);
    for (const key of Object.keys(all)) all[key].push(...parsed[key]);
  }
  const schema = await loadSource(root, "packages/db/prisma/schema.prisma");
  sources.push({ path: schema.path, sha256: schema.sha256 });
  const prisma = parsePrisma(schema);
  all.tables.push(...prisma.tables); all.columns.push(...prisma.columns); all.constraints.push(...prisma.constraints); all.indexes.push(...prisma.indexes);

  const producer = await loadSource(root, "apps/api/src/dashboard/data-jobs.ts");
  const validator = await loadSource(root, "packages/db/src/async-jobs.ts");
  const worker = await loadSource(root, "apps/worker/src/data-job-dispatcher.ts");
  const safeDto = await loadSource(root, "src/lib/dashboard/p08-data-jobs.ts");
  const p09Routes = await loadSource(root, "apps/api/src/dashboard/runtime-foundation.ts");
  const p10Routes = await loadSource(root, "apps/api/src/dashboard/analytics-foundation.ts");
  for (const source of [producer, validator, worker, safeDto, p09Routes, p10Routes]) sources.push({ path: source.path, sha256: source.sha256 });

  const wirePayloads = [
    ...anchoredFacts(producer, "P08 import commit producer payload", [{ text: 'payload: { importId: batch.id', representation: "mode + expectedVersion + scopeFingerprint" }]),
    ...anchoredFacts(producer, "P08 export producer payload", [{ text: 'payload: { exportId, scopeFingerprint', representation: "querySnapshotHash + formulaVersion; no expectedVersion/totalRows" }]),
    ...anchoredFacts(validator, "P08 job payload validator", [{ text: '"dashboard.import.commit":["commitMode"', representation: "commitMode + expectedVersion + importId + scopeFingerprint" }, { text: '"dashboard.export.generate":["exportId"', representation: "exportId + formulaVersion + querySnapshotRef + scopeFingerprint" }]),
    ...anchoredFacts(worker, "P08 Worker payload consumer", [{ text: 'claim.payload.commitMode', representation: "commitMode + totalRows" }, { text: 'claim.payload.totalRows', representation: "totalRows required by commit/export execution" }]),
    ...anchoredFacts(p10Routes, "P10 event ingestion wire", [{ text: 'r.post("/dashboard/analytics/foundation/events"', representation: "eventName/schemaVersion/timestamps/resource/category/value/occurrence/sequence/consent" }])
  ];
  const safeDtos = [
    ...anchoredFacts(producer, "P08 API safe projection", [{ text: "function safeImport", representation: "API import snake_case projection" }, { text: "function safeExport", representation: "API export snake_case projection" }]),
    ...anchoredFacts(safeDto, "P08 Frontend safe DTO", [{ text: "export type ImportBatch", representation: "strict ImportBatch DTO" }, { text: "export type ExportRequest", representation: "strict ExportRequest DTO" }, { text: "function importBatch", representation: "strict ImportBatch runtime validator" }, { text: "function exportRequest", representation: "strict ExportRequest runtime validator" }]),
    ...anchoredFacts(p09Routes, "P09 API safe projection", [{ text: "function safeRow", representation: "removes idempotencyKeyHash/requestHash/createdBy" }, { text: "descriptorState", representation: "protected descriptor state without secret values" }]),
    ...anchoredFacts(p10Routes, "P10 API safe projection", [{ text: 'r.get("/dashboard/analytics/foundation/events"', representation: "event list projection" }, { text: 'r.get("/dashboard/analytics/foundation/metrics/:key"', representation: "metric projection with suppression flag" }])
  ];

  const active = new Map();
  for (const fn of all.functions) active.set(fn.signature, fn);
  for (const dropped of all.oldOverloads) active.delete(dropped.signature);
  const oldOverloads = all.oldOverloads.map(item => ({ ...item, presentAfterMigration68: active.has(item.signature) }));

  const unknownRequiresOwnedProbe = [
    { fact: "effective PostgreSQL catalog owner for every table, sequence, function, and trigger after migrations 1-68", reason: "conditional role creation and environment-owned migration execution cannot be proven from source", requiredProbe: "owned PostgreSQL 16 pg_class/pg_proc/pg_trigger catalog query after fresh 0→68" },
    { fact: "effective role memberships and inherited privileges", reason: "role membership may pre-exist outside migration source", requiredProbe: "owned PostgreSQL 16 pg_auth_members and has_*_privilege matrix" },
    { fact: "absence of undeclared or stale function overloads in an upgraded database", reason: "source DROP statements do not prove the starting catalog had no additional overload", requiredProbe: "owned PostgreSQL 16 pg_proc identity-arguments diff for fresh 0→68 and every supported upgrade path" },
    { fact: "runtime table/function privileges including PUBLIC after all conditional branches", reason: "static GRANT/REVOKE statements do not evaluate conditional DDL or inherited grants", requiredProbe: "owned PostgreSQL 16 information_schema.role_*_grants plus has_function_privilege attack matrix" },
    { fact: "deployed database matches source migration checksums 1-68", reason: "this extractor is source-only and performs no database connection", requiredProbe: "owned database _prisma_migrations checksum reconciliation" }
  ];

  const inventory = {
    schemaVersion: INVENTORY_SCHEMA,
    extractionPolicy: { sourceOnly: true, migrationRange: { first: migrationNames[0], last: migrationNames.at(-1), count: migrationNames.length }, generatedInventoryPath: OUTPUT_NAME, unknownMarker: "unknown_requires_owned_probe" },
    sources: sorted(sources),
    tables: sorted(all.tables), columns: sorted(all.columns), constraints: sorted(all.constraints), indexes: sorted(all.indexes),
    functions: sorted(all.functions), owners: sorted(all.owners), security: sorted(all.security), searchPaths: sorted(all.searchPaths),
    triggers: sorted(all.triggers), roles: sorted(all.roles), grants: sorted(all.grants), statusChecks: sorted(all.statusChecks),
    oldOverloads: sorted(oldOverloads), wirePayloads: sorted(wirePayloads), safeDtos: sorted(safeDtos),
    unknown_requires_owned_probe: sorted(unknownRequiresOwnedProbe)
  };
  return inventory;
}

async function writeAtomic(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, bytes, { flag: "wx", mode: 0o644 });
  await rename(temporary, path);
}

async function main() {
  const { root, output } = parseArgs(process.argv.slice(2));
  const inventory = await buildInventory(root);
  const bytes = Buffer.from(`${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  if (output) await writeAtomic(output, bytes);
  else process.stdout.write(bytes);
  process.stderr.write(`${JSON.stringify({ ok: true, schemaVersion: INVENTORY_SCHEMA, sha256: sha256(bytes), bytes: bytes.length, output: output ?? "stdout" })}\n`);
}

main().catch(error => {
  const code = error instanceof ExtractorError ? error.code : "UNEXPECTED_ERROR";
  process.stderr.write(`${code}: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
