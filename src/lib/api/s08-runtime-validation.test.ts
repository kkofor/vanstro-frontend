import assert from "node:assert/strict";
import test from "node:test";
import { validateTokenMetadata } from "./s08-runtime-validation.ts";

const base = {
  id: "e6f0f6e0-0000-4000-8000-000000000001",
  status: "active",
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z"
} as const;

test("validateTokenMetadata: name=null → accepted as null", () => {
  const result = validateTokenMetadata({ ...base, name: null });
  assert.equal(result.name, null);
});

test("validateTokenMetadata: non-empty name → accepted", () => {
  const result = validateTokenMetadata({ ...base, name: "legacy token" });
  assert.equal(result.name, "legacy token");
});

test("validateTokenMetadata: empty name → rejected", () => {
  assert.throws(() => validateTokenMetadata({ ...base, name: "" }), /non-empty string/);
  assert.throws(() => validateTokenMetadata({ ...base, name: "   " }), /non-empty string/);
});

test("validateTokenMetadata: omitted name → rejected", () => {
  const { name: _omitted, ...withoutName } = { ...base, name: null };
  assert.throws(() => validateTokenMetadata(withoutName), /exact object with keys/);
});

test("validateTokenMetadata: unknown field → rejected", () => {
  assert.throws(() => validateTokenMetadata({ ...base, name: null, tokenHash: "abc" } as unknown), /exact object with keys/);
});

test("validateTokenMetadata: non-string non-null name → rejected", () => {
  assert.throws(() => validateTokenMetadata({ ...base, name: 42 } as unknown), /non-empty string/);
});
