#!/usr/bin/env node
// V11-R1 P7 — focused, DB-free tests for the run-identity / evidence-schema /
// manifest-digest / blocker-classification contract implemented in
// v11-r1-p7-evidence.mjs.
//
// Run (from the integration repo root):
//   node --test qa/v11-auth-browser/v11-r1-p7-evidence.test.mjs
//
// No database, docker container or product code is touched. The drill script
// itself is never executed here.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  SCHEMA_VERSION,
  MIGRATION69,
  MIGRATION70,
  EXPECTED_TOTAL,
  IDENTITY_FIELDS,
  DEFAULT_CLOSURE,
  FINAL_ARTIFACTS,
  RUNNER_ROLE_ATTRIBUTES,
  canonicalJson,
  sha256Hex,
  scrubSensitive,
  validateRunId,
  computeRunId,
  resolveRunDir,
  assertRunDirAvailable,
  buildIdentity,
  buildCandidateManifest,
  verifyManifestDigest,
  readClosureShas,
  classifyPass3,
  classifyOverall,
  qualifyBlockedPath,
  parsePostgresLog,
  extractFirstError,
  extractStatementSignature,
  buildBlockerLog,
  buildRemovedEvidence,
  FIXTURE_SUMMARY_KEYS,
  FIXTURE_SUMMARY_FORBIDDEN,
  summarizeFixture,
} from "./v11-r1-p7-evidence.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const tmp = (name) => {
  const dir = join(tmpdir(), `p7-evidence-test-${process.pid}-${name}-${randomBytes(3).toString("hex")}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

const FULL_IDENTITY = {
  schemaVersion: SCHEMA_VERSION,
  runId: "20260811T120000Z-ab12cd34",
  generatedAt: "2026-08-11T12:00:00Z",
  testedCandidateKind: "working-tree",
  testedCommit: "f9520ecef495b7c13210bd17aa26508ea2aee406",
  testedTree: "31f85bdba8870c0942c2e5468a33709827794e04",
  baseHead: "f9520ecef495b7c13210bd17aa26508ea2aee406",
  baseTree: "31f85bdba8870c0942c2e5468a33709827794e04",
  migration69Sha: "07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051",
  migration70Sha: "5789b68576b375bc94adec6373b6c02a976c3e5a3813697c5bbadf266977713b",
  candidateManifestSha: "ab".repeat(32),
  harnessSha: "98c981d15a6c269684cecceb64a16c969cc5a56d2464fd36b93e193f6e68ff8e",
  conformanceSha: "9121bc6bc09c8d08cb333cc4045b99103ff440e628a75c01a3295861f979d479",
  postgresImage: "postgres:16-bookworm",
  postgresImageId: "unknown",
  prismaVersion: "Prisma schema loaded from prisma/schema.prisma",
  runnerRoleAttributes: RUNNER_ROLE_ATTRIBUTES,
};

const BLOCKED_PATH = {
  verdict: "EXPECTED_BLOCKED_M70",
  blocker: {
    applied: 69,
    failedMigration: MIGRATION70,
    reproduced: true,
    sqlStateReproduced: true,
    firstErrorSignatureReproduced: true,
    ledger: { applied: 69, failed: [MIGRATION70], rolledBack: [MIGRATION69, MIGRATION70] },
    pass2: {
      sqlState: "P0001",
      message: "ATTESTATION_EXPECTED_SET_EMPTY",
      statement: "SELECT public.f1_consume_no_old_instances_v2(...)",
      firstErrorSignature: "SELECT public.f1_consume_no_old_instances_v2(...)",
      query: "SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'),current_setting('vanstro.environment'),current_setting('vanstro.manifest_digest'))",
      context: "PL/pgSQL function f1_consume_no_old_instances_v2(text,text,text) line 17 at RAISE | SQL statement \"SELECT public.f1_consume_no_old_instances_v2(...)\"",
    },
    pass3: {
      sqlState: "P0001",
      message: "ATTESTATION_EXPECTED_SET_EMPTY",
      statement: "SELECT public.f1_consume_no_old_instances_v2(...)",
      firstErrorSignature: "SELECT public.f1_consume_no_old_instances_v2(...)",
      query: "SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'),current_setting('vanstro.environment'),current_setting('vanstro.manifest_digest'))",
      context: "PL/pgSQL function f1_consume_no_old_instances_v2(text,text,text) line 17 at RAISE | SQL statement \"SELECT public.f1_consume_no_old_instances_v2(...)\"",
    },
  },
};

// ---------------------------------------------------------------------------
test("run id: generation is UTC-shaped, unique, and validated", () => {
  const a = computeRunId({ now: Date.parse("2026-08-11T12:34:56Z"), rng: () => Buffer.from("00000001", "hex") });
  assert.equal(a, "20260811T123456Z-00000001");
  assert.ok(validateRunId(a));
  for (const bad of ["", "a/b", "a b", "a*b", "-lead", ".lead", "x".repeat(129), "a\nb"]) {
    assert.equal(validateRunId(bad), false, `should reject ${JSON.stringify(bad)}`);
  }
  const ids = new Set(Array.from({ length: 200 }, () => computeRunId()));
  assert.equal(ids.size, 200, "ids must be unique");
});

test("run dir: resolves under runs/<id>, refuses pre-existing dirs, isolated from the old root", () => {
  const root = tmp("root");
  const runId = "20260811T120000Z-ab12cd34";
  const dir = resolveRunDir({ evidenceRoot: root, runId });
  assert.equal(dir, join(root, "runs", runId));
  assert.equal(resolveRunDir({ evidenceRoot: root, runId, evidenceOut: "/tmp/custom-out" }), "/tmp/custom-out");
  assert.throws(() => resolveRunDir({ evidenceRoot: root, runId: "bad/id" }), /invalid run id/);
  mkdirSync(dir, { recursive: true });
  assert.throws(() => assertRunDirAvailable(dir), /refusing existing evidence run dir/);
  const fresh = tmp("fresh");
  assert.doesNotThrow(() => assertRunDirAvailable(join(fresh, "runs", "20260811T120000Z-ab12cd34")));
});

test("identity: carries exactly the Authority Gate E1 field set in canonical order", () => {
  const id = buildIdentity(FULL_IDENTITY);
  assert.deepEqual(Object.keys(id), IDENTITY_FIELDS);
  assert.equal(id.testedCandidateKind, "working-tree");
  assert.equal(id.migration69Sha, "07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051");
  assert.equal(id.migration70Sha, "5789b68576b375bc94adec6373b6c02a976c3e5a3813697c5bbadf266977713b");
  assert.throws(() => buildIdentity({ ...FULL_IDENTITY, candidateManifestSha: undefined }), /identity field missing/);
});

// ---------------------------------------------------------------------------
test("manifest digest: canonical, deterministic, sorted, and NOT self-containing", () => {
  const files = [
    { path: "b.sql", category: "migration70", sha256: "b".repeat(64) },
    { path: "a.sql", category: "migration69", sha256: "a".repeat(64) },
    { path: "c.sh", category: "harness", sha256: "c".repeat(64) },
  ];
  const args = {
    schemaVersion: SCHEMA_VERSION,
    runId: "20260811T120000Z-ab12cd34",
    generatedAt: "2026-08-11T12:00:00Z",
    testedCandidateKind: "working-tree",
    baseHead: "f9520ecef495b7c13210bd17aa26508ea2aee406",
    baseTree: "31f85bdba8870c0942c2e5468a33709827794e04",
    files,
  };
  const { payload, digest } = buildCandidateManifest(args);
  // deterministic: identical input -> identical payload bytes + digest
  const again = buildCandidateManifest(args);
  assert.equal(canonicalJson(payload), canonicalJson(again.payload));
  assert.equal(digest, again.digest);
  assert.equal(sha256Hex(Buffer.from(canonicalJson(payload), "utf8")), digest);
  assert.ok(verifyManifestDigest(payload, digest));
  assert.equal(verifyManifestDigest(payload, "ff".repeat(32)), false);
  // files sorted by path, never self-referential
  assert.deepEqual(payload.files.map((f) => f.path), ["a.sql", "b.sql", "c.sh"]);
  assert.equal("candidateManifestSha" in payload, false);
  assert.equal("digest" in payload, false);
  assert.equal("sha256" in payload, false);
  // digest is sensitive to every byte of the closure
  const changed = buildCandidateManifest({
    ...args,
    files: [{ ...files[0], sha256: "d".repeat(64) }, ...files.slice(1)],
  });
  assert.notEqual(changed.digest, digest);
  const reordered = buildCandidateManifest({ ...args, files: [files[1], files[0], files[2]] });
  assert.equal(reordered.digest, digest, "order of the input list must not matter");
  // invalid closures are rejected
  assert.throws(() => buildCandidateManifest({ ...args, files: [{ path: "x", category: "nope", sha256: "a".repeat(64) }] }), /unknown manifest category/);
  assert.throws(() => buildCandidateManifest({ ...args, files: [{ path: "x", category: "harness", sha256: "not-a-sha" }] }), /invalid sha256/);
  assert.throws(() => buildCandidateManifest({ ...args, files: [files[0], files[0]] }), /duplicate manifest path/);
});

test("manifest closure: default set covers the candidate + read-only inputs and never the old evidence root", async () => {
  const paths = DEFAULT_CLOSURE.map((f) => f.path);
  for (const p of paths) {
    assert.ok(existsSync(join(repoRoot, p)), `closure file must exist: ${p}`);
  }
  assert.ok(paths.some((p) => p.includes(MIGRATION69)), "closure binds new migration69");
  assert.ok(paths.some((p) => p.includes(MIGRATION70)), "closure binds unchanged migration70");
  assert.ok(paths.some((p) => p.includes("run-v11-r1-p7-migration-drill.sh")), "closure binds the drill");
  assert.ok(paths.some((p) => p.includes("owned-pg16-conformance.mjs")), "closure binds the conformance harness");
  // the bounded integration commit's direct checksum/static wrapper scripts
  for (const w of [
    "scripts/f1-migration69-authority.test.mjs",
    "scripts/f1-migration70-static.test.mjs",
    "scripts/f1-migration71-owned-pg16.mjs",
    "scripts/f1-migration71-static.test.mjs",
    "scripts/test-f1-migration69.sh",
    "scripts/test-f1-migration70.sh",
    "scripts/test-f1-migration71.sh",
  ]) {
    assert.ok(paths.includes(w), `closure binds the bounded-commit wrapper: ${w}`);
  }
  assert.ok(paths.every((p) => !p.startsWith("tasks/evidence/")), "closure must never include evidence artifacts");
  // readClosureShas fails loudly on a missing file instead of silently omitting it
  assert.throws(() => readClosureShas(tmp("root"), [{ path: "does-not-exist.sql", category: "harness" }]), /closure file missing/);
});

// ---------------------------------------------------------------------------
test("old evidence untouched: the run write-set is exactly the 7 final artifacts inside runs/<id>", () => {
  const root = tmp("ev");
  const oldRoot = join(root, "v11-r1-p7");
  mkdirSync(join(oldRoot, "logs"), { recursive: true });
  mkdirSync(join(oldRoot, "fixtures"), { recursive: true });
  for (const f of ["summary.json", "fresh.json", "production.json", "logs/fresh-deploy-pass1.log", "fixtures/fixture-a.sql"]) {
    writeFileSync(join(oldRoot, f), `old-${f}`);
  }
  const runId = "20260811T120000Z-ab12cd34";
  const runDir = resolveRunDir({ evidenceRoot: oldRoot, runId });
  assert.ok(runDir.startsWith(join(oldRoot, "runs")), "new runs live under runs/<id> inside the evidence root");
  assert.ok(!existsSync(runDir));
  mkdirSync(runDir, { recursive: true });
  for (const f of FINAL_ARTIFACTS) writeFileSync(join(runDir, f), "new");
  // old root files byte-identical after the simulated run
  for (const f of ["summary.json", "fresh.json", "production.json", "logs/fresh-deploy-pass1.log", "fixtures/fixture-a.sql"]) {
    assert.equal(readFileSync(join(oldRoot, f), "utf8"), `old-${f}`);
  }
  assert.ok(!existsSync(join(runDir, "logs")) && !existsSync(join(runDir, "fixtures")), "run dir must not persist raw logs/fixtures");
  assert.equal(FINAL_ARTIFACTS.length, 7);
  // a second run with the same id must be refused, never merged/overwritten
  assert.throws(() => assertRunDirAvailable(runDir), /refusing existing evidence run dir/);
});

// ---------------------------------------------------------------------------
test("pass3 classification: expected blocker vs every deviating branch", () => {
  assert.deepEqual(classifyPass3({ rc: 1, applied: 69, failed: MIGRATION70 }), {
    verdict: "EXPECTED_BLOCKED_M70",
    reason: "EXPECTED_BLOCKER_REPRODUCED",
  });
  assert.equal(classifyPass3({ rc: 0, applied: 81, failed: "" }).verdict, "FAIL");
  assert.equal(classifyPass3({ rc: 0, applied: 81, failed: "" }).reason, "UNEXPECTED_SUCCESS");
  assert.equal(classifyPass3({ rc: 1, applied: 69, failed: MIGRATION69 }).reason, "WRONG_MIGRATION");
  assert.equal(classifyPass3({ rc: 1, applied: 68, failed: MIGRATION70 }).reason, "WRONG_APPLIED_COUNT");
  assert.equal(classifyPass3({ rc: 1, applied: 69, failed: "" }).reason, "WRONG_MIGRATION");
  assert.equal(classifyPass3({ rc: 1, applied: 81, failed: "" }).reason, "UNEXPECTED_SUCCESS");
});

test("overall classification: EXPECTED_BLOCKED_M70 only when both paths fully reproduce", () => {
  const fresh = JSON.parse(JSON.stringify(BLOCKED_PATH));
  const production = JSON.parse(JSON.stringify(BLOCKED_PATH));
  const ok = classifyOverall({ fresh, production });
  assert.equal(ok.overall, "EXPECTED_BLOCKED_M70");
  assert.equal(ok.exitCode, 0);
  assert.equal(ok.isMigrationSuccess, false, "blocked is NOT migration success");
  assert.equal(ok.blockedAt, MIGRATION70);
  assert.equal(ok.consistent, true);
  // per-path pass2/pass3 sqlState drift -> FAIL
  production.blocker.pass3.sqlState = "42501";
  assert.equal(classifyOverall({ fresh, production }).overall, "FAIL");
  assert.equal(classifyOverall({ fresh, production }).exitCode, 1);
  // UNKNOWN sqlstate is never accepted as consistent
  production.blocker.pass3.sqlState = "UNKNOWN";
  assert.equal(classifyOverall({ fresh: BLOCKED_PATH, production }).overall, "FAIL");
  // per-path pass2/pass3 signature drift -> FAIL
  production.blocker.pass3.sqlState = "P0001";
  production.blocker.pass3.firstErrorSignature = "SELECT public.other_fn(...)";
  assert.equal(classifyOverall({ fresh: BLOCKED_PATH, production }).overall, "FAIL");
  // one path deviates -> FAIL
  production.blocker.pass3.firstErrorSignature = "SELECT public.f1_consume_no_old_instances_v2(...)";
  production.verdict = "FAIL";
  assert.equal(classifyOverall({ fresh: BLOCKED_PATH, production }).overall, "FAIL");
  // missing blocker extraction -> FAIL
  assert.equal(classifyOverall({ fresh: BLOCKED_PATH, production: { verdict: "EXPECTED_BLOCKED_M70" } }).overall, "FAIL");
});

test("overall classification: fail-closed per-path qualification (every deviation is FAIL)", () => {
  const base = () => JSON.parse(JSON.stringify(BLOCKED_PATH));
  const both = (a, b) => classifyOverall({ fresh: a, production: b ?? base() });
  const mutate = (fn) => {
    const p = base();
    fn(p.blocker);
    return p;
  };
  const expectFail = (name, path, production) => {
    const r = both(path, production);
    assert.equal(r.overall, "FAIL", name);
    assert.equal(r.exitCode, 1, `${name}: exitCode`);
    assert.equal(r.isMigrationSuccess, false, `${name}: isMigrationSuccess`);
  };
  expectFail("missing blocker record", { verdict: "EXPECTED_BLOCKED_M70" });
  expectFail("applied wrong (68)", mutate((b) => { b.applied = 68; }));
  expectFail("applied crossed (70)", mutate((b) => { b.applied = 70; }));
  expectFail("failedMigration wrong", mutate((b) => { b.failedMigration = MIGRATION69; }));
  expectFail("reproduced=false", mutate((b) => { b.reproduced = false; }));
  expectFail("sqlStateReproduced=false", mutate((b) => { b.sqlStateReproduced = false; }));
  expectFail("firstErrorSignatureReproduced=false", mutate((b) => { b.firstErrorSignatureReproduced = false; }));
  expectFail("pass2 sqlState UNKNOWN", mutate((b) => { b.pass2.sqlState = "UNKNOWN"; }));
  expectFail("pass3 sqlState UNKNOWN", mutate((b) => { b.pass3.sqlState = "UNKNOWN"; }));
  expectFail("pass2/pass3 sqlState drift", mutate((b) => { b.pass3.sqlState = "42501"; }));
  expectFail("pass2 signature empty", mutate((b) => { b.pass2.firstErrorSignature = ""; }));
  expectFail("pass3 signature empty", mutate((b) => { b.pass3.firstErrorSignature = ""; }));
  expectFail("pass2/pass3 signature drift", mutate((b) => { b.pass3.firstErrorSignature = "SELECT public.other_fn(...)"; }));
  // cross-path consistency applies AFTER per-path qualification: a production
  // path that is internally consistent but differs from fresh must still FAIL
  const prodOther = mutate((b) => {
    b.pass2.sqlState = "42501";
    b.pass3.sqlState = "42501";
    b.pass2.firstErrorSignature = "REVOKE FUNCTION public.p08_create_import";
    b.pass3.firstErrorSignature = "REVOKE FUNCTION public.p08_create_import";
  });
  expectFail("cross-path sqlState+signature mismatch", base(), prodOther);
  // path verdict not expected-blocker
  expectFail("path verdict FAIL", { verdict: "FAIL", blocker: base().blocker });
  // missing production document
  const missing = classifyOverall({ fresh: base(), production: undefined });
  assert.equal(missing.overall, "FAIL", "missing production document");
  assert.equal(missing.exitCode, 1);
  // a fully-qualified path is accepted by qualifyBlockedPath
  assert.deepEqual(qualifyBlockedPath(base()), { ok: true });
  assert.equal(qualifyBlockedPath({ verdict: "FAIL" }).ok, false);
});

// ---------------------------------------------------------------------------
test("first-error extraction: SQLSTATE + statement signature from a verbose postgres log, windowed", () => {
  const log = [
    "2026-08-11 12:29:22.277 UTC [96] ERROR:  42P01: relation \"public.f1_source_migration_manifest\" does not exist at character 85",
    "2026-08-11 12:29:22.279 UTC [96] ERROR:  25P02: current transaction is aborted, commands ignored until end of transaction block",
    "2026-08-11 12:29:26.189 UTC [191] STATEMENT:  SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'),current_setting('vanstro.environment'),current_setting('vanstro.manifest_digest'))",
    "2026-08-11 12:29:26.189 UTC [191] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11 12:29:26.190 UTC [191] ERROR:  25P02: current transaction is aborted, commands ignored until end of transaction block",
    "2026-08-11 12:29:29.408 UTC [258] STATEMENT:  REVOKE ALL ON FUNCTION public.p08_create_import(text, text, text, text, text, text, text[], text[], uuid, text, text, bigint, text, timestamp with time zone, text, text, text, text, text) FROM PUBLIC,vanstro_runtime",
    "2026-08-11 12:29:29.408 UTC [258] ERROR:  42501: permission denied for function p08_create_import",
  ].join("\n");

  const pass2 = extractFirstError(log, "2026-08-11T12:29:25Z", "2026-08-11T12:29:27Z");
  assert.equal(pass2.sqlState, "P0001");
  assert.equal(pass2.message, "ATTESTATION_EXPECTED_SET_EMPTY");
  assert.equal(pass2.firstErrorSignature, "SELECT public.f1_consume_no_old_instances_v2(...)");

  const pass3 = extractFirstError(log, "2026-08-11T12:29:28Z", "2026-08-11T12:29:30Z");
  assert.equal(pass3.sqlState, "42501");
  assert.equal(pass3.message, "permission denied for function p08_create_import");
  assert.equal(pass3.firstErrorSignature, "REVOKE FUNCTION public.p08_create_import");

  // out-of-window errors are ignored; a window with no error yields null
  assert.equal(extractFirstError(log, "2026-08-11T12:30:00Z", "2026-08-11T12:30:10Z"), null);
  // plain (non-verbose) ERROR lines still yield the message with UNKNOWN state
  const plain = "2026-08-11 12:29:26.189 UTC [191] ERROR:  ATTESTATION_EXPECTED_SET_EMPTY";
  const e = extractFirstError(plain, "2026-08-11T12:29:26Z", "2026-08-11T12:29:27Z");
  assert.equal(e.sqlState, "UNKNOWN");
  assert.equal(e.message, "ATTESTATION_EXPECTED_SET_EMPTY");
  // sensitive-shaped content is scrubbed from extracted messages/statements
  const leaky = "2026-08-11 12:29:26.189 UTC [191] STATEMENT:  SELECT public.f(x) FROM t WHERE url='postgresql://u:pw@h/db'";
  const e2 = extractFirstError(`${leaky}\n2026-08-11 12:29:26.190 UTC [191] ERROR:  22023: bad`, "2026-08-11T12:29:26Z", "2026-08-11T12:29:27Z");
  assert.equal(e2.statement.includes("u:pw"), false);
});

test("first-error extraction: real postgres order (ERROR then STATEMENT, same pid)", () => {
  // log_min_error_statement appends the failing STATEMENT AFTER its ERROR
  const log = [
    "2026-08-11 12:29:29.408 UTC [258] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11 12:29:29.409 UTC [258] STATEMENT:  SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'),current_setting('vanstro.environment'),current_setting('vanstro.manifest_digest'))",
  ].join("\n");
  const e = extractFirstError(log, "2026-08-11T12:29:29Z", "2026-08-11T12:29:30Z");
  assert.equal(e.sqlState, "P0001");
  assert.equal(e.firstErrorSignature, "SELECT public.f1_consume_no_old_instances_v2(...)");
});

test("first-error extraction: prisma bookkeeping UPDATE never pairs (later event, same pid)", () => {
  // the real drill log: the P0001 event (failing SELECT) is followed by
  // prisma's trailing UPDATE "_prisma_migrations" failing with 25P02 in the
  // aborted transaction — a separate error event that must not pair
  const log = [
    "2026-08-11 12:29:29.408 UTC [191] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11 12:29:29.408 UTC [191] STATEMENT:  SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'),current_setting('vanstro.environment'),current_setting('vanstro.manifest_digest'))",
    "2026-08-11 12:29:29.409 UTC [191] ERROR:  25P02: current transaction is aborted, commands ignored until end of transaction block",
    "2026-08-11 12:29:29.409 UTC [191] STATEMENT:  UPDATE \"_prisma_migrations\" SET \"logs\" = $1 WHERE \"id\" = $2",
  ].join("\n");
  const e = extractFirstError(log, "2026-08-11T12:29:29Z", "2026-08-11T12:29:30Z");
  assert.equal(e.sqlState, "P0001");
  assert.equal(e.firstErrorSignature, "SELECT public.f1_consume_no_old_instances_v2(...)");
  assert.equal(e.firstErrorSignature.includes("_prisma_migrations"), false);
  assert.equal(e.statement.includes("_prisma_migrations"), false);
});

test("first-error extraction: adjacent statement on a DIFFERENT pid never pairs", () => {
  const log = [
    "2026-08-11 12:29:29.408 UTC [191] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11 12:29:29.408 UTC [999] STATEMENT:  UPDATE \"_prisma_migrations\" SET \"logs\" = $1 WHERE \"id\" = $2",
    "2026-08-11 12:29:29.409 UTC [191] STATEMENT:  SELECT public.f1_consume_no_old_instances_v2(...)",
  ].join("\n");
  const e = extractFirstError(log, "2026-08-11T12:29:29Z", "2026-08-11T12:29:30Z");
  assert.equal(e.sqlState, "P0001");
  assert.equal(e.firstErrorSignature, "SELECT public.f1_consume_no_old_instances_v2(...)");
});

test("first-error extraction: stale statement from a PREVIOUS pass never leaks into the window", () => {
  // pass2's trailing UPDATE sits just outside the pass3 window; the windowed
  // extractor must pair pass3's P0001 with its OWN same-pid statement
  const log = [
    "2026-08-11 12:29:29.408 UTC [191] ERROR:  25P02: current transaction is aborted",
    "2026-08-11 12:29:29.409 UTC [191] STATEMENT:  UPDATE \"_prisma_migrations\" SET \"logs\" = $1 WHERE \"id\" = $2",
    "2026-08-11 12:29:30.100 UTC [192] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11 12:29:30.101 UTC [192] STATEMENT:  SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'),current_setting('vanstro.environment'),current_setting('vanstro.manifest_digest'))",
  ].join("\n");
  const e = extractFirstError(log, "2026-08-11T12:29:30Z", "2026-08-11T12:29:31Z");
  assert.equal(e.sqlState, "P0001");
  assert.equal(e.firstErrorSignature, "SELECT public.f1_consume_no_old_instances_v2(...)");
});

test("first-error extraction: verbose CONTEXT yields the real failing function signature", () => {
  // the real drill log: the outer STATEMENT is the migration transaction
  // wrapper `BEGIN;` (migration 70's file starts with BEGIN), while the
  // verbose context stack names the directly failing SQL call — that must
  // win over BEGIN, without any hardcoding
  const log = [
    "2026-08-11 12:29:29.408 UTC [191] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11 12:29:29.408 UTC [191] CONTEXT:  PL/pgSQL function f1_consume_no_old_instances_v2(text,text,text) line 17 at RAISE",
    "2026-08-11 12:29:29.408 UTC [191] SQL statement \"SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'),current_setting('vanstro.environment'),current_setting('vanstro.manifest_digest'))\"",
    "2026-08-11 12:29:29.408 UTC [191] STATEMENT:  BEGIN;",
  ].join("\n");
  const e = extractFirstError(log, "2026-08-11T12:29:29Z", "2026-08-11T12:29:30Z");
  assert.equal(e.sqlState, "P0001");
  assert.equal(e.firstErrorSignature, "SELECT public.f1_consume_no_old_instances_v2(...)");
  assert.equal(e.statement.includes("BEGIN"), false, "statement must come from the context SQL, not the outer BEGIN");
  assert.match(e.query, /f1_consume_no_old_instances_v2/);
  assert.match(e.context, /PL\/pgSQL function f1_consume_no_old_instances_v2\(text,text,text\)/);
  assert.match(e.context, /SQL statement "SELECT public\.f1_consume_no_old_instances_v2/);
  // context is bounded
  const huge = [
    "2026-08-11 12:29:29.408 UTC [191] ERROR:  P0001: boom",
    `2026-08-11 12:29:29.408 UTC [191] CONTEXT:  PL/pgSQL function fn(${"x".repeat(900)}) line 1 at RAISE`,
    `2026-08-11 12:29:29.408 UTC [191] ${"y".repeat(900)}`,
  ].join("\n");
  const eh = extractFirstError(huge, "2026-08-11T12:29:29Z", "2026-08-11T12:29:30Z");
  assert.ok(eh.context.length <= 300, "context stays bounded");
  assert.ok(eh.message.length <= 300);
});

test("first-error extraction: PL/pgSQL function CONTEXT forms the signature", () => {
  const log = [
    "2026-08-11 12:29:29.408 UTC [191] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11 12:29:29.408 UTC [191] CONTEXT:  PL/pgSQL function f1_consume_no_old_instances_v2(text,text,text) line 17 at RAISE",
    "2026-08-11 12:29:29.408 UTC [191] STATEMENT:  BEGIN;",
  ].join("\n");
  const e = extractFirstError(log, "2026-08-11T12:29:29Z", "2026-08-11T12:29:30Z");
  assert.equal(e.firstErrorSignature, "PL/pgSQL function f1_consume_no_old_instances_v2(...)");
  assert.equal(e.firstErrorSignature.includes("BEGIN"), false);
});

test("first-error extraction: context stays within the SAME pid and error event", () => {
  const log = [
    "2026-08-11 12:29:29.408 UTC [191] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11 12:29:29.408 UTC [999] CONTEXT:  PL/pgSQL function wrong_pid_fn(text) line 1 at RAISE",
    "2026-08-11 12:29:29.408 UTC [191] STATEMENT:  BEGIN;",
    "2026-08-11 12:29:29.409 UTC [191] ERROR:  25P02: current transaction is aborted",
    "2026-08-11 12:29:29.409 UTC [191] CONTEXT:  PL/pgSQL function later_event_fn() line 1 at RAISE",
    "2026-08-11 12:29:29.409 UTC [191] STATEMENT:  UPDATE \"_prisma_migrations\" SET \"logs\" = $1 WHERE \"id\" = $2",
  ].join("\n");
  const e = extractFirstError(log, "2026-08-11T12:29:29Z", "2026-08-11T12:29:30Z");
  assert.equal(e.sqlState, "P0001");
  assert.equal(e.context.includes("wrong_pid_fn"), false, "different-pid context must not leak");
  assert.equal(e.context.includes("later_event_fn"), false, "later-event context must not leak");
  // no same-pid context on the P0001 event: the honest STATEMENT fallback remains
  assert.equal(e.firstErrorSignature, "BEGIN;");
});

test("first-error extraction: legacy second-precision end includes the WHOLE final second", () => {
  // postgres stamps carry .xxx; an end like "...T12:29:30Z" (no fraction) must
  // still include a same-second error at .900 — the run-20260811T165414Z
  // UNKNOWN failure mode (drill end truncated at .000)
  const log = [
    "2026-08-11 12:29:30.900 UTC [191] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11 12:29:30.901 UTC [191] STATEMENT:  SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'),current_setting('vanstro.environment'),current_setting('vanstro.manifest_digest'))",
  ].join("\n");
  const e = extractFirstError(log, "2026-08-11T12:29:30Z", "2026-08-11T12:29:30Z");
  assert.equal(e.sqlState, "P0001");
  assert.equal(e.firstErrorSignature, "SELECT public.f1_consume_no_old_instances_v2(...)");
  // a .999 stamp of the final second is the latest that can belong to it
  const e2 = extractFirstError(log.replace(".900", ".999"), "2026-08-11T12:29:30Z", "2026-08-11T12:29:30Z");
  assert.equal(e2.sqlState, "P0001");
  // the NEXT second's error stays outside a legacy end
  const e3 = extractFirstError(
    "2026-08-11 12:29:31.000 UTC [191] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY",
    "2026-08-11T12:29:30Z",
    "2026-08-11T12:29:30Z",
  );
  assert.equal(e3, null, "next-second error must not leak into a legacy end");
});

test("first-error extraction: strict boundaries with fractional ends", () => {
  const log = [
    "2026-08-11 12:29:29.999 UTC [191] ERROR:  42P01: before-start",
    "2026-08-11 12:29:30.000 UTC [191] ERROR:  P0001: at-start",
    "2026-08-11 12:29:30.500 UTC [191] ERROR:  P0002: at-end",
    "2026-08-11 12:29:30.501 UTC [191] ERROR:  P0003: after-end",
  ].join("\n");
  // start inclusive: at-start is the first in-window error, before-start excluded
  const e = extractFirstError(log, "2026-08-11T12:29:30.000Z", "2026-08-11T12:29:30.500Z");
  assert.equal(e.sqlState, "P0001");
  // fractional end inclusive at its exact instant
  const e2 = extractFirstError(log, "2026-08-11T12:29:30.100Z", "2026-08-11T12:29:30.500Z");
  assert.equal(e2.sqlState, "P0002");
  // one ms past the fractional end -> nothing in the window
  const e3 = extractFirstError(log, "2026-08-11T12:29:30.100Z", "2026-08-11T12:29:30.499Z");
  assert.equal(e3, null);
});

test("drill now_iso: millisecond-precision ISO output", () => {
  // window ends must carry .SSS so same-second postgres stamps (.xxx) are not
  // truncated away by the second boundary (run-20260811T165414Z UNKNOWN)
  const drill = readFileSync(join(repoRoot, "qa/v11-auth-browser/run-v11-r1-p7-migration-drill.sh"), "utf8");
  const m = drill.match(/now_iso\(\) \{([^\n]*)\}/);
  assert.ok(m, "now_iso must be a single-line function");
  assert.match(m[1], /toISOString/, "now_iso must use a millisecond-precision ISO source");
  const r = spawnSync("bash", ["-c", `set -u\nnow_iso() {${m[1]}\n}\nnow_iso`], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const iso = r.stdout.trim();
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, `now_iso must emit .SSS Z: ${iso}`);
  assert.equal(Number.isNaN(Date.parse(iso)), false);
});

test("statement signature extraction: function identity without sensitive values", () => {
  assert.equal(extractStatementSignature("SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'), current_setting('vanstro.environment'))"), "SELECT public.f1_consume_no_old_instances_v2(...)");
  assert.equal(extractStatementSignature("CALL public.vanstro_rotate_keys_v1('secret-value')"), "CALL public.vanstro_rotate_keys_v1(...)");
  assert.equal(extractStatementSignature("REVOKE ALL ON FUNCTION public.p08_create_import(text, text) FROM PUBLIC,vanstro_runtime"), "REVOKE FUNCTION public.p08_create_import");
  assert.equal(extractStatementSignature("ALTER TABLE public.orders ADD CONSTRAINT x CHECK (true)"), "ALTER TABLE public.orders");
  assert.equal(extractStatementSignature("DO $postassert$ BEGIN RAISE EXCEPTION 'X'; END $postassert$"), "DO anonymous block");
  assert.equal(extractStatementSignature("SET LOCAL lock_timeout='5s'"), "SET LOCAL lock_timeout");
  assert.equal(extractStatementSignature("BEGIN"), "BEGIN");
  assert.equal(extractStatementSignature(""), "");
  const long = `SELECT public.${"x".repeat(300)}_probe(...)`;
  assert.ok(extractStatementSignature(long).length <= 120, "fallback stays bounded");
});

test("postgres log parser: ignores non-error lines and unparseable stamps", () => {
  const lines = parsePostgresLog([
    "2026-08-11 12:29:26.189 UTC [191] STATEMENT:  SELECT 1",
    "2026-08-11 12:29:26.189 UTC [191] ERROR:  P0001: boom",
    "2026-08-11 12:29:26.189 UTC [191] WARNING:  no privileges could be revoked for \"x\"",
    "garbage line without stamp",
    "2026-08-11 12:29:26.189 UTC [191] DETAIL:  some detail",
    "2026-08-11 12:29:26.189 UTC [191] SQL statement \"SELECT 1\"",
  ].join("\n"));
  // only parseable lines count: the garbage line is dropped; the unprefixed
  // continuation (verbose CONTEXT `SQL statement "..."`) is kept as CONT
  assert.equal(lines.length, 5);
  assert.equal(lines[0].kind, "STATEMENT");
  assert.equal(lines[0].pid, "191");
  assert.equal(lines[1].kind, "ERROR");
  assert.equal(lines[1].pid, "191");
  assert.equal(lines[2].kind, "WARNING");
  assert.equal(lines[3].kind, "DETAIL");
  assert.equal(lines[4].kind, "CONT");
  assert.equal(lines[4].rest, "SQL statement \"SELECT 1\"");
  assert.equal(lines.some((l) => l.rest.includes("garbage")), false);
});

// ---------------------------------------------------------------------------
test("removed-raw-evidence: every raw file listed with sha256 and deleted=true, sorted", () => {
  const records = [
    { path: "logs/fresh-deploy-pass2.log", category: "deploy-log", sha256: "2".repeat(64), bytes: 100 },
    { path: "fixtures/fixture-a.sql", category: "fixture-sql", sha256: "1".repeat(64), bytes: 200 },
    { path: "logs/fresh-postgres.log", category: "postgres-log", sha256: "3".repeat(64), bytes: 300 },
  ];
  const out = buildRemovedEvidence(records);
  assert.deepEqual(out.map((r) => r.path), ["fixtures/fixture-a.sql", "logs/fresh-deploy-pass2.log", "logs/fresh-postgres.log"]);
  for (const r of out) {
    assert.equal(r.deleted, true);
    assert.match(r.sha256, /^[0-9a-f]{64}$/);
  }
});

test("blocker log: bounded, carries sqlstate/signature/ledger/rationale, never credentials", () => {
  const body = buildBlockerLog({
    identity: FULL_IDENTITY,
    tag: "fresh",
    blocker: BLOCKED_PATH.blocker,
    resolveRationale: "expected blocker reproduction; no resolve performed",
    deployTail: "line1\nline2\n".repeat(500),
  });
  assert.ok(Buffer.byteLength(body, "utf8") <= 16 * 1024, "blocker log must be bounded");
  assert.match(body, /migration: 20260804110000_f1_v15_phase_b/);
  assert.match(body, /applied: 69/);
  assert.match(body, /pass3 first error: sqlState=P0001 signature=SELECT public\.f1_consume_no_old_instances_v2\(\.\.\.\)/);
  assert.ok(body.includes("pass3 first error query: SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id')"), "pass3 query line");
  assert.ok(body.includes("pass3 first error context: PL/pgSQL function f1_consume_no_old_instances_v2(text,text,text) line 17 at RAISE"), "pass3 context line");
  assert.ok(body.includes("pass2 first error context: PL/pgSQL function f1_consume_no_old_instances_v2(text,text,text)"), "pass2 context line");
  assert.match(body, /resolveRationale: expected blocker reproduction/);
  assert.match(body, /testedCandidateKind: working-tree/);
  assert.equal(body.includes("postgresql://u:pw@"), false);
  assert.equal(scrubSensitive("x PASSWORD 's3cret' y postgresql://u:pw@h/db"), "x PASSWORD '***' y postgresql://***@h/db");
});

test("blocker log: no trailing whitespace, exactly one trailing LF (git show --check contract)", () => {
  // empty query/context fields and a deployTail with its own trailing blank
  // lines / whitespace-only lines must never produce trailing spaces or a
  // blank line at EOF
  const body = buildBlockerLog({
    identity: FULL_IDENTITY,
    tag: "fresh",
    blocker: {
      applied: 69,
      failedMigration: MIGRATION70,
      pass2: { sqlState: "P0001", query: "", context: "" },
      pass3: { sqlState: "P0001", query: "", context: "" },
    },
    resolveRationale: "x",
    deployTail: "line1\nline2\n\n\n  \n",
  });
  for (const line of body.split("\n")) {
    assert.equal(/[ \t]+$/.test(line), false, `no trailing whitespace: ${JSON.stringify(line)}`);
  }
  assert.match(body, /^pass2 first error query:$/m, "empty query line has no trailing space");
  assert.match(body, /^pass3 first error context:$/m, "empty context line has no trailing space");
  assert.equal(body.endsWith("\n"), true, "ends with exactly one LF");
  assert.equal(body.endsWith("\n\n"), false, "no blank line at EOF");
  assert.equal(/\n\n$/.test(body), false, "no double LF at EOF");
  // non-empty values still carry the separating space
  const withValues = buildBlockerLog({
    identity: FULL_IDENTITY,
    tag: "fresh",
    blocker: { applied: 69, failedMigration: MIGRATION70, pass3: { sqlState: "P0001", query: "SELECT 1", context: "PL/pgSQL function f(text) line 1 at RAISE" } },
    resolveRationale: "x",
  });
  assert.match(withValues, /^pass3 first error query: SELECT 1$/m);
  assert.match(withValues, /^pass3 first error context: PL\/pgSQL function f\(text\) line 1 at RAISE$/m);
  assert.equal(withValues.endsWith("\n"), true);
  assert.equal(withValues.endsWith("\n\n"), false);
});

test("canonical JSON is stable across writes (digest = sha256 of exact bytes)", () => {
  const a = { schemaVersion: SCHEMA_VERSION, runId: "r1", files: [{ path: "a", category: "harness", sha256: "a".repeat(64) }] };
  const b = { schemaVersion: SCHEMA_VERSION, runId: "r1", files: [{ path: "a", category: "harness", sha256: "a".repeat(64) }] };
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.equal(canonicalJson(a), `${JSON.stringify(a, null, 2)}\n`);
  // no trailing newline creep, no key reordering
  assert.equal(canonicalJson(a).endsWith("\n"), true);
});

test("closure defaults: drill never binds old-root evidence or WAL/protected paths", () => {
  const paths = DEFAULT_CLOSURE.map((f) => f.path);
  for (const forbidden of [
    "tasks/evidence/",
    "docker-compose.production-server.yml",
    "scripts/production-postgres-backup.sh",
    "src/app/",
    "next-env.d.ts",
    "next.config.mjs",
  ]) {
    assert.ok(paths.every((p) => !p.startsWith(forbidden)), `closure must not include ${forbidden}`);
  }
  assert.equal(new Set(DEFAULT_CLOSURE.map((f) => f.path)).size, DEFAULT_CLOSURE.length, "closure paths unique");
});

test("EXPECTED_TOTAL and migration constants stay aligned with the drill contract", () => {
  assert.equal(EXPECTED_TOTAL, 81);
  assert.equal(MIGRATION69, "20260804100000_f1_v15_expand");
  assert.equal(MIGRATION70, "20260804110000_f1_v15_phase_b");
});

// ---------------------------------------------------------------------------
test("drill snapshot extractor: completes under set -u (regression: unbound local label)", () => {
  // The real drill failed with "label: unbound variable" because
  // `local label=$1 snap="$LOGS/$tag-postgres-$label.log"` expands ALL words
  // before ANY assignment (bash semantics under `set -u`). This test runs the
  // EXACT function body extracted from the drill under `set -euo pipefail`
  // with a stubbed docker, and would fail on the old single-line declaration.
  const drill = readFileSync(join(repoRoot, "qa/v11-auth-browser/run-v11-r1-p7-migration-drill.sh"), "utf8");
  const m = drill.match(/snapshot_and_extract_error\(\) \{[^\n]*\n([\s\S]*?)\n  \}/);
  assert.ok(m, "snapshot_and_extract_error body must be present in the drill");
  const body = m[1];
  const logs = tmp("snap");
  const ts = new Date(Date.now() - 5000).toISOString().slice(0, 19); // 5s ago, e.g. 2026-08-11T16:21:40 (no Z: log stamp)
  const script = [
    "set -euo pipefail",
    "tag=fresh",
    `LOGS=${JSON.stringify(logs)}`,
    "container=vanstro-v11-p7-fresh-pg",
    `SEC_START_ISO=${JSON.stringify(ts + "Z")}`, // Z-suffixed, same shape as now_iso()
    `EVIDENCE_HELPER=${JSON.stringify(join(repoRoot, "qa/v11-auth-browser/v11-r1-p7-evidence.mjs"))}`,
    "TS=" + JSON.stringify(ts),
    "track_raw() { :; }",
    "sanitize_file() { :; }",
    "now_iso() { node -e 'process.stdout.write(new Date().toISOString())'; }",
    "docker() { printf '%s.100 UTC [7] STATEMENT:  SELECT public.f1_consume_no_old_instances_v2(...)\\n%s.101 UTC [7] ERROR:  P0001: ATTESTATION_EXPECTED_SET_EMPTY\\n' \"$TS\" \"$TS\"; }",
    "snapshot_and_extract_error() {",
    body,
    "}",
    "snapshot_and_extract_error pass2",
    `[ -s "${logs}/fresh-postgres-pass2.log" ]`,
    `printf '%s' "$P7_FIRST_JSON" | grep -q '"sqlState":"P0001"'`,
  ].join("\n");
  const r = spawnSync("bash", ["-c", script], { encoding: "utf8" });
  assert.equal(r.status, 0, `snapshot extractor must complete under set -u:\n${r.stderr}\n${r.stdout}`);
});

test("drill locals: single-line local declarations never cross-reference their own assignments (set -u hazard)", () => {
  // bash expands every word of `local a=1 b=$a` before performing ANY
  // assignment, so an RHS referencing a name assigned in the SAME declaration
  // is an unbound-variable failure under `set -u`. Audit the whole drill.
  const drill = readFileSync(join(repoRoot, "qa/v11-auth-browser/run-v11-r1-p7-migration-drill.sh"), "utf8");
  const hazards = [];
  for (const [idx, line] of drill.split("\n").entries()) {
    if (!/^\s*local\s+/.test(line)) continue;
    const assigns = [...line.matchAll(/([A-Za-z_][A-Za-z0-9_]*)=/g)].map((x) => x[1]);
    if (assigns.length === 0) continue;
    for (const name of assigns) {
      const pos = line.indexOf(`${name}=`);
      const after = line.slice(pos + name.length + 1);
      if (new RegExp(`\\$\\{?${name}\\b`).test(after)) {
        hazards.push(`line ${idx + 1}: ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(hazards, []);
});

// ---------------------------------------------------------------------------
test("fixture summary: persisted fixture fact is a non-sensitive essential subset", () => {
  const full = {
    tag: "fresh",
    rolloutId: "rollout-fresh-a",
    environment: "test",
    instanceId: "api-1",
    codeVersion: "new69",
    schemaCompatibility: 69,
    manifestDigest: "ab".repeat(32),
    observedAt: "2026-08-11T12:00:00.000Z",
    windowEndedAt: "2026-08-11T12:00:03.000Z",
    signerId: "deployment-signer-test",
    attestedBy: "deploy-controller",
    publicKeyHex: "abcd1234",
    nonce: "nonce_deployment_000001",
    reportId: "11111111-1111-4111-8111-111111111111",
    expectedCount: 1,
    telemetryCount: 31,
    attestation: { payloadDigest: "ff".repeat(32), signature: "beef".repeat(8) },
    kat: { payloadDigest: "00".repeat(32), signature: "cafe".repeat(8) },
    files: { sql: "/tmp/fixture.sql", json: "/tmp/fixture.json" },
  };
  const s = summarizeFixture(full, "fresh");
  assert.deepEqual(s, {
    tag: "fresh",
    rolloutId: "rollout-fresh-a",
    environment: "test",
    schemaCompatibility: 69,
    manifestDigest: "ab".repeat(32),
    expectedCount: 1,
    telemetryCount: 31,
  });
  assert.deepEqual(Object.keys(s).sort(), [...FIXTURE_SUMMARY_KEYS].sort());
  const raw = JSON.stringify(s);
  for (const k of FIXTURE_SUMMARY_FORBIDDEN) {
    assert.equal(raw.includes(k), false, `serialized summary must not mention ${k}`);
  }
  for (const k of ["instanceId", "codeVersion", "signerId", "attestedBy", "observedAt", "windowEndedAt"]) {
    assert.equal(raw.includes(k), false, `serialized summary must not mention ${k}`);
  }
  // missing allowlisted fields are simply absent, never invented
  assert.deepEqual(summarizeFixture({ rolloutId: "r1" }, "prod"), { tag: "prod", rolloutId: "r1" });
});

test("drill fixture fact: persisted via non-sensitive summary, never the raw fixture", () => {
  const drill = readFileSync(join(repoRoot, "qa/v11-auth-browser/run-v11-r1-p7-migration-drill.sh"), "utf8");
  assert.match(drill, /record_fact "fixtureA"[^\n]*fixture-summary/, "drill persists fixtureA via the summary CLI");
  assert.doesNotMatch(drill, /delete j\.files/, "drill must never persist the raw fixture minus files");
  assert.doesNotMatch(drill, /record_fact "fixtureB"/, "no second raw fixture fact may exist");
});
