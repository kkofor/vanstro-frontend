# Backend — v1 S01 Settings core

Date: 2026-08-05
Status: implemented and locally verified; focused commit pending at checkpoint write

- Branch/worktree: `feature/backend` / `/Users/zhangguannan/Documents/codex/vanstro/.claude/worktrees/backend`.
- Contract baseline was normally fast-forwarded through confirmed Integration `eaa5a9dbdf83f286b8c04d9624093bdaedbd7513`; no conflict, reset, stash, rebase or cherry-pick.
- S01 implements exact `/dashboard/settings/...` routes, including `PATCH /dashboard/settings/drafts/:id`, and projects fail-closed `settingsCenterV1` from global `settings.read` / `settings.write`.
- The only available descriptor is `settings.core.overview_refresh_seconds`, integer 15–300, default 60. Eleven future groups remain `coming_in_v1`. No S02–S12, CG01, provider, secret, arbitrary URL/method/table/SQL or universal JSON facility was added.
- Draft/create/update/validate/publish/history/rollback-draft use typed controlled DB functions, advisory serialization, expected-version CAS and bounded hashed idempotency. Publish and its P04-compatible immutable Audit row are one transaction; failures roll back. Readiness only reads the controlled projection and performs no provider or mutation side effect.
- S01 refresh cadence controls Settings UI overview polling only. It is deliberately independent from and not an alias of P09 `foundation.runtime.refresh_interval_seconds` operational snapshot refresh.

## Migration decision

A forward migration is required. Immutable migration43 restricts `runtime_config_version.configKey` to the three P09 sample keys, and migration70 revokes runtime execution of the old generic P09 mutation functions. Persisting the exact S01 descriptor while preserving runtime table ACLs therefore cannot honestly keep source latest at 72.

- Added migration73: `20260805100000_s01_settings_core`.
- Source count/latest: 73 / `20260805100000_s01_settings_core`.
- Migrations1–72 were not edited by S01.
- Migration73 adds typed S01 lifecycle columns, expands the existing key CHECK by one exact key, and adds operation-specific SECURITY DEFINER functions with exact runtime EXECUTE grants.

## Verification

Node 22.22.2 where required:

- Focused package contract file: 20/20 passed.
- Focused API Settings unit tests: 3/3 passed.
- S01 migration/static/readiness tests: 3/3 passed.
- Regular API disposable PostgreSQL16: 224 pass / 0 fail / 12 intentional skip.
- DB: 50 pass / 0 fail / 36 intentional skip.
- Worker: 31 pass / 0 fail / 1 intentional skip.
- Prisma generate and validate: passed.
- Monorepo typecheck: passed.
- Backend build (DB/API/Worker/CLI): passed.
- Full package contracts after final Integration contract closure: 214/214 passed. An earlier pre-closure run had two Dashboard-copy failures; synchronized closure `d9baaa996c107494c6cb67644dd0eb6c088a305e` corrected that shared contract/copy baseline and the complete rerun is green.
- Fresh generic `prisma migrate deploy` reached immutable migration59 and correctly stopped because migration59 requires direct `vanstro_migrator`; this is not an S01 failure. The S01 migration was separately parsed/applied successfully against an isolated PostgreSQL16 fixture with the required predecessor objects/owner topology.
- Diff check: passed.

## Protected pre-existing dirty assets

All seven remained byte-identical and are excluded from staging:

- `scripts/f1-migration71-static.test.mjs` — `78872b7ad3694ce8388d6350f1a6d9c79c7f9465ddd18631a4655de82a31a7d1`
- `packages/db/src/auth-client.ts` — `d13c9d67996342996cb095e8c62302e0858d69614b9f4870511d0983a3d93f46`
- `scripts/f1-migration71-strict-api.mjs` — `25bbe394c0aa6cc4364b8c9aed760779c4b776fb93f0f7e0fa90cccd3c659796`
- `scripts/f1-migration72-static.test.mjs` — `290c4177834137472d888a614cd4da487ab6bd78184a35f92d3a0b836fdeae72`
- `scripts/f1-migration73-static.test.mjs` — `151877289dead5099da44d111cde16ee5e2edfdf7afcfca72401839687737674`
- `tasks/checkpoints/backend-2026-08-04-f1-migration71-strict-acl-followup-blocked.md` — `dda65c1a441221d7b7263fe315588c58efd8770d1d336652fbb1b74c6514df94`
- `tasks/checkpoints/backend-2026-08-04-f1-v15-migration72-runtime-acl-closure.md` — `18ca1ae9b269ed8d91e99b154a4fc049c803cefeaefa77b14139ec6684babdb6`

## Independent review follow-up

Integration merged the initial Backend commit as `506f8b1`; independent review then found 2 Blocker / 2 High / 2 Medium defects. This separate forward follow-up synchronized authority contract `127a447561b4595d21949e66a36d52c858f7133f` and repairs the unreleased migration73 final bytes without adding migration74.

- Existing P09 schema/validation/activation/state and authority-v2 Audit constraints are respected; published S01 rows use `runtime_override`, authorityVersion 2 and a linked Audit.
- `vanstro_p09_guard_owner` receives nested P02 EXECUTE through `vanstro_p02_guard_owner`.
- `settingsRevision` is the external CAS revision and increments atomically per successful transition.
- `settings_command_ledger` is per-operation, actor-bound and request-hash-bound; completed rows link result revision and Audit and reject UPDATE/DELETE.
- Middleware and DB reads hard-code global `settings.read`; mutation requires the global read+write dependency.
- Ordinary publication uses `superseded`, never rollback status; rollback provenance is on the new publication.
- Final migration73 SHA-256: `02693c77d5a3de29d529a49acb950922202eaa85b93058de7cbd599fd46aa053`; source count remains exactly 73.
- The true owned PostgreSQL16 chain through migrations1–72 passed, then the final migration73 applied as `vanstro_migrator` (`S01_MIGRATION73_APPLIED`). Regular API, DB, Worker, package contracts, Prisma, typecheck, build and static gates remained green with the counts above.
- Final Medium closure uses `settingsRevision` for diff and publication source draft versions, exposes `superseded` verbatim in lifecycle/history, and persists `settingsValidatedAt` so validate idempotent replay returns the same timestamp. Focused Settings tests are 4/4. Final Medium gates: Regular API 225 pass / 0 fail / 12 skip; DB 50/0/36; Worker 31/0/1; contracts 214/214; static 3/3; Prisma/type/build green.

No Main merge, push, production access, deployment, production migration, provider action, payment/refund, DNS/TLS or stash operation occurred. Next action: complete independent re-review, create the authorized separate follow-up commit, and hand its SHA to Integration.

- Final five-Medium closure: diff before is the draft-persisted base value; operation names are isolated from the legacy runtime unique key; PATCH/validate/publish persist Settings updated time; superseded history points to an exact `unpublish` Audit; create/update/validate/publish use legal operation-specific Audit actions. Obsolete migration73 v1 functions were removed so only the final v2 SQL surface executes.
