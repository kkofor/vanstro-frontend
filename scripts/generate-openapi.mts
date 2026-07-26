import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const contractPath = resolve("src/lib/api/api-contract.ts");
const source = readFileSync(contractPath, "utf8");
const endpointMatches = [...source.matchAll(/^\s+([a-zA-Z0-9_]+):\s+"([^"]+)"/gm)];
const paths = Object.fromEntries(
  endpointMatches
    .filter(([key]) => !key.includes("("))
    .map(([, name, path]) => [path, { get: { summary: name, responses: { "200": { description: "OK" } } } }])
);

const openapi = {
  openapi: "3.1.0",
  info: {
    title: "VanStro API",
    version: "1.0.0",
    description: "Generated from api-contract.ts endpoint constants."
  },
  servers: [{ url: "https://api.vanstro.ca/api/v1" }],
  paths
};

const outPath = resolve("docs/openapi/vanstro-api.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(openapi, null, 2)}\n`);
console.log(`Wrote ${outPath} with ${Object.keys(paths).length} paths.`);
