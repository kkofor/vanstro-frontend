import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractUrl = new URL("../tasks/checkpoints/integration-2026-08-05-v1-s01b-corrective-readiness-contract-frozen.md", import.meta.url);

async function contract() {
  return readFile(contractUrl, "utf8");
}

test("S01B corrective contract freezes publication sequence generation and default projection", async () => {
  const source = await contract();
  assert.match(source, /`publishedGeneration` is the descriptor-scoped positive publication sequence/);
  assert.match(source, /compiled default projection has stable `publishedGeneration = 0` and `effectiveOverviewRefreshSeconds = 60`/);
  assert.match(source, /not.*draft resource CAS, React request counter/s);
  assert.match(source, /`publicationVersion` remains present.*compatibility/s);
});

test("S01B corrective contract freezes side-effect-free missing mismatch and exact-match semantics", async () => {
  const source = await contract();
  assert.match(source, /Missing parameter:.*`degraded \/ consumer_generation_missing`/);
  assert.match(source, /Non-equality: `degraded \/ consumer_generation_mismatch`/);
  assert.match(source, /Exact equality.*`ready \/ ready`/);
  assert.match(source, /performs no write, heartbeat, Audit/);
  assert.match(source, /`0\.\.2147483647`/);
  assert.match(source, /`400 SETTINGS_VALIDATION_FAILED`/);
});

test("S01B corrective contract freezes install-before-ready timer protocol", async () => {
  const source = await contract();
  const clear = source.indexOf("clears the old timer");
  const install = source.indexOf("installs the new timer");
  const record = source.indexOf("record the applied generation");
  const second = source.indexOf("second readiness read");
  assert.ok(clear >= 0 && install > clear && record > install && second > record);
  assert.match(source, /Actor switch, request supersession, apply failure, or unmount clears the timer/);
  assert.match(source, /refresh timer triggers an actual Overview refresh/);
});

test("S01B corrective contract forbids migration and scope expansion", async () => {
  const source = await contract();
  assert.match(source, /Migrations 1–74 remain immutable; migration75 is forbidden/);
  assert.match(source, /CG01 and S02–S12 remain unauthorized/);
  assert.match(source, /No new descriptor, provider, secret, Payment, Email, ERP, Webhook, API Key/);
});
