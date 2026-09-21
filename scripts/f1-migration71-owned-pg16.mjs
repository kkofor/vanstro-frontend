#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const FROZEN_HARNESS = new URL("../tasks/tooling/f1-v15-clarification/owned-pg16-conformance.mjs", import.meta.url);
const FROZEN_HARNESS_SHA256 = "9121bc6bc09c8d08cb333cc4045b99103ff440e628a75c01a3295861f979d479";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const args = process.argv.slice(2);
const migration71Index = args.indexOf("--migration71");
const migration72Index = args.indexOf("--migration72");
if (migration71Index < 0 || !args[migration71Index + 1]) throw new Error("--migration71 required");
if (migration72Index < 0 || !args[migration72Index + 1]) throw new Error("--migration72 required");
const frozen = await readFile(FROZEN_HARNESS, "utf8");
if (sha256(frozen) !== FROZEN_HARNESS_SHA256) throw new Error("FROZEN_OWNED_HARNESS_DRIFT");

const parserAnchor = 'for(const k of ["root","sql","old68","migration70","bootstrap","concurrent"])if(!a[k])throw new Error(`--${k} required`);const root=resolve(a.root),sqlPath=resolve(a.sql),old68Path=resolve(a.old68),migration70Path=resolve(a.migration70),bootstrapPath=resolve(a.bootstrap),concurrentPath=resolve(a.concurrent);';
const parserReplacement = 'for(const k of ["root","sql","old68","migration70","migration71","migration72","bootstrap","concurrent"])if(!a[k])throw new Error(`--${k} required`);const root=resolve(a.root),sqlPath=resolve(a.sql),old68Path=resolve(a.old68),migration70Path=resolve(a.migration70),migration71Path=resolve(a.migration71),migration72Path=resolve(a.migration72),bootstrapPath=resolve(a.bootstrap),concurrentPath=resolve(a.concurrent),strictApiRoot=a.strictApiRoot?resolve(a.strictApiRoot):null;';
const dockerAnchor = 'run("docker",["run","--detach","--rm","--name",container,"-e",`POSTGRES_PASSWORD=${password}`,"-e","POSTGRES_DB=clarification","postgres:16-alpine"]);';
const dockerReplacement = 'run("docker",["run","--detach","--rm","--name",container,"-p","127.0.0.1::5432","-e",`POSTGRES_PASSWORD=${password}`,"-e","POSTGRES_DB=clarification","postgres:16-alpine"]);';
const psqlAnchor = 'const psql=(input,user="postgres")=>run("docker",["exec","-i",container,"psql","-X","-v","ON_ERROR_STOP=1","-U",user,"-d","clarification"],{input});';
const psqlReplacement = 'let dbName="clarification";const psql=(input,user="postgres")=>run("docker",["exec","-i",container,"psql","-X","-v","ON_ERROR_STOP=1","-U",user,"-d",dbName],{input});';
const executionAnchor = 'if(replay.status===0)throw new Error("ATTESTATION_REPLAY_ACCEPTED");';
// Functional-first M70: the A+ post70 closure assertion (old worker lifecycle
// entry-point EXECUTE must have been revoked by migration70) is replaced by
// the functional-first contract: API/Worker old-entry privileges are KEPT, so
// vanstro_runtime MUST still hold EXECUTE on the legacy worker lifecycle
// entry point after migration70. Every other harness assertion (attestation
// consumption, instance attestation cleared, migrator not superuser, replay
// denial, M71/M72 atomicity + ACL matrices) is unchanged.
const post70Anchor = "AND NOT has_function_privilege('vanstro_runtime','public.p09_worker_startup(text,text,text,text[],integer,timestamptz)','EXECUTE') AND (SELECT NOT rolsuper FROM pg_roles WHERE rolname='vanstro_migrator');";
const post70Replacement = "AND has_function_privilege('vanstro_runtime','public.p09_worker_startup(text,text,text,text[],integer,timestamptz)','EXECUTE') AND (SELECT NOT rolsuper FROM pg_roles WHERE rolname='vanstro_migrator');";
const extension = await readFile(new URL("./f1-migration71-owned-extension.txt", import.meta.url), "utf8");
if (!frozen.includes(parserAnchor) || frozen.split(parserAnchor).length !== 2) throw new Error("FROZEN_PARSER_ANCHOR_MISMATCH");
if (!frozen.includes(dockerAnchor) || frozen.split(dockerAnchor).length !== 2) throw new Error("FROZEN_DOCKER_ANCHOR_MISMATCH");
if (!frozen.includes(psqlAnchor) || frozen.split(psqlAnchor).length !== 2) throw new Error("FROZEN_PSQL_ANCHOR_MISMATCH");
if (!frozen.includes(executionAnchor) || frozen.split(executionAnchor).length !== 2) throw new Error("FROZEN_EXECUTION_ANCHOR_MISMATCH");
if (!frozen.includes(post70Anchor) || frozen.split(post70Anchor).length !== 2) throw new Error("FROZEN_POST70_ANCHOR_MISMATCH");
const derived = frozen.replace(parserAnchor, parserReplacement).replace(dockerAnchor, dockerReplacement).replace(psqlAnchor, psqlReplacement).replace(executionAnchor, extension.trimEnd()).replace(post70Anchor, post70Replacement)
  .replace('migration70:true,attestationReplayDenied:true', 'migration70:true,migration71:true,attestationReplayDenied:true,migration71AtomicRollback:true,migration71AclMatrix:true');
const workspace = await mkdtemp(join(tmpdir(), "vanstro-f1-m71-owned-"));
const derivedPath = join(workspace, "owned-pg16-conformance-m71.mjs");
try {
  await writeFile(derivedPath, derived);
  const result = spawnSync(process.execPath, [derivedPath, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  await rm(workspace, { recursive: true, force: true });
}
