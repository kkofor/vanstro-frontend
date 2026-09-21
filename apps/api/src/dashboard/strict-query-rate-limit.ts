import { prisma, type Prisma } from "@vanstro/db";
import { createHash } from "node:crypto";
export type StrictLimitResult={allowed:boolean;remaining:number;resetEpochSeconds:number;retryAfterSeconds?:number;burstResetEpochSeconds:number};
function lockId(key:string){return BigInt.asIntN(64,BigInt(`0x${createHash("sha256").update(key).digest("hex").slice(0,16)}`))}
export async function consumeStrictQueryLimit(actorId:string,profileId:string,now=Date.now(),database:typeof prisma=prisma):Promise<StrictLimitResult>{
 const key=`dashboard-cq:${actorId}:${profileId}`,second=now-1000,minute=now-60000;
 return database.$transaction(async (tx: Prisma.TransactionClient)=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId(key)})`;
  await tx.rateLimitBucket.deleteMany({where:{key,expiresAt:{lte:new Date(now)}}});
  const rows=await tx.rateLimitBucket.findMany({where:{key,window:{gt:BigInt(minute)*1000n}},select:{window:true},orderBy:{window:"asc"}});
  const times=rows.map(r=>Number(r.window/1000n)),long=times.length,burst=times.filter(t=>t>second).length;
  const blockedLong=long>=60,blockedBurst=burst>=10;
  const longNext=blockedLong?times[long-60]!+60000:now,burstTimes=times.filter(t=>t>second),burstNext=blockedBurst?burstTimes[burstTimes.length-10]!+1000:now;
  if(blockedLong||blockedBurst){const retry=Math.max(1,Math.ceil((Math.max(longNext,burstNext)-now)/1000));return {allowed:false,remaining:Math.max(0,60-long),resetEpochSeconds:Math.ceil(longNext/1000),retryAfterSeconds:retry,burstResetEpochSeconds:Math.ceil(burstNext/1000)}}
  const ordinal=rows.filter(r=>Number(r.window/1000n)===now).length;await tx.rateLimitBucket.create({data:{key,window:BigInt(now)*1000n+BigInt(ordinal),count:1,expiresAt:new Date(now+60000)}});
  return {allowed:true,remaining:Math.max(0,59-long),resetEpochSeconds:Math.ceil(((times[0]??now)+60000)/1000),burstResetEpochSeconds:Math.ceil(((burstTimes[0]??now)+1000)/1000)};
 });
}
