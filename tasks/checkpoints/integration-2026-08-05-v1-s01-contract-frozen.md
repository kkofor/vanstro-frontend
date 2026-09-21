# Integration — v1 S01 Settings core contract freeze

Date: 2026-08-05
Status: **CONTRACT FROZEN — DOMAIN IMPLEMENTATION NOT STARTED**

## Scope

This checkpoint freezes only the shared `settings-center.v1` contract needed for S01. It does not implement Backend persistence/API handlers or the Frontend Settings workspace, and it does not start CG01 or S02–S12.

S01 owns one real, non-secret control-plane descriptor:

`settings.core.overview_refresh_seconds`

- integer range `15..300`;
- default `60`;
- controls only the safe refresh cadence of the new Settings Overview UI;
- is not an alias for P09 `foundation.runtime.refresh_interval_seconds`, which continues to own the operational runtime snapshot refresh interval; neither key reads, writes or overrides the other;
- belongs to the Settings core control plane, not P09 sample data or a future domain Settings Port.

Every future domain group remains `coming_in_v1` or `not_implemented`. No Payment, Email, ERP, Commerce, Webhook, API Key, provider or secret field is available.

## Contract identity

- Contract version: `settings-center.v1`
- Registry version: `settings-registry.v1`
- Foundation module: `settings`
- Foundation route: `/dashboard/settings`
- Read visibility permission: `settings.read`
- Existing mutation permission for S01 implementation: `settings.write`
- No new permission keys are introduced by the freeze.

Canonical page routes:

- `/dashboard/settings`
- `/dashboard/settings/overview`
- `/dashboard/settings/lifecycle`
- `/dashboard/settings/history`

The root canonicalizes to Overview. Settings subpages are views inside one Foundation module, not separate modules.

Canonical API routes:

- `GET /dashboard/settings/overview`
- `GET /dashboard/settings/registry`
- `GET|POST /dashboard/settings/drafts`
- `GET|PATCH /dashboard/settings/drafts/:id`
- `POST /dashboard/settings/drafts/:id/validate`
- `GET /dashboard/settings/drafts/:id/diff`
- `POST /dashboard/settings/drafts/:id/publish`
- `GET /dashboard/settings/history`
- `POST /dashboard/settings/history/:publicationId/rollback-draft`
- `GET /dashboard/settings/readiness`

Callers cannot supply an arbitrary URL, method, table, SQL, schema, provider or secret.

## DTO boundary

The shared API truth defines exact, camelCase DTOs for:

- `SettingsOverview`
- `SettingsRegistryEntry`
- `SettingsDraft`
- `SettingsValidationResult`
- `SettingsSafeDiff`
- `SettingsPublication`
- `SettingsHistoryEntry`
- `SettingsReadiness`
- `SettingsCenterCapability`
- `SettingsUpdateDraftRequest`

Runtime validators reject unknown fields, unsafe integers, non-UTC times, unknown lifecycle values, leaked secret/storage/raw-error fields, unsupported descriptors and inconsistent readiness or validation states. Generation is a decimal string. Safe diff is restricted to the public `value` field and reports zero secret changes.

Stable S01 error codes:

- `SETTINGS_DESCRIPTOR_UNAVAILABLE`
- `SETTINGS_STATE_CONFLICT`
- `SETTINGS_VALIDATION_FAILED`

Existing `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `DASHBOARD_FORBIDDEN` and `READINESS_UNAVAILABLE` remain applicable.

## Lifecycle

Frozen transitions:

```text
create -> draft
draft/invalid -> validated | invalid
validated -> publishing
publishing -> published | activation_failed | rolled_back
published/rolled_back -> rollback_draft
rollback_draft -> validated | invalid
activation_failed -> validated
```

Rules:

- drafts never change effective configuration;
- validation emits blocker/warning/info issues;
- blockers prevent publish;
- publish requires expected version/CAS and idempotency;
- publish is atomic and has no partial state;
- publish is followed by side-effect-free readiness;
- history is append-only;
- draft, invalid, activation-failed and rollback-draft records can be corrected only through the typed PATCH command with CAS/idempotency, after which validation must run again;
- rollback creates a new draft, validation and publication;
- irreversible actions and secrets cannot be represented as rollback.

## Capability projection

`DashboardAuthorization.settingsCenterV1` is fail-closed and projects:

- read;
- create draft;
- validate;
- publish;
- rollback;
- history read;
- readiness read.

Missing, malformed, secret-bearing or side-effect-bearing capability payloads normalize to disabled. Frontend must consume this server projection and must not infer authority from roles, query strings, local state or environment variables.

## CG01 boundary

S01 exposes no public Domain Settings Port type, adapter obligation or domain Port content. The six-part Port contract remains documented only as a future planning concept and will be frozen, if authorized, by CG01. CG01 has not started.

## Ownership leases

- Shared contract/registry lease: Integration S01 until domain merge completion.
- Migration lease: Backend S01 only.
- Implementation review confirmed immutable migration43 restricts P09 keys to the historical sample registry and later ACLs forbid a safe application-only extension. Backend S01 therefore owns the necessary minimal forward migration73 for the independent S01 core descriptor and operation-specific boundary.
- Migrations 1–72 remain immutable; the protected historical migration73 test draft is unrelated and must remain untouched.

## Frontend impact

Frontend must add a desktop Settings module, route parser, Overview/Lifecycle/History workspace, strict validators and operation-derived transport. It must preserve request generation, abort, 401 fencing, permission fail-close, focus handling and explicit `coming_in_v1` states. It must not reuse P09 sample keys as Settings completion.

## Backend impact

Backend must project the Settings Foundation module and `settingsCenterV1` capability, implement the exact routes and lifecycle using typed adapters, preserve CAS/idempotency/Audit/readiness semantics, and expose only the S01 core descriptor. Existing P09 tables/functions should be reused where they satisfy the frozen semantics; no generic JSON Settings store is allowed.

## Verification

- Focused S01 route/lifecycle/package/Foundation tests: `43/43` passed.
- `pnpm typecheck:web`: passed after removing stale generated `.next` types.
- Initial `pnpm exec tsx` attempt failed because `tsx` is not installed; the repository's documented `node --experimental-strip-types --test` runner was then used successfully.
- Existing protected `next-env.d.ts` and `next.config.mjs` were not edited or staged.
- No Backend, Frontend, migration, provider, production, Main, stash or agent-worktree operation occurred.

## Next action

Create the focused Integration contract freeze commit, then synchronize the permanent Backend and Frontend branches exactly as authorized. Do not begin CG01 or S02.
