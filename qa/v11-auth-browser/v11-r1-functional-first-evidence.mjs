#!/usr/bin/env node
// V11-R1 Functional-First F0 — evidence assembly helper.
//
// The runner (run-v11-r1-functional-first-migration.sh) dispatches the shared
// run-identity primitives through the P7 evidence helper binary
// (v11-r1-p7-evidence.mjs: run-id / validate-run-id / identity / manifest /
// extract-first-error / fixture-summary / removed). THIS file adds the
// success-oriented assembly the F0 gate needs — both paths must END at
// ledger 83 successful / 0 unresolved failed with a no-op second deploy:
//
//   assemble-path — build <tag>.json (verdict SUCCESS/FAIL, facts,
//                   assertions, segments, ledger, deploy rcs, no-op text,
//                   first failure evidence) from the runner's jsonl records
//   summary       — write summary.json (overall SUCCESS/FAIL, per-path
//                   ledger 83/0, deploy rcs, no-op text, M69/M70 SHA)
//   noop          — extract the prisma no-op line from a deploy log
//
// Run (from the repo root, same conventions as the P7 helper):
//   node qa/v11-auth-browser/v11-r1-functional-first-evidence.mjs \
//     assemble-path <out> <logs> <tag> <container> <db> <rc> <identity> <expectedTotal>
//   node qa/v11-auth-browser/v11-r1-functional-first-evidence.mjs \
//     summary --fresh <f> --production <p> --identity <i> --generated-at <iso> --evidence-dir <d>
//   node qa/v11-auth-browser/v11-r1-functional-first-evidence.mjs noop --log <deployLog>
//
// No database, docker container or product code is touched; the drill script
// itself is never executed here.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  canonicalJson,
  computeRunId,
  validateRunId,
  buildIdentity,
  buildCandidateManifest,
  readClosureShas,
  DEFAULT_CLOSURE,
  IDENTITY_FIELDS,
  extractFirstError,
  scrubSensitive,
  buildRemovedEvidence,
  summarizeFixture,
} from "./v11-r1-p7-evidence.mjs";

export const F0_SCHEMA_VERSION = "v11-r1-functional-first-run-2";
export const F0_EXPECTED_TOTAL = 83;

// prisma migrate deploy prints exactly one of these when nothing is pending
// (verified against the installed prisma 6.19 build).
export const NOOP_PATTERNS = [
  /No pending migrations to apply/,
  /Already in sync, no schema change or pending migration was found/,
];

export const readJson = (p) => (p && existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

export const readJsonl = (p) =>
  existsSync(p)
    ? readFileSync(p, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];

// ---------------------------------------------------------------------------
// noop extraction
// ---------------------------------------------------------------------------
export const extractNoop = (logText) => {
  const lines = String(logText).split("\n");
  for (const line of lines) {
    if (NOOP_PATTERNS.some((re) => re.test(line))) {
      return { text: line.trim(), line: line.trim() };
    }
  }
  return { text: "", line: "" };
};

// ---------------------------------------------------------------------------
// assemble-path: <out> <logs> <tag> <container> <db> <rc> <identityFile> <expectedTotal>
// ---------------------------------------------------------------------------
export const assemblePath = ({
  out,
  logs,
  tag,
  container,
  db,
  rc,
  identityFile,
  expectedTotal,
}) => {
  const segments = readJsonl(`${logs}/${tag}-segments.jsonl`);
  const assertions = {};
  const facts = {};
  for (const f of readJsonl(`${logs}/${tag}-facts.jsonl`)) {
    if (f.key.startsWith("assert:")) assertions[f.key.slice(7)] = f.value;
    else facts[f.key] = f.value;
  }
  const failures = readJsonl(`${logs}/${tag}-failures.jsonl`);
  const identity = readJson(identityFile);
  const aborted = facts.aborted ? String(facts.aborted) : null;

  const allAssertionsPass = Object.values(assertions).every((a) => a.pass === true);
  const ledgerOk =
    String(facts["ledger.applied"]) === String(expectedTotal) &&
    String(facts["ledger.unresolvedFailed"]) === "0" &&
    String(facts["ledger.rolledBack"]) === "0";
  const verdict =
    aborted === null && failures.length === 0 && Number(rc) === 0 && allAssertionsPass && ledgerOk
      ? "SUCCESS"
      : "FAIL";

  const result = {
    schemaVersion: identity?.schemaVersion ?? F0_SCHEMA_VERSION,
    runId: identity?.runId ?? null,
    path: tag,
    container,
    database: db,
    expectedTotal: Number(expectedTotal),
    verdict,
    aborted,
    ledger: {
      applied: Number(facts["ledger.applied"] ?? -1),
      unresolvedFailed: Number(facts["ledger.unresolvedFailed"] ?? -1),
      rolledBack: Number(facts["ledger.rolledBack"] ?? -1),
    },
    deployRcs: Object.fromEntries(
      Object.entries(facts)
        .filter(([k]) => k.endsWith(".rc"))
        .map(([k, v]) => [k.slice(0, -3), Number(v)]),
    ),
    noop: facts["noop.text"] ? { text: String(facts["noop.text"]), boundedLog: String(facts["noop.boundedLog"] ?? "") } : null,
    fixture: facts["fixture.rolloutId"]
      ? {
          rolloutId: String(facts["fixture.rolloutId"]),
          manifestDigest: String(facts["fixture.manifestDigest"] ?? ""),
          consumed: Number(facts["fixture.consumed"] ?? -1),
          telemetryRows: Number(facts["fixture.telemetryRows"] ?? -1),
        }
      : null,
    migration69Sha: String(facts["migration69Sha"] ?? ""),
    migration70Sha: String(facts["migration70Sha"] ?? ""),
    firstFailure: failures[0] ?? null,
    failures,
    identity,
    segments,
    assertions,
    facts,
  };
  writeFileSync(join(out, `${tag}.json`), canonicalJson(result));
  process.stdout.write(`${tag}: ${verdict} (${Object.keys(assertions).length} assertions, ${failures.length} failures)\n`);
};

// ---------------------------------------------------------------------------
// summary: --fresh <f> --production <p> --identity <i> --generated-at <iso> --evidence-dir <d>
// ---------------------------------------------------------------------------
export const buildSummary = ({ fresh, production, identity, generatedAt, evidenceDir }) => {
  const paths = { fresh, production };
  const pathSummary = (tag) => {
    const p = paths[tag];
    if (!p) return { verdict: "MISSING" };
    return {
      verdict: p.verdict,
      ledger: p.ledger,
      deployRcs: p.deployRcs,
      noop: p.noop,
      fixture: p.fixture,
      migration69Sha: p.migration69Sha,
      migration70Sha: p.migration70Sha,
      firstFailure: p.firstFailure,
      failures: p.failures,
    };
  };
  const freshOk = fresh?.verdict === "SUCCESS";
  const productionOk = production?.verdict === "SUCCESS";
  const overall = freshOk && productionOk ? "SUCCESS" : "FAIL";
  const failedPaths = Object.entries({ fresh: freshOk, production: productionOk })
    .filter(([, ok]) => !ok)
    .map(([tag]) => tag);
  const summary = {
    schemaVersion: identity?.schemaVersion ?? F0_SCHEMA_VERSION,
    runId: identity?.runId ?? null,
    generatedAt,
    evidenceDir,
    identity,
    overall,
    exitCode: overall === "SUCCESS" ? 0 : 1,
    failedPaths,
    ledgerTarget: { successful: F0_EXPECTED_TOTAL, unresolvedFailed: 0, rolledBack: 0 },
    paths: {
      fresh: pathSummary("fresh"),
      production: pathSummary("production"),
    },
  };
  writeFileSync(join(evidenceDir, "summary.json"), canonicalJson(summary));
  return { overall, exitCode: summary.exitCode, failedPaths };
};

// ---------------------------------------------------------------------------
// CLI dispatch
// ---------------------------------------------------------------------------
const flag = (rest, name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};

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
      const root = resolve(flag(rest, "--root"));
      const outDir = flag(rest, "--out");
      const files = readClosureShas(root, DEFAULT_CLOSURE);
      for (const spec of rest) {
        if (!spec.startsWith("--file=")) continue;
        const [path, category] = spec.slice(7).split(":");
        files.push(...readClosureShas(root, [{ path, category }]));
      }
      const { payload, digest } = buildCandidateManifest({
        schemaVersion: F0_SCHEMA_VERSION,
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
    case "removed": {
      const records = readFileSync(flag(rest, "--records"), "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
      writeFileSync(
        flag(rest, "--out"),
        canonicalJson({ schemaVersion: F0_SCHEMA_VERSION, runId: flag(rest, "--run-id"), records: buildRemovedEvidence(records) }),
      );
      return;
    }
    case "fixture-summary": {
      process.stdout.write(JSON.stringify(summarizeFixture(readJson(flag(rest, "--fixture")), flag(rest, "--tag") ?? "")));
      return;
    }
    case "assemble-path": {
      const [out, logs, tag, container, db, rc, identityFile, expectedTotal] = rest;
      if (!out || !logs || !tag) throw new Error("assemble-path <out> <logs> <tag> <container> <db> <rc> <identity> <expectedTotal>");
      assemblePath({ out, logs, tag, container, db, rc, identityFile, expectedTotal: Number(expectedTotal ?? F0_EXPECTED_TOTAL) });
      return;
    }
    case "summary": {
      const result = buildSummary({
        fresh: readJson(flag(rest, "--fresh")),
        production: readJson(flag(rest, "--production")),
        identity: readJson(flag(rest, "--identity")),
        generatedAt: flag(rest, "--generated-at"),
        evidenceDir: flag(rest, "--evidence-dir"),
      });
      process.stdout.write(`${JSON.stringify(result)}\n`);
      return;
    }
    case "noop": {
      process.stdout.write(`${JSON.stringify(extractNoop(readFileSync(flag(rest, "--log"), "utf8")))}\n`);
      return;
    }
    case "extract-first-error": {
      // thin re-dispatch so failure evidence is computed identically to P7
      process.stdout.write(
        `${JSON.stringify(
          extractFirstError(readFileSync(flag(rest, "--log"), "utf8"), flag(rest, "--start"), flag(rest, "--end")),
        )}\n`,
      );
      return;
    }
    case "scrub": {
      process.stdout.write(scrubSensitive(readFileSync(flag(rest, "--file"), "utf8")));
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
    process.stderr.write("v11-r1-functional-first-evidence.mjs <run-id|validate-run-id|identity|manifest|assemble-path|summary|noop|extract-first-error|removed|fixture-summary|scrub> ...\n");
    process.exitCode = 2;
  } else {
    try {
      await main(args);
    } catch (err) {
      process.stderr.write(`${err.message}\n`);
      process.exitCode = 1;
    }
  }
}
