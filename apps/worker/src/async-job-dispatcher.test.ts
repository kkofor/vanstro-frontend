import assert from "node:assert/strict";
import test from "node:test";
import { dispatchFoundationJobs, mediaSelectedObjectKey } from "./async-job-dispatcher.js";
test("P05 dispatcher is a deployment no-op and cannot claim provider work",async()=>{assert.deepEqual(await dispatchFoundationJobs({runtimeMode:"deployment",workerId:"worker-test"}),{claimed:0});assert.deepEqual(await dispatchFoundationJobs({runtimeMode:"development",workerId:"worker-test"}),{claimed:0})});
test("P07 selected outputs persist outside attempt scratch",()=>{const id="11111111-1111-4111-8111-111111111111",variant="22222222-2222-4222-8222-222222222222",operation="33333333-3333-4333-8333-333333333333",key=mediaSelectedObjectKey(id,variant,operation);assert.equal(key,`objects/${id}/${variant}/${operation}`);assert.equal(key.startsWith(`attempts/${id}/`),false)});
