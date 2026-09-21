import assert from "node:assert/strict";
import test from "node:test";
import { createS02ReadinessConsumer } from "./s02-settings-readiness-consumer.ts";

test("S02 readiness consumer clears the old timer before installing a generation", () => {
  const callbacks = new Map<number, () => void>();
  const cleared: number[] = [];
  let next = 1;
  const consumer = createS02ReadinessConsumer({
    set(callback) { const id = next++; callbacks.set(id, callback); return id; },
    clear(id) { cleared.push(id); callbacks.delete(id); }
  });
  let reloads = 0;
  assert.equal(consumer.install(4, () => { reloads += 1; }), 4);
  const first = callbacks.get(1)!;
  assert.equal(consumer.appliedGeneration(), 4);
  assert.equal(consumer.install(5, () => { reloads += 1; }), 5);
  assert.deepEqual(cleared, [1]);
  first();
  assert.equal(reloads, 0, "a replaced timer callback is fenced");
  callbacks.get(2)!();
  assert.equal(reloads, 1);
});

test("S02 readiness consumer dispose clears timer and applied generation", () => {
  const cleared: number[] = [];
  const consumer = createS02ReadinessConsumer({ set() { return 7; }, clear(id) { cleared.push(id); } });
  consumer.install(0, () => {});
  consumer.dispose();
  assert.deepEqual(cleared, [7]);
  assert.equal(consumer.appliedGeneration(), null);
});

test("S02 readiness consumer rejects invalid projection generations", () => {
  const consumer = createS02ReadinessConsumer({ set() { return 1; }, clear() {} });
  for (const generation of [-1, 2147483648, 1.5]) {
    assert.throws(() => consumer.install(generation, () => {}), TypeError);
  }
});
