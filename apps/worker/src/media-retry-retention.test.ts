import assert from "node:assert/strict";
import test from "node:test";
import { reconcileMediaRetryRetention } from "@vanstro/db";

test("P07 retry retention invokes one bounded database batch",async()=>{
  const calls:unknown[]=[];
  const database={$queryRaw:async(query:unknown)=>{calls.push(query);return[{commandsDeleted:2n,retirementsDeleted:1n}]}};
  assert.deepEqual(await reconcileMediaRetryRetention(database as never),{ok:true,commandsDeleted:2,retirementsDeleted:1});
  assert.equal(calls.length,1);
  assert.match(String((calls[0] as {strings?:string[]}).strings?.join("")),/media_cleanup_retry_retention\(100,CURRENT_TIMESTAMP\)/);
});

test("P07 retry retention failure emits safe evidence and does not escape",async()=>{
  const evidence:string[]=[];
  const database={$queryRaw:async()=>{throw new Error("sensitive database detail")}};
  assert.deepEqual(await reconcileMediaRetryRetention(database as never,code=>evidence.push(code)),{ok:false,commandsDeleted:0,retirementsDeleted:0});
  assert.deepEqual(evidence,["MEDIA_RETRY_RETENTION_FAILED"]);
});
