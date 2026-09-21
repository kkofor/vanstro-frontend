# Backend — v1.0 functional compatibility baseline

## Identity and snapshot

- Start: `feature/backend` at `960e7e6f8c6ab01982a5f2ee3ce94497ac07b7fe`, tree `40fbc5a91157eb22d95767f30168d1987e562ee3`.
- Start status: 51 modified / 10 untracked / 0 staged.
- Recoverable snapshot: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/workspace/v1-step2-backend-dirty-snapshot/`.
- Snapshot manifest SHA-256: `44233e174178379c017302809e70d005d6145a64b5bd37b86759fc41c7a346e2`; manifest, 485031-byte tracked patch, 10-entry 156672-byte untracked tar, reverse apply and every untracked SHA verified.
- Hunk register: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-step2-backend-dirty-hunk-register.md`, SHA `d4e4d03445a9cd5751176a3dba52500a5f201523f1c8b1cd396b74199aeacd67`.

## Scope reconciliation

The rejected migration72/73 draft was collapsed to one forward-only functional migration72. Product adapters restore normal Auth, P02/P04, P05/P06/P07, P10 consent projection and stale Worker alert paths after committed migration69–71 table revokes. Independent Auth DB topology, exhaustive ACL attacks and other v2 security-only assets were excluded from product references and preserved in the snapshot/v2 register.

AI Image Studio is v3.0 per the forward erratum; this work adds no AI functionality.

## Migration

- Source count: 72.
- New migration: `packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql`.
- SHA-256: `461d130913f471a26a680358ec76128734509863d51f8a2172581ba4a9d5a83e`.
- Source latest: 72 / `20260804130000_f1_v15_runtime_acl_closure`.
- Migration73 was not retained; its original bytes remain in the snapshot.
- Migrations69/70/71 remain `442e8bd...`, `5789b685...`, `fdeb3183...`; migrations1–71 were not edited.

## Normal paths

- Auth: register+first session, login, session projection, refresh/rotation, logout, logout-all, forgot/reset functions.
- P02: Dashboard authorization context, principal/membership helpers, normal global and existing Dealer paths.
- P04: normal Dashboard Audit append/list/detail; machine event fallback remains functional.
- P05: create/list/detail/artifact/cancel/retry functions; retry no longer performs runtime direct `async_jobs` read in the HTTP handler.
- P06: queue/list/action/notification/source-state adapters retained.
- P07: upload→job, detail, job-first lock, retry generation, execution binding/fencing and rollback adapters retained.
- Worker stale alert: a fresh compatible active Worker suppresses historical stale-row critical alert.

## Verification

Passed:

- snapshot secret scan and restoration validation;
- functional migration72 static: 3/3;
- disposable PostgreSQL16 migration72 function/EXECUTE gate;
- stale alert: 4/4;
- Regular API: 233 discovered / 221 pass / 0 fail / 12 intentional owned-only skip;
- DB: 50 pass / 0 fail / 36 intentional owned-only skip;
- Worker: 31 pass / 0 fail / 1 intentional owned-only skip;
- package contracts: 212/212;
- monorepo typecheck;
- Backend builds;
- Prisma validate and generate; only expected source-latest file changed;
- `git diff --check`.

Focused owned test attempts exposed fixture-lineage gaps rather than accepted passes: raw `db push` lacked P04/P05 indexes and P07 helper objects; iterative harness attempts were preserved in job logs. The committed normal-path claim therefore relies on the complete Regular suite plus migration function gate, and explicitly does not claim strict ACL/security certification.

## Deferred v2

The 20-item register is `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v2-known-remediation-register.md`. No finding is marked fixed merely because it is deferred.

## Commit and remaining state

- Functional commit: `2022bac2be35dc15b34d08043d0d1d9e644d0207`, tree `81af39a619eb6d6f82496f88965b5b393cb9a6f4`.
- Continuity follow-up: `aaea485` (`docs: close v1 backend functional handoff`).
- Remaining dirty is intentionally only one modified and six untracked v2/security evidence assets: `scripts/f1-migration71-static.test.mjs`, `packages/db/src/auth-client.ts`, strict/static security harnesses, and two historical blocked checkpoints.

## Boundaries

No Integration merge, Frontend/Main/stash action, production DB/provider access, push or deployment. AI_OS snapshot and reports are not product authority and are not part of the Backend commit.
