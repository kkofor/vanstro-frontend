import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));
const PUBLIC_ROOT = resolve(ROOT, "public");
const SOURCE_ROOT = resolve(ROOT, "src");
const EXPORT_ROOT = resolve(ROOT, "out");
const REPORT_PATH = new URL("./asset-cleanup-plan.json", import.meta.url);

async function walk(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const assetPattern = /\/assets\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]+/g;
const publicFiles = await walk(PUBLIC_ROOT);
const sourceFiles = (await walk(SOURCE_ROOT)).filter((path) => /\.[cm]?[jt]sx?$/.test(path));
const exportFiles = (await walk(EXPORT_ROOT)).filter((path) => [".html", ".js", ".css", ".json", ".txt"].includes(extname(path)));

async function collectReferences(files) {
  const references = new Set();
  for (const path of files) {
    const content = await readFile(path, "utf8");
    for (const match of content.matchAll(assetPattern)) references.add(match[0]);
  }
  return references;
}

const [sourceReferences, exportReferences] = await Promise.all([
  collectReferences(sourceFiles),
  collectReferences(exportFiles)
]);

const publicRows = [];
const pathsByHash = new Map();
for (const path of publicFiles) {
  const buffer = await readFile(path);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const publicPath = `/${relative(PUBLIC_ROOT, path).replaceAll("\\", "/")}`;
  const row = { publicPath, physicalPath: path, bytes: buffer.length, sha256 };
  publicRows.push(row);
  const matches = pathsByHash.get(sha256) ?? [];
  matches.push(publicPath);
  pathsByHash.set(sha256, matches);
}

const candidates = [];
for (const row of publicRows) {
  const sourceReferenced = sourceReferences.has(row.publicPath);
  const exportReferenced = exportReferences.has(row.publicPath);
  if (sourceReferenced || exportReferenced) continue;

  const sameHashPaths = (pathsByHash.get(row.sha256) ?? []).filter((path) => path !== row.publicPath);
  if (
    (row.publicPath.startsWith("/assets/legacy/") || row.publicPath.startsWith("/assets/original-site/")) &&
    sameHashPaths.length > 0
  ) {
    candidates.push({
      ...row,
      reason: "unreferenced legacy/original-site file with byte-identical retained copy",
      retainedCopies: sameHashPaths
    });
    continue;
  }

  if (row.publicPath.startsWith("/assets/generated/") && row.publicPath.endsWith(".png")) {
    const webpPath = row.publicPath.replace(/\.png$/, ".webp");
    if (publicRows.some((candidate) => candidate.publicPath === webpPath)) {
      candidates.push({
        ...row,
        reason: "unreferenced generated PNG with active WebP replacement",
        retainedCopies: [webpPath]
      });
    }
    continue;
  }

  if (row.publicPath === "/assets/generated/support-agent-v1.webp") {
    const replacement = "/assets/generated/support-agent-v1-192.webp";
    if (publicRows.some((candidate) => candidate.publicPath === replacement)) {
      candidates.push({
        ...row,
        reason: "unreferenced full-size support image with active 192px replacement",
        retainedCopies: [replacement]
      });
    }
  }
}

candidates.sort((a, b) => a.publicPath.localeCompare(b.publicPath));
const report = {
  generatedAt: new Date().toISOString(),
  rules: [
    "source reference count must be zero",
    "current static export reference count must be zero",
    "legacy and original-site files require a byte-identical retained copy",
    "generated PNG and support candidates require an active optimized replacement"
  ],
  sourceReferenceCount: sourceReferences.size,
  exportReferenceCount: exportReferences.size,
  candidateCount: candidates.length,
  candidateBytes: candidates.reduce((sum, item) => sum + item.bytes, 0),
  candidates: candidates.map(({ physicalPath: _physicalPath, ...candidate }) => candidate)
};

await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  candidateCount: report.candidateCount,
  candidateBytes: report.candidateBytes,
  candidates: report.candidates.map((candidate) => candidate.publicPath)
}, null, 2));
