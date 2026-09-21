# Integration checkpoint — Dashboard P04 Audit Foundation

- Branch/worktree: `integration/fullstack`, `.claude/worktrees/integration`.
- Shared parent: `44043891b7c0b29196418e6819bd2cdd9c0a6863`.
- Backend deliveries: `f91e741dff61cf5c14dea6734904e22069e39d8f`, `98e75a2c1c6b423fef3bdd43301e0126d3e28c47`, and scoped-access follow-up `ce1c7d450ea262e1fbe25ded9cc3a94121376f6b`.
- Frontend deliveries: `65e1f925410da9a34e5e0bd6ade2c814ac08643c`, `24deb0439688594ff05313d142869854d426b435`.
- Integrated code tip before this checkpoint: `eea8e518d6e7bfce985c8bfcedb943b9a095b33e`, tree `05bbb6b6aa956205a9c923e2e053fa812a76f481`.
- Frozen contract: `audit-event.v1` / `dashboard.audit-events.v1`; SHA-256 `40181858a76f4f09e47968b4f6c6848eb2c74c462305a8d2f2ae9c0d18738539`.

## Integrated scope

P04 adds one immutable append-only `AuditEvent` source migration, server-owned actor/source contexts, validated safe summaries and metadata, transaction-bound and best-effort recorders, PostgreSQL-safe exact replay/conflict idempotency, persisted retention fields, and a DB trigger that rejects UPDATE/DELETE. It retains legacy `AuditLog` unchanged and dispatches strict `common-query.v1` exclusively to `AuditEvent`.

Strict Audit query uses `occurredAt desc, id desc`, a frozen default range anchor, AES-256-GCM opaque cursor bound to actor/context/grant/field profile/query/order/retention/schema, P02 Dealer/Location scope, exact supplementary sensitive-grant scope, no total count, and fail-closed serialization. Bounded mutation proofs cover P02 membership/location and category operations only.

Frontend adds canonical Audit filters, transport-only cursor history, separate strict/legacy storage, 60-second stale behavior, capability and identity rollback, Simplified Chinese read-only table/detail UI, safe metadata, local Apply/Clear controls, and no mutation, Export, raw JSON, Work Queue or P05 surface.

## Closed integration finding

Integration found that the existing RBAC bootstrap skipped every existing non-`super_admin` canonical role, so an existing `dealer_admin` could not receive the new `audit_logs.read` grant. Follow-up `ce1c7d4` now reconciles all existing `DASHBOARD_ROLE_MANIFEST` roles: canonical name/`isSystem`, missing manifest grants only, preserved extra grants, no user assignments, and idempotent replay. No second migration was added.

Deterministic evidence:

- RBAC test proves all existing canonical roles are reconciled, extra grants remain, no assignment is created, and the second run adds zero grants.
- Canonical local database bootstrap recorded first corrected run `grantsCreated=1`, then `0`; Integration independently reran twice at the reconciled state and observed `0`, `0`.
- Direct DB-package query confirms `dealer_admin → audit_logs.read` exists.
- Owned disposable PostgreSQL scoped Audit matrix migrated fresh `0→43`, passed strict 200 / legacy 403, Dealer A visibility, Dealer B/global/none exclusion, Location overlap, omitted total, redaction without exact sensitive grant, and cross-actor/context cursor rejection; the disposable database was dropped.

## Verification

Final code was verified with Node `22.22.2`. An initial direct workspace API test without canonical environment failed because `DATABASE_URL` was absent; it was rerun with the protected canonical local environment loaded in-process and passed. No environment file was copied or changed.

- DB: 6 passed, 0 failed, 1 intentional owned-disposable skip.
- API: 167 passed, 0 failed, 6 intentional owned-disposable skips.
- Worker: 11/11 passed.
- Package contracts: 132/132 passed.
- Full TypeScript: passed after Prisma generation during the prior full Integration run; focused DB/API typechecks passed again after the follow-up.
- Backend DB/API/Worker/CLI builds: passed.
- Existing-database preflight: passed.
- Prisma schema/format/validate/status: passed in the full Integration run; 43 source migrations are up to date.
- Full static build: 396/396 passed with `NEXT_PUBLIC_SITE_URL=https://vanstro.ca`, `NEXT_PUBLIC_API_BASE_URL=https://vanstro.ca/api/v1`, and `VANSTRO_STATIC_EXPORT=true`.
- Dashboard artifacts: exactly 42 EN/fr, 0 Chinese routes, no-referrer metadata present.
- Chromium current-tree: 40/40 passed.
- Shared local `AuditEvent` count remained 2→2 across the full API run; immutable test artifacts were not added to the shared database.

Controlled browser validation passed strict global list/filter/detail, safe metadata, Escape/focus restore, opaque Next/Previous, invalid future-range no-fetch, capability rollback, neutral legacy Clear, redacted sensitive profile, and disabled mutation/Export/Global Search/Work Queue. The controlled fixture and Next runtime on ports 4330/4331 were stopped; their expected SIGTERM exit code was 143.

## Boundaries and release status

- Exactly one P04 source migration was added; local source count is 43. Production remains at release `3904a4404ada5b0107a08d5b9c71a3100f22b447` with 41 migrations.
- No production deployment, production migration/bootstrap, production write, real payment/refund/ERP action, fetch, push, PR, stash operation, legacy Audit deletion, business-wide Audit retrofit, Export, Work Queue, Async Job or P05 work occurred.
- Final reviewed P04 scope has no known open Blocker, High or Medium finding.
- Next action: commit this Integration evidence, audit protected Main collisions, strictly fast-forward Main and the clean feature branches to the verified Integration tip, then stop and wait for explicit P05 authorization.
