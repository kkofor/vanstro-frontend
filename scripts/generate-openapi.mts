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
    const expandedPaths = rawPath === "/dashboard/${moduleKey}"
      ? ["/dashboard/navigation", "/dashboard/home-page", "/dashboard/footer"]
      : rawPath.includes("${")
        ? []
        : [rawPath];
    for (const expandedPath of expandedPaths) {
      const path = expandedPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
      paths[path] ??= {};
      paths[path][method] = {
        summary: `${method.toUpperCase()} ${expandedPath}`,
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
}

if (paths["/checkout/session"]?.post) {
  paths["/checkout/session"].post = {
    ...paths["/checkout/session"].post as object,
    parameters: [{
      name: "Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string", minLength: 1, maxLength: 128 }
    }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["firstName", "lastName", "email", "phone", "fulfillment", "paymentMethod"],
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              fulfillment: { type: "string", enum: ["pickup", "delivery"] },
              paymentMethod: { type: "string", enum: ["card", "pos", "cash"] },
              dealerLocationId: { type: "string" },
              shippingCountry: { type: "string", enum: ["CA"] }
            }
          }
        }
      }
    },
    responses: {
      "200": { description: "Idempotent replay" },
      "201": { description: "Checkout session created" },
      "400": { description: "Invalid request" },
      "409": { description: "Checkout conflict" },
      "502": { description: "Payment provider unavailable" }
    }
  };
}
if (paths["/payments/callback"]?.post) {
  paths["/payments/callback"].post = {
    ...paths["/payments/callback"].post as object,
    parameters: [{
      name: "X-Payment-Signature",
      in: "header",
      required: false,
      schema: { type: "string" }
    }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["sessionId", "status"],
            properties: {
              sessionId: { type: "string" },
              status: { type: "string", enum: ["paid"] },
              providerPaymentId: { type: "string" },
              ticket: { type: "string" }
            }
          }
        }
      }
    },
    responses: {
      "200": { description: "Payment confirmed or idempotently replayed" },
      "400": { description: "Invalid callback" },
      "401": { description: "Provider verification failed" },
      "409": { description: "Payment requires reconciliation" }
    }
  };
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
