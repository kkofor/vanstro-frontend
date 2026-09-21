# Backend checkpoint — Dashboard P07 Media Library Foundation

## 2026-08-03 v1.12 fail-closed addendum

- Frozen authority is now v1.12, 1,420 lines, SHA-256 `5bfeb0d3ddacdb3be69ce38484adac9953c04ca95492c66a642cd399a621801c`.
- This is not a completed milestone: the dirty forward delta remains uncommitted at committed HEAD `b59e9486a8c27238325de44a307b2edea144443c` because storage-ledger/compensation/upload-binding/Audit/SQL-Usage and interleaving matrices remain open.
- Exact source-operation Job binding is blocked by a four-way frozen conflict: ledger-before-write requires a committed operation row; operation `jobId` has an immediate FK to an existing Job; Media Job creation derives its unresolved binding from post-acceptance Asset/original Variant versions; immutable migration58 forbids adding `jobId` to a written operation. Creating either side first violates another invariant and migrations 56–60 cannot be rewritten. The minimum next decision is either a contract erratum authorizing forward migration61 (for a deferred/bindable relation and exact transition family) or an explicit redesign of the binding/order. No unauthorized schema workaround was added.
- Native processing/upload is deterministically fail-closed: shared readiness always returns image/PDF false and zero capacity; Worker writes only failed/zero-capacity attestation and does not claim `media.process`; API intent creation rejects with `MEDIA_PROCESSING_UNAVAILABLE`. The standalone test compose does not enable runtime capability.
- Forward repairs include encoded PDF Name rejection, same-filesystem atomic rename + directory fsync, actor-row authorization serialization, current target-filtered Usage DTO/list/filter/archive counts, stable expired-retry 409, immediate cleanup attempts after API/Worker finalization failure, successful upload Asset/Variant/Job/intent Audits, success-path scratch removal, sorted-unique NFC-normalized metadata tag persistence, and exact migration59 snapshot harnessing.
- The Frontend cross-wire Medium is closed: direct metadata PATCH on owned disposable PostgreSQL 16 with canonical migrator/guard-owner/runtime roles sent `z,a,z` plus canonically equivalent Unicode input, returned and persisted sorted unique normalized `a,z,é`, and the strict consumer assertion accepted the DTO (1/1, exit 0).
- Node 22.22.2 evidence: focused Worker 7/7, focused DB 21/21, direct metadata PATCH 1/1, full TypeScript, Backend build, package contracts 151/151, Linux parser gate with encoded active-content fixtures, migration59 owned PG16 fresh 0→59 and 58→59, migration60 owned PG16 fresh 0→60 and 59→60. Full DB/API/Worker suites were not rerun and no completion/commit claim is made.
- `vanstro_dev`, production, deployment, merge, push, reset, rebase and stash remained untouched.

## Frozen authority and boundary

- Contract v1.9: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p07-media-library-contract-20260802.md`, 1,319 lines, SHA-256 `475cee49e120b0996921b929f3e8a94c17b4e97905ffc3eebd86979c834fce90`.
- Start: `feature/backend` at `a943b0f71d4d04db7fd9b9bb8f3d25f85ef59fc3`, tree `cef668658128acfcf26e374cab20bbe934eb5141`, clean.
- P07-only Backend scope. Existing ProductAsset and 1,327 public assets were not changed or backfilled. No production storage, DB, deployment, provider, Frontend, P08, remote Git or stash operation occurred.

## Current partial implementation

- Added native Prisma Media persistence and one initial migration 56; migrations 1–55 remain unchanged.
- Added frozen Media permissions and canonical role grants.
- Added basic filename/type/signature/size/role/HMAC validators, private filesystem provider skeleton, upload-intent persistence, partial content consume, list/detail/adapters, metadata, archive/restore and controlled-read route skeletons.
- Extended P05 registry definitions with internal-only `media.process` and `media.cleanup`, execution-binding columns and non-public retry/cancel policy.
- Added parser process wrapper, pinned Dockerfile/test compose and Linux gate command.
- Added P07 unit tests for unsupported SVG/AVIF/video, signature checks, path/header-safe filenames, exact required-role boundaries, HMAC keysets and parser timeout/output bounds.

## Evidence and blockers

- Migration 56 applied only to local `vanstro_dev`; local migration count is 56. Production remains 41 and was not accessed.
- Passed before the latest partial route addition: full TypeScript; DB 18 pass / 0 fail / 23 intentional skips; Worker 14 pass / 0 fail / 1 intentional skip; all Backend builds.
- Full API exposed an exact route/ACL mismatch for not-yet-implemented Usage/retry routes. The premature ACL entries were removed; API has not yet been rerun and no green API claim is made.
- Required Linux parser gate is blocked: Docker CLI 29.6.2 is present, Docker daemon is unavailable at `/Users/zhangguannan/.docker/run/docker.sock`; `pnpm test:media-linux` fails at compose build. No mock/macOS positive claim is made.
- Major frozen-contract surfaces remain incomplete: durable upload lease/recovery and exact byte streaming; real isolated image/PDF processing and readiness attestation; storage-operation selection/cleanup fencing; Usage locks/targets; retry commands/generation binding/key tombstones; P06 media producer and complete row-aware authorization; exact P03 cursor/summary; complete P04 event matrix; pending-expiry and cleanup reconcilers; full security/integration/fresh DB matrices.

## v1.11 database-role boundary and current blocker

- Frozen v1.11: 1,389 lines, SHA-256 `f42a977c4fae0cb7eda2bc919fa22f7a9c8bef553343fac323dc63fbe0fe8075`.
- Source migration 59 is present only for the separate PostgreSQL 16 admin/migrator/NOLOGIN-guard-owner/runtime topology; it is intentionally not applied to `vanstro_dev` or production. Current migration59 SHA-256 is `ca8da8553dee215f194376f4aae9ec77eb40bc347b8bd30701097fc28456fa10`.
- The PG16 fresh/upgrade attack matrix reached migration application but final rerun is currently blocked because Docker Desktop stopped responding after host disk exhaustion/recovery. No green role-boundary claim is made until `pnpm test:media-migration59` completes again.
- Pre-existing local DB history drift was observed and is not modified: root `.env` targets Homebrew PostgreSQL 17 `localhost:5432/vanstro_dev`; `_prisma_migrations` contains both canonical `20260730135000_catalog_sync_cleanup` SHA `71ab…` and source-absent `20260730200000_catalog_sync_cleanup` SHA `c9303c4c…`, with 64 successful records while source currently has 59 migrations. Existing-DB Prisma status/preflight are blocked and must not be called green. No migrate/resolve/reset/seed/write was performed against that database after this mismatch was identified.
- All migration59 and other DB verification must use owned disposable databases only. Production remains untouched.

## v1.10 forward remediation

- Frozen v1.10: 1,343 lines, SHA-256 `c5bac7f3760039cff374285130d56220eaca609b5d19b6d444ce492e34818c45`.
- Forward commits after rejected baseline `1127e1c`: `d8e6da4`, `6997325`, `afc6613`, `04ce621`, `ae3f9c9`, `403f4e1`; final `403f4e1e48f0e61694d94cbdd56b80879d9e6968`, tree `af7df6ab4563b0ec67472f5894a1e5a073745138`.
- Exactly one consolidated migration 58 was added, SHA-256 `2670324b81c180ad70d42df726d92871546fdbc45374833c19ca327eefd7fe38`; migration 56/57 retain SHA-256 `3319634df960a24c23f64bd26c4bef0169438cf3626dda32dcfa079c2106e413` and `14ef85ea337145b07333046f04c15f91a6271e2c07f997939fedf3e3c29c2c6b`.
- Migration58 fresh raw-SQL matrix 5/5 covers identity/version/no-op/mixed/illegal transitions, parent state/scope, concurrent target-wide single slots, DB-time retry retention and controlled delete.
- Real Docker Linux gate passed JPEG/PNG/WebP/PDF success; unsafe PDF, crash, output flood, inode/block quota and hang fail closed; UID10001, core0, seccomp/no-new-privileges, no network and read-only topology verified.
- Final Node22 gates: TypeScript/build passed; DB 19/19 with 28 intentional skips; API 173/173 with 8 skips; Worker 14/14 with 1 skip; contracts 151/151; fresh 0→58 passed. ProductAsset/public assets and production remained untouched.

## Final implementation and verification

- Docker daemon became available as Engine 29.6.2 on linux/arm64. The pinned OCI gate built from digest `sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94` and passed real image/PDF success plus crash, output-flood, inode, block and hang negative fixtures. It proved UID 10001, core limit 0, no-new-privileges, seccomp, no network, read-only root and bounded tmpfs.
- Final source has 57 migrations: initial Media persistence migration 56 and forward P05/P06 registry extension 57. Existing migrations 1–55 remain unchanged; migration 55 SHA remains `0d0b3ee77699a93489d3645cfb97acb7f4149a2cf6a27d8cbf922712db55de8d`.
- Native services cover intent HMAC/exact byte/signature acceptance, durable storage ledger, readiness attestation, pending expiry, cleanup, usage locks/target registry, retry commands/key retirement, binding resolution and fenced output selection. API includes strict native list/detail/adapters, controlled upload, metadata, Usage, archive/restore, retry and controlled reads. P05 registers internal media process/cleanup; P06 registers Media failure and row-aware source permission SQL/predicates.
- Node 22.22.2 passed full TypeScript, Prisma generate/validate/status (57 up to date), Backend builds, DB `18 pass / 0 fail / 23 intentional skips`, API `173 pass / 0 fail / 8 intentional skips`, Worker `14 pass / 0 fail / 1 intentional skip`, contracts `151/151`, existing-database preflight, local 55→57 upgrade and owned fresh 0→57. Public/static source remains unchanged; frozen tracked public count remains the canonical 1,327 Media baseline and no public diff exists.
- Production remains 41 migrations and was not accessed. ProductAsset, legacy URLs/files, Frontend, P08, provider/deploy, remote Git and stash stayed untouched.

## v1.11 migration 59 role boundary

- Frozen v1.11 §35 authorizes exactly one source-only migration 59. Migration 59 SHA-256 is `3cb2a3248f3f6d625cb1522dedeac12cfced4625cb572a6021ae18ca584d1f77`; migrations 56/57/58 remain byte-identical at their recorded checksums.
- Migration 59 fails closed unless run directly as the exact migrator with the three-role topology. It replaces the migration58 GUC boundary with guard-owner SECURITY DEFINER functions, private transaction-local nonce evidence, exact runtime detach execution, fixed-table migrator retention and direct guarded-table DELETE revocation.
- Owned Docker PostgreSQL 16 matrices passed both fresh `0→59` and `58→59`; runtime attack coverage includes direct DELETE on all guarded evidence tables, old/new GUC spoofing, ALTER/DROP, schema/database CREATE, SET ROLE, retention invocation, phase-table reads and `pg_temp` shadowing. Exact detach 1→0, wrong-asset isolation, ineligible retention rejection and eligible retention success passed.
- Node 22.22.2 gates passed: Backend typecheck/build; DB `20 pass / 0 fail / 28 intentional skips`; API `173 pass / 0 fail / 8 intentional skips`; Worker `14 pass / 0 fail / 1 intentional skip`; contracts `151/151`. `vanstro_dev` was never accessed and remains at 58. Production remains 41 and untouched.

## v1.12 continuation — 2026-08-03 blocked checkpoint

- Frozen authority advanced to v1.12: 1,420 lines, SHA-256 `5bfeb0d3ddacdb3be69ce38484adac9953c04ca95492c66a642cd399a621801c`.
- Committed HEAD/tree remain `b59e9486a8c27238325de44a307b2edea144443c` / `f52e2c099feb08830d7622b3cbb55b15d9ac6f51`; current forward delta is deliberately uncommitted.
- Migration 60 SHA-256 is `e21c71a427413675719fa25c22f64cdbd65d4b400624ce8a9a10937b5120f2c3`. Owned PostgreSQL 16 fresh 0→60 and 59→60 role-topology, retention, concurrency and attack matrices passed. Migrations 56–59 remain unchanged at the hashes recorded above.
- Current verified repairs include API+Worker retention owners with safe non-blocking failure, restart/key-rotation tombstone readiness, parser/upload heartbeats, over-axis/over-pixel binding rejection, atomic publish closure of Asset/Variants/Job/Attempt, exact authorization Media capability/list request ID/per-Asset actions, and server-owned Usage required locales for product/product_variant/category/dealer EN/fr and Article/CMS module locale. Email template remains disabled under normative §30.8.
- Node 22 affected TypeScript/build, contracts, DB focused 21/21, Worker parser/retention 7/7, migration60 and Linux Media gate passed. The attempted disposable all-suite run exposed test fixture/TRUNCATE concurrency and seed assumptions; because its internal suites contained failures, it is not a clean full-suite completion claim.
- P07 closure is blocked. The enabled Worker parser path still lacks the required production execution sandbox and can publish positive readiness from provider health alone. Additional explicit review blockers remain around PDF encoded-name policy, ledger-before-write/scratch cleanup, post-put compensation, complete auth TOCTOU, Usage target visibility filtering, upload source-operation Job binding, and complete Audit/replay matrices.
- No staged set, secret scan or commit was created because repository policy forbids committing with unresolved contract/security blockers. No production, storage deployment, `vanstro_dev`, remote Git or stash action occurred.

## Closure state

Blocked pending the v1.12 security remediation above. Preserve the current dirty tree and continue forward-only; do not represent the existing Linux test compose as proof that the enabled Worker runtime itself satisfies sandbox isolation.
