import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildErpOpenApiDocument } from "./openapi.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../../..");

const read = (relative: string) => readFileSync(resolve(root, relative), "utf8");

const SAFE_ORDER_FIELDS = [
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
];

const SAFE_ORDER_LINE_FIELDS = ["id", "skuCode", "productName", "quantity", "unitPriceCents", "lineTotalCents"];

// PII/payment fields returned only when the token carries erp.orders.pii.
const PII_ORDER_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "notes",
  "shippingAddressLine1",
  "shippingAddressLine2",
  "paymentMethod",
  "providerPaymentId",
  "shippingCity",
  "shippingProvince",
  "shippingPostalCode",
  "shippingCountry"
];

// Fields that must still never cross the ERP v1 boundary under any permission.
const FORBIDDEN_ORDER_FIELDS = [
  "guestOrderToken",
  "guestTokenExpiresAt",
  "guestTokenRevokedAt",
  "paymentSessionId",
  "promotionKey",
  "userId"
];

test("orders: erpListOrders/erpGetOrder expose exactly the safe operational DTO with order lines", () => {
  const document = buildErpOpenApiDocument() as Record<string, any>;
  const list = document.paths["/v1/orders"].get;
  const get = document.paths["/v1/orders/{id}"].get;
  assert.equal(list.operationId, "erpListOrders");
  assert.equal(get.operationId, "erpGetOrder");

  const listItem = list.responses[200].content["application/json"].schema.properties.data.properties.items.items;
  assert.deepEqual(Object.keys(listItem.properties).sort(), [...SAFE_ORDER_FIELDS, ...PII_ORDER_FIELDS].sort());
  assert.deepEqual(listItem.required, SAFE_ORDER_FIELDS);
  assert.deepEqual(listItem.properties.status.enum, ["paid", "processing", "fulfilled", "cancelled"]);
  assert.deepEqual(listItem.properties.fulfillment.enum, ["pickup", "delivery"]);
  assert.equal(listItem.properties.dealerId.nullable, true);
  assert.equal(listItem.properties.dealerLocationId.nullable, true);

  const line = listItem.properties.items.items;
  assert.deepEqual(Object.keys(line.properties), SAFE_ORDER_LINE_FIELDS);
  assert.deepEqual(line.required, SAFE_ORDER_LINE_FIELDS);

  const getItem = get.responses[200].content["application/json"].schema.properties.data;
  assert.deepEqual(Object.keys(getItem.properties).sort(), [...SAFE_ORDER_FIELDS, ...PII_ORDER_FIELDS].sort());
  assert.deepEqual(get.responses[404], { $ref: "#/components/responses/ErpError" });

  for (const forbidden of FORBIDDEN_ORDER_FIELDS) {
    assert.equal(listItem.properties[forbidden], undefined, `list DTO must not expose ${forbidden}`);
    assert.equal(getItem.properties[forbidden], undefined, `get DTO must not expose ${forbidden}`);
  }
});

test("orders: cursor/status/updatedSince/limit validation matches the products surface", () => {
  const document = buildErpOpenApiDocument() as Record<string, any>;
  const parameters = document.paths["/v1/orders"].get.parameters;
  const names = parameters.map((parameter: { name: string }) => parameter.name);
  assert.deepEqual(names, ["status", "updatedSince", "cursor", "limit"]);
  const limit = parameters.find((parameter: { name: string }) => parameter.name === "limit");
  assert.equal(limit.schema.maximum, 200);
  assert.equal(limit.schema.default, 100);
  const status = parameters.find((parameter: { name: string }) => parameter.name === "status");
  assert.deepEqual(status.schema.enum, ["paid", "processing", "fulfilled", "cancelled"]);
});

test("orders: routes reuse the composite updatedAt:id cursor, explicit safe select, and stable 404", () => {
  const routes = read("apps/api/src/erp-api/routes.ts");
  assert.match(routes, /routes\.get\("\/v1\/orders"\,/);
  assert.match(routes, /routes\.get\("\/v1\/orders\/:id"\,/);
  assert.match(routes, /ERP_ORDER_STATUSES\.includes\(status\)/);
  assert.match(routes, /updatedSince is invalid/);
  assert.match(routes, /cursor is invalid/);
  assert.match(routes, /orderBy: \[\{ updatedAt: "desc" \}, \{ id: "desc" \}\]/);
  assert.match(routes, /take: limit \+ 1/);
  assert.match(routes, /nextCursor/);
  assert.match(routes, /ERP_ORDER_NOT_FOUND/);
  assert.match(routes, /ORDER_SAFE_SELECT/);
  assert.match(routes, /items: \{\s*select: \{\s*id: true,\s*skuCode: true,\s*productName: true,\s*quantity: true,\s*unitPriceCents: true,\s*lineTotalCents: true\s*\}\s*\}/);
});

test("orders: the Prisma select explicitly omits every PII and payment field", () => {
  const routes = read("apps/api/src/erp-api/routes.ts");
  // The select must list the safe operational fields explicitly...
  for (const safe of ["dealerLocationId", "subtotalCents", "discountCents", "taxCents", "shippingCents", "totalCents"]) {
    assert.match(routes, new RegExp(`^\\s*${safe}: true,$`, "m"), `safe field ${safe} must be selected`);
  }
  // ...and never pull in the full Order row (which would carry PII).
  assert.doesNotMatch(routes, /prisma\.order\.findMany\(\{\s*include:/);
  assert.doesNotMatch(routes, /prisma\.order\.findUnique\(\{\s*include:/);
  // dealerId is derived from DealerLocation, not read off the Order row.
  assert.match(routes, /dealerLocation\.findMany\(\{\s*where: \{ id: \{ in: ids \} \},\s*select: \{ id: true, dealerId: true \}\s*\}\)/);
  for (const forbidden of FORBIDDEN_ORDER_FIELDS) {
    assert.doesNotMatch(routes, new RegExp(`^\\s*${forbidden}: true,$`, "m"), `PII field ${forbidden} must not be selected`);
  }
});
