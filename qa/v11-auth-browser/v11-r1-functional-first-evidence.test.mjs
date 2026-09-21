#!/usr/bin/env node
// V11-R1 Functional-First F0 — focused, DB-free tests for the run-identity /
// evidence-schema / no-op extraction / path-verdict / summary contract
// implemented in v11-r1-functional-first-evidence.mjs.
//
// Run (from the repo root):
//   node --test qa/v11-auth-browser/v11-r1-functional-first-evidence.test.mjs
//
// No database, docker container or product code is touched; the drill script
// itself is never executed here.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  F0_SCHEMA_VERSION,
  F0_EXPECTED_TOTAL,
  NOOP_PATTERNS,
  readJson,
  extractNoop,
  assemblePath,
  buildSummary,
} from "./v11-r1-functional-first-evidence.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const helperPath = join(repoRoot, "qa/v11-auth-browser/v11-r1-functional-first-evidence.mjs");
const tmp = (name) => {
  const dir = join(tmpdir(), `f0-evidence-test-${process.pid}-${name}-${randomBytes(3).toString("hex")}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

const FULL_IDENTITY = {
  schemaVersion: F0_SCHEMA_VERSION,
  runId: "20260811T120000Z-ab12cd34",
  generatedAt: "2026-08-11T12:00:00Z",
  testedCandidateKind: "working-tree",
  testedCommit: "ccddebdbabe470ea39aad6f29da2ebd3f313dda5",
  testedTree: "31f85bdba8870c0942c2e5468a33709827794e04",
  baseHead: "ccddebdbabe470ea39aad6f29da2ebd3f313dda5",
  baseTree: "31f85bdba8870c0942c2e5468a33709827794e04",
  migration69Sha: "07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051",
  migration70Sha: "93e3657383c8d1f9ae023cdcd1344a33cf49090444dcbbcdabe2ab3e0d525288",
  candidateManifestSha: "ab".repeat(32),
  harnessSha: "98c981d15a6c269684cecceb64a16c969cc5a56d2464fd36b93e193f6e68ff8e",
  conformanceSha: "9121bc6bc09c8d08cb333cc4045b99103ff440e628a75c01a3295861f979d479",
  postgresImage: "postgres:16-bookworm",
  postgresImageId: "unknown",
  prismaVersion: "Prisma schema loaded from prisma/schema.prisma",
  runnerRoleAttributes: "vanstro_migrator:LOGIN,NOINHERIT,NOSUPERUSER;vanstro_deployment_owner:LOGIN,SUPERUSER;deploys M59-bearing segments as migrator;deploys 70-81 + no-op as deployment owner;fixture=disposable superuser only",
};

const SUCCESS_PATH = {
  schemaVersion: F0_SCHEMA_VERSION,
  runId: "20260811T120000Z-ab12cd34",
  path: "fresh",
  container: "vanstro-v11-f0-fresh-pg",
  database: "vanstro_f0_fresh",
  expectedTotal: 81,
  verdict: "SUCCESS",
  aborted: null,
  ledger: { applied: 81, unresolvedFailed: 0, rolledBack: 0 },
  deployRcs: { "deploy-1-69": 0, "deploy-70-81": 0, "deploy-noop": 0 },
  noop: { text: "No pending migrations to apply.", boundedLog: "fresh-noop.log" },
  fixture: { rolloutId: "rollout-fresh-f0", manifestDigest: "d".repeat(64), consumed: 1, telemetryRows: 31 },
  migration69Sha: FULL_IDENTITY.migration69Sha,
  migration70Sha: FULL_IDENTITY.migration70Sha,
  firstFailure: null,
  failures: [],
  identity: FULL_IDENTITY,
  segments: [],
  assertions: {},
  facts: {},
};

test("F0 schema version and expected total are stable", () => {
  assert.equal(F0_SCHEMA_VERSION, "v11-r1-functional-first-run-2");
  assert.equal(F0_EXPECTED_TOTAL, 83);
});

test("run-id / validate-run-id via CLI", () => {
  const out = spawnSync(process.execPath, [helperPath, "run-id"], { encoding: "utf8" });
  assert.equal(out.status, 0);
  assert.match(out.stdout.trim(), /^\d{8}T\d{6}Z-[0-9a-f]{8}$/);
  const bad = spawnSync(process.execPath, [helperPath, "validate-run-id", "not valid!"], { encoding: "utf8" });
  assert.notEqual(bad.status, 0);
});

test("identity via CLI accepts all canonical fields", () => {
  const args = ["identity"];
  for (const [k, v] of Object.entries(FULL_IDENTITY)) args.push(`${k}=${v}`);
  const out = spawnSync(process.execPath, [helperPath, ...args], { encoding: "utf8" });
  assert.equal(out.status, 0);
  const parsed = JSON.parse(out.stdout);
  assert.equal(parsed.schemaVersion, F0_SCHEMA_VERSION);
  assert.equal(parsed.runId, FULL_IDENTITY.runId);
  assert.equal(parsed.migration69Sha, FULL_IDENTITY.migration69Sha);
});

test("no-op extraction matches the prisma no-op line only", () => {
  const log = [
    "Prisma schema loaded from prisma/schema.prisma",
    'Datasource "db": PostgreSQL database "vanstro_f0_fresh" at "127.0.0.1:54321"',
    "",
    "No pending migrations to apply.",
    "",
  ].join("\n");
  assert.deepEqual(extractNoop(log), { text: "No pending migrations to apply.", line: "No pending migrations to apply." });
  assert.deepEqual(extractNoop("Prisma schema loaded\nAll migrations have been successfully applied.\n"), {
    text: "",
    line: "",
  });
  assert.equal(NOOP_PATTERNS.length, 2);
});

test("assemble-path: SUCCESS requires all assertions, ledger 81/0/0 and no failures", () => {
  const dir = tmp("assemble-ok");
  const logs = join(dir, "logs");
  mkdirSync(logs, { recursive: true });
  const facts = [
    { key: "ledger.applied", value: "81" },
    { key: "ledger.unresolvedFailed", value: "0" },
    { key: "ledger.rolledBack", value: "0" },
    { key: "assert:ledger.applied", value: { expected: "81", actual: "81", pass: true } },
    { key: "assert:ledger.unresolvedFailed", value: { expected: "0", actual: "0", pass: true } },
    { key: "assert:ledger.rolledBack", value: { expected: "0", actual: "0", pass: true } },
    { key: "deploy-70-81.rc", value: "0" },
    { key: "deploy-70-81.applied", value: "81" },
    { key: "deploy-noop.rc", value: "0" },
    { key: "deploy-noop.applied", value: "81" },
    { key: "noop.text", value: "No pending migrations to apply." },
    { key: "noop.boundedLog", value: "fresh-noop.log" },
    { key: "fixture.rolloutId", value: "rollout-fresh-f0" },
    { key: "fixture.manifestDigest", value: "d".repeat(64) },
    { key: "fixture.consumed", value: "1" },
    { key: "fixture.telemetryRows", value: "31" },
    { key: "migration69Sha", value: FULL_IDENTITY.migration69Sha },
    { key: "migration70Sha", value: FULL_IDENTITY.migration70Sha },
  ];
  writeFileSync(join(logs, "fresh-facts.jsonl"), facts.map((f) => JSON.stringify(f)).join("\n") + "\n");
  writeFileSync(join(logs, "fresh-segments.jsonl"), "");
  writeFileSync(join(logs, "fresh-failures.jsonl"), "");
  const identityFile = join(dir, "identity.json");
  writeFileSync(identityFile, JSON.stringify(FULL_IDENTITY));
  assemblePath({ out: dir, logs, tag: "fresh", container: "c", db: "d", rc: "0", identityFile, expectedTotal: 81 });
  const doc = readJson(join(dir, "fresh.json"));
  assert.equal(doc.verdict, "SUCCESS");
  assert.equal(doc.ledger.applied, 81);
  assert.deepEqual(doc.deployRcs, { "deploy-70-81": 0, "deploy-noop": 0 });
  assert.equal(doc.noop.text, "No pending migrations to apply.");
  assert.equal(doc.fixture.consumed, 1);
  rmSync(dir, { recursive: true, force: true });
});

test("assemble-path: FAIL on ledger drift even with rc=0", () => {
  const dir = tmp("assemble-fail");
  const logs = join(dir, "logs");
  mkdirSync(logs, { recursive: true });
  const facts = [
    { key: "ledger.applied", value: "80" },
    { key: "ledger.unresolvedFailed", value: "1" },
    { key: "ledger.rolledBack", value: "0" },
    { key: "assert:ledger.applied", value: { expected: "81", actual: "80", pass: false } },
    { key: "assert:ledger.unresolvedFailed", value: { expected: "0", actual: "1", pass: false } },
    { key: "assert:ledger.rolledBack", value: { expected: "0", actual: "0", pass: true } },
    { key: "deploy-70-81.rc", value: "0" },
    { key: "deploy-70-81.applied", value: "80" },
    { key: "deploy-noop.rc", value: "0" },
    { key: "deploy-noop.applied", value: "80" },
    { key: "noop.text", value: "No pending migrations to apply." },
    { key: "fixture.consumed", value: "1" },
    { key: "migration69Sha", value: "x" },
    { key: "migration70Sha", value: "y" },
  ];
  writeFileSync(join(logs, "fresh-facts.jsonl"), facts.map((f) => JSON.stringify(f)).join("\n") + "\n");
  writeFileSync(join(logs, "fresh-segments.jsonl"), "");
  writeFileSync(join(logs, "fresh-failures.jsonl"), "");
  const identityFile = join(dir, "identity.json");
  writeFileSync(identityFile, JSON.stringify(FULL_IDENTITY));
  assemblePath({ out: dir, logs, tag: "fresh", container: "c", db: "d", rc: "0", identityFile, expectedTotal: 81 });
  const doc = readJson(join(dir, "fresh.json"));
  assert.equal(doc.verdict, "FAIL");
  assert.equal(doc.ledger.applied, 80);
  assert.equal(doc.firstFailure, null);
  rmSync(dir, { recursive: true, force: true });
});

test("assemble-path: FAIL with first failure recorded", () => {
  const dir = tmp("assemble-fail2");
  const logs = join(dir, "logs");
  mkdirSync(logs, { recursive: true });
  writeFileSync(join(logs, "fresh-facts.jsonl"), JSON.stringify({ key: "aborted", value: "deploy deploy-70-81 failed rc=1 migration=20260804110000_f1_v15_phase_b sqlState=42501" }) + "\n");
  writeFileSync(join(logs, "fresh-segments.jsonl"), "");
  writeFileSync(
    join(logs, "fresh-failures.jsonl"),
    JSON.stringify({ migration: "20260804110000_f1_v15_phase_b", sqlState: "42501", message: "permission denied", deployLabel: "deploy-70-81", ledger: { applied: 69, unresolvedFailed: 1, rolledBack: 0 } }) + "\n",
  );
  const identityFile = join(dir, "identity.json");
  writeFileSync(identityFile, JSON.stringify(FULL_IDENTITY));
  assemblePath({ out: dir, logs, tag: "fresh", container: "c", db: "d", rc: "1", identityFile, expectedTotal: 81 });
  const doc = readJson(join(dir, "fresh.json"));
  assert.equal(doc.verdict, "FAIL");
  assert.equal(doc.firstFailure.migration, "20260804110000_f1_v15_phase_b");
  assert.equal(doc.firstFailure.sqlState, "42501");
  assert.equal(doc.aborted.includes("deploy-70-81"), true);
  rmSync(dir, { recursive: true, force: true });
});

test("summary: SUCCESS only when both paths SUCCESS", () => {
  const dir = tmp("summary");
  const prod = { ...SUCCESS_PATH, path: "production", container: "vanstro-v11-f0-prod-pg", database: "vanstro_f0_prod", deployRcs: { "deploy-1-41": 0, "deploy-42-69": 0, "deploy-70-81": 0, "deploy-noop": 0 }, noop: { text: "No pending migrations to apply.", boundedLog: "production-noop.log" } };
  writeFileSync(join(dir, "fresh.json"), JSON.stringify(SUCCESS_PATH));
  writeFileSync(join(dir, "production.json"), JSON.stringify(prod));
  const result = buildSummary({
    fresh: SUCCESS_PATH,
    production: prod,
    identity: FULL_IDENTITY,
    generatedAt: "2026-08-11T12:00:00Z",
    evidenceDir: dir,
  });
  assert.equal(result.overall, "SUCCESS");
  assert.equal(result.exitCode, 0);
  const summary = readJson(join(dir, "summary.json"));
  assert.equal(summary.overall, "SUCCESS");
  assert.equal(summary.paths.fresh.ledger.applied, 81);
  assert.equal(summary.paths.production.noop.text, "No pending migrations to apply.");
  assert.equal(summary.paths.fresh.migration69Sha, FULL_IDENTITY.migration69Sha);
  assert.deepEqual(summary.failedPaths, []);
  rmSync(dir, { recursive: true, force: true });
});

test("summary: FAIL when one path FAILs", () => {
  const dir = tmp("summary-fail");
  const failing = { ...SUCCESS_PATH, verdict: "FAIL", ledger: { applied: 69, unresolvedFailed: 1, rolledBack: 0 }, firstFailure: { migration: "20260804110000_f1_v15_phase_b", sqlState: "42501" } };
  writeFileSync(join(dir, "fresh.json"), JSON.stringify(failing));
  writeFileSync(join(dir, "production.json"), JSON.stringify(SUCCESS_PATH));
  const result = buildSummary({
    fresh: failing,
    production: SUCCESS_PATH,
    identity: FULL_IDENTITY,
    generatedAt: "2026-08-11T12:00:00Z",
    evidenceDir: dir,
  });
  assert.equal(result.overall, "FAIL");
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.failedPaths, ["fresh"]);
  rmSync(dir, { recursive: true, force: true });
});

test("manifest digest is deterministic and closure files exist", () => {
  const dir = tmp("manifest");
  const out = spawnSync(process.execPath, [helperPath, "manifest", "--root", repoRoot, "--run-id", "r1", "--generated-at", "2026-08-11T12:00:00Z", "--kind", "working-tree", "--base-head", "h", "--base-tree", "t", "--out", dir], { encoding: "utf8" });
  assert.equal(out.status, 0);
  const payload = readJson(join(dir, "candidate-manifest.json"));
  assert.equal(payload.schemaVersion, F0_SCHEMA_VERSION);
  const digest = createHash("sha256").update(`${JSON.stringify(payload, null, 2)}\n`).digest("hex");
  assert.equal(JSON.parse(out.stdout).digest, digest);
  const again = spawnSync(process.execPath, [helperPath, "manifest", "--root", repoRoot, "--run-id", "r1", "--generated-at", "2026-08-11T12:00:00Z", "--kind", "working-tree", "--base-head", "h", "--base-tree", "t", "--out", dir], { encoding: "utf8" });
  assert.equal(JSON.parse(out.stdout).digest, JSON.parse(again.stdout).digest);
  rmSync(dir, { recursive: true, force: true });
});

test("removed evidence is sorted and schema-tagged", () => {
  const dir = tmp("removed");
  const records = join(dir, "records.jsonl");
  writeFileSync(records, [
    JSON.stringify({ path: "logs/z.log", category: "deploy-log", sha256: "b".repeat(64), bytes: 3 }),
    JSON.stringify({ path: "logs/a.log", category: "deploy-log", sha256: "a".repeat(64), bytes: 2 }),
  ].join("\n") + "\n");
  const outFile = join(dir, "removed-raw-evidence.json");
  const out = spawnSync(process.execPath, [helperPath, "removed", "--records", records, "--run-id", "r1", "--out", outFile], { encoding: "utf8" });
  assert.equal(out.status, 0);
  const doc = readJson(outFile);
  assert.equal(doc.schemaVersion, F0_SCHEMA_VERSION);
  assert.equal(doc.records.length, 2);
  assert.equal(doc.records[0].path, "logs/a.log");
  rmSync(dir, { recursive: true, force: true });
});
