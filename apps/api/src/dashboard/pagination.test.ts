import assert from "node:assert/strict";
import test from "node:test";
import { pageMeta, parsePagination, DASHBOARD_PAGE_SIZE_DEFAULT, DASHBOARD_PAGE_SIZE_MAX } from "./request.js";

function fakeContext(query: Record<string, string | undefined>) {
  return {
    req: {
      query: (key: string) => query[key]
    }
  } as Parameters<typeof parsePagination>[0];
}

test("parsePagination defaults to page 1 and default page size", () => {
  const pagination = parsePagination(fakeContext({}));
  assert.equal(pagination.page, 1);
  assert.equal(pagination.pageSize, DASHBOARD_PAGE_SIZE_DEFAULT);
  assert.equal(pagination.skip, 0);
  assert.equal(pagination.take, DASHBOARD_PAGE_SIZE_DEFAULT);
});

test("parsePagination clamps pageSize to the max", () => {
  const pagination = parsePagination(fakeContext({ page: "2", pageSize: "999" }));
  assert.equal(pagination.page, 2);
  assert.equal(pagination.pageSize, DASHBOARD_PAGE_SIZE_MAX);
  assert.equal(pagination.skip, DASHBOARD_PAGE_SIZE_MAX);
});

test("parsePagination ignores invalid values", () => {
  const pagination = parsePagination(fakeContext({ page: "0", pageSize: "-5" }));
  assert.equal(pagination.page, 1);
  assert.equal(pagination.pageSize, DASHBOARD_PAGE_SIZE_DEFAULT);
});

test("pageMeta computes totalPages", () => {
  assert.deepEqual(pageMeta({ page: 1, pageSize: 2, skip: 0, take: 2 }, 7), {
    page: 1,
    pageSize: 2,
    total: 7,
    totalPages: 4
  });
  assert.deepEqual(pageMeta({ page: 1, pageSize: 50, skip: 0, take: 50 }, 0), {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1
  });
});
