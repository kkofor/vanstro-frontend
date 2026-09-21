#!/usr/bin/env node

import { constants as fsConstants } from "node:fs";
import {
  lstat,
  open,
  readdir,
  realpath,
  rename,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";

const PACKAGE_MEMBERS = Object.freeze({
  "v1.3": Object.freeze([
    "01-dashboard-p09-runtime-config-flags-readiness-contract-v1.3.md",
    "02-dashboard-p10-analytics-event-metric-foundation-contract-v1.3.md",
    "03-dashboard-p04-replay-legacy-audit-erratum-v1.0.md",
    "04-dashboard-p05-p08-artifact-payload-token-joint-erratum-v1.0.md",
    "05-dashboard-p02-current-context-authority-clarification-v1.0.md",
    "06-dashboard-f1-unified-migrations69-70-authority-ledger-v1.0.md",
    "07-dashboard-f1-sql-authority-catalog-v1.0.md",
    "08-dashboard-f1-authority-manifest-spec-v1.0.md",
    "09-dashboard-f1-authority-review-checklist-v1.0.md"
  ]),
  "v1.4": Object.freeze([
    "01-dashboard-p09-runtime-physical-closure-v1.4.md",
    "02-dashboard-p10-analytics-release-physical-closure-v1.4.md",
    "03-dashboard-p04-fact-audit-physical-closure-v1.4.md",
    "04-dashboard-p05-p08-physical-closure-contract-v1.4.md",
    "05-dashboard-p02-resource-authority-physical-closure-v1.4.md",
    "06-dashboard-f1-migrations69-70-physical-ledger-v1.4.md",
    "07-dashboard-f1-closed-physical-sql-catalog-v1.4.md",
    "08-dashboard-f1-physical-package-manifest-spec-v1.4.md",
    "09-dashboard-f1-physical-package-review-checklist-v1.4.md"
  ]),
  "v1.5": Object.freeze([
    "source/authority-model.yaml",
    "source/authority-model.schema.json",
    "source/baseline-physical-inventory.json",
    "source/owned-pg16-probe.json",
    "generated/01-dashboard-p02-resource-authority-clarification-v1.5.md",
    "generated/02-dashboard-p04-fact-audit-erratum-v1.5.md",
    "generated/03-dashboard-p05-p08-joint-erratum-v1.5.md",
    "generated/04-dashboard-p09-contract-v1.5.md",
    "generated/05-dashboard-p10-contract-v1.5.md",
    "generated/06-dashboard-f1-migrations69-70-ledger-v1.5.md",
    "generated/07-dashboard-f1-closed-sql-authority-catalog-v1.5.md",
    "generated/08-dashboard-f1-physical-object-inventory-v1.5.json",
    "generated/09-dashboard-f1-wire-dto-registry-v1.5.json",
    "generated/10-dashboard-f1-permission-action-reason-registry-v1.5.json",
    "generated/11-dashboard-f1-rollout-upgrade-matrix-v1.5.md",
    "generated/12-dashboard-f1-review-checklist-v1.5.md",
    "generated/MANIFEST.staging.json",
    "tooling/f1-v15-extract-baseline.mjs",
    "tooling/f1-v15-owned-probe.mjs",
    "tooling/f1-v15-generate.mjs",
    "tooling/f1-v15-semantic-verify.mjs",
    "tooling/f1-v15-extract-baseline.test.mjs",
    "tooling/f1-v15-authority.test.mjs",
    "tooling/f1-v15-hmac-vectors.test.mjs",
    "tooling/f1-v15-p08-cancel-compat.test.mjs"
  ])
});

const ENVELOPE = new Set(["MANIFEST.sha256", "MANIFEST.metadata.tsv"]);
const SHA_PATTERN = /^[0-9a-f]{64}$/;

class VerificationError extends Error {
  constructor(code, detail) {
    super(`${code}${detail ? `: ${detail}` : ""}`);
    this.code = code;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(code, detail) {
  throw new VerificationError(code, detail);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== "generate" && command !== "verify") {
    fail("USAGE", "command must be generate or verify");
  }

  const values = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      fail("USAGE", "arguments must be --key value pairs");
    }
    values[key.slice(2)] = value;
  }

  if (!values.root || !isAbsolute(values.root)) {
    fail("USAGE", "--root must be an absolute path");
  }
  const packageVersion = values["package-version"] ?? "v1.3";
  if (!PACKAGE_MEMBERS[packageVersion]) {
    fail("USAGE", "--package-version must be v1.3, v1.4, or v1.5");
  }
  if (
    command === "verify" &&
    (!values["expected-manifest-sha256"] ||
      !SHA_PATTERN.test(values["expected-manifest-sha256"]))
  ) {
    fail("USAGE", "verify requires a lowercase --expected-manifest-sha256");
  }

  return {
    command,
    root: resolve(values.root),
    packageVersion,
    expectedManifestSha256: values["expected-manifest-sha256"]
  };
}

function validateRelativePath(path) {
  if (
    !path ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("//") ||
    path.split("/").some(segment => segment === "." || segment === ".." || !segment) ||
    /[\0-]/u.test(path)
  ) {
    fail("PATH_INVALID", path);
  }
  if (path.normalize("NFC") !== path) {
    fail("PATH_NOT_NFC", path);
  }
}

async function validateRoot(root) {
  const info = await lstat(root).catch(() => fail("PATH_INVALID", root));
  if (info.isSymbolicLink()) fail("SYMLINK_REJECTED", root);
  if (!info.isDirectory()) fail("PATH_INVALID", root);
  return realpath(root);
}

async function rejectSymlinkComponents(root, relativePath) {
  let current = root;
  for (const component of relativePath.split("/")) {
    current = join(current, component);
    const info = await lstat(current).catch(() => fail("MEMBER_MISSING", relativePath));
    if (info.isSymbolicLink()) fail("SYMLINK_REJECTED", relativePath);
  }
}

async function readStableMember(root, rootReal, relativePath) {
  validateRelativePath(relativePath);
  await rejectSymlinkComponents(root, relativePath);

  const absolutePath = join(root, ...relativePath.split("/"));
  const resolvedPath = await realpath(absolutePath);
  const relativeReal = relative(rootReal, resolvedPath);
  if (
    !relativeReal ||
    relativeReal === ".." ||
    relativeReal.startsWith(`..${sep}`) ||
    isAbsolute(relativeReal)
  ) {
    fail("PATH_ESCAPES_ROOT", relativePath);
  }

  const handle = await open(
    absolutePath,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
  );
  try {
    const before = await handle.stat();
    if (!before.isFile()) fail("NON_REGULAR_MEMBER", relativePath);
    if (before.nlink !== 1) fail("NON_REGULAR_MEMBER", `${relativePath} has ${before.nlink} links`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs
    ) {
      fail("FILE_CHANGED_DURING_READ", relativePath);
    }
    if (bytes.length === 0 || bytes.at(-1) !== 0x0a) {
      fail("MISSING_FINAL_LF", relativePath);
    }
    if (bytes.includes(0x0d)) fail("CR_REJECTED", relativePath);
    if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
      fail("BOM_REJECTED", relativePath);
    }
    const decoded = bytes.toString("utf8");
    if (!Buffer.from(decoded, "utf8").equals(bytes)) fail("INVALID_UTF8", relativePath);
    return {
      path: relativePath,
      sha256: sha256(bytes),
      lfLines: bytes.reduce((count, byte) => count + (byte === 0x0a ? 1 : 0), 0),
      bytes: bytes.length
    };
  } finally {
    await handle.close();
  }
}

async function inspectPackage(root, members) {
  const rootReal = await validateRoot(root);
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const entryPaths = entries.map(entry => relative(root, join(entry.parentPath ?? entry.path, entry.name)).split(sep).join("/"));
  const allowed = new Set([...members, ...ENVELOPE]);
  const allowedDirectories = new Set([
    ...(PACKAGE_MEMBERS["v1.5"] === members ? ["reviews"] : []),
    ...members.flatMap(member => {
      const parts = member.split("/");
      return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"));
    })
  ]);

  for (const [index, entry] of entries.entries()) {
    const path = entryPaths[index];
    if (entry.isSymbolicLink()) fail("SYMLINK_REJECTED", path);
    if (entry.isDirectory()) {
      if (!allowedDirectories.has(path)) fail("EXTRA_MEMBER", path);
      continue;
    }
    if (path.startsWith("reviews/")) fail("EXTRA_MEMBER", path);
    if (!entry.isFile()) fail("NON_REGULAR_MEMBER", path);
    if (!allowed.has(path)) fail("EXTRA_MEMBER", path);
  }

  for (const member of members) {
    if (!entryPaths.includes(member)) fail("MEMBER_MISSING", member);
  }

  const records = [];
  for (const member of members) {
    records.push(await readStableMember(root, rootReal, member));
  }
  records.sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)));

  const manifest = Buffer.from(
    records.map(record => `${record.sha256}  ${record.path}\n`).join(""),
    "utf8"
  );
  const metadata = Buffer.from(
    [
      "path\tsha256\tlfLines\tbytes",
      ...records.map(
        record => `${record.path}\t${record.sha256}\t${record.lfLines}\t${record.bytes}`
      )
    ].join("\n") + "\n",
    "utf8"
  );

  return { records, manifest, metadata };
}

async function writeAtomically(path, bytes) {
  const existing = await open(path, "r")
    .then(async handle => {
      try {
        return await handle.readFile();
      } finally {
        await handle.close();
      }
    })
    .catch(() => null);
  if (existing?.equals(bytes)) return;

  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, bytes, { flag: "wx", mode: 0o644 });
  const handle = await open(temporary, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, path).catch(async error => {
    await unlink(temporary).catch(() => undefined);
    throw error;
  });
  const directory = await open(dirname(path), "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

async function readEnvelope(path, missingCode) {
  const info = await lstat(path).catch(() => fail(missingCode, path));
  if (info.isSymbolicLink()) fail("SYMLINK_REJECTED", path);
  if (!info.isFile()) fail("NON_REGULAR_MEMBER", path);
  return open(path, "r").then(async handle => {
    try {
      return await handle.readFile();
    } finally {
      await handle.close();
    }
  });
}

async function main() {
  const { command, root, packageVersion, expectedManifestSha256 } = parseArgs(
    process.argv.slice(2)
  );
  const result = await inspectPackage(root, PACKAGE_MEMBERS[packageVersion]);
  const manifestPath = join(root, "MANIFEST.sha256");
  const metadataPath = join(root, "MANIFEST.metadata.tsv");

  if (command === "generate") {
    await writeAtomically(manifestPath, result.manifest);
    await writeAtomically(metadataPath, result.metadata);
  } else {
    const manifest = await readEnvelope(manifestPath, "MANIFEST_MISMATCH");
    const metadata = await readEnvelope(metadataPath, "METADATA_MISMATCH");
    if (!manifest.equals(result.manifest)) fail("MANIFEST_MISMATCH", manifestPath);
    if (!metadata.equals(result.metadata)) fail("METADATA_MISMATCH", metadataPath);
    if (sha256(manifest) !== expectedManifestSha256) {
      fail("MANIFEST_SHA_MISMATCH", expectedManifestSha256);
    }
  }

  const summary = {
    ok: true,
    command,
    memberCount: result.records.length,
    manifestSha256: sha256(result.manifest),
    metadataSha256: sha256(result.metadata),
    totalBytes: result.records.reduce((sum, record) => sum + record.bytes, 0),
    totalLfLines: result.records.reduce((sum, record) => sum + record.lfLines, 0)
  };
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

main().catch(error => {
  const code = error instanceof VerificationError ? error.code : "UNEXPECTED_ERROR";
  process.stderr.write(`${code}: ${error.message}\n`);
  process.exitCode = 1;
});
