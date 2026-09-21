import assert from "node:assert/strict";
import test from "node:test";
import {
  SESSION_NOTICE_STORAGE_KEY,
  SESSION_NOTICE_TTL_MS,
  browserSessionNoticeStorage,
  clearSessionNotice,
  parseSessionNotice,
  readSessionNotice,
  sessionNoticeAction,
  writeSessionNotice,
  type SessionNoticeStorage
} from "./session-notice.ts";

const NOW = Date.parse("2026-08-13T00:00:00Z");

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const ops: string[] = [];
  const storage: SessionNoticeStorage = {
    getItem: (key) => { ops.push(`get:${key}`); return map.get(key) ?? null; },
    setItem: (key, value) => { ops.push(`set:${key}`); map.set(key, value); },
    removeItem: (key) => { ops.push(`remove:${key}`); map.delete(key); }
  };
  return { storage, map, ops };
}

const validPayload = (createdAt = NOW) => JSON.stringify({ type: "expired", createdAt, version: 1 });

function runLifecycle(
  previousStatus: "idle" | "loading" | "legacy" | "ready" | "anonymous" | "forbidden" | "unavailable" | "invalid" | null,
  currentStatus: "idle" | "loading" | "legacy" | "ready" | "anonymous" | "forbidden" | "unavailable" | "invalid",
  loggingOut = false,
  storage: SessionNoticeStorage = memoryStorage().storage
) {
  return sessionNoticeAction({ previousStatus, currentStatus, loggingOut, now: NOW, storage });
}

test("payload contract: only the fixed non-sensitive fields are ever persisted", () => {
  const { storage, map } = memoryStorage();
  writeSessionNotice(NOW, storage);
  const parsed = JSON.parse(map.get(SESSION_NOTICE_STORAGE_KEY) ?? "");
  assert.deepEqual(Object.keys(parsed).sort(), ["createdAt", "type", "version"]);
  assert.deepEqual(parsed, { type: "expired", createdAt: NOW, version: 1 });
  // No other storage key is ever touched.
  assert.equal(map.size, 1);
  assert.ok(map.has(SESSION_NOTICE_STORAGE_KEY));
});

test("parse fails closed on malformed, wrong-type, wrong-version and non-finite records", () => {
  assert.equal(parseSessionNotice(null), null);
  assert.equal(parseSessionNotice("expired"), null);
  assert.equal(parseSessionNotice({}), null);
  assert.equal(parseSessionNotice({ type: "expired" }), null);
  assert.equal(parseSessionNotice({ type: "anonymous", createdAt: NOW, version: 1 }), null);
  assert.equal(parseSessionNotice({ type: "expired", createdAt: "2026-08-13T00:00:00Z", version: 1 }), null);
  assert.equal(parseSessionNotice({ type: "expired", createdAt: NaN, version: 1 }), null);
  assert.equal(parseSessionNotice({ type: "expired", createdAt: Infinity, version: 1 }), null);
  assert.equal(parseSessionNotice({ type: "expired", createdAt: NOW, version: 2 }), null);
  assert.deepEqual(parseSessionNotice({ type: "expired", createdAt: NOW, version: 1 }), {
    type: "expired",
    createdAt: NOW,
    version: 1
  });
});

test("valid read is non-destructive: the notice survives until re-auth/logout/TTL/malformed", () => {
  const { storage, map } = memoryStorage({ [SESSION_NOTICE_STORAGE_KEY]: validPayload() });
  assert.deepEqual(readSessionNotice(NOW, storage), { type: "expired", createdAt: NOW, version: 1 });
  assert.ok(map.has(SESSION_NOTICE_STORAGE_KEY), "a valid read must not consume the notice");
});

test("TTL expiry clears the record and fails closed", () => {
  const { storage, map } = memoryStorage({ [SESSION_NOTICE_STORAGE_KEY]: validPayload() });
  assert.deepEqual(readSessionNotice(NOW + SESSION_NOTICE_TTL_MS, storage), {
    type: "expired",
    createdAt: NOW,
    version: 1
  }, "exactly at the TTL boundary the notice is still within its window");
  assert.equal(readSessionNotice(NOW + SESSION_NOTICE_TTL_MS + 1, storage), null, "past the TTL the notice expires");
  assert.ok(!map.has(SESSION_NOTICE_STORAGE_KEY), "expired records are cleared");
  // Future-dated records beyond clock skew fail closed too.
  const future = memoryStorage({ [SESSION_NOTICE_STORAGE_KEY]: validPayload(NOW + 2 * 60 * 1000) });
  assert.equal(readSessionNotice(NOW, future.storage), null);
  assert.ok(!future.map.has(SESSION_NOTICE_STORAGE_KEY));
});

test("malformed storage clears the record and fails closed", () => {
  for (const raw of ["not-json", validPayload().replace('"expired"', '"expire"'), "{", "null", "42"]) {
    const { storage, map } = memoryStorage({ [SESSION_NOTICE_STORAGE_KEY]: raw });
    assert.equal(readSessionNotice(NOW, storage), null, `raw=${raw} must fail closed`);
    assert.ok(!map.has(SESSION_NOTICE_STORAGE_KEY), `raw=${raw} must be cleared`);
  }
});

test("storage API throwing degrades safely and never blocks the login flow", () => {
  const throwing: SessionNoticeStorage = {
    getItem: () => { throw new DOMException("blocked", "SecurityError"); },
    setItem: () => { throw new DOMException("blocked", "SecurityError"); },
    removeItem: () => { throw new DOMException("blocked", "SecurityError"); }
  };
  assert.doesNotThrow(() => writeSessionNotice(NOW, throwing));
  assert.doesNotThrow(() => clearSessionNotice(throwing));
  assert.equal(readSessionNotice(NOW, throwing), null);
  assert.doesNotThrow(() => runLifecycle("ready", "anonymous", false, throwing));
  // The in-memory transition still surfaces even when persistence fails.
  assert.equal(runLifecycle("ready", "anonymous", false, throwing), "show");
});

test("browser adapter is null on SSR and when storage access throws", () => {
  assert.equal(typeof window, "undefined", "node has no window");
  assert.equal(browserSessionNoticeStorage(), null, "SSR must degrade to no storage");
});

test("lifecycle: initial anonymous never writes or shows a notice", () => {
  const { storage, map } = memoryStorage();
  assert.equal(runLifecycle(null, "loading", false, storage), "hide");
  assert.equal(runLifecycle("loading", "anonymous", false, storage), "keep");
  assert.equal(map.size, 0);
});

test("lifecycle: ready → anonymous without logout persists the notice and shows it once", () => {
  const { storage, map } = memoryStorage();
  assert.equal(runLifecycle("ready", "anonymous", false, storage), "show");
  const parsed = JSON.parse(map.get(SESSION_NOTICE_STORAGE_KEY) ?? "");
  assert.deepEqual(parsed, { type: "expired", createdAt: NOW, version: 1 });
  // StrictMode double run of the same status must not flip or re-write.
  assert.equal(runLifecycle("anonymous", "anonymous", false, storage), "keep");
  assert.equal(map.size, 1);
});

test("lifecycle: explicit logout clears the persisted notice and never shows expired", () => {
  const { storage, map } = memoryStorage({ [SESSION_NOTICE_STORAGE_KEY]: validPayload() });
  assert.equal(runLifecycle("ready", "anonymous", true, storage), "hide");
  assert.equal(map.size, 0);
});

test("lifecycle: authenticated status clears the persisted notice", () => {
  const { storage, map } = memoryStorage({ [SESSION_NOTICE_STORAGE_KEY]: validPayload() });
  assert.equal(runLifecycle("loading", "ready", false, storage), "hide");
  assert.equal(map.size, 0);
  assert.equal(runLifecycle(null, "ready", false, storage), "hide");
  assert.equal(map.size, 0);
});

test("lifecycle: fresh mount restores a still-valid notice without consuming it", () => {
  const { storage, map } = memoryStorage({ [SESSION_NOTICE_STORAGE_KEY]: validPayload() });
  assert.equal(runLifecycle(null, "anonymous", false, storage), "show");
  assert.ok(map.has(SESSION_NOTICE_STORAGE_KEY), "a fresh-mount restore must not consume the notice");
  // A second fresh shell (route remount) still sees it.
  assert.equal(runLifecycle(null, "anonymous", false, storage), "show");
  // Full reload within the TTL: loading → anonymous keeps the shown notice.
  assert.equal(runLifecycle(null, "loading", false, storage), "show");
  assert.equal(runLifecycle("loading", "anonymous", false, storage), "keep");
});

test("lifecycle: transient restore/failure states never touch the persisted notice", () => {
  const { storage, map } = memoryStorage({ [SESSION_NOTICE_STORAGE_KEY]: validPayload() });
  assert.equal(runLifecycle("anonymous", "loading", false, storage), "keep");
  assert.equal(runLifecycle("anonymous", "forbidden", false, storage), "keep");
  assert.equal(runLifecycle("anonymous", "unavailable", false, storage), "keep");
  assert.equal(runLifecycle("anonymous", "invalid", false, storage), "keep");
  assert.ok(map.has(SESSION_NOTICE_STORAGE_KEY));
});

test("lifecycle: no credential or PII-shaped value can ever be stored", () => {
  const { storage, map } = memoryStorage();
  runLifecycle("ready", "anonymous", false, storage);
  const raw = map.get(SESSION_NOTICE_STORAGE_KEY) ?? "";
  for (const forbidden of ["token", "cookie", "email", "userId", "returnTo", "password", "secret", "authorization", "Bearer"]) {
    assert.ok(!raw.toLowerCase().includes(forbidden), `payload must not contain ${forbidden}`);
  }
});
