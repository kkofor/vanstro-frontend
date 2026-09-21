import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyCursorResult,
  classifyOffsetResult,
  isCommonQueryFresh,
  parseDashboardP03Location,
  strictDealerApiPath,
  strictProductApiPath,
  validateCommonCursorResult,
  validateCommonOffsetResult
} from "./p03-query.ts";

test("Products URL 使用固定 browser keys 并映射 strict transport", () => {
  const parsed = parseDashboardP03Location("/dashboard/products", "page=2&productStatus=active&q=Cabinet");
  assert.equal(parsed.kind, "valid");
  if (parsed.kind !== "valid" || parsed.state.resource !== "products") return;
  assert.equal(parsed.canonicalHref, "/dashboard/products?q=Cabinet&productStatus=active&page=2");
  assert.equal(strictProductApiPath(parsed.state), "/dashboard/products?queryVersion=common-query.v1&limit=25&offset=25&sort=createdAt&direction=desc&includeSummary=false&q=Cabinet&status=active");
});

test("重复 scalar 与 browser/API key 混用 fail closed", () => {
  assert.equal(parseDashboardP03Location("/dashboard/products", "q=aa&q=bb").kind, "invalid");
  assert.equal(parseDashboardP03Location("/dashboard/products", "productStatus=active&status=draft").kind, "invalid");
  assert.equal(parseDashboardP03Location("/dashboard/dealers", "dealerStatus=active&status=inactive").kind, "invalid");
  assert.equal(parseDashboardP03Location("/dashboard/products", "unknown=value").kind, "invalid");
});

test("Dealers cursor 只进入 transport，不进入 canonical URL", () => {
  const parsed = parseDashboardP03Location("/fr/dashboard/dealers", "dealerStatus=active&q=MB");
  assert.equal(parsed.kind, "valid");
  if (parsed.kind !== "valid" || parsed.state.resource !== "dealers") return;
  assert.equal(parsed.canonicalHref, "/fr/dashboard/dealers?q=MB&dealerStatus=active");
  assert.equal(strictDealerApiPath(parsed.state, "cq1.opaque"), "/dashboard/dealers?queryVersion=common-query.v1&limit=25&sort=recordId&direction=asc&includeSummary=false&q=MB&status=active&after=cq1.opaque");
});

test("strict meta validator 接受精确 shape 并拒绝 malformed", () => {
  const offset = {
    data: [],
    meta: {
      requestId: "request-id",
      queryContractVersion: "common-query.v1",
      pagination: { mode: "offset", limit: 25, offset: 0, hasNext: false, hasPrevious: false },
      sort: [{ field: "createdAt", direction: "desc", nulls: "last" }],
      total: { value: 0, relation: "exact", capturedAt: "2026-08-02T00:00:00.000Z" },
      snapshot: { consistency: "transaction", capturedAt: "2026-08-02T00:00:00.000Z" },
      visibility: { profileId: "dashboard.products.safe-list.v1" }
    }
  };
  assert.equal(validateCommonOffsetResult(offset).meta.total.value, 0);
  assert.throws(() => validateCommonOffsetResult({ ...offset, meta: { ...offset.meta, total: undefined } }));

  const cursor = {
    data: [],
    meta: {
      requestId: "request-id",
      queryContractVersion: "common-query.v1",
      pagination: { mode: "cursor", limit: 25, hasMore: false },
      sort: [{ field: "recordId", direction: "asc", nulls: "last" }],
      snapshot: { consistency: "statement", capturedAt: "2026-08-02T00:00:00.000Z" },
      visibility: { profileId: "dashboard.dealers.safe-list.v1" }
    }
  };
  assert.equal(validateCommonCursorResult(cursor).meta.pagination.hasMore, false);
  assert.throws(() => validateCommonCursorResult({ ...cursor, meta: { ...cursor.meta, pagination: { mode: "cursor", limit: 25, hasMore: true } } }));
});

test("empty/out-of-range/exhausted 与 60 秒边界明确", () => {
  assert.equal(classifyOffsetResult({ rows: [], total: 0, offset: 0, filtered: false }), "empty");
  assert.equal(classifyOffsetResult({ rows: [], total: 0, offset: 0, filtered: true }), "filtered-empty");
  assert.equal(classifyOffsetResult({ rows: [], total: 30, offset: 50, filtered: false }), "out-of-range");
  assert.equal(classifyCursorResult({ rows: [], after: "opaque", filtered: false }), "exhausted");
  assert.equal(isCommonQueryFresh("2026-08-02T00:00:00.000Z", Date.parse("2026-08-02T00:00:59.999Z")), true);
  assert.equal(isCommonQueryFresh("2026-08-02T00:00:00.000Z", Date.parse("2026-08-02T00:01:00.000Z")), false);
});
