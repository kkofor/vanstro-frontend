import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { consumeStrictQueryLimit } from "./strict-query-rate-limit.js";

test("strict query limiter enforces accepted-only burst and long windows atomically", async()=>{
 const actor=randomUUID(),profile="dashboard.products.v1",prefix=`dashboard-cq:${actor}:`;
 try{
  const now=1_800_000_000_000;
  const burst=await Promise.all(Array.from({length:11},()=>consumeStrictQueryLimit(actor,profile,now)));
  assert.equal(burst.filter(x=>x.allowed).length,10);assert.equal(burst.filter(x=>!x.allowed).length,1);assert.equal(burst.find(x=>!x.allowed)?.retryAfterSeconds,1);
  const boundary=await consumeStrictQueryLimit(actor,profile,now+1000);assert.equal(boundary.allowed,true);
  const other=await consumeStrictQueryLimit(`${actor}-other`,profile,now);assert.equal(other.allowed,true);
 }finally{await prisma.rateLimitBucket.deleteMany({where:{key:{startsWith:prefix}}});await prisma.rateLimitBucket.deleteMany({where:{key:{startsWith:`dashboard-cq:${actor}-other:`}}})}
});

test("strict query limiter enforces 60 accepted requests per rolling minute",async()=>{
 const actor=randomUUID(),profile="dashboard.dealers.v1",key=`dashboard-cq:${actor}:${profile}`;
 try{const start=1_800_100_000_000;for(let i=0;i<60;i++){const result=await consumeStrictQueryLimit(actor,profile,start+i*1000);assert.equal(result.allowed,true)}const blocked=await consumeStrictQueryLimit(actor,profile,start+59_500);assert.equal(blocked.allowed,false);const refilled=await consumeStrictQueryLimit(actor,profile,start+60_000);assert.equal(refilled.allowed,true)}finally{await prisma.rateLimitBucket.deleteMany({where:{key}})}
});
