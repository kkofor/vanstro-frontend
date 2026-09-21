import assert from "node:assert/strict";
import test from "node:test";
import { createS10ReadinessConsumer } from "./s10-settings-readiness-consumer.ts";

test("S10 readiness consumer installs, fences and disposes generations", () => {
  let scheduled: Array<{ handle: number; callback: () => void; delay: number }> = [];
  let nextHandle = 1;
  const scheduler = {
    set: (callback: () => void, delayMs: number) => { const handle = nextHandle++; scheduled.push({ handle, callback, delay: delayMs }); return handle; },
    clear: (handle: number) => { scheduled = scheduled.filter((entry) => entry.handle !== handle); }
  };
  const consumer = createS10ReadinessConsumer<number>(scheduler);
  let reloads = 0;
  assert.equal(consumer.appliedGeneration(), null);
  consumer.install(3, () => { reloads += 1; });
  assert.equal(consumer.appliedGeneration(), 3);
  consumer.install(4, () => { reloads += 1; });
  assert.equal(consumer.appliedGeneration(), 4);
  assert.equal(scheduled.length, 1, "reinstalling must dispose the prior timer");
  consumer.dispose();
  assert.equal(consumer.appliedGeneration(), null);
  assert.equal(scheduled.length, 0, "dispose must clear the timer");
  assert.throws(() => consumer.install(-1, () => undefined), /Invalid S10 published generation/);
  assert.throws(() => consumer.install(Number.NaN, () => undefined), /Invalid S10 published generation/);
});
