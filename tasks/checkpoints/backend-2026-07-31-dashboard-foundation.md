# Backend checkpoint — F0 Dashboard foundation

Date: 2026-07-31

## Identity and scope

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`.
- Parent: `1c4fe35301840fe157437f141df0441861c6125c`; clean at start.
- Bounded objective: add the read-only Dashboard foundation contract and strict internal shell flag only.
- Explicit exclusions preserved: F1, business-module migration, business mutation changes, Frontend components/pages, Worker, Prisma schema, migrations, seed/backfill, deployment, production writes, and real payment/refund actions.

## Contract and authorization

- Added `GET /api/v1/dashboard/foundation` with fixed `contractVersion: dashboard-foundation.v1`.
- The existing Dashboard middleware requires an active admin session and `dashboard.access`; the route is explicitly present in the deny-by-default ACL.
- Success returns only actor ID, safe generic display label, role labels, known module projections, honest permission-only visibility, shell/readiness state, and request ID. It returns no email, password, token, secret, or business records.
- Module projection uses only permissions in canonical `INITIAL_PERMISSIONS`. Unknown actor permissions cannot create modules. Shared runtime validation accepts only known module/route pairs and fail-closed denial semantics.
- Scope visibility is `unavailable`; field visibility is `permission-only`. No global or row/field scope is invented.
- `X-Request-Id` equals body `requestId` on success and the specified anonymous/under-permission errors.

## Shell flag

- Flag key: `dashboard.shell.v2`.
- Server configuration: `DASHBOARD_SHELL_V2_MODE` and `DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS` only.
- Only exact mode `internal`, active admin authorization, `dashboard.access`, and actor allowlist membership yields ready/enabled.
- Missing, empty, whitespace-altered, illegal, or exceptional config yields disabled. Header/query/body/cookie inputs cannot override it.
- Response always states `readOnly: true`; no mutation was added or opened.
- Stable shell state codes: `DASHBOARD_SHELL_DISABLED`, `DASHBOARD_SHELL_ACTOR_NOT_ALLOWED`, and `DASHBOARD_SHELL_READY`.

## Verification

Successful commands used Node `22.22.2`:

- Focused foundation tests: `5/5`.
- Shared/package contracts: `75/75`.
- Full API suite: `126/126`, 0 failed, 0 skipped.
- Full TypeScript across Web, DB, API, Worker, and CLI: passed.
- Backend build across DB, API, Worker, and CLI: passed.
- `git diff --check`: passed.
- Credential-pattern scan of changed implementation/test paths: no match.

Not run:

- Destructive API smoke did not execute. With the local environment loaded, the guard rejected `vanstro_dev` because it is not a test/smoke-named database; the guard was not bypassed.
- No browser QA, staging/production check, deploy, production migration/write, seed, schema change, backfill, push, real payment/refund, or ERP action.

## Review closure

Independent review found no blocker and identified three contract-hardening gaps. F0 tightened the shared validator to reject unknown module/route pairs and inconsistent denial reasons. The endpoint-specific required 401/403 request-ID bodies are covered. Global unexpected-error envelope unification was not expanded because the task explicitly prohibited broad API error normalization.

Follow-up from `a1bae346a9399ec6cab40921addfe53dc94baba1`: review reproduced that the first validator still accepted server-impossible disabled/internal shell combinations. The follow-up changes only the shared validator, package contract regression, and continuity records. Validation now permits exactly: `(disabled,false,DASHBOARD_SHELL_DISABLED,disabled)`, `(internal,false,DASHBOARD_SHELL_ACTOR_NOT_ALLOWED,disabled)`, and `(internal,true,DASHBOARD_SHELL_READY,ready)`. Regressions explicitly reject contradictory `enabled: false` tuples. Endpoint, ACL, env, permissions, mutations, schema, migrations, seed, and Frontend remain unchanged.

## Known untouched issue

`apps/api/src/routes/dashboard.ts` still checks noncanonical `system.settings.write` when replacing permissions on a system role, while canonical `INITIAL_PERMISSIONS` contains `settings.write`. Its matching test fixture also uses the noncanonical key. This pre-existing business-mutation drift was recorded in the Backend handoff and intentionally not changed in F0.
