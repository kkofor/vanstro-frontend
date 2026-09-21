#!/usr/bin/env node
// V11-R1 P7 — disposable PG16 migration-drill fixture generator.
//
// Produces the OUT-OF-MIGRATION admin-contract fixtures that migrations 69/70
// (f1_v15_expand / f1_v15_phase_b) assert at deploy time, following the recipe
// proven by tasks/tooling/f1-v15-clarification/owned-pg16-conformance.mjs:
//   * pinned ed25519 verifier preset (vanstro_verify_ed25519_v1) whose
//     allowlist covers a fixed KAT tuple plus THIS fixture's attestation tuple
//   * f1_trusted_ed25519_signer row (purpose 'deployment_attestation')
//   * f1_deployment_expected_instance row (1 expected instance)
//   * f1_deployment_instance_attestation row signed over the exact framed
//     payload f1_consume_no_old_instances_v2 reconstructs
//   * f1_old_call_report row (fresh window, consumedAt NULL)
//   * exactly 31 f1_old_function_call_telemetry rows (the frozen old68
//     runtime surface, callCount = 0) — the consume contract requires the
//     count to be exactly 31 and no row may have callCount > 0
//
// The deployment-attestation frame (must byte-match the consume function):
//   int32(len)||bytes for each of: 'vanstro.deployment-attestation.v1',
//   rolloutId, environment, instanceId, codeVersion, schemaCompatibility::text,
//   attestationDigest, epoch(observedAt), draining::text, nonce, attestedBy.
//
// Usage:
//   node v11-p7-fixture.mjs --root <repo> --out <dir> --tag <fresh|production>
//     [--rollout <id>] [--environment test] [--instance api-1]
//     [--code-version new69] [--schema-compat 69] [--signer deployment-signer-test]
//
// Writes <out>/fixture-<tag>-<rollout>.sql and .json. The SQL is applied by the
// drill as the disposable superuser immediately before the migration-70 retry;
// the JSON carries the GUC values (vanstro.rollout_id / environment /
// manifest_digest) the drill persists with ALTER DATABASE so every
// `prisma migrate deploy` connection inherits them.
//
// The private key below is a FIXED DISPOSABLE TEST KEY (same seed as the
// conformance harness); it is never written to any file — only the public key,
// digests and signatures are emitted. No credentials, passwords or URLs are
// ever part of the output.
import { createPrivateKey, createPublicKey, sign, createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const args = {};
for (let i = 2; i < process.argv.length; i += 1) {
  const a = process.argv[i];
  if (a.startsWith("--")) args[a.slice(2)] = process.argv[i + 1];
}
for (const k of ["root", "out", "tag"]) {
  if (!args[k]) throw new Error(`--${k} required`);
}
const root = resolve(args.root);
const outDir = resolve(args.out);
const tag = String(args.tag);
const rolloutId = args.rollout ?? `rollout-${tag}-${Date.now()}`;
const environment = args.environment ?? "test";
const instanceId = args.instance ?? "api-1";
const codeVersion = args["code-version"] ?? "new69";
const schemaCompatibility = Number(args["schema-compat"] ?? 69);
const signerId = args.signer ?? "deployment-signer-test";
const attestedBy = "deploy-controller";

if (!/^[A-Za-z0-9_-]{1,64}$/.test(rolloutId)) throw new Error(`invalid rollout id: ${rolloutId}`);
if (!/^[A-Za-z0-9_-]{1,64}$/.test(signerId)) throw new Error(`invalid signer id: ${signerId}`);

// ---- disposable fixed test keypair (recipe seed) ---------------------------
const seed = Buffer.from("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60", "hex");
const pkcs8 = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]);
const privateKey = createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
const publicKey = createPublicKey(privateKey);
const publicKeyHex = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("hex");

// ---- deterministic manifest digest over the 68 source migration names ------
const migrationsDir = join(root, "packages/db/prisma/migrations");
const dirs = (await readdir(migrationsDir, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
if (dirs.length !== 83) throw new Error(`EXPECTED_83_MIGRATIONS got ${dirs.length}`);
const sourceNames = dirs.slice(0, 68);
const manifestDigest = createHash("sha256").update(sourceNames.join("\n")).digest("hex");

// ---- frozen old68 runtime surface (31 identity signatures) ------------------
const surfacePath = join(root, "tasks/tooling/f1-v15-clarification/03-old68-runtime-surface.json");
const surface = JSON.parse(await readFile(surfacePath, "utf8"));
const signatures = surface.old68RuntimeSurface.map((x) => x.identitySignature);
if (signatures.length !== 31) throw new Error(`EXPECTED_31_OLD68_SIGNATURES got ${signatures.length}`);

// ---- framing + signing ------------------------------------------------------
const frame = (values) =>
  Buffer.concat(
    values.map((value) => {
      const b = Buffer.from(String(value));
      const n = Buffer.alloc(4);
      n.writeUInt32BE(b.length);
      return Buffer.concat([n, b]);
    }),
  );
const sqlQuote = (s) => `'${String(s).replaceAll("'", "''")}'`;

// Fixed KAT tuple: proves the pinned verifier itself (self-check, recipe).
const katPayload = frame(["vanstro.ed25519-kat.v1", "subject-signer-test", "pinned-verifier-v22"]);
const katSignature = sign(null, katPayload, privateKey);
const katDigest = createHash("sha256").update(katPayload).digest("hex");

// Fresh deployment attestation for THIS rollout (observedAt is now-based so it
// lands inside the consume window: > now-2min and <= now+5s).
const observedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
const observedAtEpoch = Math.floor(observedAt.getTime() / 1000);
const nonce = "nonce_deployment_000001"; // satisfies ^[A-Za-z0-9_-]{22,128}$
const attestationPayload = frame([
  "vanstro.deployment-attestation.v1",
  rolloutId,
  environment,
  instanceId,
  codeVersion,
  String(schemaCompatibility),
  manifestDigest,
  observedAtEpoch,
  "false",
  nonce,
  attestedBy,
]);
const attestationSignature = sign(null, attestationPayload, privateKey);
const attestationDigest = createHash("sha256").update(attestationPayload).digest("hex");

// Old-call-report fixture: fresh window (windowEndedAt <= consume-time + 5s is
// required by f1_consume_no_old_instances_v2), consumedAt stays NULL.
const reportId = randomUUID();
const windowStartedAt = new Date(observedAt.getTime() - 60_000);
const windowEndedAt = new Date(observedAt.getTime() + 3_000);
const collectorNonce = "nonce_collector_00000001";
const reportPayload = frame([
  "vanstro.old-call-report.v1",
  reportId,
  rolloutId,
  environment,
  manifestDigest,
  Math.floor(windowStartedAt.getTime() / 1000),
  Math.floor(windowEndedAt.getTime() / 1000),
  collectorNonce,
  signerId,
]);
const reportSignature = sign(null, reportPayload, privateKey);
const reportDigest = createHash("sha256").update(reportPayload).digest("hex");

const signatureList = signatures.map((s) => sqlQuote(s)).join(",");

const sql = `-- V11-R1 P7 fixture SQL (GENERATED — disposable test material, no secrets)
-- tag=${tag} rollout=${rolloutId} environment=${environment} instance=${instanceId}
-- manifestDigest=${manifestDigest} observedAt=${observedAt.toISOString()}
-- Apply as the disposable superuser AFTER migration 69 created the f1_* tables
-- and IMMEDIATELY BEFORE the migration-70 retry (attestation window ~2 min).

-- 1) pinned ed25519 verifier preset (KAT self-check OR this fixture's tuple)
CREATE OR REPLACE FUNCTION public.vanstro_verify_ed25519_v1(payload bytea, signature bytea, public_key bytea)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
SELECT (public.digest(payload,'sha256')=decode(${sqlQuote(katDigest)},'hex') AND signature=decode(${sqlQuote(katSignature.toString("hex"))},'hex') AND public_key=decode(${sqlQuote(publicKeyHex)},'hex'))
    OR (public.digest(payload,'sha256')=decode(${sqlQuote(attestationDigest)},'hex') AND signature=decode(${sqlQuote(attestationSignature.toString("hex"))},'hex') AND public_key=decode(${sqlQuote(publicKeyHex)},'hex'))
$fn$;
ALTER FUNCTION public.vanstro_verify_ed25519_v1(bytea,bytea,bytea) OWNER TO vanstro_crypto_verifier_owner;
REVOKE ALL ON FUNCTION public.vanstro_verify_ed25519_v1(bytea,bytea,bytea) FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.vanstro_verify_ed25519_v1(bytea,bytea,bytea) TO vanstro_p10_guard_owner,vanstro_migrator,vanstro_telemetry_guard_owner;

-- 2) trusted deployment signer (purpose/active/window match the consume join)
INSERT INTO public.f1_trusted_ed25519_signer ("signerId","publicKey",purpose,active,"notBefore","notAfter","createdAt")
VALUES (${sqlQuote(signerId)}, decode(${sqlQuote(publicKeyHex)},'hex'), 'deployment_attestation', true,
        CURRENT_TIMESTAMP - interval '1 hour', CURRENT_TIMESTAMP + interval '24 hours', CURRENT_TIMESTAMP);

-- 3) expected instance + 4) signed instance attestation (rollout-scoped, fresh)
INSERT INTO public.f1_deployment_expected_instance ("rolloutId",environment,"instanceId","expectedCodeVersion","expectedSchemaCompatibility","expectedManifestDigest")
VALUES (${sqlQuote(rolloutId)},${sqlQuote(environment)},${sqlQuote(instanceId)},${sqlQuote(codeVersion)},${schemaCompatibility},${sqlQuote(manifestDigest)});

INSERT INTO public.f1_deployment_instance_attestation ("rolloutId",environment,"instanceId","codeVersion","schemaCompatibility","observedAt",draining,"attestationDigest",nonce,signature,"signerId","attestedBy")
VALUES (${sqlQuote(rolloutId)},${sqlQuote(environment)},${sqlQuote(instanceId)},${sqlQuote(codeVersion)},${schemaCompatibility},${sqlQuote(observedAt.toISOString())},false,${sqlQuote(manifestDigest)},${sqlQuote(nonce)},decode(${sqlQuote(attestationSignature.toString("hex"))},'hex'),${sqlQuote(signerId)},${sqlQuote(attestedBy)});

-- 5) old-call-report (UNIQUE rolloutId; windowEndedAt <= now+5s at consume)
INSERT INTO public.f1_old_call_report ("reportId","rolloutId",environment,"manifestDigest","windowStartedAt","windowEndedAt","collectorNonce","collectorSignerId","reportDigest",signature)
VALUES (${sqlQuote(reportId)},${sqlQuote(rolloutId)},${sqlQuote(environment)},${sqlQuote(manifestDigest)},${sqlQuote(windowStartedAt.toISOString())},${sqlQuote(windowEndedAt.toISOString())},${sqlQuote(collectorNonce)},${sqlQuote(signerId)},decode(${sqlQuote(reportDigest)},'hex'),decode(${sqlQuote(reportSignature.toString("hex"))},'hex'));

-- 6) exactly 31 old68 telemetry rows, callCount = 0, resolved by identity
--    signature from the live pg_proc catalog (consume joins telemetry rows to
--    the CURRENT function identity and requires exactly 31)
INSERT INTO public.f1_old_function_call_telemetry ("reportId","rolloutId","functionOid","identitySignature","callCount")
SELECT ${sqlQuote(reportId)},${sqlQuote(rolloutId)},p.oid,'public.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',0
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND 'public.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' IN (${signatureList});
`;

const json = {
  tag,
  rolloutId,
  environment,
  instanceId,
  codeVersion,
  schemaCompatibility,
  manifestDigest,
  observedAt: observedAt.toISOString(),
  windowStartedAt: windowStartedAt.toISOString(),
  windowEndedAt: windowEndedAt.toISOString(),
  signerId,
  attestedBy,
  publicKeyHex,
  nonce,
  reportId,
  expectedCount: 1,
  telemetryCount: 31,
  attestation: {
    payloadDigest: attestationDigest,
    signature: attestationSignature.toString("hex"),
  },
  kat: {
    payloadDigest: katDigest,
    signature: katSignature.toString("hex"),
  },
  generatedAt: new Date().toISOString(),
};

await mkdir(outDir, { recursive: true });
const sqlFile = join(outDir, `fixture-${tag}-${rolloutId}.sql`);
const jsonFile = join(outDir, `fixture-${tag}-${rolloutId}.json`);
await writeFile(sqlFile, sql);
await writeFile(jsonFile, JSON.stringify({ ...json, files: { sql: sqlFile, json: jsonFile } }, null, 2) + "\n");
process.stdout.write(`${JSON.stringify(json)}\n`);
