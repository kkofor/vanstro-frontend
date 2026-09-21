import assert from "node:assert/strict";
import test from "node:test";
import { workerHeartbeatRequiresCriticalAlert } from "./alerts.js";

const observation = (input: {
  activeCount: bigint;
  staleCount: bigint;
  latestSucceededAt?: Date | null;
  latestFailedAt?: Date | null;
  latestErrorCode?: "worker_error" | null;
}) => ({
  activeCount: input.activeCount,
  staleCount: input.staleCount,
  latestSucceededAt: input.latestSucceededAt ?? null,
  latestFailedAt: input.latestFailedAt ?? null,
  latestErrorCode: input.latestErrorCode ?? null
});

test("fresh active Worker suppresses historical stale-row critical alert", () => {
  assert.equal(workerHeartbeatRequiresCriticalAlert(observation({
    activeCount: 1n,
    staleCount: 1n,
    latestSucceededAt: new Date("2026-08-04T17:00:00.000Z")
  })), false);
});

test("stale-only Worker fleet remains critical", () => {
  assert.equal(workerHeartbeatRequiresCriticalAlert(observation({
    activeCount: 0n,
    staleCount: 1n,
    latestSucceededAt: new Date("2026-08-04T16:55:00.000Z")
  })), true);
});

test("no observed active or stale Worker preserves critical no-heartbeat behavior", () => {
  assert.equal(workerHeartbeatRequiresCriticalAlert(observation({
    activeCount: 0n,
    staleCount: 0n
  })), true);
});

test("fresh active Worker with a safe failure signal preserves active-fleet semantics", () => {
  assert.equal(workerHeartbeatRequiresCriticalAlert(observation({
    activeCount: 1n,
    staleCount: 0n,
    latestSucceededAt: new Date("2026-08-04T17:00:00.000Z"),
    latestFailedAt: new Date("2026-08-04T17:00:30.000Z"),
    latestErrorCode: "worker_error"
  })), false);
});
