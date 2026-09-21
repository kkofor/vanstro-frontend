import assert from "node:assert/strict";
import test from "node:test";
import { createSettingsReadinessConsumer } from "./s01-settings-readiness-consumer.ts";

test("Settings readiness consumer clears the old timer before installing a generation", () => {
  const callbacks = new Map<number, () => void>();
  const cleared: number[] = [];
  let next = 1;
  const delays: number[] = [];
  const consumer = createSettingsReadinessConsumer({
    set(callback, delayMs) { delays.push(delayMs); const id = next++; callbacks.set(id, callback); return id; },
    clear(id) { cleared.push(id); callbacks.delete(id); }
  });
  let reloads = 0;
  assert.equal(consumer.install(4, 15, () => { reloads += 1; }), 4);
  const first = callbacks.get(1)!;
  assert.equal(consumer.appliedGeneration(), 4);
  assert.equal(consumer.install(5, 300, () => { reloads += 1; }), 5);
  assert.deepEqual(delays, [15_000, 300_000]);
  assert.deepEqual(cleared, [1]);
  first();
  assert.equal(reloads, 0, "a replaced timer callback is fenced");
  callbacks.get(2)!();
  assert.equal(reloads, 1);
});

test("Settings readiness consumer dispose clears timer and applied generation", () => {
  const cleared: number[] = [];
  const consumer = createSettingsReadinessConsumer({ set() { return 7; }, clear(id) { cleared.push(id); } });
  consumer.install(0, 60, () => {});
  consumer.dispose();
  assert.deepEqual(cleared, [7]);
  assert.equal(consumer.appliedGeneration(), null);
});

test("Settings readiness consumer rejects invalid projection values", () => {
  const consumer = createSettingsReadinessConsumer({ set() { return 1; }, clear() {} });
  for (const [generation, seconds] of [[-1, 60], [2147483648, 60], [1, 14], [1, 301], [1.5, 60]]) {
    assert.throws(() => consumer.install(generation, seconds, () => {}), TypeError);
  }
});
