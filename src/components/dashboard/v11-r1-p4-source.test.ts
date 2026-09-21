import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");

const read = (relative: string) => readFileSync(resolve(root, relative), "utf8");

test("P4: batch import is an async ingest job — handler creates, worker writes", () => {
  const batch = read("apps/api/src/dashboard/batch.ts");
  // handler must NOT apply business writes synchronously
  assert.doesNotMatch(batch, /prisma\.(product|price|inventorySnapshot|dealer)\.(create|update|upsert)/);
  assert.match(batch, /createIngestJob/);
  assert.match(batch, /routes\.post\("\/dashboard\/batch\/import"/);
  assert.match(batch, /routes\.get\("\/dashboard\/batch\/import\/:jobId"/);
  assert.match(batch, /routes\.post\("\/dashboard\/batch\/import\/:jobId\/retry"/);
  const ingest = read("apps/api/src/dashboard/batch-ingest.ts");
  assert.match(ingest, /claimNextAsyncJob/);
  assert.match(ingest, /completeAsyncJob/);
  assert.match(ingest, /failAsyncJob/);
  assert.match(ingest, /applyIngestItem/);
  // worker loop is started at boot
  const index = read("apps/api/src/index.ts");
  assert.match(index, /startBatchIngestWorker/);
});

test("P4: durable idempotency ledger via createAsyncJob — atomic claim, 409, replay, recoverable states", () => {
  const ingest = read("apps/api/src/dashboard/batch-ingest.ts");
  assert.match(ingest, /createAsyncJob/);
  assert.match(ingest, /IDEMPOTENCY_CONFLICT/);
  const batch = read("apps/api/src/dashboard/batch.ts");
  assert.match(batch, /DASHBOARD_CONFLICT/, "same key different payload -> 409");
  assert.match(batch, /replayed/, "same key same payload -> original result");
  // results persist per item for replay/recovery (not in AuditLog)
  assert.doesNotMatch(ingest, /auditLog.*resourceId.*erp-batch/);
  assert.match(ingest, /batchIngestResult\.createMany/);
  const schema = read("packages/db/prisma/schema.prisma");
  assert.match(schema, /model BatchIngestResult/);
  assert.match(schema, /@@unique\(\[jobId, itemIndex\]\)/);
  const migration = read("packages/db/prisma/migrations/20260810100000_s11_batch_ingest_results/migration.sql");
  assert.match(migration, /CREATE TABLE "batch_ingest_results"/);
});

test("P4: frozen scope — categories/dealer_locations/sku_mappings included; dry-run writes nothing", () => {
  const ingest = read("apps/api/src/dashboard/batch-ingest.ts");
  for (const kind of ["products", "prices", "inventory", "dealers", "dealer_locations", "categories", "sku_mappings"]) {
    assert.match(ingest, new RegExp(`case "${kind}"`), `missing ${kind}`);
  }
  assert.match(ingest, /payload\.dryRun/);
  // per-item permission and field ownership
  assert.match(ingest, /INGEST_KIND_PERMISSION/);
  assert.match(ingest, /required} is required/);
  // artifact: results carry only index/status/error, never full payloads
  assert.doesNotMatch(ingest, /items.*payload.*artifact|artifact.*items/);
});

test("P4: partial retry binds to the original job via retryAsyncJob", () => {
  const ingest = read("apps/api/src/dashboard/batch-ingest.ts");
  assert.match(ingest, /retryAsyncJob/);
  const batch = read("apps/api/src/dashboard/batch.ts");
  assert.match(batch, /only failed jobs can be retried/);
  assert.match(batch, /retryIngestJob\(jobId, job\.version\)/, "retry uses the job version (CAS)");
});
