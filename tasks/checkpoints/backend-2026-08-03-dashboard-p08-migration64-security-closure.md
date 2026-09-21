# Backend P08 Migration 64 Security Closure

- Parent: `89f197d2b27ad2a25248f892757025ee02e85ff5`
- Contract v1.2 unchanged: `128ae596734963b77269e18e01894789733de782449033a5669bcf8b8f28db9d`
- Scope: CP112 direct-table blocker only; no P09/production.

## Design

CP113 records the four-table actor/verb matrix and minimal role design. Migration64 adds NOLOGIN `vanstro_p08_guard_owner` prerequisite, revokes all runtime/PUBLIC direct SELECT/INSERT/UPDATE/DELETE, and exposes fixed operation-specific SECURITY DEFINER boundaries. User boundaries re-resolve active persisted session + P02 RBAC/scope and exact-match resource binding. Worker boundaries bind current P05 Job/lease/revision/resource. No dynamic SQL or caller-provided identifiers.

## Migration64

- Path: `packages/db/prisma/migrations/20260803110000_dashboard_p08_runtime_permission_boundary/migration.sql`
- Adds no tables/business objects. It replaces only the P05 registry CHECK to admit the already-frozen four P08 Job descriptors, revokes m63 direct privileges, and creates fixed functions.
- Does not alter Contract, migrations1–63, P05 Artifact schema, signed URL, business object registry or production config.

## Controlled boundaries

- import list/detail/finalize context/create/transition/rows;
- export list/detail/create/transition;
- sample commit/export;
- system row-payload purge.

API now carries the already-authenticated session token hash internally and uses `packages/db/src/p08-controlled.ts`; no API/Worker production source directly invokes Prisma clients for the four protected P08 tables.

## PostgreSQL evidence

`test-permission-migration64.sh` passed on owned PG16:

- current m63 failure baseline proves SELECT/INSERT/UPDATE allowed and DELETE denied;
- fresh 0→64;
- P06 55→64;
- P07 62→64;
- P08 63→64;
- all four P08 tables × SELECT/INSERT/UPDATE/DELETE denied to runtime;
- PUBLIC/table/schema/database/create/owner checks;
- fixed SECURITY DEFINER owner/search_path checks;
- shadow CREATE/function and internal-helper invocation denied;
- same-session authorized create/read/export/cancel adapter positive path.

## Backend gates — Node22.22.2

- Prisma generate/validate: passed.
- Full TypeScript: passed.
- Focused P08 API: 17/17.
- Controlled boundary source tests: 3/3.
- DB rerun: 42 pass / 33 fixture-gated skip / 0 fail. An initial run had one P07 timing-heartbeat flake; unchanged immediate full rerun passed.
- Worker: 30 pass / 1 fixture-gated skip / 0 fail.
- Contracts: 191/191.
- API: 177 pass / 12 fixture-gated skip / 0 fail.
- Backend builds: passed.

Owned-disposable skipped tests remain for Integration execution under the dedicated fixture. No production/local persistent DB migration was run.
