import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packaged = import.meta.url.includes("/tooling/");
const root = packaged
  ? process.env.VANSTRO_F1_REPOSITORY_ROOT
  : resolve(fileURLToPath(new URL("..", import.meta.url)));
if (!root) throw new Error("VANSTRO_F1_REPOSITORY_ROOT is required for packaged baseline tests");
const script = packaged
  ? fileURLToPath(new URL("./f1-v15-extract-baseline.mjs", import.meta.url))
  : join(root, "qa/scripts/f1-v15-extract-baseline.mjs");

function run(...args) {
  return spawnSync(process.execPath, [script, "--root", root, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function inventory(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("extracts deterministic migration 1-68 physical inventory", () => {
  const first = run(), second = run();
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const value = inventory(first);
  assert.equal(value.schemaVersion, "vanstro.f1-v1.5-baseline-physical-inventory.v1");
  assert.equal(value.extractionPolicy.sourceOnly, true);
  assert.equal(value.extractionPolicy.migrationRange.count, 68);
  assert.match(value.extractionPolicy.migrationRange.last, /dashboard_p10_audit_atomicity$/);
  for (const key of ["tables", "columns", "constraints", "indexes", "functions", "owners", "security", "searchPaths", "triggers", "roles", "grants", "statusChecks", "oldOverloads", "wirePayloads", "safeDtos", "unknown_requires_owned_probe"]) assert.ok(Array.isArray(value[key]), key);
  assert.ok(value.tables.some(row => row.name === "dashboard_import_batch"));
  assert.ok(value.tables.some(row => row.name === "runtime_config_version"));
  assert.ok(value.tables.some(row => row.name === "analytics_foundation_event"));
  assert.ok(value.functions.some(row => row.name === "p10_ingest_event_v2"));
  assert.ok(value.security.some(row => row.mode === "security_definer"));
  assert.ok(value.searchPaths.length > 0);
  assert.ok(value.statusChecks.some(row => row.table === "dashboard_import_batch"));
});

test("every source-derived fact has path line and hash provenance", () => {
  const value = inventory(run());
  assert.ok(value.sources.length >= 75);
  for (const source of value.sources) {
    assert.match(source.sha256, /^[0-9a-f]{64}$/);
    assert.ok(!source.path.startsWith("/"));
  }
  for (const collection of ["tables", "columns", "constraints", "indexes", "functions", "owners", "security", "searchPaths", "triggers", "roles", "grants", "statusChecks", "oldOverloads", "wirePayloads", "safeDtos"]) {
    for (const fact of value[collection]) {
      assert.equal(typeof fact.provenance.sourcePath, "string", `${collection} path`);
      assert.ok(Number.isInteger(fact.provenance.startLine) && fact.provenance.startLine >= 1, `${collection} line`);
      assert.ok(Number.isInteger(fact.provenance.endLine) && fact.provenance.endLine >= fact.provenance.startLine, `${collection} end line`);
      assert.match(fact.provenance.sourceSha256, /^[0-9a-f]{64}$/, `${collection} hash`);
    }
  }
});

test("records current producer validator worker and DTO seams without resolving them", () => {
  const value = inventory(run());
  const payloads = value.wirePayloads.map(row => `${row.responsibility}: ${row.representation}`).join("\n");
  assert.match(payloads, /import commit producer payload: mode/);
  assert.match(payloads, /job payload validator: commitMode/);
  assert.match(payloads, /Worker payload consumer: commitMode \+ totalRows/);
  assert.match(payloads, /export producer payload: querySnapshotHash/);
  assert.match(payloads, /job payload validator: exportId \+ formulaVersion \+ querySnapshotRef/);
  const dtos = value.safeDtos.map(row => row.responsibility);
  assert.ok(dtos.includes("P08 API safe projection"));
  assert.ok(dtos.includes("P08 Frontend safe DTO"));
  assert.ok(dtos.includes("P09 API safe projection"));
  assert.ok(dtos.includes("P10 API safe projection"));
});

test("marks catalog-dependent facts unknown_requires_owned_probe", () => {
  const value = inventory(run());
  assert.ok(value.unknown_requires_owned_probe.length >= 5);
  for (const fact of value.unknown_requires_owned_probe) {
    assert.equal(typeof fact.fact, "string");
    assert.equal(typeof fact.reason, "string");
    assert.match(fact.requiredProbe, /owned PostgreSQL|owned database/);
  }
  assert.ok(value.unknown_requires_owned_probe.some(row => /overloads/.test(row.fact)));
  assert.ok(value.unknown_requires_owned_probe.some(row => /privileges/.test(row.fact)));
});

test("writes only the explicitly requested package output", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vanstro-f1-v15-"));
  const output = join(directory, "v1.5-package", "baseline-physical-inventory.json");
  try {
    const result = run("--output", output);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    const written = JSON.parse(await readFile(output, "utf8"));
    assert.equal(written.schemaVersion, "vanstro.f1-v1.5-baseline-physical-inventory.v1");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("fails closed outside a complete 68-migration repository", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vanstro-f1-v15-bad-root-"));
  try {
    const result = spawnSync(process.execPath, [script, "--root", directory], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /MIGRATION_COUNT_MISMATCH|ENOENT/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
