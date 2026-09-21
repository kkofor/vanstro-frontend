#!/usr/bin/env node
// V11-R1 P7 — run-identity / evidence-schema / manifest-digest helper (no DB).
//
// Pure, dependency-free (node:crypto / node:fs / node:path only) module that
// owns the VERSIONED RUN CONTRACT of the P7 migration drill:
//
//   * run-id generation + validation, isolated run-dir resolution
//   * the canonical candidate manifest payload + digest algorithm
//     (candidateManifestSha is NEVER part of its own payload)
//   * the Authority identity block (Gate E1 field list)
//   * pass3/overall classification: expected M70-blocker reproduction vs
//     every deviating branch (success, wrong migration, wrong applied count,
//     cross-path inconsistency)
//   * first-error extraction from a (verbose) postgres container log within
//     a deploy-pass window, with SQLSTATE + first statement signature
//   * bounded migration70-blocker log generation
//   * removed-raw-evidence records for the raw material that is extracted,
//     scanned and DELETED (never persisted into the final run dir)
//
// The shell script invokes it as a CLI (subcommands below); the focused test
// file imports the same functions. No database, docker or product code is
// touched by this module.
//
// MANIFEST DIGEST ALGORITHM (canonical, versioned):
//   payload = { schemaVersion, kind, runId, generatedAt, testedCandidateKind,
//               baseHead, baseTree, files: [{path, category, sha256}] }
//   - files are sorted by `path` (byte order), one entry per path
//   - payload is serialized as JSON.stringify(payload, null, 2) + "\n"
//     with the exact key insertion order above (deterministic construction)
//   - digest = sha256Hex(utf8(canonical payload))
//   The payload deliberately contains NO digest/sha of itself, so the digest
//   can never be self-referential.
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const SCHEMA_VERSION = "v11-r1-p7-run-1";
export const MIGRATION69 = "20260804100000_f1_v15_expand";
export const MIGRATION70 = "20260804110000_f1_v15_phase_b";
export const EXPECTED_TOTAL = 81;
// The expected blocker leaves migrations 1..69 applied and migration 70
// failing. Any pass3 that applies MORE than this has crossed migration 70,
// i.e. the blocker was NOT reproduced — always UNEXPECTED_SUCCESS.
export const EXPECTED_APPLIED_AT_BLOCKER = 69;
export const BLOCKER_LOG_MAX = 16 * 1024; // bounded blocker log cap (bytes)
export const ERROR_MESSAGE_MAX = 300; // bounded first-error message (chars)
export const STATEMENT_MAX = 200; // bounded statement text (chars)
export const CONTEXT_MAX = 300; // bounded first-error context text (chars)

export const RUNNER_ROLE_ATTRIBUTES =
  "vanstro_migrator:LOGIN,NOINHERIT,NOSUPERUSER,NOCREATEDB,NOCREATEROLE,NOREPLICATION,NOBYPASSRLS;" +
  "cap-role memberships WITH ADMIN OPTION;owner of database+public schema;runner=prisma migrate deploy over 127.0.0.1 TCP";

// Identity fields required by Authority Gate E1 (order is canonical).
export const IDENTITY_FIELDS = [
  "schemaVersion",
  "runId",
  "generatedAt",
  "testedCandidateKind",
  "testedCommit",
  "testedTree",
  "baseHead",
  "baseTree",
  "migration69Sha",
  "migration70Sha",
  "candidateManifestSha",
  "harnessSha",
  "conformanceSha",
  "postgresImage",
  "postgresImageId",
  "prismaVersion",
  "runnerRoleAttributes",
];

export const MANIFEST_CATEGORIES = new Set([
  "migration69",
  "migration70",
  "conformance",
  "fixture-input",
  "harness",
  "product-input",
  "extra",
]);

// Default candidate closure bound by candidateManifestSha: the authorized
// Migration69 implementation + evidence/harness closure + read-only inputs
// whose SHAs must be proven unchanged (migration70, schema, fixture surface).
// Paths are relative to the repository root. NEVER includes tasks/evidence.
export const DEFAULT_CLOSURE = [
  { path: "packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql", category: "migration69" },
  { path: "packages/db/prisma/migrations/20260804110000_f1_v15_phase_b/migration.sql", category: "migration70" },
  { path: "packages/db/prisma/schema.prisma", category: "product-input" },
  { path: "qa/v11-auth-browser/f1-source-manifest.sql", category: "harness" },
  { path: "qa/v11-auth-browser/run-v11-r1-p7-migration-drill.sh", category: "harness" },
  { path: "qa/v11-auth-browser/v11-p7-fixture.mjs", category: "harness" },
  { path: "qa/v11-auth-browser/v11-r1-p7-evidence.mjs", category: "harness" },
  { path: "qa/v11-auth-browser/v11-r1-p7-evidence.test.mjs", category: "harness" },
  { path: "tasks/tooling/f1-v15-clarification/03-old68-runtime-surface.json", category: "fixture-input" },
  { path: "tasks/tooling/f1-v15-clarification/owned-pg16-conformance.mjs", category: "conformance" },
  // direct checksum/static wrapper scripts of the bounded integration commit
  { path: "scripts/f1-migration69-authority.test.mjs", category: "harness" },
  { path: "scripts/f1-migration70-static.test.mjs", category: "harness" },
  { path: "scripts/f1-migration71-owned-pg16.mjs", category: "harness" },
  { path: "scripts/f1-migration71-static.test.mjs", category: "harness" },
  { path: "scripts/test-f1-migration69.sh", category: "harness" },
  { path: "scripts/test-f1-migration70.sh", category: "harness" },
  { path: "scripts/test-f1-migration71.sh", category: "harness" },
];

export const FINAL_ARTIFACTS = [
  "candidate-manifest.json",
  "fresh.json",
  "production.json",
  "summary.json",
  "migration70-blocker-fresh.log",
  "migration70-blocker-production.log",
  "removed-raw-evidence.json",
];

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------
export const sha256Hex = (data) => createHash("sha256").update(data).digest("hex");

// Canonical serialization: JSON.stringify(obj, null, 2) + "\n". Determinism is
// the CALLER's contract: objects must be constructed with fixed key insertion
// order (the builders below do; identity uses IDENTITY_FIELDS order).
export const canonicalJson = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

export const scrubSensitive = (text) =>
  String(text)
    .replace(/postgresql:\/\/[^ @/]+:[^ @/]*@/g, "postgresql://***@")
    .replace(/\b(PASSWORD|PGPASSWORD|POSTGRES_PASSWORD|DATABASE_PASSWORD|SUPER_PASSWORD|MIGRATOR_PASSWORD)\s*=\s*\S+/gi, "$1=***")
    .replace(/\bPASSWORD\s+'([^']|'')*'/gi, "PASSWORD '***'");

// ---------------------------------------------------------------------------
// run id + run dir
// ---------------------------------------------------------------------------
export const RUN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export const validateRunId = (id) => typeof id === "string" && RUN_ID_RE.test(id);

export const computeRunId = ({ now = Date.now(), rng = randomBytes } = {}) => {
  const d = new Date(now);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const stamp =
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  return `${stamp}-${rng(4).toString("hex")}`;
};

export const resolveRunDir = ({ evidenceRoot, runId, evidenceOut }) => {
  if (evidenceOut) return resolve(evidenceOut);
  if (!validateRunId(runId)) throw new Error(`invalid run id: ${String(runId)}`);
  return resolve(join(evidenceRoot, "runs", runId));
};

export const assertRunDirAvailable = (dir) => {
  if (existsSync(dir)) throw new Error(`refusing existing evidence run dir: ${dir}`);
};

// ---------------------------------------------------------------------------
// identity (Authority Gate E1 field list, canonical order)
// ---------------------------------------------------------------------------
export const buildIdentity = (fields) => {
  const out = {};
  for (const key of IDENTITY_FIELDS) {
    if (!(key in fields) || fields[key] === undefined) throw new Error(`identity field missing: ${key}`);
    out[key] = fields[key];
  }
  return out;
};

// ---------------------------------------------------------------------------
// candidate manifest (canonical payload + digest; never self-containing)
// ---------------------------------------------------------------------------
export const buildCandidateManifest = ({
  schemaVersion = SCHEMA_VERSION,
  runId,
  generatedAt,
  testedCandidateKind,
  baseHead,
  baseTree,
  files,
}) => {
  if (!validateRunId(runId)) throw new Error(`invalid run id: ${String(runId)}`);
  const seen = new Set();
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const f of sorted) {
    if (seen.has(f.path)) throw new Error(`duplicate manifest path: ${f.path}`);
    if (!MANIFEST_CATEGORIES.has(f.category)) throw new Error(`unknown manifest category: ${f.category}`);
    if (!/^[0-9a-f]{64}$/.test(f.sha256)) throw new Error(`invalid sha256 for ${f.path}`);
    seen.add(f.path);
  }
  const payload = {
    schemaVersion,
    kind: "candidate-closure",
    runId,
    generatedAt,
    testedCandidateKind,
    baseHead,
    baseTree,
    files: sorted,
  };
  return { payload, digest: sha256Hex(Buffer.from(canonicalJson(payload), "utf8")) };
};

export const verifyManifestDigest = (payload, digest) =>
  sha256Hex(Buffer.from(canonicalJson(payload), "utf8")) === digest;

export const readClosureShas = (root, specs) =>
  specs.map(({ path, category }) => {
    const abs = resolve(root, path);
    if (!existsSync(abs)) throw new Error(`closure file missing: ${path}`);
    return { path, category, sha256: sha256Hex(readFileSync(abs)) };
  });

// ---------------------------------------------------------------------------
// pass3 / overall classification (expected blocker vs deviating branches)
// ---------------------------------------------------------------------------
export const classifyPass3 = ({ rc, applied, failed }) => {
  const count = Number(applied);
  if (Number(rc) === 0) {
    return { verdict: "FAIL", reason: "UNEXPECTED_SUCCESS", detail: `deploy rc=0 applied=${applied}` };
  }
  if (count > EXPECTED_APPLIED_AT_BLOCKER) {
    // The deploy crossed migration 70 (applied 70..81): the expected blocker
    // was NOT reproduced. Always UNEXPECTED_SUCCESS, never WRONG_MIGRATION.
    return { verdict: "FAIL", reason: "UNEXPECTED_SUCCESS", detail: `deploy crossed migration 70 (applied=${applied})` };
  }
  if (failed !== MIGRATION70) {
    return { verdict: "FAIL", reason: "WRONG_MIGRATION", detail: String(failed) };
  }
  if (count !== EXPECTED_APPLIED_AT_BLOCKER) {
    return { verdict: "FAIL", reason: "WRONG_APPLIED_COUNT", detail: String(applied) };
  }
  return { verdict: "EXPECTED_BLOCKED_M70", reason: "EXPECTED_BLOCKER_REPRODUCED" };
};

// fail-closed per-path qualification: a path is a valid M70 blocker only when
// the blocker record exists, applied/failedMigration are exact, ALL three
// reproduction booleans are true, and pass2 == pass3 on both sqlState (never
// UNKNOWN) and signature (never empty). Any drift or missing flag is a FAIL.
export const qualifyBlockedPath = (path) => {
  const b = path?.blocker;
  if (!b) return { ok: false, reason: "missing blocker record" };
  if (Number(b.applied) !== EXPECTED_APPLIED_AT_BLOCKER) {
    return { ok: false, reason: `applied=${String(b.applied)} (expected ${EXPECTED_APPLIED_AT_BLOCKER})` };
  }
  if (b.failedMigration !== MIGRATION70) {
    return { ok: false, reason: `failedMigration=${String(b.failedMigration)} (expected ${MIGRATION70})` };
  }
  if (b.reproduced !== true || b.sqlStateReproduced !== true || b.firstErrorSignatureReproduced !== true) {
    return {
      ok: false,
      reason: `reproduction flags not all true (reproduced=${b.reproduced}, sqlStateReproduced=${b.sqlStateReproduced}, firstErrorSignatureReproduced=${b.firstErrorSignatureReproduced})`,
    };
  }
  const p2 = b.pass2 ?? {};
  const p3 = b.pass3 ?? {};
  if (!p2.sqlState || p2.sqlState === "UNKNOWN") return { ok: false, reason: `pass2 sqlState unknown (${String(p2.sqlState)})` };
  if (!p3.sqlState || p3.sqlState === "UNKNOWN") return { ok: false, reason: `pass3 sqlState unknown (${String(p3.sqlState)})` };
  if (p2.sqlState !== p3.sqlState) return { ok: false, reason: `pass2/pass3 sqlState drift (${p2.sqlState} vs ${p3.sqlState})` };
  if (!p2.firstErrorSignature) return { ok: false, reason: "pass2 firstErrorSignature empty" };
  if (!p3.firstErrorSignature) return { ok: false, reason: "pass3 firstErrorSignature empty" };
  if (p2.firstErrorSignature !== p3.firstErrorSignature) {
    return { ok: false, reason: `pass2/pass3 signature drift ('${p2.firstErrorSignature}' vs '${p3.firstErrorSignature}')` };
  }
  return { ok: true };
};

// fresh/production: parsed path JSON documents carrying .verdict and .blocker.
export const classifyOverall = ({ fresh, production }) => {
  if (!fresh || !production) {
    return {
      overall: "FAIL",
      consistent: false,
      exitCode: 1,
      isMigrationSuccess: false,
      reason: "missing path document",
    };
  }
  if (fresh.verdict !== "EXPECTED_BLOCKED_M70" || production.verdict !== "EXPECTED_BLOCKED_M70") {
    return {
      overall: "FAIL",
      consistent: false,
      exitCode: 1,
      isMigrationSuccess: false,
      reason: `path verdicts not expected-blocker (fresh=${fresh.verdict}, production=${production.verdict})`,
    };
  }
  const fq = qualifyBlockedPath(fresh);
  if (!fq.ok) {
    return { overall: "FAIL", consistent: false, exitCode: 1, isMigrationSuccess: false, reason: `fresh path: ${fq.reason}` };
  }
  const pq = qualifyBlockedPath(production);
  if (!pq.ok) {
    return { overall: "FAIL", consistent: false, exitCode: 1, isMigrationSuccess: false, reason: `production path: ${pq.reason}` };
  }
  const fs = fresh.blocker.pass3.sqlState;
  const ps = production.blocker.pass3.sqlState;
  const fsig = fresh.blocker.pass3.firstErrorSignature;
  const psig = production.blocker.pass3.firstErrorSignature;
  if (fs !== ps || fsig !== psig) {
    return {
      overall: "FAIL",
      consistent: false,
      exitCode: 1,
      isMigrationSuccess: false,
      reason: `cross-path extraction mismatch (sqlState ${fs}/${ps}, signature '${fsig}'/'${psig}')`,
    };
  }
  return {
    overall: "EXPECTED_BLOCKED_M70",
    consistent: true,
    exitCode: 0,
    isMigrationSuccess: false,
    blockedAt: MIGRATION70,
    reason: "EXPECTED_BLOCKER_REPRODUCED",
  };
};

// ---------------------------------------------------------------------------
// first-error extraction from a verbose postgres container log
// ---------------------------------------------------------------------------
const LOG_LINE_RE =
  /^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)(?: UTC)?\s+\[(\d+)\]\s+(ERROR|STATEMENT|WARNING|NOTICE|DETAIL|HINT|QUERY|LOCATION|CONTEXT):\s?(.*)$/;
// continuation of a multi-line log record (postgres verbose CONTEXT): same
// stamp+pid prefix but NO kind label, e.g. `SQL statement "..."` lines
const LOG_CONT_RE =
  /^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)(?: UTC)?\s+\[(\d+)\]\s+(.*)$/;

const logTsMs = (stamp) => {
  const ms = Date.parse(`${stamp.replace(" ", "T").replace(/\.(\d{1,2})$/, ".$100")}Z`);
  return Number.isNaN(ms) ? null : ms;
};

export const parsePostgresLog = (text) => {
  const out = [];
  for (const line of String(text).split("\n")) {
    const m = LOG_LINE_RE.exec(line.trim()) ?? LOG_CONT_RE.exec(line.trim());
    if (!m) continue;
    const tsMs = logTsMs(m[1]);
    if (tsMs === null) continue;
    if (m.length === 5) out.push({ tsMs, pid: m[2], kind: m[3], rest: m[4] });
    else out.push({ tsMs, pid: m[2], kind: "CONT", rest: m[3] });
  }
  return out;
};

// First ERROR inside [startIso, endIso]. The failing statement is recovered
// from the SAME error event — same pid, bounded by the next ERROR of that pid:
//   1. verbose CONTEXT stack: `SQL statement "<sql>"` (continuation line) or
//      `PL/pgSQL function <name>(...)` — the directly failing SQL call /
//      function (the outer `STATEMENT:` is often the migration transaction
//      wrapper, e.g. `BEGIN;`, and must NOT be used while context exists);
//   2. QUERY lines of the event (literal SQL text);
//   3. the event's STATEMENT line — PostgreSQL appends it AFTER the ERROR
//      (log_min_error_statement); synthetic logs emit it BEFORE execution
//      (log_statement=all), recovered by backward search.
// A statement of a DIFFERENT event — e.g. prisma's trailing bookkeeping
// `UPDATE "_prisma_migrations"` (own 25P02 event) or another backend's
// statement — is separated by an intervening ERROR on that pid and can never
// pair; stale statements from earlier passes are excluded by the window.
const ERROR_STATEMENT_DELTA_MS = 2000;

export const extractFirstError = (logText, startIso, endIso) => {
  const start = Date.parse(startIso);
  const endBase = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(endBase)) throw new Error(`invalid window: ${startIso}..${endIso}`);
  // Legacy second-precision ends (no fraction, e.g. "...T12:29:30Z") mean the
  // WHOLE final second: postgres log stamps carry .xxx, so a naive .000 end
  // would silently exclude a same-second error at .900. Fractional ends stay
  // strict (inclusive). Start is always inclusive at its exact instant.
  const end = /\.\d+/.test(endIso) ? endBase : endBase + 999;
  const lines = parsePostgresLog(logText).filter((l) => l.tsMs >= start && l.tsMs <= end);
  const errorIdx = lines.findIndex((l) => l.kind === "ERROR");
  if (errorIdx === -1) return null;
  const err = lines[errorIdx];
  const inner = err.rest.trim();
  const stateMatch = /^([0-9A-Z]{5}):\s?(.*)$/.exec(inner);
  const sqlState = stateMatch ? stateMatch[1] : "UNKNOWN";
  const message = scrubSensitive(stateMatch ? stateMatch[2] : inner).slice(0, ERROR_MESSAGE_MAX);
  // same error event: same pid, within delta, terminated by the next ERROR
  const event = [];
  for (let i = errorIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.pid !== err.pid) continue;
    if (l.tsMs - err.tsMs > ERROR_STATEMENT_DELTA_MS) break;
    if (l.kind === "ERROR") break;
    event.push(l);
  }
  const ctxLines = event.filter((l) => l.kind === "CONTEXT" || l.kind === "CONT");
  const context = scrubSensitive(ctxLines.map((l) => l.rest.trim()).join(" | ")).slice(0, CONTEXT_MAX);
  // 1) direct failing SQL call from the verbose context stack (innermost first)
  let query = "";
  for (const l of ctxLines) {
    const m = /^SQL statement\s+"([\s\S]*?)"\s*$/.exec(l.rest.trim());
    if (m) {
      query = m[1];
      break;
    }
  }
  if (!query) {
    const q = event.find((l) => l.kind === "QUERY");
    if (q) query = q.rest;
  }
  // 1b) PL/pgSQL function identity from the context stack (innermost first)
  let plpgsqlFn = "";
  for (const l of ctxLines) {
    const m = /^PL\/pgSQL function\s+([A-Za-z_][A-Za-z0-9_$]*(?:\.[A-Za-z_][A-Za-z0-9_$]*)*)\([^)]*\)/.exec(l.rest.trim());
    if (m) {
      plpgsqlFn = m[1];
      break;
    }
  }
  // 3) STATEMENT of the event (real order: after the ERROR), then backward
  let statementText = "";
  const st = event.find((l) => l.kind === "STATEMENT");
  statementText = st ? st.rest : "";
  if (!statementText) {
    for (let i = errorIdx - 1; i >= 0; i--) {
      const l = lines[i];
      if (l.pid !== err.pid) continue;
      if (err.tsMs - l.tsMs > ERROR_STATEMENT_DELTA_MS) break;
      if (l.kind === "ERROR") break;
      if (l.kind === "STATEMENT") {
        statementText = l.rest;
        break;
      }
    }
  }
  const statement = scrubSensitive(query || statementText).slice(0, STATEMENT_MAX);
  let firstErrorSignature = "";
  if (query) {
    // direct failing SQL call from the context stack (innermost first)
    firstErrorSignature = extractStatementSignature(scrubSensitive(query).slice(0, STATEMENT_MAX));
  } else if (plpgsqlFn) {
    // direct failing function identity from the context stack
    firstErrorSignature = `PL/pgSQL function ${plpgsqlFn}(...)`;
  } else if (statementText) {
    // outer STATEMENT line (often the migration transaction wrapper)
    firstErrorSignature = extractStatementSignature(scrubSensitive(statementText).slice(0, STATEMENT_MAX));
  }
  return {
    sqlState,
    message,
    statement,
    query: scrubSensitive(query).slice(0, STATEMENT_MAX),
    context,
    firstErrorSignature,
  };
};

// "Function signature without sensitive values": SELECT/CALL/PERFORM keep the
// qualified function name; DDL keeps verb + object kind + qualified name; DO
// blocks are labeled as anonymous; string literals are scrubbed before any
// fallback truncation.
export const extractStatementSignature = (statement) => {
  const s = String(statement).trim().replace(/\s+/g, " ").replace(/'([^']|'')*'/g, "''");
  if (!s) return "";
  let m = /^(SELECT|CALL|PERFORM)\s+((?:public|pg_catalog)\.)?([a-z_][a-z0-9_]*)\s*\(/i.exec(s);
  if (m) return `${m[1]} ${m[2] ?? ""}${m[3]}(...)`.slice(0, 120);
  if (/^DO\b/i.test(s)) return "DO anonymous block";
  m = /^(ALTER|CREATE|DROP|GRANT|REVOKE|COMMENT|TRUNCATE)\s+(?:[A-Z ]*?\b)?(FUNCTION|TABLE|SCHEMA|INDEX|CONSTRAINT|TRIGGER|VIEW|SEQUENCE|TYPE|ROLE|DATABASE|EXTENSION)\s+((?:public|pg_catalog)\.)?([a-z_][a-z0-9_]*)/i.exec(
    s,
  );
  if (m) return `${m[1]} ${m[2]} ${m[3] ?? ""}${m[4]}`.slice(0, 120);
  // SET LOCAL <guc> — LOCAL is a modifier, the GUC name is the next token
  m = /^(SET)\s+LOCAL\s+([a-z0-9_.]+)/i.exec(s);
  if (m) return `${m[1]} LOCAL ${m[2]}`.slice(0, 120);
  m = /^(SET|RESET|SHOW)\s+([a-z0-9_.]+)/i.exec(s);
  if (m) return `${m[1]} ${m[2]}`.slice(0, 120);
  return s.slice(0, 120);
};

// ---------------------------------------------------------------------------
// bounded blocker log
// ---------------------------------------------------------------------------
export const buildBlockerLog = ({
  identity,
  tag,
  blocker,
  resolveRationale,
  deployTail = "",
  maxBytes = BLOCKER_LOG_MAX,
}) => {
  const p2 = blocker?.pass2 ?? {};
  const p3 = blocker?.pass3 ?? {};
  const lines = [
    `V11-R1 P7 — migration70 blocker extract (path: ${tag})`,
    `schemaVersion: ${identity.schemaVersion}`,
    `runId: ${identity.runId}`,
    `generatedAt: ${identity.generatedAt}`,
    `testedCandidateKind: ${identity.testedCandidateKind}`,
    `testedCommit: ${identity.testedCommit}`,
    `testedTree: ${identity.testedTree}`,
    `baseHead: ${identity.baseHead}`,
    `baseTree: ${identity.baseTree}`,
    `migration69Sha: ${identity.migration69Sha}`,
    `migration70Sha: ${identity.migration70Sha}`,
    `candidateManifestSha: ${identity.candidateManifestSha}`,
    `harnessSha: ${identity.harnessSha}`,
    `conformanceSha: ${identity.conformanceSha}`,
    `postgresImage: ${identity.postgresImage}`,
    `postgresImageId: ${identity.postgresImageId}`,
    `prismaVersion: ${identity.prismaVersion}`,
    `runnerRoleAttributes: ${identity.runnerRoleAttributes}`,
    `migration: ${MIGRATION70}`,
    `applied: ${blocker?.applied ?? "?"}`,
    `failedMigration: ${blocker?.failedMigration ?? "?"}`,
    `pass2 first error: sqlState=${p2.sqlState ?? "?"} signature=${p2.firstErrorSignature ?? "?"} message=${p2.message ?? ""}`,
    `pass2 first error query:${p2.query ? ` ${p2.query}` : ""}`,
    `pass2 first error context:${p2.context ? ` ${p2.context}` : ""}`,
    `pass3 first error: sqlState=${p3.sqlState ?? "?"} signature=${p3.firstErrorSignature ?? "?"} message=${p3.message ?? ""}`,
    `pass3 first error query:${p3.query ? ` ${p3.query}` : ""}`,
    `pass3 first error context:${p3.context ? ` ${p3.context}` : ""}`,
    `ledger: applied=${blocker?.ledger?.applied ?? "?"} failed=[${(blocker?.ledger?.failed ?? []).join(",")}] rolledBack=[${(blocker?.ledger?.rolledBack ?? []).join(",")}]`,
    `resolveRationale: ${resolveRationale}`,
  ];
  let body = lines.join("\n");
  if (deployTail) body += `\n--- bounded deploy-pass3 log tail (sanitized) ---\n${deployTail}`;
  // git show --check contract: no trailing whitespace on ANY line and exactly
  // one trailing LF, even when empty fields or a deployTail carrying its own
  // trailing whitespace / blank lines are involved
  body = `${body.replace(/[ \t]+$/gm, "").replace(/\n+$/, "")}\n`;
  if (Buffer.byteLength(body, "utf8") > maxBytes) {
    body = `${body.slice(0, maxBytes - 64)}\n...TRUNCATED (bounded blocker log)\n`;
  }
  return body;
};

// ---------------------------------------------------------------------------
// fixture summary (non-sensitive essential subset for persisted evidence)
// ---------------------------------------------------------------------------
// The generated fixture JSON carries signing material (publicKeyHex, nonce,
// payloadDigest, signature, reportId, full attestation/kat tuples). Persisted
// evidence may only contain this essential allowlist — never the sensitive
// shapes, per the Authority's "no complete sensitive/raw fixture" rule.
export const FIXTURE_SUMMARY_KEYS = [
  "tag",
  "rolloutId",
  "environment",
  "schemaCompatibility",
  "manifestDigest",
  "expectedCount",
  "telemetryCount",
];
export const FIXTURE_SUMMARY_FORBIDDEN = [
  "publicKeyHex",
  "nonce",
  "reportId",
  "payloadDigest",
  "signature",
  "attestation",
  "kat",
  "files",
];

export const summarizeFixture = (fixture, tag = "") => {
  const out = { tag: tag || fixture?.tag || "" };
  for (const key of FIXTURE_SUMMARY_KEYS) {
    if (key === "tag") continue;
    if (fixture && key in fixture) out[key] = fixture[key];
  }
  return out;
};

// ---------------------------------------------------------------------------
// removed-raw-evidence
// ---------------------------------------------------------------------------
export const buildRemovedEvidence = (records) =>
  [...records]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map(({ path, category, sha256, bytes }) => ({
      path,
      category,
      sha256,
      bytes,
      deleted: true,
    }));

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const flag = (args, name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const hasFlag = (args, name) => args.includes(name);

const main = async (argv) => {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case "run-id":
      process.stdout.write(`${computeRunId()}\n`);
      return;
    case "validate-run-id": {
      const ok = validateRunId(rest[0]);
      if (!ok) {
        process.stderr.write(`invalid run id: ${rest[0]}\n`);
        process.exitCode = 1;
      }
      return;
    }
    case "identity": {
      const fields = {};
      for (const kv of rest) {
        const i = kv.indexOf("=");
        fields[kv.slice(0, i)] = kv.slice(i + 1);
      }
      process.stdout.write(`${canonicalJson(buildIdentity(fields))}`);
      return;
    }
    case "manifest": {
      const root = flag(rest, "--root");
      const outDir = flag(rest, "--out");
      const files = readClosureShas(root, DEFAULT_CLOSURE);
      for (const spec of rest) {
        if (!spec.startsWith("--file=")) continue;
        const [path, category] = spec.slice(7).split(":");
        files.push(...readClosureShas(root, [{ path, category }]));
      }
      const { payload, digest } = buildCandidateManifest({
        runId: flag(rest, "--run-id"),
        generatedAt: flag(rest, "--generated-at"),
        testedCandidateKind: flag(rest, "--kind"),
        baseHead: flag(rest, "--base-head"),
        baseTree: flag(rest, "--base-tree"),
        files,
      });
      const payloadFile = join(outDir, "candidate-manifest.json");
      writeFileSync(payloadFile, canonicalJson(payload));
      process.stdout.write(`${JSON.stringify({ digest, payloadFile })}\n`);
      return;
    }
    case "extract-first-error": {
      const found = extractFirstError(
        readFileSync(flag(rest, "--log"), "utf8"),
        flag(rest, "--start"),
        flag(rest, "--end"),
      );
      process.stdout.write(`${JSON.stringify(found)}\n`);
      return;
    }
    case "classify-pass3": {
      process.stdout.write(
        `${JSON.stringify(
          classifyPass3({
            rc: Number(flag(rest, "--rc")),
            applied: Number(flag(rest, "--applied")),
            failed: flag(rest, "--failed"),
          }),
        )}\n`,
      );
      return;
    }
    case "blocker-info": {
      const pass2 = JSON.parse(flag(rest, "--pass2") || "null");
      const pass3 = JSON.parse(flag(rest, "--pass3") || "null");
      const failedName = flag(rest, "--failed") || "";
      process.stdout.write(
        `${JSON.stringify({
          reproduced: pass2?.sqlState !== "UNKNOWN" && pass2?.sqlState === pass3?.sqlState,
          sqlStateReproduced: pass2?.sqlState === pass3?.sqlState,
          firstErrorSignatureReproduced: pass2?.firstErrorSignature === pass3?.firstErrorSignature,
          applied: Number(flag(rest, "--applied")),
          failedMigration: failedName,
          ledger: {
            applied: Number(flag(rest, "--applied")),
            failed: failedName ? [failedName] : [],
            rolledBack: (flag(rest, "--rolled-back") ?? "").split(",").filter(Boolean),
          },
          pass2,
          pass3,
        })}\n`,
      );
      return;
    }
    case "blocker-log": {
      const identity = readJson(flag(rest, "--identity"));
      const blocker = readJson(flag(rest, "--info"));
      const tailFile = flag(rest, "--deploy-tail");
      const tail = tailFile && existsSync(tailFile) ? readFileSync(tailFile, "utf8").split("\n").slice(-25).join("\n") : "";
      const body = buildBlockerLog({
        identity,
        tag: flag(rest, "--tag"),
        blocker,
        resolveRationale: flag(rest, "--rationale"),
        deployTail: tail,
      });
      writeFileSync(flag(rest, "--out"), body);
      return;
    }
    case "summarize": {
      const fresh = readJson(flag(rest, "--fresh"));
      const production = readJson(flag(rest, "--production"));
      const identity = readJson(flag(rest, "--identity"));
      const decision = classifyOverall({ fresh, production });
      const p3 = (p) => p?.blocker?.pass3 ?? null;
      const summary = {
        schemaVersion: identity.schemaVersion,
        runId: identity.runId,
        generatedAt: flag(rest, "--generated-at"),
        evidenceDir: flag(rest, "--evidence-dir"),
        identity,
        overall: decision.overall,
        isMigrationSuccess: decision.isMigrationSuccess,
        blockedAt: decision.blockedAt ?? null,
        blockerConsistency: {
          consistent: decision.consistent,
          sqlState: { fresh: p3(fresh)?.sqlState ?? null, production: p3(production)?.sqlState ?? null },
          firstErrorSignature: {
            fresh: p3(fresh)?.firstErrorSignature ?? null,
            production: p3(production)?.firstErrorSignature ?? null,
          },
        },
        paths: {
          fresh: fresh
            ? { verdict: fresh.verdict, applied: fresh.blocker?.applied ?? fresh.facts?.["pass3.applied"] ?? null, failedMigration: fresh.blocker?.failedMigration ?? null, sqlState: p3(fresh)?.sqlState ?? null, firstErrorSignature: p3(fresh)?.firstErrorSignature ?? null }
            : { verdict: "MISSING" },
          production: production
            ? { verdict: production.verdict, applied: production.blocker?.applied ?? production.facts?.["pass3.applied"] ?? null, failedMigration: production.blocker?.failedMigration ?? null, sqlState: p3(production)?.sqlState ?? null, firstErrorSignature: p3(production)?.firstErrorSignature ?? null }
            : { verdict: "MISSING" },
        },
      };
      writeFileSync(join(flag(rest, "--evidence-dir"), "summary.json"), canonicalJson(summary));
      process.stdout.write(`${JSON.stringify({ overall: decision.overall, exitCode: decision.exitCode, consistent: decision.consistent, blockedAt: decision.blockedAt ?? null })}\n`);
      return;
    }
    case "removed": {
      const records = readFileSync(flag(rest, "--records"), "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
      writeFileSync(
        flag(rest, "--out"),
        canonicalJson({ schemaVersion: SCHEMA_VERSION, runId: flag(rest, "--run-id"), records: buildRemovedEvidence(records) }),
      );
      return;
    }
    case "fixture-summary": {
      const fixture = readJson(flag(rest, "--fixture"));
      // no trailing newline: the caller embeds this value raw in a JSONL fact
      process.stdout.write(JSON.stringify(summarizeFixture(fixture, flag(rest, "--tag") ?? "")));
      return;
    }
    default:
      process.stderr.write(`unknown subcommand: ${cmd}\n`);
      process.exitCode = 2;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write("v11-r1-p7-evidence.mjs <run-id|validate-run-id|identity|manifest|extract-first-error|classify-pass3|blocker-info|blocker-log|summarize|removed|fixture-summary> ...\n");
    process.exitCode = 2;
  } else {
    await main(args);
  }
}
