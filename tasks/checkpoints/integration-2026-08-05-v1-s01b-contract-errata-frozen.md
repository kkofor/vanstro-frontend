# Integration — v1 S01B Settings contract conformance errata freeze

Date: 2026-08-05
Status: **ERRATA FROZEN — FORWARD CONTRACT CORRECTION ONLY**

## Authority

S01B coordinator prompt (SHA-256 `e257186d966fd206c1b12dafe3c4798115d9c85da77be5056946db72968db05d`) supersedes the S01 contract freeze where the two conflict, forward only. This errata checkpoint amends, but does not rewrite, `integration-2026-08-05-v1-s01-contract-frozen.md`. Historical S01 checkpoints and evidence remain immutable.

Independent read-only re-review of S01 settled on `0 Blocker / 3 High / 7 Medium`, plus one minimal S01 helper ACL tightening item. All are deterministic gaps in the frozen contract, normal function or completion evidence — not v2 scope. S01B closes them forward; it does not redo S01 and does not start CG01 or S02–S12.

## Scope guard (verbatim)

S01B must not start CG01 or S02–S12, must not add Payment, Email, ERP, Webhook, API Key, provider, secret or new descriptors, must not create a universal JSON second source of truth, and must not advance Main or production. After S01B completes, stop.

## Errata 1 — Append-only publication/history event model

The current history projection derives entries from mutable live publication rows. Publishing B in-place rewrites publication A's `settingsLifecycleStatus`, `successAuditEventId` and `settingsUpdatedAt`, so History may return a different status/Audit ID for the same publication later. This violates the frozen contract and must not be achieved by projecting mutable rows.

Frozen forward contract:

1. Migration74 creates an independent append-only `s01_settings_publication_event` object (descriptor-scoped) with at minimum:
   - event id;
   - descriptor key;
   - publication/runtimeConfig id;
   - publication sequence;
   - event type: `published` | `superseded` | `rollback_published` | `activation_failed`;
   - source draft id/version;
   - rollback source publication id;
   - change reason;
   - audit event id;
   - occurredAt;
   - immutable trigger (no update/delete);
   - unique constraint on descriptor-scoped publication sequence.
2. History returns the append-only event stream, not a live-row projection.
3. A publication fact, once returned, never changes because of later publications; supersession is a new appended event.
4. The original publish Audit ID remains traceable forever.
5. Rollback eligibility is judged from an explicit current-state projection (e.g. current publication pointer), never by mutating history events.
6. Audit, publication and ledger write in the same transaction.
7. Existing Audit/ledger rows are neither deleted nor rewritten.

Final naming and shape are frozen here; Backend implements exactly this contract.

## Errata 2 — Publication sequence vs draft resource CAS

`settingsRevision` currently serves both as the single-draft CAS and as the publicly returned publication/history version, and can repeat across drafts.

Frozen forward contract:

1. Drafts carry a resource-local, strictly increasing CAS version that is unique per descriptor draft row.
2. Publications/history carry a descriptor-scoped global, monotonic publication sequence.
3. DTOs distinguish the two with single, non-ambiguous semantics:
   - draft `version` (and request `expectedVersion`) = draft resource CAS;
   - publication/history `version` = descriptor publication sequence.
4. DB unique constraints enforce both (per-draft CAS uniqueness and descriptor-scoped publication sequence uniqueness).
5. Sorting/ordering does not fall back to time or UUID; the sequence is the stable unique order.
6. Replay returns the original sequence/version.
7. Concurrent drafts cannot collide on the publication sequence.
8. Existing v1 client fields are preserved: `version` keeps a single frozen meaning per DTO with a documented compatibility mapping where both appear.

## Errata 3 — Server-side invalid/blocker/PATCH recovery lifecycle

`validate` currently always returns `validated`; create/PATCH and the DB shape constraint reject 15–300-external values before persistence, so a structurally valid but business-invalid draft can never exist.

Frozen forward contract:

1. Structurally invalid input (non-integer, unsafe integer, wrong fields) is rejected at the API boundary with 400 `SETTINGS_VALIDATION_FAILED`; no draft is created.
2. Structurally correct but business-invalid values (e.g. integer 10) are accepted into a draft.
3. `validate` produces `status=invalid` with at least one blocker issue, persists the `invalid` state, and publish is refused.
4. A typed PATCH can correct the invalid draft (e.g. to 60).
5. Re-validation then yields `validated`.
6. diff/publish use the corrected exact revision.
7. Rollback drafts support the same invalid → PATCH → validate chain.
8. DB constraints only require validated/published values to satisfy 15–300; draft/invalid rows may hold structurally correct business-invalid values.
9. Browser and real PG16 regression cover the full chain.

Frontend-local field error hints may remain as UX, but must not substitute for the server invalid lifecycle.

## Errata 4 — State/version/not-found error separation

PATCH, validate, publish and rollback paths must distinguish, in order: (a) row does not exist; (b) expected revision does not match; (c) lifecycle does not allow the transition.

Frozen forward contract:

1. Revision mismatch → `VERSION_CONFLICT` (409).
2. Lifecycle-illegal → `SETTINGS_STATE_CONFLICT` (409).
3. Missing row / descriptor unavailable → stable `404` or `SETTINGS_DESCRIPTOR_UNAVAILABLE` per frozen resource-hiding policy.
4. A publish attempt with a correct version but unvalidated state returns `SETTINGS_STATE_CONFLICT`, never `VERSION_CONFLICT`.
5. A single shared `mapConflict`-style helper must not collapse the three.

## Errata 5 — Version and UUID input boundaries

All public version/sequence inputs (`expectedPublishedVersion`, `expectedVersion`, rollback target/current version, any other public revision/sequence input) must be validated at the API boundary:

1. `Number.isSafeInteger`;
2. non-negative (or positive, per frozen contract) — version inputs are non-negative; publication sequences are positive;
3. within PostgreSQL integer/bigint safe range;
4. negative, unsafe or out-of-range values return stable 400 `SETTINGS_VALIDATION_FAILED` and never reach the repository as 409/500.

Mutation path UUID parameters (`draftId`, `publicationId`):

1. API boundary UUID validation;
2. malformed → stable 400 (or controlled 404 per frozen resource-hiding policy — one choice per resource type, consistent for GET and mutation);
3. well-formed but missing → conventional 404;
4. never SQLSTATE 22P02/500;
5. GET and mutation error semantics are consistent.

The same runtime validator/helper is reused between Frontend and Backend to prevent drift.

## Errata 6 — History DTO compatibility and `superseded` copy

Frozen forward contract:

1. Option A is chosen: History becomes the append-only event-stream DTO (`SettingsHistoryEntry` gains the event model semantics per Errata 1; existing fields `publicationId`, `generation`, `version`, `status`, `descriptorKeys`, `changeReason`, `publishedAt`, `rollbackOfPublicationId`, `auditEventId` are retained and remain valid).
2. `superseded` gains a stable Chinese label: "已被后续版本取代" (or a frozen equivalent); EN/fr routes under the current Dashboard simplified-Chinese policy still display a consistent safe string.
3. Runtime validators and UI are exhaustive over `SETTINGS_LIFECYCLE_STATUSES`.
4. Publish A → B shows A clearly superseded in the Browser acceptance.

## Errata 7 — Descriptor runtime consumer and readiness generation binding

`settings.core.overview_refresh_seconds` is the only available descriptor and must have a real runtime consumer; hardcoded 60_000 ms timers are not a consumer.

Frozen forward contract:

1. The Settings Overview auto-refresh/security polling consumes the current published effective value in real time.
2. No publication → compiled default 60 seconds.
3. Published 15/300 takes effect after the next poll cycle without restart.
4. Stale actor/generation switches clean up the old timer and rebuild with the new effective value.
5. The 15–300 boundary holds at the effective-value layer.
6. Readiness is `ready` only when the consumer projection matches the published generation; consumer unavailable/mismatch → `degraded`, never fake-ready.
7. Browser proves the refresh frequency change with a controlled clock or a short legal published value — not merely by checking the API value.
8. The descriptor stays scoped to Settings Overview safe refresh; it is not extended to other pages or domains.

## Errata 8 — S01 mutation Audit with real P02 authority snapshot

The Audit helper currently records `effectiveRoles=[]` and a fixed `settings.write/global` grant regardless of the actual P02 context.

Frozen forward contract:

1. Within the same transaction, the P02 context (obtained via `p02_dashboard_authorization_context_v1(session_token_hash, actor_id)`) derives actor, effective roles, required permission grants, scope and context revision.
2. Each mutation records its true required permission(s).
3. Caller self-reported roles/grants are not accepted.
4. Audit stays atomic with mutation/ledger/history.
5. Historical S01 Audit rows are not rewritten; Migration74 guarantees correctness for new events only, and the completion checkpoint discloses the historical limitation.
6. Tests use real roles/grants to prove the Audit snapshot matches.
7. No full P04/v2 provenance refactor — only S01 normal mutation facts are corrected.

## Errata 9 — Shell access-mode copy matches server capability

Frozen forward contract:

1. On the Settings route, when server capability allows writes, the shell shows "Settings 受控写入" (or frozen equivalent accurate copy).
2. A read-only Settings actor still shows read-only.
3. Other legacy modules keep their read-only declaration; Media keeps its controlled interaction copy.
4. Copy is driven by server capability projection, never by Frontend role-name inference.
5. Browser covers Settings writer, Settings read-only and non-Settings routes.

## Errata 10 — Browser evidence schema and reproducibility

Frozen forward contract for the persisted harness at `qa/v1-s01-settings-browser/` with results at `tasks/evidence/v1-s01b-settings-browser/`:

1. `testedCommit` dynamically bound (never hardcoded old commits);
2. definition, fixture, harness and runner each recorded with SHA-256;
3. raw/expected/unexpected console and request evidence retained;
4. process/port cleanup in the wrapper;
5. old S01 result (`tasks/evidence/v1-s01-settings-browser/result.json`, SHA `17e9f581dfc6da6f7833de1cecc265b8a02fb71d03840fd7b1adeeae0dbb2531`) preserved, never overwritten;
6. ≥ 24 desktop acceptance cases (Section 14 of the coordinator prompt), 0 unexpected console/request;
7. normalization is deterministic (controlled fixture), screenshots kept minimal.

## ACL errata (Section 5 of the coordinator prompt)

`migration73`'s trigger helper `s01_settings_ledger_immutable_v1()` does not explicitly revoke PUBLIC EXECUTE. Migration74 must apply precise REVOKE/GRANT for the S01 helper surface (including the new event object helpers) to stop growing the default function surface. Only S01 objects; no full-library ACL audit.

## Migration boundary

- Migrations 1–73 are immutable; their SHA-256s must not change.
- Backend creates exactly one forward migration: `20260805110000_s01_settings_contract_closure`.
- It contains only: append-only event object; global publication sequence; draft/resource CAS fields/constraints; invalid lifecycle constraint adjustment; revised controlled functions; immutable triggers; exact S01 ACL; post-assertions.
- No migration75 may exist.
- Verification matrix: migrations1–73 SHA unchanged; fresh 0→74; 41→74; 73→74; concurrent publish; failure rollback; history backfill/compatibility with existing S01 fixture data; no migration75.

## Forward contract freeze

The following are frozen forward by this errata and any later implementation must match exactly:

- New types: `SettingsPublicationEvent` (append-only) with event type union `published | superseded | rollback_published | activation_failed`.
- Publication/history `version` = descriptor publication sequence (positive integer, globally monotonic per descriptor); draft `version` = resource CAS.
- Error precedence: not-found → `VERSION_CONFLICT` → `SETTINGS_STATE_CONFLICT`.
- Stable Chinese label for `superseded`: "已被后续版本取代"（等价的冻结文案）.
- Shell access-mode copy: "Settings 受控写入"（Settings 可写时，server capability 为准）.
- Version/UUID input boundaries per Errata 5.
- Invalid lifecycle: draft/invalid rows may hold 15–300-external structurally valid values; only validated/published rows are constrained.
- `settings.core.overview_refresh_seconds` drives the Overview timer; readiness `ready` requires consumer-generation match.
- Audit snapshot from real P02 context.
- No new API route is introduced; existing routes carry the corrected semantics. No new descriptor, provider, secret, Payment/Email/ERP/Webhook/API Key content.

## Verification (this checkpoint)

Contract-focused tests must pass before the errata commit is created:

- Contract exact positive/negative over the frozen errata types and boundaries;
- S01/S01B focused tests;
- typecheck:web.

No Backend implementation, no Frontend implementation, no migration, no production, no Main advance, no stash/clean/force/push occurred during this freeze.

## Next action

1. Create the Integration contract errata commit after contract tests pass.
2. Synchronize the permanent Backend and Frontend worktrees exactly per standard flow; Backend implements Migration74/API/DB tests protecting the seven v2 dirty assets; Frontend merges the errata normally and implements its corrections.
3. Integration performs normal two-parent merges, full gates, persistent Browser harness/evidence, completion checkpoint/handoff.
4. Do not begin CG01 or S02.
