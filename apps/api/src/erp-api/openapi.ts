// V11-R1 P5 — ERP Integration API v1 — the single source of truth for the
// ERP OpenAPI surface. No hand-written second OpenAPI document exists; this
// module generates the JSON document that /v1/openapi serves and that the
// focused tests validate against the contract.

export interface ErpProductRead {
  erpSkuKey: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "archived" | "inactive";
  brand: string | null;
  shortDescription: string | null;
  categorySlug: string | null;
  priceCents: number | null;
  currency: string | null;
  quantityOnHand: number | null;
  locationCode: string | null;
  // V11-R1 ERP readiness §3: explicit inventory read state — the snapshot is
  // always for the requested (resolved) dealer location, never an arbitrary
  // first snapshot. inventory_no_dealer means no location was requested or
  // the ERP location id is not mapped to a dealer location.
  inventoryStatus: "inventory_ok" | "inventory_no_dealer";
  updatedAt: string;
}

export interface ErpProductWrite {
  erpSkuKey: string;
  name: string;
  erpSystem?: string;
  erpCategoryKey?: string;
  priceCents?: number;
  currency?: string;
  quantityOnHand?: number;
  locationCode?: string;
  source?: "vanstro" | "erp";
  externalVersion?: number;
  sourceUpdatedAt?: string;
}

export interface ErpPerItemResult {
  index: number;
  status: "committed" | "failed" | "skipped";
  error?: string;
}

export interface ErpBatchSummary {
  total: number;
  committed: number;
  failed: number;
  skipped: number;
}

export interface ErpSyncJobRead {
  id: string;
  jobType: string;
  status: string;
  idempotencyKeyHash: string | null;
  resultSummary: Record<string, unknown> | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ErpOrderLineRead {
  id: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface ErpOrderRead {
  id: string;
  status: "pending_payment" | "paid" | "processing" | "fulfilled" | "cancelled" | "payment_expired";
  fulfillment: "pickup" | "delivery";
  currency: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  dealerId: string | null;
  dealerLocationId: string | null;
  createdAt: string;
  updatedAt: string;
  items: ErpOrderLineRead[];
  // V11-R1 — PII/payment fields, gated behind the erp.orders.pii machine
  // permission. Absent without that permission; the four shipping* fields
  // come from the (nullable) payment session and are null when absent.
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  shippingAddressLine1?: string | null;
  shippingAddressLine2?: string | null;
  paymentMethod?: string | null;
  providerPaymentId?: string | null;
  shippingCity?: string | null;
  shippingProvince?: string | null;
  shippingPostalCode?: string | null;
  shippingCountry?: string | null;
}

export const ERP_BATCH_LIMIT = 500;
export const ERP_BATCH_BYTES = 1_048_576;
export const ERP_PAGE_LIMIT_MAX = 200;

function schemaForProductRead(): Record<string, unknown> {
  return {
    type: "object",
    required: ["erpSkuKey", "name", "slug", "status", "updatedAt"],
    properties: {
      erpSkuKey: { type: "string" },
      name: { type: "string" },
      slug: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "archived", "inactive"] },
      brand: { type: "string", nullable: true },
      shortDescription: { type: "string", nullable: true },
      categorySlug: { type: "string", nullable: true },
      priceCents: { type: "integer", nullable: true },
      currency: { type: "string", nullable: true },
      quantityOnHand: { type: "integer", nullable: true },
      locationCode: { type: "string", nullable: true },
      inventoryStatus: { type: "string", enum: ["inventory_ok", "inventory_no_dealer"] },
      updatedAt: { type: "string", format: "date-time" }
    }
  };
}

function schemaForOrderLineRead(): Record<string, unknown> {
  return {
    type: "object",
    required: ["id", "skuCode", "productName", "quantity", "unitPriceCents", "lineTotalCents"],
    properties: {
      id: { type: "string" },
      skuCode: { type: "string" },
      productName: { type: "string" },
      quantity: { type: "integer", minimum: 1 },
      unitPriceCents: { type: "integer", minimum: 0 },
      lineTotalCents: { type: "integer", minimum: 0 }
    }
  };
}

function schemaForOrderRead(): Record<string, unknown> {
  return {
    type: "object",
    required: ["id", "status", "fulfillment", "currency", "subtotalCents", "discountCents", "taxCents", "shippingCents", "totalCents", "dealerId", "dealerLocationId", "createdAt", "updatedAt", "items"],
    properties: {
      id: { type: "string" },
      status: { type: "string", enum: ["paid", "processing", "fulfilled", "cancelled"] },
      fulfillment: { type: "string", enum: ["pickup", "delivery"] },
      currency: { type: "string" },
      subtotalCents: { type: "integer", minimum: 0 },
      discountCents: { type: "integer", minimum: 0 },
      taxCents: { type: "integer", minimum: 0 },
      shippingCents: { type: "integer", minimum: 0 },
      totalCents: { type: "integer", minimum: 0 },
      dealerId: { type: "string", nullable: true },
      dealerLocationId: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      items: { type: "array", items: schemaForOrderLineRead() },
      // PII/payment fields: only with the erp.orders.pii permission.
      firstName: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回" },
      lastName: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回" },
      phone: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回" },
      email: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回" },
      notes: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回" },
      shippingAddressLine1: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回" },
      shippingAddressLine2: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回" },
      paymentMethod: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回" },
      providerPaymentId: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回" },
      shippingCity: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回（来自可空的 payment session）" },
      shippingProvince: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回（来自可空的 payment session）" },
      shippingPostalCode: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回（来自可空的 payment session）" },
      shippingCountry: { type: "string", nullable: true, description: "需要 erp.orders.pii 权限，无权限时不返回（来自可空的 payment session）" }
    }
  };
}

export function buildErpOpenApiDocument(): Record<string, unknown> {
  const productRead = schemaForProductRead();
  // V11-R1 ERP readiness §7 — push field ownership. slug/status/compareAtCents
  // are VanStro-owned and rejected per item; brand/media/seo etc. are outside
  // the push contract and rejected the same way (never silently accepted).
  const productWrite = {
    type: "object",
    required: ["erpSkuKey", "name"],
    properties: {
      erpSkuKey: { type: "string" },
      name: { type: "string" },
      erpSystem: { type: "string" },
      erpCategoryKey: { type: "string", description: "ERP category key resolved through erp_category_mappings; requires erpSystem. Unmapped keys fail per item with ERP_MAPPING_INCOMPLETE." },
      priceCents: { type: "integer", minimum: 0 },
      currency: { type: "string" },
      quantityOnHand: { type: "integer", minimum: 0 },
      locationCode: { type: "string", description: "ERP location id resolved through DealerErpLink.erpLocationId; unmapped ids fail per item with ERP_MAPPING_INCOMPLETE." },
      source: { type: "string", enum: ["vanstro", "erp"], default: "vanstro" },
      externalVersion: { type: "integer", minimum: 0 },
      sourceUpdatedAt: { type: "string", format: "date-time" }
    }
  };
  const perItemResult = {
    type: "object",
    required: ["index", "status"],
    properties: {
      index: { type: "integer" },
      status: { type: "string", enum: ["committed", "failed", "skipped"] },
      error: { type: "string", nullable: true }
    }
  };
  const batchSummary = {
    type: "object",
    required: ["total", "committed", "failed", "skipped"],
    properties: { total: { type: "integer" }, committed: { type: "integer" }, failed: { type: "integer" }, skipped: { type: "integer" } }
  };
  const batchResponse = {
    type: "object",
    required: ["data"],
    properties: {
      data: {
        type: "object",
        required: ["jobId", "status"],
        properties: {
          // null for dry-run: zero AsyncJob/ledger writes (contract §7).
          jobId: { type: "string", format: "uuid", nullable: true },
          status: { type: "string", enum: ["queued", "replayed", "dry_run"] },
          results: { type: "array", items: perItemResult },
          summary: batchSummary
        }
      }
    }
  };
  const syncJob = {
    type: "object",
    required: ["id", "jobType", "status", "createdAt", "updatedAt"],
    properties: {
      id: { type: "string", format: "uuid" },
      jobType: { type: "string" },
      status: { type: "string" },
      idempotencyKeyHash: { type: "string", nullable: true },
      resultSummary: { type: "object", nullable: true, additionalProperties: true },
      errorCode: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  };
  const standardErrors = {
    401: { $ref: "#/components/responses/ErpError" },
    403: { $ref: "#/components/responses/ErpError" },
    429: { $ref: "#/components/responses/ErpRateLimited" }
  };
  return {
    openapi: "3.0.3",
    info: { title: "VanStro ERP Integration API v1", version: "1.0.0" },
    servers: [{ url: "/api/v1/integrations/erp" }],
    security: [{ serviceAccountBearer: [] }],
    components: {
      securitySchemes: {
        serviceAccountBearer: {
          type: "http",
          scheme: "bearer",
          description: "VanStro service account token. Access is scoped by machine permission bits (e.g. erp.catalog.read, erp.orders.pii). The order PII/payment fields (contact info, notes, shipping address, payment method/provider id) are returned only when the token carries the erp.orders.pii permission; without it those fields are omitted."
        }
      },
      responses: {
        ErpError: {
          description: "error",
          content: { "application/json": { schema: { type: "object", required: ["error", "code"], properties: { error: { type: "string" }, code: { type: "string" } } } } }
        },
        ErpRateLimited: {
          description: "rate limited",
          headers: { "Retry-After": { schema: { type: "integer" } } },
          content: { "application/json": { schema: { type: "object", required: ["error", "code"], properties: { error: { type: "string" }, code: { type: "string" } } } } }
        }
      }
    },
    paths: {
      "/v1/products": {
        get: {
          operationId: "erpListProducts",
          parameters: [
            { name: "updatedSince", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: ERP_PAGE_LIMIT_MAX, default: 100 } },
            { name: "locationCode", in: "query", schema: { type: "string" }, description: "ERP location id; snapshots are read only for this resolved dealer location. Absent/unmapped -> inventoryStatus inventory_no_dealer (never an arbitrary snapshot)." },
            { name: "erpSystem", in: "query", schema: { type: "string" }, description: "Optional ERP system to disambiguate the locationCode resolution." }
          ],
          responses: {
            200: {
              description: "products",
              content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["items", "nextCursor"], properties: { items: { type: "array", items: productRead }, nextCursor: { type: "string", nullable: true } } } } } } }
            },
            ...standardErrors
          }
        }
      },
      "/v1/products/{erpSkuKey}": {
        get: {
          operationId: "erpGetProduct",
          parameters: [
            { name: "erpSkuKey", in: "path", required: true, schema: { type: "string" } },
            { name: "locationCode", in: "query", schema: { type: "string" }, description: "ERP location id; snapshots are read only for this resolved dealer location. Absent/unmapped -> inventoryStatus inventory_no_dealer (never an arbitrary snapshot)." },
            { name: "erpSystem", in: "query", schema: { type: "string" }, description: "Optional ERP system to disambiguate the locationCode resolution." }
          ],
          responses: {
            200: { description: "product", content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: productRead } } } } },
            404: { $ref: "#/components/responses/ErpError" },
            ...standardErrors
          }
        }
      },
      "/v1/products/batch": {
        post: {
          operationId: "erpBatchUpsert",
          parameters: [{ name: "Idempotency-Key", in: "header", required: false, schema: { type: "string", minLength: 8, maxLength: 128 }, description: "Canonical idempotency key; when present must match the body requestHash. Replay of the same key returns 200 with the original results; a different payload under the same key is 409." }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "requestHash"],
                  properties: {
                    items: { type: "array", maxItems: ERP_BATCH_LIMIT, items: productWrite },
                    dryRun: { type: "boolean", default: false },
                    requestHash: { type: "string", minLength: 8, maxLength: 128, description: "Required idempotency key (contract §7)." }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: "queued job, replayed per-item results, or dry_run preview (zero writes)", content: { "application/json": { schema: batchResponse } } },
            400: { $ref: "#/components/responses/ErpError" },
            409: { $ref: "#/components/responses/ErpError" },
            413: { $ref: "#/components/responses/ErpError", description: "batch over limit (items count or payload bytes)" },
            503: { $ref: "#/components/responses/ErpError" },
            ...standardErrors
          }
        }
      },
      "/v1/products/unlist": {
        post: {
          operationId: "erpBatchUnlist",
          parameters: [{ name: "Idempotency-Key", in: "header", required: false, schema: { type: "string", minLength: 8, maxLength: 128 }, description: "Canonical idempotency key; when present must match the body requestHash. Replay of the same key returns 200 with the original results; a different payload under the same key is 409." }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "requestHash"],
                  properties: {
                    items: { type: "array", maxItems: ERP_BATCH_LIMIT, items: { type: "object", required: ["erpSkuKey"], properties: { erpSkuKey: { type: "string" }, reason: { type: "string" } } } },
                    dryRun: { type: "boolean", default: false },
                    requestHash: { type: "string", minLength: 8, maxLength: 128, description: "Required idempotency key (contract §7)." }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: "queued job, replayed per-item results, or dry_run preview (zero writes)", content: { "application/json": { schema: batchResponse } } },
            400: { $ref: "#/components/responses/ErpError" },
            409: { $ref: "#/components/responses/ErpError" },
            413: { $ref: "#/components/responses/ErpError", description: "batch over limit (items count or payload bytes)" },
            503: { $ref: "#/components/responses/ErpError" },
            ...standardErrors
          }
        }
      },
      "/v1/sync-jobs": {
        get: {
          operationId: "erpListSyncJobs",
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["queued", "running", "succeeded", "partially_succeeded", "failed", "cancelled"] } },
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: ERP_PAGE_LIMIT_MAX, default: 100 } }
          ],
          responses: {
            200: { description: "jobs", content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["items", "nextCursor"], properties: { items: { type: "array", items: syncJob }, nextCursor: { type: "string", nullable: true } } } } } } } },
            400: { $ref: "#/components/responses/ErpError" },
            ...standardErrors
          }
        }
      },
      "/v1/sync-jobs/{id}": {
        get: {
          operationId: "erpGetSyncJob",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            200: { description: "job with per-item results", content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: { allOf: [syncJob, { type: "object", properties: { results: { type: "array", items: perItemResult }, summary: batchSummary } }] } } } } } },
            404: { $ref: "#/components/responses/ErpError" },
            ...standardErrors
          }
        }
      },
      "/v1/sync-jobs/{id}/retry": {
        post: {
          operationId: "erpRetrySyncJob",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            { name: "expectedVersion", in: "query", schema: { type: "integer", minimum: 0 } }
          ],
          responses: {
            200: { description: "queued retry", content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["id", "jobType", "status"], properties: { id: { type: "string", format: "uuid" }, jobType: { type: "string" }, status: { type: "string", enum: ["queued"] } } } } } } } },
            404: { $ref: "#/components/responses/ErpError" },
            409: { $ref: "#/components/responses/ErpError" },
            ...standardErrors
          }
        }
      },
      "/v1/connection-test": {
        post: {
          operationId: "erpConnectionTest",
          responses: {
            200: { description: "controlled self-connectivity result", content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["configured", "maskedUrl", "lastTestedAt", "status", "reachable", "serviceAccountKey"], properties: { configured: { type: "boolean" }, maskedUrl: { type: "string" }, lastTestedAt: { type: "string", format: "date-time" }, status: { type: "integer" }, reachable: { type: "boolean" }, serviceAccountKey: { type: "string" } } } } } } } },
            ...standardErrors
          }
        }
      },
      "/v1/webhooks": {
        post: {
          operationId: "erpCreateWebhook",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["url", "events", "secret"], properties: { url: { type: "string", format: "uri" }, events: { type: "array", items: { type: "string" } }, secret: { type: "string", minLength: 16 }, active: { type: "boolean", default: true } } } } } },
          responses: {
            200: { description: "created webhook; caller-supplied secret appears only in this response" },
            400: { $ref: "#/components/responses/ErpError" },
            ...standardErrors
          }
        },
        get: { operationId: "erpListWebhooks", responses: { 200: { description: "webhook metadata list without secret or hash" }, ...standardErrors } }
      },
      "/v1/webhooks/{id}": {
        delete: {
          operationId: "erpDeleteWebhook",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "deleted" }, 404: { $ref: "#/components/responses/ErpError" }, ...standardErrors }
        }
      },
      "/v1/openapi": { get: { operationId: "erpOpenApi", responses: { 200: { description: "OpenAPI document" }, ...standardErrors } } },
      "/v1/orders": {
        get: {
          operationId: "erpListOrders",
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["paid", "processing", "fulfilled", "cancelled"] } },
            { name: "updatedSince", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: ERP_PAGE_LIMIT_MAX, default: 100 } }
          ],
          responses: {
            200: {
              description: "orders",
              content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["items", "nextCursor"], properties: { items: { type: "array", items: schemaForOrderRead() }, nextCursor: { type: "string", nullable: true } } } } } } }
            },
            400: { $ref: "#/components/responses/ErpError" },
            ...standardErrors
          }
        }
      },
      "/v1/orders/{id}": {
        get: {
          operationId: "erpGetOrder",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "order", content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: schemaForOrderRead() } } } } },
            404: { $ref: "#/components/responses/ErpError" },
            ...standardErrors
          }
        }
      }
    }
  };
}
