// V11-R1 functional-first F4 — focused source contract test for the surfaces
// driven by qa/v11-functional-first-batch-erp. Cheap, dependency-free
// (node:test only) guard that the live acceptance matrix stays aligned with
// the frozen v11-r1-erp-readiness.v1 contract: batch ingest kinds/permissions/
// item outcomes/retry gates, ERP v1 route/error/idempotency surface, §7
// requestHash/Idempotency-Key/413/dry-run-zero-writes, §1/§5 category mapping
// with ERP_MAPPING_INCOMPLETE, §3/§4 field ownership and deterministic
// inventory reads.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const read = (relative) => readFileSync(resolve(root, relative), "utf8");
const batchIngest = read("apps/api/src/dashboard/batch-ingest.ts");
const batchRoutes = read("apps/api/src/dashboard/batch.ts");
const erpRoutes = read("apps/api/src/erp-api/routes.ts");
const erpOpenapi = read("apps/api/src/erp-api/openapi.ts");
const erpMount = read("apps/api/src/routes/erp-integration.ts");
const dbAsyncJobs = read("packages/db/src/async-jobs.ts");

test("batch-ingest: exactly the eight kinds with their apply permissions", () => {
  const kinds = ["products", "prices", "inventory", "dealers", "dealer_locations", "erp_links", "categories", "sku_mappings"];
  for (const kind of kinds) {
    assert.match(batchIngest, new RegExp(`"${kind}"`), `kind ${kind} present`);
  }
  assert.match(batchIngest, /export type IngestKind = "products" \| "prices" \| "inventory" \| "dealers" \| "dealer_locations" \| "erp_links" \| "categories" \| "sku_mappings"/);
  const permissionMap = {
    products: "products.write",
    prices: "pricing.write",
    inventory: "inventory.write",
    dealers: "settings.write",
    dealer_locations: "settings.write",
    erp_links: "settings.write",
    categories: "categories.write",
    sku_mappings: "products.write",
  };
  for (const [kind, permission] of Object.entries(permissionMap)) {
    assert.match(batchIngest, new RegExp(`${kind}: "${permission}"`), `${kind} -> ${permission}`);
  }
  assert.match(batchIngest, /export const INGEST_MAX_ITEMS = 500/);
});

test("batch-ingest erp_links apply: dealer resolution, location ownership, schema-unique upsert, no batch unlink", () => {
  // Validation contract for the erp_links item shape.
  assert.match(batchIngest, /erp_links require dealerCode, erpSystem and erpLocationId/);
  assert.match(batchIngest, /erp_links dealerLocationCode must be a non-empty string when provided/);
  // Apply resolves the dealer by code and enforces location ownership.
  assert.match(batchIngest, /case "erp_links"/);
  assert.match(batchIngest, /prisma\.dealer\.findUnique\(\{ where: \{ code: str\(item\.dealerCode\)! \} \}\)/);
  assert.match(batchIngest, /dealerLocation\.findFirst\(\{ where: \{ code: dealerLocationCode, dealerId: dealer\.id \} \}\)/);
  assert.match(batchIngest, /dealer location not found for dealer/);
  // Idempotency rides the real schema uniqueness (@@unique([erpSystem, erpLocationId])).
  assert.match(batchIngest, /dealerErpLink\.findUnique\(\{ where: \{ erpSystem_erpLocationId/);
  assert.match(batchIngest, /dealerErpLink\.upsert\(\{\s*where: \{ erpSystem_erpLocationId/);
  // No-op guard: an identical existing link is not rewritten.
  assert.match(batchIngest, /existing\.dealerId === dealer\.id && existing\.dealerLocationId === dealerLocationId\) return; \/\/ no-op/);
  // Physical unlink is out of scope for the batch surface.
  assert.doesNotMatch(batchIngest, /dealerErpLink\.delete/);
});

test("batch-ingest worker: per-item outcomes, retry only on failed", () => {
  assert.match(batchIngest, /outcomes\.push\(\{ index, status: "skipped", error: validation \}\)/);
  assert.match(batchIngest, /outcomes\.push\(\{ index, status: "failed", error: error instanceof Error \? error\.message\.slice\(0, 240\) : "commit failed" \}\)/);
  assert.match(batchIngest, /retryAsyncJob\(prisma, \{ jobId, expectedVersion \}\)/);
  assert.match(batchIngest, /status: "committed" \| "failed" \| "skipped"/);
});

test("async-jobs completion: failed>0 -> partially_succeeded; retry requires status failed", () => {
  assert.match(dbAsyncJobs, /const status=input\.failed>0\?"partially_succeeded":"succeeded"/);
  assert.match(dbAsyncJobs, /job\.status!=="failed"/);
  assert.match(dbAsyncJobs, /JOB_NOT_RETRYABLE/);
});

test("dashboard batch routes: permission gate, idempotency conflict, retry state gate", () => {
  assert.match(batchRoutes, /if \(!context\.get\("actorPermissions"\)\.includes\(required\)\)/);
  assert.match(batchRoutes, /code: "DASHBOARD_FORBIDDEN"/);
  assert.match(batchRoutes, /code: "DASHBOARD_CONFLICT"/);
  assert.match(batchRoutes, /only failed jobs can be retried/);
  assert.match(batchRoutes, /unsupported import kind/);
  assert.match(batchRoutes, /batch limit is \$\{INGEST_MAX_ITEMS\} items/);
});

test("batch-ingest §7: dry-run performs zero AsyncJob/ledger writes and returns a synchronous preview", () => {
  // The dry-run branch returns before the async claim; no jobId, no
  // batch_ingest_results rows are ever produced.
  assert.match(batchIngest, /if \(input\.dryRun\) \{/);
  assert.match(batchIngest, /return \{ kind: "dry_run", jobId: undefined, results, summary \};/);
  assert.match(batchIngest, /const readiness = asyncJobReadiness\(\);/);
  assert.match(batchIngest, /const idempotencyKey = input\.requestHash \?\? `batch-\$\{randomUUID\(\)\}`;/);
});

test("batch-ingest §2/§3/§4/§5: VanStro-owned push fields are rejected per item, never silently ignored", () => {
  // §4 price owner: amountCents (ERP) vs compareAtCents/status (VanStro).
  assert.match(batchIngest, /const VANSTRO_OWNED_PRODUCT_FIELDS = \["slug", "status", "compareAtCents"\] as const;/);
  assert.match(batchIngest, /const VANSTRO_OWNED_PRICE_FIELDS = \["status", "compareAtCents"\] as const;/);
  // §3 inventory owner: onHand (ERP) vs reserved (VanStro).
  assert.match(batchIngest, /const VANSTRO_OWNED_INVENTORY_FIELDS = \["reserved"\] as const;/);
  // §5 category owner: code/name/status (ERP) vs displayOrder/seo (VanStro).
  assert.match(batchIngest, /const VANSTRO_OWNED_CATEGORY_FIELDS = \["displayOrder", "seo"\] as const;/);
  // Fields outside the push contract are rejected the same explicit way.
  assert.match(batchIngest, /is VanStro-owned and cannot be set via ERP push/);
  assert.match(batchIngest, /is not supported by ERP push/);
  assert.match(batchIngest, /function rejectOwnedOrUnsupported/);
  // ERP writes never clear VanStro-owned fields: same-value re-push only
  // refreshes the ERP provenance metadata.
  assert.match(batchIngest, /data: \{ source, externalVersion, sourceUpdatedAt \}/);
  assert.match(batchIngest, /status: "archived", effectiveUntil: new Date\(\)/);
  // The ERP route surface stamps every price write as ERP-owned.
  assert.match(erpRoutes, /source: "erp", \/\/ this surface is the ERP writer/);
});

test("batch-ingest §1/§5: category identity resolves through erp_category_mappings only; unmapped -> ERP_MAPPING_INCOMPLETE", () => {
  // No name/slug/display-order matching: the mapping table is the only key.
  assert.match(batchIngest, /SELECT "categoryId" FROM "erp_category_mappings" WHERE "erpSystem" = \$\{erpSystem\} AND "erpCategoryKey" = \$\{erpCategoryKey\} LIMIT 1/);
  assert.match(batchIngest, /ERP_MAPPING_INCOMPLETE: no erp_category_mappings row for erpSystem=/);
  assert.match(batchIngest, /upsertCategoryMapping/);
  assert.match(batchIngest, /INSERT INTO "erp_category_mappings"/);
  assert.match(batchIngest, /ON CONFLICT \("erpSystem", "erpCategoryKey"\) DO UPDATE/);
  // erpCategoryKey requires erpSystem on both the products and categories kinds.
  assert.match(batchIngest, /products erpCategoryKey requires erpSystem/);
  assert.match(batchIngest, /categories erpCategoryKey requires erpSystem/);
  // An inbound category key on a product item upserts the mapping row.
  assert.match(batchIngest, /if \(str\(item\.erpCategoryKey\)\) \{/);
  assert.match(batchIngest, /categoryId: category\.id/);
});

test("batch-ingest §3: deterministic inbound location resolution through DealerErpLink", () => {
  assert.match(batchIngest, /resolveDealerLocationId/);
  assert.match(batchIngest, /erpSystem_erpLocationId: \{ erpSystem, erpLocationId \}/);
  // Without an explicit erpSystem exactly one link row may own the id;
  // otherwise the resolution is absent/ambiguous (null) — never an arbitrary
  // first match.
  assert.match(batchIngest, /mapped\.length === 1 \? \(mapped\[0\]!\.dealerLocationId as string\) : null/);
  assert.match(batchIngest, /ERP_MAPPING_INCOMPLETE: no DealerErpLink maps erpLocationId/);
  // The ERP route surface resolves locationCode the same way.
  assert.match(erpRoutes, /resolveDealerLocationId\(prisma, erpSystem \?\? null, locationCode\)/);
});

test("ERP v1 routes: all machine paths, idempotency and retry error codes", () => {
  for (const path of ["/v1/openapi", "/v1/products", "/v1/products/:erpSkuKey", "/v1/products/batch", "/v1/products/unlist", "/v1/sync-jobs", "/v1/sync-jobs/:id", "/v1/sync-jobs/:id/retry", "/v1/connection-test", "/v1/webhooks", "/v1/webhooks/:id"]) {
    assert.match(erpRoutes, new RegExp(`routes\\.(get|post|delete)\\("${escapeRegExp(path.replace(/"/g, '\\"'))}"`), `route ${path}`);
  }
  assert.match(erpRoutes, /requireMachineAccess\("cli\.access"\)/);
  assert.match(erpRoutes, /rateLimitServiceAccount/);
  assert.match(erpRoutes, /ERP_IDEMPOTENCY_CONFLICT/);
  assert.match(erpRoutes, /ERP_JOB_STATE_CONFLICT/);
  assert.match(erpRoutes, /ERP_JOB_VERSION_CONFLICT/);
  assert.match(erpRoutes, /ERP_SKU_NOT_FOUND/);
  assert.match(erpRoutes, /ERP_JOB_NOT_FOUND/);
  assert.match(erpRoutes, /ERP_WEBHOOK_NOT_FOUND/);
  assert.match(erpRoutes, /erp\.sync\.retry is required/);
  assert.match(erpRoutes, /only failed jobs can be retried/);
  assert.match(erpRoutes, /cursor is invalid/);
  assert.match(erpRoutes, /updatedSince is invalid/);
  assert.match(erpRoutes, /batch limit is \$\{ERP_BATCH_LIMIT\} items/);
  assert.match(erpRoutes, /status: created\.kind === "replayed" \? "replayed" : "queued"/);
});

test("ERP v1 routes §7: requestHash required, Idempotency-Key header, 413 over-limit, dry_run preview", () => {
  // requestHash is required (400 if missing) and validated.
  assert.match(erpRoutes, /requestHash is required/);
  assert.match(erpRoutes, /requestHash is invalid/);
  // Idempotency-Key header: validated, must match the body, canonical key.
  assert.match(erpRoutes, /Idempotency-Key header is invalid/);
  assert.match(erpRoutes, /Idempotency-Key header does not match requestHash/);
  assert.match(erpRoutes, /const requestHash = idempotencyKeyHeader \?\? body\.requestHash;/);
  // Over-limit batches fail with 413, not 400.
  assert.match(erpRoutes, /413/);
  assert.match(erpRoutes, /code: "ERP_BATCH_LIMIT"/);
  // Dry-run returns the synchronous per-item preview with jobId null (zero
  // AsyncJob/ledger writes) on both the batch and unlist surfaces.
  assert.match(erpRoutes, /jobId: null, status: "dry_run", results: created\.results, summary: created\.summary/);
});

test("ERP v1 routes §3: deterministic inventory read never returns an arbitrary snapshot", () => {
  // No location requested/resolved -> explicit INVENTORY_NO_DEALER state.
  assert.match(erpRoutes, /const NO_DEALER_LOCATION = "00000000-0000-4000-8000-000000000000"/);
  assert.match(erpRoutes, /inventoryStatus: targetLocationId \? "inventory_ok" : "inventory_no_dealer"/);
  assert.match(erpRoutes, /const snapshot = targetLocationId \? sku\.inventorySnapshots\?\.\[0\] : undefined;/);
  assert.match(erpRoutes, /where: \{ dealerLocationId: targetLocationId \?\? NO_DEALER_LOCATION \}/);
  assert.match(erpRoutes, /const locationCode = context\.req\.query\("locationCode"\)\?\.trim\(\) \|\| undefined;/);
});

test("ERP v1 mounted under the machine route tree", () => {
  assert.match(erpMount, /createErpApiV1Routes\(\)/);
  assert.match(erpMount, /machineRoutes\.route\("\/integrations\/erp", erpV1\)/);
});

test("OpenAPI module: 3.0.3, bounded page/batch, serviceAccountBearer security, §7 write surface", () => {
  assert.match(erpOpenapi, /openapi: "3\.0\.3"/);
  assert.match(erpOpenapi, /ERP_BATCH_LIMIT = 500/);
  assert.match(erpOpenapi, /ERP_PAGE_LIMIT_MAX = 200/);
  assert.match(erpOpenapi, /serviceAccountBearer: \{ type: "http", scheme: "bearer"/);
  assert.match(erpOpenapi, /"\/v1\/products\/batch"/);
  assert.match(erpOpenapi, /"\/v1\/products\/unlist"/);
  assert.match(erpOpenapi, /"\/v1\/sync-jobs\/\{id\}\/retry"/);
  assert.match(erpOpenapi, /operationId: "erpListProducts"/);
  assert.match(erpOpenapi, /operationId: "erpRetrySyncJob"/);
  // The batch write contract documents requestHash as required, the
  // Idempotency-Key header, 413 and the dry_run response.
  assert.match(erpOpenapi, /required: \["items", "requestHash"\]/);
  assert.match(erpOpenapi, /name: "Idempotency-Key", in: "header", required: false/);
  assert.match(erpOpenapi, /413: \{ \$ref: "#\/components\/responses\/ErpError"/);
  assert.match(erpOpenapi, /status: \{ type: "string", enum: \["queued", "replayed", "dry_run"\] \}/);
  assert.match(erpOpenapi, /jobId: \{ type: "string", format: "uuid", nullable: true \}/);
  // §1/§3/§5 documented mapping semantics on the write/read surfaces.
  assert.match(erpOpenapi, /ERP_MAPPING_INCOMPLETE/);
  assert.match(erpOpenapi, /inventoryStatus: \{ type: "string", enum: \["inventory_ok", "inventory_no_dealer"\] \}/);
  assert.match(erpOpenapi, /name: "locationCode", in: "query", schema: \{ type: "string" \}, description: "ERP location id; snapshots are read only for this resolved dealer location\. Absent\/unmapped -> inventoryStatus inventory_no_dealer/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
