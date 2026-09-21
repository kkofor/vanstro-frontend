<!--
GENERATED — DO NOT EDIT
model SHA-256: 7376e74962984bf4a73733edcfdf308b979d62a0fc34a8ee9c11e9e013a181a8
schema SHA-256: b40af890b5a81e3aacde2d2715c6b10fe0a64f930d0c3c5eb97c147e5ae56f2b
generator SHA-256: f19cee679a0c112b62e5cc19465ffce409adfd4a32b97a2101bd6013e7627301
status: FROZEN
-->
# F1 v1.5 Implementation Authority Clarification v1.0.1

This frozen clarification extends the frozen parent manifest and adds no business capability. Every object reason is `implementation_audit_missing_authority`. This v1.0.1 successor records the user-authorized Plan A revision of migration 69 (ACL-before-owner for the 40 non-migrator handoff sites plus a closed-set owner/ACL/grantor post-assert); the old v1.0 package and its SHA history are preserved unmodified. Gate4 revision: real PG16 proved ALTER OWNER rewrites old-owner ACL entries to the new owner as grantor but drops the explicit grant option, so each of the 40 ALTER OWNER statements is followed by a restore block 'SET ROLE <target owner>; GRANT EXECUTE (functions) / SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER (tables) TO vanstro_migrator WITH GRANT OPTION; RESET ROLE;' (still inside the temporary schema CREATE window); the direct-ACL post-assert is unchanged and not relaxed, except that its expected closed set additionally includes the new owner's own implicit ACL row (grantor=new owner, grantee=new owner) with per-kind grantable taken from the disposable real PG16 catalog probe instead of inferred: the probe ran migration69 to its first failing post-assert (function p02) and found owner self is_grantable actual=false vs expected=true as the ONLY actual/expected difference (actual proacl {owner=X/owner,...,migrator=X*/owner}); PG16 acldefault('f') grants the function owner EXECUTE without grant option and acldefault('r') likewise grants the table owner the seven table privileges without grant option (probe-verified on f1_p02_resolver_registry: actual relacl {owner=arwdDxt/owner, migrator=a*r*w*d*D*x*t*/owner}, the ONLY actual/expected difference was 7 owner-self tuples actual=false vs expected=true), so both function owner rows (EXECUTE) and table owner rows (SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER) are grantable=false — each site's expected tuples are: owner row first (functions and tables grantable=false), then the migrator restore row (grantor=new owner, grantee=vanstro_migrator, grantable=true), then the pre-owner caller/grants rows (grantable=false); caller rows whose grantee equals the owner are excluded before appending so the authoritative owner-self false is never promoted by the duplicate normalize rule; duplicate (o,g,p) rows otherwise stay normalized grantable=true-dominant and the symmetric EXCEPT is kept exact.

## parentAuthority

```json
{
  "baselineSha256": "bfa3a3e2f0ec6a40cd09dd0cccb7ebeb9fa655856f3a9586d172cfd0a95abcfc",
  "goalSha256": "d26b745f0e9fa1893dda12e85d18922b99aef017f80c5b193fe6e6d564331e02",
  "manifestSha256": "e6c3cb275b3ecee17022418586613f6739757802b705bd17444b5c95be5a6e8f",
  "modelSha256": "924233520e1e96990a8a998b8dc0b0953f0cd726a24f7eaed863ea5349f69f48",
  "originalPackageMutable": false,
  "ownedProbeSha256": "53e677f4ffb3994479dee969226b1e634ccf29cef9fcfa5f20069f9e275ba416",
  "relationship": "extends_with_explicit_supersedes_only",
  "schemaSha256": "aee92f071a21cb1979ad0b9b469c8360893391f81988f3de2d59a0336a6bf194"
}
```

## p09ReadAuthority

```json
{
  "functions": [
    "p09_config_list_v2",
    "p09_flag_list_v2",
    "p09_readiness_summary_v2",
    "p09_readiness_detail_v2"
  ],
  "nonImplication": true,
  "permissions": [
    "config.read",
    "flags.read",
    "readiness.read_summary",
    "readiness.read_detail"
  ],
  "sqlToApiMapping": "exact_registry_only",
  "strategy": "new_v2_surface"
}
```

## readinessTruthTable

```json
{
  "dbTime": {
    "callerObservedAtAuthority": false,
    "comparison": "CURRENT_TIMESTAMP",
    "mediaFreshInterval": "30 seconds",
    "observationTtl": "15 seconds",
    "workerFreshInterval": "2 minutes"
  },
  "detailSecondaryReasons": "ordered_and_permission_trimmed",
  "healthSources": [
    {
      "predicate": "NOT migration68 applied OR unfinished migration exists",
      "priority": 1,
      "reason": "migration_incompatible",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "bounded DB observation raises",
      "priority": 2,
      "reason": "database_unavailable",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "fresh incompatible worker rows only; stale incompatible rows excluded",
      "priority": 3,
      "reason": "registry_incompatible",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "zero lifecycle authority rows",
      "priority": 4,
      "reason": "no_worker_observed",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "rows exist and max heartbeatObservedAt <= CURRENT_TIMESTAMP - interval 2 minutes",
      "priority": 5,
      "reason": "all_workers_stale",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "all fresh compatible rows lifecycleState=shutdown",
      "priority": 6,
      "reason": "all_workers_shutdown",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "all fresh compatible nonshutdown rows lifecycleState=draining",
      "priority": 7,
      "reason": "all_workers_draining",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "sum fresh active compatible effectiveCapacity = 0",
      "priority": 8,
      "reason": "zero_claim_capacity",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "no fresh media readiness capacity for required storage",
      "priority": 9,
      "reason": "required_storage_unavailable",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "no fresh parser readiness capacity",
      "priority": 10,
      "reason": "required_parser_unavailable",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "closed passive smtp/erp/payment source is configured but degraded",
      "priority": 11,
      "reason": "optional_provider_degraded",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    },
    {
      "predicate": "all required predicates false and claim capacity > 0",
      "priority": 12,
      "reason": "ready",
      "reasonTag": "implementation_audit_missing_authority",
      "source": [
        "database",
        "_prisma_migrations",
        "worker_heartbeats",
        "media_processing_readiness",
        "deployment_config"
      ]
    }
  ],
  "multipleConditions": "highest_priority_only",
  "orderedReasons": [
    {
      "priority": 1,
      "reason": "migration_incompatible",
      "status": "not_ready"
    },
    {
      "priority": 2,
      "reason": "database_unavailable",
      "status": "not_ready"
    },
    {
      "priority": 3,
      "reason": "registry_incompatible",
      "status": "not_ready"
    },
    {
      "priority": 4,
      "reason": "no_worker_observed",
      "status": "not_ready"
    },
    {
      "priority": 5,
      "reason": "all_workers_stale",
      "status": "stale"
    },
    {
      "priority": 6,
      "reason": "all_workers_shutdown",
      "status": "not_ready"
    },
    {
      "priority": 7,
      "reason": "all_workers_draining",
      "status": "not_ready"
    },
    {
      "priority": 8,
      "reason": "zero_claim_capacity",
      "status": "not_ready"
    },
    {
      "priority": 9,
      "reason": "required_storage_unavailable",
      "status": "not_ready"
    },
    {
      "priority": 10,
      "reason": "required_parser_unavailable",
      "status": "not_ready"
    },
    {
      "priority": 11,
      "reason": "optional_provider_degraded",
      "status": "degraded"
    },
    {
      "priority": 12,
      "reason": "ready",
      "status": "ready"
    }
  ],
  "perPrincipalCapacity": {
    "freshInterval": "15 seconds",
    "generation": "DB-controlled expected-generation CAS; DB increments by exactly one",
    "key": "DB-generated unique principalRole+poolInstance+incarnationId startup claim; clients cannot choose/reuse identifiers",
    "missing": "zero_claim_capacity",
    "multiReplica": "each live replica owns one independently generated pool row",
    "registryFingerprint": "a456065e5ee6ea13812c457dc21ef53efff26ee0a7f49dd964e4f547077a9e74",
    "registryVersion": "async-job-registry.v2",
    "required": [
      [
        "vanstro_worker_runtime",
        "analytics.release.seal"
      ],
      [
        "vanstro_worker_runtime",
        "analytics.source.cleanup"
      ],
      [
        "vanstro_signer_admin_runtime",
        "security.signer.manage"
      ],
      [
        "vanstro_kms_rotation_runtime",
        "analytics.subject-key.rotate"
      ],
      [
        "vanstro_dsar_runtime",
        "privacy.subject.purge"
      ]
    ],
    "restart": "every restart claims a new poolInstance and incarnation; old exact tuple cannot update new row",
    "sharedPoolCounting": "capacity is reserved per pool row and summed once even when supportedJobTypes covers multiple required families",
    "staleCleanup": "startup claim deletes rows observedAt <= DB time - 2 minutes",
    "totalCapacity": "sum of fresh compatible positive capacities across all five required principal/job families"
  },
  "predicateBitmap": {
    "authorityFunction": "p09_observe_readiness_internal_v2",
    "evaluatedOnceAt": "single now_at=CURRENT_TIMESTAMP snapshot",
    "keys": [
      "migration_incompatible",
      "database_unavailable",
      "registry_incompatible",
      "no_worker_observed",
      "all_workers_stale",
      "all_workers_shutdown",
      "all_workers_draining",
      "zero_claim_capacity",
      "required_storage_unavailable",
      "required_parser_unavailable",
      "optional_provider_degraded"
    ],
    "primary": "first true by priority else ready",
    "secondary": "same bitmap true keys excluding primary in priority order"
  },
  "secondaryReasons": "all twelve predicates evaluated at DB time, ordered by priority, primary excluded",
  "statuses": [
    "ready",
    "degraded",
    "not_ready",
    "stale"
  ],
  "summaryForbidden": [
    "instance_id",
    "host",
    "pid",
    "database",
    "provider_account",
    "path",
    "credential"
  ]
}
```

## p10AuditAuthority

```json
{
  "auditFailureRollsBackFact": true,
  "factAndAuditSameTransaction": true,
  "helperOwner": "vanstro_p04_guard_owner",
  "helperOwnerPrivileges": [
    "INSERT audit_events",
    "fixed registry reads"
  ],
  "newV3": true,
  "p10GuardDirectAuditEventsPrivileges": [],
  "replayAddsAudit": false,
  "replayReturnsOriginalFactAndAudit": true,
  "selectedHelper": "p04_write_forward_audit_v4",
  "systemHelper": "p04_write_system_job_audit_v1"
}
```

## p02ResolverAuthority

```json
{
  "dynamicSql": false,
  "helper": "p02_resolve_persisted_authority_v3",
  "identityTypes": {
    "actor": "text",
    "dealerIds": "text[]",
    "locationIds": "text[]",
    "resourceId": "text"
  },
  "registryClosed": true,
  "resolvers": [
    {
      "dynamicSql": false,
      "id": "resolver.v2.1",
      "idSemantics": "uuid",
      "operation": "read",
      "outcomes": [
        "authorized",
        "denied",
        "not_found",
        "stale"
      ],
      "permission": "dashboard.import.foundation_sample.read",
      "reason": "implementation_audit_missing_authority",
      "resourceType": "p08_import",
      "scopeSource": "persisted target plus persisted session grants",
      "table": "dashboard_import_batch"
    },
    {
      "dynamicSql": false,
      "id": "resolver.v2.2",
      "idSemantics": "uuid",
      "operation": "read",
      "outcomes": [
        "authorized",
        "denied",
        "not_found",
        "stale"
      ],
      "permission": "dashboard.export.foundation_sample.read",
      "reason": "implementation_audit_missing_authority",
      "resourceType": "p08_export",
      "scopeSource": "persisted target plus persisted session grants",
      "table": "dashboard_export_request"
    },
    {
      "dynamicSql": false,
      "id": "resolver.v2.3",
      "idSemantics": "config_key",
      "operation": "read",
      "outcomes": [
        "authorized",
        "denied",
        "not_found",
        "stale"
      ],
      "permission": "config.read",
      "reason": "implementation_audit_missing_authority",
      "resourceType": "p09_config",
      "scopeSource": "persisted target plus persisted session grants",
      "table": "runtime_config_version"
    },
    {
      "dynamicSql": false,
      "id": "resolver.v2.4",
      "idSemantics": "flag_key",
      "operation": "read",
      "outcomes": [
        "authorized",
        "denied",
        "not_found",
        "stale"
      ],
      "permission": "flags.read",
      "reason": "implementation_audit_missing_authority",
      "resourceType": "p09_flag",
      "scopeSource": "persisted target plus persisted session grants",
      "table": "feature_flag_version"
    },
    {
      "dynamicSql": false,
      "id": "resolver.v2.5",
      "idSemantics": "literal:worker-fleet",
      "operation": "read",
      "outcomes": [
        "authorized",
        "denied",
        "not_found",
        "stale"
      ],
      "permission": "readiness.read_summary",
      "reason": "implementation_audit_missing_authority",
      "resourceType": "p09_readiness_summary",
      "scopeSource": "persisted target plus persisted session grants",
      "table": "worker_heartbeats"
    },
    {
      "dynamicSql": false,
      "id": "resolver.v2.6",
      "idSemantics": "literal:worker-fleet",
      "operation": "read",
      "outcomes": [
        "authorized",
        "denied",
        "not_found",
        "stale"
      ],
      "permission": "readiness.read_detail",
      "reason": "implementation_audit_missing_authority",
      "resourceType": "p09_readiness_detail",
      "scopeSource": "persisted target plus persisted session grants",
      "table": "worker_heartbeats"
    },
    {
      "dynamicSql": false,
      "id": "resolver.v2.7",
      "idSemantics": "uuid",
      "operation": "ingest",
      "outcomes": [
        "authorized",
        "denied",
        "not_found",
        "stale"
      ],
      "permission": "analytics.ingest",
      "reason": "implementation_audit_missing_authority",
      "resourceType": "p10_analytics_ingestion",
      "scopeSource": "persisted target plus persisted session grants",
      "table": "foundation_sample"
    },
    {
      "dynamicSql": false,
      "id": "resolver.v2.8",
      "idSemantics": "release-family-key",
      "operation": "read",
      "outcomes": [
        "authorized",
        "denied",
        "not_found",
        "stale"
      ],
      "permission": "analytics.release.read",
      "reason": "implementation_audit_missing_authority",
      "resourceType": "p10_release_family",
      "scopeSource": "persisted target plus persisted session grants",
      "table": "analytics_foundation_release"
    }
  ],
  "returnsGrantProvenance": true,
  "scopeContainment": "relational dealer/location pairs; no independent-array laundering",
  "signature": "public.p02_resolve_persisted_authority_v3(text,text,text,text,text,text,bigint)"
}
```

## workerHeartbeats

```json
{
  "acl": {
    "migrator": "owner",
    "p09Guard": [
      "SELECT",
      "INSERT",
      "UPDATE"
    ],
    "publicCrud": [],
    "runtimeCrud": [],
    "workerCrud": []
  },
  "actualSupportedJobTypes": [
    "analytics.release.seal",
    "analytics.source.cleanup"
  ],
  "baselineObjectsNotRecreated": true,
  "baselineSources": [
    {
      "path": "packages/db/prisma/migrations/20260730280000_worker_heartbeat/migration.sql",
      "sha256": "35ad2c812127c20f0245c6fe78b58c9e7cbac49f96a4681565e462f216491a85"
    },
    {
      "path": "packages/db/prisma/migrations/20260803130000_dashboard_p09_worker_lifecycle_authority/migration.sql",
      "sha256": "a5a7ded9ac25d9d592b7c0f7791f803be63ecbdb4653ec2ed35c2150207a8dd5"
    }
  ],
  "children": [
    "lifecycle_state",
    "declared_capacity",
    "effective_capacity",
    "generation",
    "version",
    "registry_version",
    "registry_fingerprint",
    "supported_job_types",
    "observed_at",
    "deployment_id",
    "freshness index",
    "lifecycle CHECK constraints",
    "p09_worker_startup",
    "p09_worker_heartbeat",
    "p09_worker_transition"
  ],
  "migration69Adds": [
    "p09_worker_startup_v2",
    "p09_worker_heartbeat_v2",
    "p09_worker_transition_v2",
    "p09_readiness_summary_v2",
    "p09_readiness_detail_v2"
  ],
  "migration70Revokes": [
    "p09_worker_startup",
    "p09_worker_heartbeat",
    "p09_worker_transition"
  ],
  "table": "public.worker_heartbeats"
}
```

## workerLogin

```json
{
  "assert": {
    "bypassrls": false,
    "createdb": false,
    "createrole": false,
    "inherit": false,
    "login": true,
    "replication": false,
    "superuser": false
  },
  "credentialProvisioning": "deployment_runbook_not_authorized",
  "externalPreprovisioned": true,
  "migration69MembershipGrant": "vanstro_worker_lifecycle_cap",
  "migrationAlters": false,
  "migrationCreates": false,
  "ownedHarnessCreates": true,
  "passwordProvisioned": false,
  "role": "vanstro_worker_runtime",
  "setRoleProtocol": {
    "mode": "transaction_local",
    "pinnedConnectionRequired": true,
    "rollbackRestoresRole": true,
    "sessionSetRoleForbidden": true,
    "steps": [
      "BEGIN",
      "SET LOCAL ROLE vanstro_worker_lifecycle_cap",
      "SELECT exact p09_worker_*_v2",
      "COMMIT"
    ]
  }
}
```

## uniqueRepresentation

```json
{
  "authorityRule": "unique_constraint_and_backing_index_are_one_object",
  "constraintField": "backingIndexName",
  "duplicateIndexDefinitionForbidden": true,
  "generatorEmits": "ADD CONSTRAINT UNIQUE only",
  "ordinaryIndexesIndependent": true
}
```

## frontendReplacement

```json
{
  "domainCommitRequired": true,
  "exactSourceSymbols": [
    {
      "action": "delete",
      "symbol": "API_ENDPOINTS.dashboardImportUploadComplete",
      "test": "qa/package-a-contracts.test.ts: upload-complete route absent"
    },
    {
      "action": "delete",
      "symbol": "DashboardDataJobs uploadComplete operation",
      "test": "negative transport test: no POST /upload-complete"
    },
    {
      "action": "delete",
      "symbol": "Dashboard analytics rawEvents consumer",
      "test": "raw events request never emitted"
    },
    {
      "action": "add GET /dashboard/analytics/releases/:releaseDay",
      "symbol": "API_ENDPOINTS.dashboardAnalyticsRelease",
      "test": "sealed safe release consumer validates wire.p10.sealed.release.v1"
    }
  ],
  "p08": {
    "negativeRouteTestRequired": true,
    "onlyFinalizeTransport": "controlled PUT",
    "positiveAssertionRemoved": true,
    "uploadCompleteRoute": "must_not_exist"
  },
  "p09p10": {
    "noCaseOrTruthInference": true,
    "waitForGeneratedWire": true
  },
  "p10": {
    "rawEventsConsumer": "delete",
    "rawEventsRoute": "delete",
    "replacementMethod": "GET",
    "replacementPath": "/api/v1/dashboard/analytics/releases/:releaseDay",
    "replacementWire": "wire.p10.sealed.release.v1",
    "suppressionWireRequired": true
  }
}
```

## successor

```json
{
  "allowedClosedSet": [
    "successor package (this directory)",
    "packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql",
    "scripts/f1-migration69-authority.test.mjs",
    "scripts/f1-migration70-static.test.mjs",
    "scripts/f1-migration71-static.test.mjs",
    "scripts/test-f1-migration69.sh",
    "scripts/test-f1-migration70.sh",
    "scripts/test-f1-migration71.sh",
    "tasks/tooling/f1-v15-clarification/owned-pg16-conformance.mjs",
    "qa/v11-auth-browser/run-v11-r1-p7-migration-drill.sh (+ directly sourced test, only if required)"
  ],
  "conditionalAuthorization": "User-authorized on 2026-08-10 via tasks/plans/v11-r1-migration69-authorized-implementation-prompt.md after Gate0=A (no persistent environment holds a successful old-69 record). Excludes deployment, staging/production writes, P8-P10, WAL operations, and any migration other than 69.",
  "decision": "Plan A: for all 40 non-migrator ownership handoffs generated by migration69 (29 functions + 11 tables, 0 sequences), the exact REVOKE/GRANT precedes ALTER OWNER (ACL-before-owner) so the NOINHERIT non-superuser vanstro_migrator still holds grant options at GRANT time; a closed-set direct-ACL post-assert (grantor/grantee/privilege/grant option via aclexplode on proacl/relacl) runs inside the same transaction; 32 migrator-owned sites keep their original order; no sequence handoff. Gate4 revision (real PG16): PostgreSQL 16 ALTER OWNER rewrites every ACL entry granted by the old owner with the NEW owner as grantor but DROPS the old owner's explicit grant option, so ACL-before-owner alone cannot produce the post-assert's (grantor=new owner, grantee=vanstro_migrator, grantable=true) tuples and the first p02 direct-ACL post-assert fails. The successor therefore also emits, immediately after each of the 40 ALTER OWNER statements and while the temporary schema CREATE grant is still in effect, a restore block 'SET ROLE <target owner>; GRANT EXECUTE (functions) / SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER (tables) TO vanstro_migrator WITH GRANT OPTION; RESET ROLE;' so the new owner re-establishes the target ACL as grantor; caller REVOKE/GRANT stays pre-owner; the final REVOKE CREATE + denial and the 40-site post-assert are unchanged except the owner implicit row grantable, now taken from a disposable real PG16 catalog probe instead of inferred: the probe ran the full migration69 to its first failing post-assert (function p02) and compared the aclexplode(proacl) actual against the generated expected tuples — the ONLY actual/expected difference was owner self is_grantable actual=false vs expected=true, with the actual proacl {owner=X/owner,...,migrator=X*/owner}; PostgreSQL 16 acldefault('f') grants the function owner EXECUTE WITHOUT grant option and acldefault('r') likewise grants the table owner all seven privileges WITHOUT grant option — the second disposable PG16 catalog probe (tableacl.p02.registry) ran migration69 past the function asserts to the first failing table post-assert and found the ONLY actual/expected difference was 7 owner-self tuples actual=is_grantable false vs expected=true, actual relacl={owner=arwdDxt/owner,migrator=a*r*w*d*D*x*t*/owner} — so every non-migrator function expected owner row is (grantor=new owner, grantee=new owner, EXECUTE, grantable=false) and every non-migrator table expected owner row is (grantor=new owner, grantee=new owner, each of SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER, grantable=false); expected tuples per site are owner row first (functions and tables grantable=false), then the migrator restore row (grantor=new owner, grantee=vanstro_migrator, grantable=true), then the pre-owner caller/grants rows (grantable=false); caller rows whose grantee equals the owner are excluded before appending so the authoritative owner-self false can never be promoted by normalize's true-dominant duplicate rule; the symmetric EXCEPT stays exact and is not relaxed. ALTER FUNCTION/TABLE OWNER requires the new owner to hold CREATE on the object's schema, which earlier security migrations attempted to revoke with ineffective SET ROLE self-revokes (the guard was neither grantor nor schema owner, so real PG16 leaves CREATE residue); migration69 therefore self-provisions a temporary closed-set GRANT CREATE ON SCHEMA public (unique non-migrator target-owner set mechanically derived from the 40 handoff sites) inside the same transaction: a precondition DO asserts only that every target owner exists (starting CREATE is not required to be absent — the unified GRANT is idempotent for existing holders), GRANT CREATE precedes the first ALTER OWNER, REVOKE CREATE follows the last ALTER OWNER (before all 40 post-asserts), and a final denial DO re-asserts every target owner lacks CREATE — any failure rolls back the whole migration; no GRANT ALL/USAGE is emitted and the final schema ACL is unchanged. The final zero-CREATE denial closes the historical self-revoke residue as part of the migration69 owner-transfer security closure; it changes no object ACL or grantor. Gate4 search_path probe: the disposable PG16 probe ran the migration to its first failing post-assert (function p02) and recorded the catalog-canonical proconfig entry 'search_path=pg_catalog, public' for the canonical SQL SET search_path=pg_catalog,public — PostgreSQL 16 normalizes the stored value by trimming each comma-separated component and joining with ', ' — so the SECURITY DEFINER post-assert normalizes every proconfig search_path entry the same way (btrim each component, join with ', ') and compares it exactly against the model-derived canonical 'search_path=pg_catalog, public'; prosecdef=true, PUBLIC EXECUTE denial and the full direct-ACL tuples are still asserted per site. Gate5 revision (real PG16): the SECURITY DEFINER post-assert's catalog normalization expression (unnest/string_agg/btrim/string_to_array over proconfig) failed to compile on PostgreSQL 16 with mismatched parentheses; a real probe confirmed proconfig stores exactly 'search_path=pg_catalog, public', so the post-assert now uses the fixed direct ANY equality 'search_path=pg_catalog, public' = ANY(COALESCE(proconfig,'{}'::text[])) — same semantics, no regexp/array normalization; canonical bodies, ACL tuples, owner and schema protocol unchanged.",
  "dualTopologyMatrix": {
    "fresh": {
      "ledger": "81 successful / 0 failed / 0 active rolled-back",
      "path": "real prisma migrate deploy 1→81",
      "repeat": "second deploy no-op",
      "runner": "vanstro_migrator LOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS",
      "sites": "40 ACL-before-owner + post-owner restore (SET ROLE/GRANT WITH GRANT OPTION/RESET ROLE) exact; 32 migrator-owned exact; 0 sequences",
      "stderr": "0 'no privileges could be revoked'; 0 'no privileges were granted'"
    },
    "production": {
      "ledger": "81 successful / 0 failed",
      "path": "real prisma migrate deploy 1→41 then 42→81",
      "repeat": "second deploy no-op",
      "runner": "vanstro_migrator (same attributes)",
      "sites": "same 40+restore/32/0",
      "stderr": "same 0/0"
    }
  },
  "gate0Matrix": [
    {
      "checksum": "n/a",
      "conclusion": "no old-69 applied; new 69 only enters the 41→81 drill",
      "currentMigrations": "41 successful / 0 failed",
      "environment": "PROD-REMOTE",
      "migration69": "absent",
      "persistence": "persistent"
    },
    {
      "checksum": "n/a",
      "conclusion": "Gate0=A: ledger proven read-only, no old-69 applied",
      "currentMigrations": "38 successful / 0 failed / 0 rolled-back",
      "environment": "STG-REMOTE",
      "migration69": "absent",
      "persistence": "persistent"
    },
    {
      "checksum": "n/a",
      "conclusion": "no old-69 applied (not production evidence)",
      "currentMigrations": "60 successful + 4 rolled_back (none 69)",
      "environment": "LOCAL-DEV-3659",
      "migration69": "absent",
      "persistence": "persistent"
    },
    {
      "checksum": "n/a",
      "conclusion": "no old-69 applied (not production evidence)",
      "currentMigrations": "8 successful",
      "environment": "LOCAL-G10-c141",
      "migration69": "absent",
      "persistence": "persistent"
    },
    {
      "checksum": "old 442e8bd5...",
      "conclusion": "rebuild with new 69",
      "currentMigrations": "various, incl. failed old-69 rolled back",
      "environment": "DISPOSABLE-*",
      "migration69": "failed old-69 only",
      "persistence": "rebuildable"
    }
  ],
  "newMigration69Sha256": "07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051",
  "oldMigration69Sha256": "442e8bd564ebf7f787e41a830d720428310c69ae928ab17bef4d9f4fc2a4d21a",
  "schemaCreateProtocol": {
    "finalAcl": "schema public ACL unchanged by migration69 (no GRANT ALL/USAGE emitted)",
    "finalDenial": "DO: each target owner has_schema_privilege(owner,'public','CREATE')=false",
    "grantBefore": "first ALTER FUNCTION OWNER of the 40 handoff sites",
    "grantType": "GRANT CREATE ON SCHEMA public TO <unique non-migrator target-owner closed set>",
    "object": "public",
    "ownerSetSource": "mechanically derived: unique owners of sqlFunctionBodies/tableAcl sites whose owner is not vanstro_migrator",
    "precheck": "DO: each target owner exists (role existence only — starting CREATE=false is NOT required: historical ineffective self-revokes leave residue and the unified GRANT is idempotent; final denial re-asserts zero CREATE after the owner transfer)",
    "privilege": "CREATE",
    "revokeAfter": "last ALTER TABLE OWNER of the 40 handoff sites, before every 40-site post-assert",
    "revokeType": "REVOKE CREATE ON SCHEMA public FROM <same closed set>",
    "rollback": "same transaction as migration69; any RAISE or statement failure rolls back GRANT and ALL OWNER transfers"
  },
  "version": "1.0.1"
}
```
