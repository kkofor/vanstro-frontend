import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const routeRoot = resolve("apps/api/src");
const routeFiles: string[] = [];

function collectTypeScriptFiles(directory: string) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) collectTypeScriptFiles(path);
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) routeFiles.push(path);
  }
}

collectTypeScriptFiles(routeRoot);

const paths: Record<string, Record<string, unknown>> = {};
const routePattern = /\b(?:routes|app)\.(get|post|put|patch|delete)\(\s*["`]([^"`]+)["`]/g;

for (const file of routeFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(routePattern)) {
    const method = match[1];
    const rawPath = match[2];
    if (!rawPath.startsWith("/")) continue;
    const path = rawPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    paths[path] ??= {};
    paths[path][method] = {
      summary: `${method.toUpperCase()} ${rawPath}`,
      responses: {
        "200": { description: "Successful response" },
        "400": { description: "Invalid request" },
        "401": { description: "Authentication required" },
        "403": { description: "Permission denied" },
        "500": { description: "Internal error" }
      }
    };
  }
}

const sortedPaths = Object.fromEntries(
  Object.entries(paths).sort(([left], [right]) => left.localeCompare(right))
);

const openapi = {
  openapi: "3.1.0",
  info: {
    title: "VanStro API",
    version: "1.0.0",
    description: "Generated method and path inventory from registered Hono routes. Request and response schemas remain contract-review requirements."
  },
  servers: [{ url: "/api/v1" }],
  paths: sortedPaths
};

const outPath = resolve("docs/openapi/vanstro-api.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(openapi, null, 2)}\n`);
console.log(`Wrote ${outPath} with ${Object.keys(sortedPaths).length} paths.`);
