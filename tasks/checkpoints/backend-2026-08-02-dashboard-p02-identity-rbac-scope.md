# Backend checkpoint — Dashboard P02 Identity / RBAC / Data Scope

Date: 2026-08-02

## Identity and boundary

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`.
- Parent/shared baseline: `c0156c51c448e8e3298c68b1dbf66cdeb0cc927b`.
- Bounded objective: P02 identity, persisted RBAC, Dealer/Location data scope, authorization contract, explicit bootstrap/backfill, and deterministic security regressions.
- Excluded: Frontend implementation, P03, Payment/Refund behavior, ERP/Privacy expansion, deployment, production migration/write, push/PR, inferred membership, and automatic user-role assignment.

## Schema and migration

- Added `DealerMembership`, `DealerMembershipRole`, and `DealerMembershipLocation`, plus explicit membership/location statuses, revision, validity, revocation, composite parent constraints, and supporting indexes.
- Added exactly one source migration: `20260731310000_dashboard_p02_identity_scope`; no prior migration was changed.
- Existing local `vanstro_dev` reports 42 migrations and schema up to date.
- A uniquely named disposable local database applied all 42 migrations from empty successfully; `_prisma_migrations` reported 42 successful and 0 failed, and the temporary database was removed.
- Existing-database preflight passed with `{ "ok": true, "failures": [] }`.
- No production or staging database was accessed or changed.

## RBAC and backfill

- Canonical planning manifest contains the authorized 12 stable roles and five added permissions. Persisted assignments remain authoritative.
- Bootstrap is idempotent and does not create user assignments. Verification result: `permissionsCreated=0`, `rolesCreated=0`, `rolesSkipped=12`, `grantsCreated=0`, `userAssignmentsCreated=0`.
- Membership backfill accepts explicit IDs only and rejects inferred/unknown role input. Empty explicit manifest dry-run returned `requested=0`, `valid=0`, `inferred=0`; no membership was written.

## Authorization and security closure

- Authorization is represented per permission as `PermissionGrant { permissionKey, global, dealerIds, locationIds }`.
- A global role marks only permissions assigned to that role as global. Scoped membership roles contribute only their own permission and that membership’s Dealer/Location IDs. A membership with no scoped role contributes no grant.
- Middleware asks for the route permission’s own grant. P02 scope-aware reads accept an existing grant; unmigrated Domain handlers require that permission’s own `global=true` grant and otherwise fail closed.
- Dealer and Location handlers use only the `dealers.read` grant. Foundation/authorization Dealer module projection is aligned to the same read permission. Empty Location IDs mean no Location records, never all records.
- Membership mutations require both `users.manage` and `settings.write` to be independently global. Location status mutation requires independently global `settings.write`.
- The authorization DTO exposes permission-specific action scope. Its top-level scope is a non-authoritative summary and supports `mixed`; runtime validation rejects malformed, contradictory, duplicate, and empty scope tuples.
- Regression reproduced and closed the original High: an unrelated global role containing only `dashboard.access/content.read` plus Dealer A `dealer_admin` cannot promote `dealers.read` to global or read Dealer B.
- Global permission ceilings exclude dealer-scoped direct `UserRole` assignments, preventing scoped permissions from being laundered into ordinary global roles. Dealer-scoped/system role scope identity cannot be changed through generic role metadata mutation.
- Membership mutations re-resolve both required global permissions inside the write transaction after taking the shared user/role lock order, so a committed revocation cannot race a stale preflight authorization into a later write. Create locks Actor and target users together in the first sorted acquisition to avoid reciprocal lock inversion.
- Location-scoped membership reads require an overlapping granted Location and redact non-granted nested Location assignments rather than expanding to Dealer-wide visibility.
- Shared authorization validation rejects unknown decisions, effective-role scopes, and module/permission mappings.
- The same regression found and closed a separate Dealer-detail IDOR caused by duplicate `id` object keys overriding the requested resource ID; the query now combines requested ID and granted scope.
- Last-active-Super-Admin protection, CAS revision conflict, inactive/expired membership, inactive Dealer/Location, request IDs, and selected Order/Payment/Audit projection boundaries are covered.

## Verification

Successful commands used Node `22.22.2`:

- Prisma generate, format, validate: passed.
- `prisma migrate status`: 42 migrations, local schema up to date.
- Fresh disposable database 0→42: 42 successful, 0 failed; database removed.
- DB tests: `5/5`.
- Focused P02 + route/ACL tests: `10/10`.
- Full API suite: `137/137`, 0 failed, 0 skipped.
- Worker tests: `11/11`.
- Shared/package contracts: `112/112`, 0 failed, 0 skipped.
- Full TypeScript across Web, DB, API, Worker, and CLI: passed.
- Backend build across DB, API, Worker, and CLI: passed.
- Existing-database preflight: passed.
- RBAC bootstrap second run: zero creates/grants/assignments.
- Explicit empty membership backfill dry-run: zero requested/valid/inferred.
- `git diff --check`: passed.
- Credential-pattern scan of the P02 diff: no match.

Not run / limitation:

- `qa:protected-artifacts` requires generated `out/` and failed before checking because `out/careers/index.html` is absent. No protected artifact changed in this Backend work unit; the source package/protected-content contract tests passed.
- Destructive `api:smoke` was not bypassed against `vanstro_dev`.
- Browser QA and Frontend consumption are pending the separate Frontend work unit.
- Historical Email/ERP/Support/CRM/Lead/Application serializers were not all converted to new P02 field profiles; P02 does not claim complete field-policy coverage for those Domains.
- No deploy, staging/production migration/write, push, PR, real payment/refund, or ERP action occurred.

## Independent security review

- Two independent read-only adversarial reviews reproduced and drove closure of permission-scope laundering, role-key scope mutation, membership authorization TOCTOU, reciprocal user-lock inversion, Location-scope expansion, and validator semantic-forgery paths.
- Final re-reviews found no remaining reproducible High or Medium across these paths. Reviewers did not edit files or write the database.

## Integration state and next action

- Backend work is ready for the focused local commit after the staged set audit.
- Frontend, Integration, and Main remain at the shared F0 baseline; P02 has not been dispatched, merged, promoted, or deployed.
- Next action after Backend commit: implement the `dashboard-authorization.v1` consumer on `feature/frontend`, then perform normal Backend and Frontend merges into `integration/fullstack` and full-stack verification.
