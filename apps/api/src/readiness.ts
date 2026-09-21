import { ASYNC_JOB_CONTRACT_VERSION, ASYNC_JOB_REGISTRY_VERSION, ASYNC_JOB_SCHEMA_VERSION, SOURCE_LATEST_MIGRATION, p09WorkerObservation, prisma } from "@vanstro/db";
import { createHash } from "node:crypto";

export { SOURCE_LATEST_MIGRATION };
export const READINESS_CONTRACT_VERSION = "runtime-foundation.v1" as const;
export type ReadinessState = "ready" | "degraded" | "not_ready" | "draining" | "stale";
export type DependencyState = "ready" | "degraded" | "unavailable" | "not_configured" | "unknown" | "stale";
export type SafeDependency = { key:string; required:boolean; state:DependencyState; reasonCode:string; safeSummary:string; observedAt:string; staleAfter:string; source:string; sourceVersion:string };

const timeout = async <T>(promise: Promise<T>, ms=2000) => Promise.race([promise,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("READINESS_TIMEOUT")),ms))]);
const stamp=(key:string,required:boolean,state:DependencyState,reasonCode:string,safeSummary:string,observed:Date,ttlMs:number,source:string,sourceVersion:string):SafeDependency=>({key,required,state,reasonCode,safeSummary,observedAt:observed.toISOString(),staleAfter:new Date(observed.getTime()+ttlMs).toISOString(),source,sourceVersion});
function configuredState(value:string|undefined){return value?.trim()?"ready" as const:"not_configured" as const}
export function staleDependency(value:SafeDependency,now=new Date()):SafeDependency{return now>=new Date(value.staleAfter)&&value.state==="ready"?{...value,state:"stale",reasonCode:"observation_stale",safeSummary:"The last successful observation expired."}:value}

export async function collectRuntimeReadiness(env:NodeJS.ProcessEnv=process.env,now=new Date()){
 const dependencies:SafeDependency[]=[];
 try{
  const rows=await timeout(prisma.$queryRaw<Array<{latestApplied:boolean;failedCount:bigint;permissionCount:bigint;auditPresent:boolean;jobRegistryValid:boolean}>>`
   SELECT
    EXISTS(SELECT 1 FROM "_prisma_migrations" WHERE "migration_name"=${SOURCE_LATEST_MIGRATION} AND "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL) AS "latestApplied",
    (SELECT count(*) FROM "_prisma_migrations" WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL)::bigint AS "failedCount",
    (SELECT count(*) FROM "permissions" WHERE "key" IN ('config.read','config.manage','config.activate','flags.read','flags.manage','flags.kill_switch','readiness.read_summary','readiness.read_detail'))::bigint AS "permissionCount",
    to_regclass('public.audit_events') IS NOT NULL AS "auditPresent",
    NOT EXISTS(SELECT 1 FROM "async_jobs" WHERE "contractVersion"<>${ASYNC_JOB_CONTRACT_VERSION} OR "schemaVersion"<>${ASYNC_JOB_SCHEMA_VERSION}) AS "jobRegistryValid"
  `);
  const row=rows[0]!,migrationReady=row.latestApplied&&Number(row.failedCount)===0;
  dependencies.push(stamp("database",true,"ready","connected","Database connection is available.",now,15000,"postgresql","postgresql.v16"));
  dependencies.push(stamp("migration",true,migrationReady?"ready":"unavailable",migrationReady?"source_latest_applied":"migration_incompatible",migrationReady?"Source-compatible migration is applied.":"Source-compatible migration is unavailable.",now,15000,"prisma_migrations",SOURCE_LATEST_MIGRATION));
  dependencies.push(stamp("auth_session",true,Number(row.permissionCount)===8?"ready":"unavailable",Number(row.permissionCount)===8?"registry_valid":"registry_invalid","Session and P09 permission registry were checked.",now,15000,"p02_rbac","dashboard-authorization.v1"));
  dependencies.push(stamp("p04_audit",true,row.auditPresent?"ready":"unavailable",row.auditPresent?"registry_valid":"registry_invalid","Audit persistence contract was checked.",now,15000,"p04_audit","audit-event.v1"));
  dependencies.push(stamp("p05_job_registry",true,row.jobRegistryValid?"ready":"unavailable",row.jobRegistryValid?"registry_valid":"registry_invalid","Persisted Job contracts were checked.",now,15000,"p05_jobs",ASYNC_JOB_REGISTRY_VERSION));
 }catch{
  for(const key of ["database","migration","auth_session","p04_audit","p05_job_registry"])dependencies.push(stamp(key,true,"unavailable","bounded_probe_failed","Required dependency check failed safely.",now,5000,"runtime_probe",READINESS_CONTRACT_VERSION));
 }
 try{
  const [heartbeat,queued,running,mediaRows]=await timeout(Promise.all([
   p09WorkerObservation(prisma),
   prisma.asyncJob.count({where:{status:"queued"}}),prisma.asyncJob.count({where:{status:"running"}}),
   prisma.mediaProcessingReadiness.findMany({where:{probeExpiresAt:{gt:now},heartbeatAt:{gt:new Date(now.getTime()-30000)}},select:{supportedKinds:true,capacityByKind:true,probeResult:true,heartbeatAt:true,probeExpiresAt:true}})
  ]));
  const active=Number(heartbeat.activeCount),draining=Number(heartbeat.drainingCount),shutdown=Number(heartbeat.shutdownCount),stale=Number(heartbeat.staleCount),capacity=Number(heartbeat.totalCapacity);
  const workerState:DependencyState=active?"ready":draining?"degraded":shutdown?"unavailable":stale?"stale":"unavailable",workerReason=active?"heartbeat_fresh":draining?"all_draining":shutdown?"all_shutdown":stale?"stale_only":"no_instance";
  dependencies.push(stamp("worker",false,workerState,workerReason,`Active ${active}; draining ${draining}; shutdown ${shutdown}; stale ${stale}.`,heartbeat.observedAt,120000,"worker_observer","worker-lifecycle.v1"));
  dependencies.push(stamp("worker_claim",false,capacity>0?"ready":draining?"degraded":"unavailable",capacity>0?"claim_preconditions_ready":draining?"all_draining":"zero_capacity",`Effective claim capacity ${capacity}; queued ${queued}; running ${running}.`,heartbeat.observedAt,15000,"p05_claim","async-job-claim.v1"));
  const storageConfigured=Boolean(env.MEDIA_PRIVATE_ROOT?.trim()||env.P08_PRIVATE_ROOT?.trim()),mediaCapacity=mediaRows.reduce((sum,row)=>sum+Object.values(row.capacityByKind as Record<string,unknown>).reduce<number>((n,v)=>n+(Number(v)||0),0),0);
  dependencies.push(stamp("storage",false,storageConfigured?(mediaCapacity>0?"ready":"degraded"):"not_configured",storageConfigured?(mediaCapacity>0?"capacity_available":"zero_capacity"):"not_configured",storageConfigured?`Private storage configured; attested capacity ${mediaCapacity}.`:"Private storage is not configured.",now,15000,"p07_p08_storage","media-processing-readiness.v1"));
 }catch{for(const key of ["worker","worker_claim","storage"])dependencies.push(stamp(key,false,"unavailable","bounded_probe_failed","Capability observation failed safely.",now,5000,"runtime_probe",READINESS_CONTRACT_VERSION));}
 for(const [key,value] of [["smtp",env.SMTP_HOST],["erp",env.ERP_API_BASE_URL],["payment",env.MONERIS_STORE_ID]] as const){const state=configuredState(value);dependencies.push(stamp(key,false,state,state==="ready"?"configured_passive":"not_configured",state==="ready"?`${key} configuration is present; no side-effecting probe was sent.`:`${key} is not configured.`,now,30000,"deployment_config","passive-config.v1"));}
 const current=dependencies.map(value=>staleDependency(value,now)),requiredUnavailable=current.some(x=>x.required&&x.state!=="ready"),draining=current.some(x=>x.reasonCode==="draining"),degraded=current.some(x=>!x.required&&x.state!=="ready");
 const state:ReadinessState=requiredUnavailable?"not_ready":draining?"draining":degraded?"degraded":"ready";
 return{contractVersion:READINESS_CONTRACT_VERSION,registryVersion:"runtime-foundation-registry.v1",state,reasonCode:state==="ready"?"ready":state==="not_ready"?"required_dependency_unavailable":state==="draining"?"worker_draining":"optional_dependency_unavailable",observedAt:now.toISOString(),staleAfter:new Date(now.getTime()+15000).toISOString(),generation:createHash("sha256").update(JSON.stringify(current.map(x=>[x.key,x.state,x.reasonCode,x.sourceVersion]))).digest("base64url"),dependencies:current};
}
