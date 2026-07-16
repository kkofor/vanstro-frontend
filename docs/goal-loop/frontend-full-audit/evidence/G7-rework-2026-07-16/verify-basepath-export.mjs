import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));
const OUT = resolve(ROOT, "out");
const BASE_PATH = "/vanstro-frontend";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(OUT);
const textFiles = files.filter((path) => [".css", ".html", ".js", ".json", ".map", ".txt", ".xml"].includes(extname(path)));
const htmlFiles = files.filter((path) => extname(path) === ".html");
const mb01Files = [];
const localAssetReferences = new Set();

for (const path of textFiles) {
  const source = await readFile(path, "utf8");
  if (source.includes("mb01.vanstro.ca")) mb01Files.push(relative(OUT, path));
  for (const match of source.matchAll(/\/vanstro-frontend\/assets\/products\/[a-z0-9/.-]+\.(?:gif|jpe?g|png|webp)/gi)) {
    localAssetReferences.add(match[0]);
  }
}

const missingLocalAssets = [];
for (const reference of localAssetReferences) {
  const exportedPath = resolve(OUT, reference.slice(BASE_PATH.length + 1));
  const exists = await stat(exportedPath).then(() => true, () => false);
  if (!exists) missingLocalAssets.push(reference);
}

const result = {
  observedAt: new Date().toISOString(),
  basePath: BASE_PATH,
  htmlFiles: htmlFiles.length,
  textFiles: textFiles.length,
  mb01Files,
  uniqueControlledAssetReferences: localAssetReferences.size,
  missingLocalAssets
};

await writeFile(new URL("./basepath-export-verification.json", import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
