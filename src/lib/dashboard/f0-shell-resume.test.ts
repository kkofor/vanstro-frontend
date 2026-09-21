import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardFoundationState } from "./f0-shell.ts";
import {
  createDashboardFoundationRequestCoordinator,
  shouldRevalidateDashboardOnResume
} from "./f0-shell.ts";

const STALE_AFTER_MS = 5 * 60_000;
const SKEW_MS = 60_000;
const NOW = 1_700_000_000_000;
const future = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

function decide(currentState: DashboardFoundationState["status"], lastSuccessfulAt: number | null, expiresAt: string | null) {
  return shouldRevalidateDashboardOnResume({
    now: NOW,
    lastSuccessfulAt,
    authorizationExpiresAt: expiresAt,
    currentState,
    staleAfterMs: STALE_AFTER_MS,
    expirySkewMs: SKEW_MS
  });
}

test("resume: ready + fresh → skip (0 requests)", () => {
  assert.deepEqual(decide("ready", NOW, future(30 * 60_000)), { kind: "skip" });
});

test("resume: ready + near expiry → background revalidate", () => {
  assert.deepEqual(decide("ready", NOW, future(SKEW_MS / 2)), { kind: "revalidate", presentation: "background" });
});

test("resume: ready + expired → blocking fail-closed", () => {
  assert.deepEqual(decide("ready", NOW, future(-1)), { kind: "revalidate", presentation: "blocking" });
});

test("resume: ready + stale (no fresh load) → background revalidate", () => {
  assert.deepEqual(decide("ready", NOW - STALE_AFTER_MS - 1, future(30 * 60_000)), { kind: "revalidate", presentation: "background" });
});

test("resume: unavailable/invalid → background revalidate", () => {
  assert.deepEqual(decide("unavailable", NOW, null), { kind: "revalidate", presentation: "background" });
  assert.deepEqual(decide("invalid", NOW, null), { kind: "revalidate", presentation: "background" });
});

test("resume: anonymous/forbidden → skip (no auto re-ping)", () => {
  assert.deepEqual(decide("anonymous", null, null), { kind: "skip" });
  assert.deepEqual(decide("forbidden", null, null), { kind: "skip" });
});

test("resume: idle/loading/legacy → skip (in-flight or legacy-owned)", () => {
  assert.deepEqual(decide("idle", null, null), { kind: "skip" });
  assert.deepEqual(decide("loading", null, null), { kind: "skip" });
  assert.deepEqual(decide("legacy", null, null), { kind: "skip" });
});

test("resume: repeated fresh focus stays skipped (deterministic, no extra request)", () => {
  for (let i = 0; i < 5; i += 1) {
    assert.deepEqual(decide("ready", NOW, future(30 * 60_000)), { kind: "skip" });
  }
});

test("resume coordinator: in-flight request blocks a second chain (dedupe)", () => {
  const coordinator = createDashboardFoundationRequestCoordinator();
  const first = coordinator.begin(false);
  assert.notEqual(first, null);
  assert.equal(coordinator.begin(true), null, "dedupe must reject a second chain while one is active");
  coordinator.finish(first as number);
  assert.notEqual(coordinator.begin(true), null, "after finish a new chain is allowed");
});

test("resume coordinator: expiry-timer force always supersedes (single current chain)", () => {
  const coordinator = createDashboardFoundationRequestCoordinator();
  const background = coordinator.begin(true);
  assert.notEqual(background, null);
  const forced = coordinator.begin(false);
  assert.notEqual(forced, null, "force must always start a new generation");
  assert.equal(coordinator.isCurrent(background as number), false, "superseded background must no longer be current");
  assert.equal(coordinator.isCurrent(forced as number), true);
});
