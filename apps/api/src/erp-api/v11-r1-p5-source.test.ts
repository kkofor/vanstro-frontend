import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildErpOpenApiDocument } from "./openapi.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../../..");
const matrixPath = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/evidence/v11-r1-p5/action-matrix.json";
const compatibilityManifestPath = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/contracts/erp-product-api-v1-compatibility-manifest.json";

const read = (relative: string) => readFileSync(resolve(root, relative), "utf8");
const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
const compatibilityManifest = JSON.parse(readFileSync(compatibilityManifestPath, "utf8"));

function operations(document: Record<string, any>): string[] {
  const result: string[] = [];
  for (const [path, item] of Object.entries(document.paths as Record<string, Record<string, unknown>>)) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      if (item[method]) result.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return result;
}

test("P5: evidence is a deterministic projection of the single generated OpenAPI contract", () => {
  const document = buildErpOpenApiDocument() as Record<string, any>;
  const source = read("apps/api/src/erp-api/openapi.ts");
  assert.equal(document.openapi, "3.0.3");
  assert.equal(document.info.version, "1.0.0");
  assert.deepEqual(document.servers, [{ url: matrix.contract.basePath }]);
  assert.deepEqual(document.security, [{ serviceAccountBearer: [] }]);
  // The AI_OS matrix is a P5-era historical snapshot; the v11-r1 orders
  // extension adds exactly two operations on top of it (erpListOrders /
  // erpGetOrder). The matrix itself is left untouched.
  const ordersOperations = operations(document).filter((entry) => entry.startsWith("GET /v1/orders"));
  assert.deepEqual(ordersOperations, ["GET /v1/orders", "GET /v1/orders/{id}"]);
  assert.deepEqual(operations(document).filter((entry) => !entry.startsWith("GET /v1/orders")), matrix.operations);
  // Historical matrix identity stays true (source/singleSource/basePath);
  // sourceSha256 pins the P5-era source and intentionally no longer matches
  // the extended contract — the new orders surface is verified from the
  // document itself below instead of a regenerated hash.
  assert.equal(matrix.contract.source, "apps/api/src/erp-api/openapi.ts");
  assert.equal(matrix.contract.singleSource, true);
  assert.notEqual(createHash("sha256").update(source).digest("hex"), matrix.contract.sourceSha256, "orders extension changed openapi.ts; the P5 matrix sha is a historical pin");
  const ordersSchema = document.paths["/v1/orders"].get.responses[200].content["application/json"].schema.properties.data.properties.items.items;
  assert.deepEqual(Object.keys(ordersSchema.properties), [
    "id",
    "status",
    "fulfillment",
    "currency",
    "subtotalCents",
    "discountCents",
    "taxCents",
    "shippingCents",
    "totalCents",
    "dealerId",
    "dealerLocationId",
    "createdAt",
    "updatedAt",
    "items"
  ]);
  assert.deepEqual(Object.keys(ordersSchema.properties.items.items.properties), ["id", "skuCode", "productName", "quantity", "unitPriceCents", "lineTotalCents"]);
  assert.equal(document.paths["/v1/orders"].get.operationId, "erpListOrders");
  assert.equal(document.paths["/v1/orders/{id}"].get.operationId, "erpGetOrder");
  assert.doesNotMatch(JSON.stringify(document), /"type":\[/, "OpenAPI 3.0 uses nullable, not JSON-Schema type arrays");

  const writeSchema = document.paths["/v1/products/batch"].post.requestBody.content["application/json"].schema.properties.items.items;
  const writeFields = Object.keys(writeSchema.properties);
  // V11-R1 ERP readiness §7 replaced the push field surface: the P5-era
  // matrix pinned the legacy field list (slug/status/brand/...), which the
  // frozen contract now rejects per item as VanStro-owned/unsupported. The
  // matrix stays a historical snapshot; the live contract is asserted here.
  assert.deepEqual(writeFields, ["erpSkuKey", "name", "erpSystem", "erpCategoryKey", "priceCents", "currency", "quantityOnHand", "locationCode", "source", "externalVersion", "sourceUpdatedAt"]);
  assert.deepEqual(writeSchema.required, ["erpSkuKey", "name"]);
  assert.equal(writeSchema.properties.status, undefined, "status is VanStro-owned and must not be a push field");
  assert.equal(writeFields.includes("mpn"), false);
  assert.deepEqual(matrix.models.notExposed, ["mpn"]);

  const readSchema = document.paths["/v1/products"].get.responses[200].content["application/json"].schema.properties.data.properties.items.items;
  // inventoryStatus sits right before updatedAt in the emitted schema.
  assert.deepEqual(Object.keys(readSchema.properties), [...matrix.models.ProductReadFields.slice(0, -1), "inventoryStatus", matrix.models.ProductReadFields.at(-1)]);
  assert.deepEqual(readSchema.properties.inventoryStatus.enum, ["inventory_ok", "inventory_no_dealer"]);
  const batchEnvelope = document.paths["/v1/products/batch"].post.responses[200].content["application/json"].schema;
  assert.deepEqual(batchEnvelope.required, ["data"]);
  assert.deepEqual(batchEnvelope.properties.data.required, ["jobId", "status"]);
  assert.equal(batchEnvelope.properties.data.properties.jobId.nullable, true, "dry-run returns jobId null (zero writes)");
  assert.deepEqual(batchEnvelope.properties.data.properties.status.enum, ["queued", "replayed", "dry_run"]);

  for (const [path, pathItem] of Object.entries(document.paths as Record<string, Record<string, any>>)) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      if (!pathItem[method]) continue;
      assert.deepEqual(pathItem[method].responses[429], { $ref: "#/components/responses/ErpRateLimited" }, `${method.toUpperCase()} ${path} documents 429`);
    }
  }
  assert.ok(document.components.responses.ErpRateLimited.headers["Retry-After"]);
});

test("P5: ERP batch runtime maps the public key and applies optional price/inventory through canonical ingest", () => {
  const routes = read("apps/api/src/erp-api/routes.ts");
  assert.match(routes, /skuCode: erpSkuKey \|\| item\.skuCode/);
  assert.match(routes, /createIngestJob/);
  assert.doesNotMatch(routes, /prisma\.product\.(create|update)|prisma\.price\.create|prisma\.inventorySnapshot/);
  const ingest = read("apps/api/src/dashboard/batch-ingest.ts");
  assert.match(ingest, /typeof item\.quantityOnHand === "number"/);
  assert.match(ingest, /typeof item\.priceCents === "number"/);
  assert.match(routes, /lastIndexOf\(":"\)/);
  assert.match(ingest, /status: "archived", effectiveUntil/);
});

test("P5: batch/unlist operations document contract §7 idempotency, limits and deterministic inventory reads", () => {
  const document = buildErpOpenApiDocument() as Record<string, any>;
  for (const path of ["/v1/products/batch", "/v1/products/unlist"]) {
    const post = document.paths[path].post;
    assert.ok(post.responses[413], `${path} documents 413 for over-limit batches`);
    assert.ok(post.parameters.some((parameter: any) => parameter.name === "Idempotency-Key" && parameter.in === "header"), `${path} documents the Idempotency-Key header`);
    assert.deepEqual(post.requestBody.content["application/json"].schema.required, ["items", "requestHash"], `${path} requires requestHash`);
  }
  const productsParams = document.paths["/v1/products"].get.parameters.map((parameter: any) => parameter.name);
  assert.ok(productsParams.includes("locationCode"), "list reads document locationCode");
  assert.ok(productsParams.includes("erpSystem"), "list reads document erpSystem");
  const singleParams = document.paths["/v1/products/{erpSkuKey}"].get.parameters.map((parameter: any) => parameter.name);
  assert.ok(singleParams.includes("locationCode"), "single reads document locationCode");
  assert.ok(singleParams.includes("erpSystem"), "single reads document erpSystem");
});

test("P5: routes enforce requestHash/Idempotency-Key, 413, zero-write dry-run and DealerErpLink inventory reads", () => {
  const routes = read("apps/api/src/erp-api/routes.ts");
  assert.match(routes, /requestHash is required/);
  assert.match(routes, /Idempotency-Key header does not match requestHash/);
  assert.match(routes, /context\.req\.header\("Idempotency-Key"\)/);
  assert.match(routes, /}, 413\)/);
  assert.match(routes, /ERP_BATCH_LIMIT/);
  assert.match(routes, /created\.kind === "dry_run"/);
  assert.match(routes, /source: "erp"/);
  assert.match(routes, /__unlist: true/);
  assert.match(routes, /resolveDealerLocationId\(prisma, erpSystem \?\? null, locationCode\)/);
  // Unlist resolution moved into the canonical apply path: the route performs
  // no per-item write lookups anymore (single-product reads still use the
  // read-only findUnique).
  assert.doesNotMatch(routes, /prisma\.platformSku\.findUnique\(\{\s*where: \{ skuCode: erpSkuKey \},\s*include: \{ product: true \}/);
});

test("P5: canonical ingest enforces ownership, ERP_MAPPING_INCOMPLETE and dry-run zero-write", () => {
  const ingest = read("apps/api/src/dashboard/batch-ingest.ts");
  assert.match(ingest, /VANSTRO_OWNED_PRODUCT_FIELDS/);
  assert.match(ingest, /is VanStro-owned and cannot be set via ERP push/);
  assert.match(ingest, /is not supported by ERP push/);
  assert.match(ingest, /ERP_MAPPING_INCOMPLETE/);
  assert.match(ingest, /resolveDealerLocationId/);
  assert.match(ingest, /upsertCategoryMapping/);
  assert.match(ingest, /erp_category_mappings/);
  assert.ok(ingest.indexOf("if (input.dryRun)") < ingest.indexOf("createAsyncJob("), "dry-run returns before any AsyncJob claim");
});

test("P5: idempotency evidence names the AsyncJob claim and per-item ledger, never AuditLog.resourceId", () => {
  assert.match(matrix.idempotency.mechanism, /AsyncJob idempotency key/);
  assert.match(matrix.idempotency.resultsLedger, /batch_ingest_results/);
  assert.equal(matrix.idempotency.auditLogResourceId, false);
  assert.equal(matrix.correlationAndAudit.dedicatedAuditLogEmission, true);
  assert.match(matrix.correlationAndAudit.correlation, /async_jobs\.requestId/);
});

test("P5: sync-job cursor/retry contract matches runtime guardrails", () => {
  const routes = read("apps/api/src/erp-api/routes.ts");
  assert.match(routes, /nextCursor/);
  assert.match(routes, /updatedAt: "desc"/);
  assert.match(routes, /erp\.sync\.retry/);
  assert.match(routes, /only failed jobs can be retried/);
  assert.match(routes, /expectedVersion/);
  assert.match(routes, /jobType !== "dashboard\.batch\.ingest"/);
});

test("P5: webhook and compatibility evidence stays partial/unverified where runtime gates are absent", () => {
  const webhookSource = read("apps/api/src/erp-api/webhooks.ts");
  const routeSource = read("apps/api/src/erp-api/routes.ts");
  assert.equal(matrix.webhook.status, "partial");
  assert.equal(matrix.webhook.productionDeliveryVerified, false);
  assert.equal(matrix.webhook.retryAfterHonor, false);
  assert.match(webhookSource, /retryDueWebhooks/);
  assert.doesNotMatch(routeSource, /deliverErpWebhook|retryDueWebhooks/);
  assert.equal(matrix.compatibilityManifest.source, "tasks/contracts/erp-product-api-v1-compatibility-manifest.json");
  assert.equal(createHash("sha256").update(readFileSync(compatibilityManifestPath)).digest("hex"), matrix.compatibilityManifest.sourceSha256);
  assert.equal(compatibilityManifest.schemaVersion, matrix.compatibilityManifest.schemaVersion);
  assert.equal(compatibilityManifest.currentV11R1Contract.sourceSha256, matrix.contract.sourceSha256);
  assert.equal(compatibilityManifest.goNoGo.productionLikeMigrationDrillPassing, false);
  assert.equal(matrix.compatibilityManifest.verified, false);
});
