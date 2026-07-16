import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const outDir = join(root, "out");
const baseUrl = "https://kkofor.github.io/vanstro-frontend";
const evidenceFile = new URL("./deployed-route-scan.json", import.meta.url);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : path;
    })
  );
  return files.flat();
}

function routeFor(file) {
  const path = relative(outDir, file).split(sep).join("/");
  if (path === "index.html") return "/";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"index.html".length)}`;
  return `/${path}`;
}

const routes = (await walk(outDir))
  .filter((file) => file.endsWith(".html"))
  .map(routeFor)
  .sort();

let nextIndex = 0;
const results = [];

async function worker() {
  while (nextIndex < routes.length) {
    const route = routes[nextIndex++];
    const response = await fetch(`${baseUrl}${route}`, { redirect: "follow" });
    const body = await response.text();
    const mb01References = body.match(/mb01\.vanstro\.ca/gi)?.length ?? 0;
    const localProductReferences = body.match(/\/vanstro-frontend\/assets\/products\//g)?.length ?? 0;
    results.push({
      route,
      status: response.status,
      bytes: Buffer.byteLength(body),
      cacheControl: response.headers.get("cache-control"),
      contentType: response.headers.get("content-type"),
      mb01References,
      localProductReferences
    });
  }
}

await Promise.all(Array.from({ length: 8 }, () => worker()));
results.sort((a, b) => a.route.localeCompare(b.route));

const output = {
  observedAt: new Date().toISOString(),
  baseUrl,
  sourceRouteCount: routes.length,
  summary: {
    responses: results.length,
    successful: results.filter((result) => result.status >= 200 && result.status < 400).length,
    failed: results.filter((result) => result.status < 200 || result.status >= 400).length,
    routesWithMb01References: results.filter((result) => result.mb01References > 0).length,
    totalMb01References: results.reduce((sum, result) => sum + result.mb01References, 0),
    routesWithLocalProductReferences: results.filter((result) => result.localProductReferences > 0).length,
    totalLocalProductReferences: results.reduce((sum, result) => sum + result.localProductReferences, 0)
  },
  results
};

await writeFile(evidenceFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary, null, 2));
