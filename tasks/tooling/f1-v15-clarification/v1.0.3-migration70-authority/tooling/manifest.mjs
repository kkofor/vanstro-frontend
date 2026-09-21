#!/usr/bin/env node
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import { lstat, open, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";

export const MEMBERS = Object.freeze([
  "source/clarification-model.yaml",
  "source/clarification-model.schema.json",
  "generated/10-migration70-executable-authority.sql",
  "generated/MANIFEST.staging.json",
  "tooling/generate.mjs",
  "tooling/manifest.mjs",
  "tooling/clarification.test.mjs",
  "tooling/manifest.test.mjs",
]);
const ENVELOPE = new Set(["MANIFEST.sha256", "MANIFEST.metadata.tsv"]);
const sha = (b) => createHash("sha256").update(b).digest("hex");
class E extends Error {
  constructor(code, detail = "") {
    super(`${code}${detail ? `: ${detail}` : ""}`);
    this.code = code;
  }
}
const fail = (c, d) => {
  throw new E(c, d);
};
function pathOk(p) {
  if (!p || isAbsolute(p) || p.includes("\\") || p.includes("\0") || p.split("/").some((x) => !x || x === "." || x === "..") || p.normalize("NFC") !== p) fail("PATH_INVALID", p);
}
async function stable(root, rootReal, p) {
  pathOk(p);
  let cur = root;
  for (const part of p.split("/")) {
    cur = join(cur, part);
    const i = await lstat(cur).catch(() => fail("MEMBER_MISSING", p));
    if (i.isSymbolicLink()) fail("SYMLINK_REJECTED", p);
  }
  const full = join(root, p);
  const rp = await realpath(full);
  const rel = relative(rootReal, rp);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail("PATH_ESCAPES_ROOT", p);
  const h = await open(full, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await h.stat();
    if (!before.isFile() || before.nlink !== 1) fail("NON_REGULAR_MEMBER", p);
    const b = await h.readFile();
    const after = await h.stat();
    if (before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs) fail("FILE_CHANGED_DURING_READ", p);
    if (!b.length || b.at(-1) !== 0x0a) fail("MISSING_TRAILING_NEWLINE", p);
    if (b.includes(0x0d)) fail("CR_REJECTED", p);
    return { path: p, bytes: b.length, sha256: sha(b), lfLines: b.toString("utf8").split("\n").length - 1 };
  } finally {
    await h.close();
  }
}
export async function inspect(root) {
  const info = await lstat(root).catch(() => fail("ROOT_INVALID"));
  if (!info.isDirectory() || info.isSymbolicLink()) fail("ROOT_INVALID");
  const rr = await realpath(root);
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const allowedDirs = new Set(MEMBERS.flatMap((m) => m.split("/").slice(0, -1).map((_, i) => m.split("/").slice(0, i + 1).join("/"))));
  for (const e of entries) {
    const p = relative(root, join(e.parentPath ?? e.path, e.name)).split(sep).join("/");
    if (e.isSymbolicLink()) fail("SYMLINK_REJECTED", p);
    if (e.isDirectory()) {
      if (!allowedDirs.has(p)) fail("EXTRA_MEMBER", p);
    } else if (!e.isFile() || (!MEMBERS.includes(p) && !ENVELOPE.has(p))) fail("EXTRA_MEMBER", p);
  }
  const records = [];
  for (const m of MEMBERS) records.push(await stable(root, rr, m));
  const canonical = Buffer.from(`${records.map((r) => `${r.sha256}  ${r.path}`).join("\n")}\n`, "utf8");
  const metadata = Buffer.from(`path\tsha256\tlfLines\tbytes\n${records.map((r) => `${r.path}\t${r.sha256}\t${r.lfLines}\t${r.bytes}`).join("\n")}\n`, "utf8");
  return { records, manifest: canonical, metadata };
}
async function atomic(path, b) {
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, b, { flag: "wx", mode: 0o644 });
  await rename(tmp, path).catch(async (e) => {
    await rm(tmp, { force: true });
    throw e;
  });
}
export async function run(command, root, expected) {
  const x = await inspect(root);
  const mp = join(root, "MANIFEST.sha256");
  const tp = join(root, "MANIFEST.metadata.tsv");
  if (command === "generate") {
    await atomic(mp, x.manifest);
    await atomic(tp, x.metadata);
  } else {
    if (!(await open(mp).then(async (h) => { try { return (await h.readFile()).equals(x.manifest); } finally { await h.close(); } }))) fail("MANIFEST_MISMATCH");
    if (!(await open(tp).then(async (h) => { try { return (await h.readFile()).equals(x.metadata); } finally { await h.close(); } }))) fail("METADATA_MISMATCH");
    if (sha(x.manifest) !== expected) fail("MANIFEST_SHA_MISMATCH");
  }
  return { ok: true, command, memberCount: x.records.length, manifestSha256: sha(x.manifest), metadataSha256: sha(x.metadata) };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [command, ...rest] = process.argv.slice(2);
  const a = {};
  for (let i = 0; i < rest.length; i += 2) a[rest[i].replace(/^--/, "")] = rest[i + 1];
  if (!["generate", "verify"].includes(command) || !isAbsolute(a.root) || (command === "verify" && !/^[0-9a-f]{64}$/.test(a.expected ?? ""))) fail("USAGE");
  run(command, resolve(a.root), a.expected).then((x) => process.stdout.write(`${JSON.stringify(x)}\n`)).catch((e) => { process.stderr.write(`${e.code ?? "UNEXPECTED_ERROR"}: ${e.message}\n`); process.exitCode = 1; });
}
