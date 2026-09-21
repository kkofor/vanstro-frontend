# Frontend Handoff

## Current State — 2026-08-05 v1 S02 General/Brand/Storefront/Localization Frontend

- S02 Frontend implementation landed on `feature/frontend` (see commit SHA in the commit report). Desktop page `/dashboard/settings/general-storefront` (+ `/fr`) renders a new bounded `GeneralStorefrontSettingsPanel` with five typed sections (generalIdentity/brand/storefront/localization/defaultDealerLocation), reusing S01 transport/lifecycle patterns (AbortController/generation/actor fences, 401/403/404/409 VERSION_CONFLICT vs SETTINGS_STATE_CONFLICT, safe diff, explicit publish/rollback confirmations, append-only history, degraded/empty/forbidden/error states, keyboard/focus/live-region/forced-colors/reduced-motion). Visual contract follows the shadcn-admin forward addendum: deep-green sidebar/teal/orange brand tokens, Chinese desktop density, fine borders, light shadows, 8–12px radii, clear Settings sections, no KPI cards/random charts/zinc template colors/English template copy; no new dependencies installed.
- API client/contract/validators extended for S02 (GeneralStorefrontSettingsValueV1 five field families, S02Draft/S02ValidationResult/S02SafeDiff/S02Publication/S02HistoryEntry/S02Readiness, `settings.general-storefront` descriptor, `/dashboard/settings/s02-*` endpoints, public `GET /storefront/config?locale=`). Safe diff shows field paths and reference IDs only, never CMS body/Media bytes/PII.
- StorefrontProvider extends with a client-start `GET /storefront/config?locale=<locale>` consumer: `loading|ready|degraded|error` + public-safe effective config, AbortController/generation fence, and a publishedGeneration handshake (second read-only confirmation via `/dashboard/settings/s02-readiness?consumerGeneration=`; exact match before `ready`, otherwise honest `degraded`; handshake never blocks safe config display). SiteHeader consumes `siteDisplayName` (logo alt + compact brand text) and `announcementRule` (announcement bar when enabled and message non-empty with start/end window), keeping static copy fallbacks; navigation/Footer/CMS untouched.
- Static export compatibility verified: static HTML shows compiled fallback, hydration loads the public API and updates visible fields; EN/fr `general-storefront` artifacts generated and localized (204 French HTML files).
- Verification: focused S02 tests `23/23`; full frontend package contracts `270/270`; `typecheck:web` passed; `git diff --check` passed. Browser/full-stack Integration gates and authenticated live backend remain Integration work.
- No Backend/API/Prisma/migration, no new dependencies, no Main/production change. Next action: hand commit SHA to Integration for normal double-parent merge and full-stack gates.

## Previous Current State — 2026-08-05 v1 S01B corrective readiness implementation

- The prior S01B completion was rejected at `1 Blocker / 0 High / 2 Medium`. This bounded Frontend follow-up consumes the frozen readiness projection, installs the exact publication generation/value timer, and only then performs the second readiness GET with `consumerGeneration`.
- A separate injected timer controller clears and fences replaced timers, records the applied generation only after installation, reloads the real Overview at 15–300 seconds, and clears generation/timer on actor switch, request supersession, apply failure, or unmount. React request generation remains only a stale-response fence.
- Focused contracts/panel/timer behavior passed `47/47`; timer helper `3/3`; `typecheck:web` passed. Browser and full Integration gates remain pending. No Backend, Prisma, migration, CG01, S02–S12, Main, or production change occurred.

## Previous Current State — 2026-08-05 v1 S01B Settings contract conformance closure

- S01B closed the S01 re-review findings in Frontend commit `3ed3336` on `feature/frontend` (4 files: SettingsFoundationPanel, DashboardF0Shell, runtime-validation, panel test), merged normally into Integration `fdc6fe2`; accessibility corrections (`00914b3`) and a history key fix (`273cd60`) followed on Integration.
- Changes: stable `superseded` label "已被后续版本取代"; Overview refresh cadence consumes the published effective value via the safe diff's before field; 409 responses distinguish VERSION_CONFLICT from SETTINGS_STATE_CONFLICT; structural value validation lets business-invalid drafts reach the server invalid/blocker/PATCH lifecycle; Shell access-mode copy shows "Settings 受控写入" on the Settings route when the server capability allows writes (never role-name derived); negative values are rejected with a Chinese field error and correct focus; stale announcement uses the actual cadence; history keys combine publicationId/version/status so the append-only event stream renders without collisions.
- Focused S01/S01B tests `29/29` (pre-S01B) and `65/65` (post-merge integration focused); `typecheck:web` passed; desktop Browser `25/25`, 0 unexpected console/request.
- Full details: `tasks/checkpoints/integration-2026-08-05-v1-s01b-settings-contract-closure.md` (Integration).
- Next action: stop; wait for a separately authorized bounded package. Do not begin CG01 or S02.

## Previous Current State — 2026-08-05 v1 S01 response-binding follow-up

- Worktree/branch: `.claude/worktrees/frontend` / `feature/frontend`; HEAD `6594d76` normally merges latest Integration `4fef6fb3cdc148b919d35594a0299050f62ae7a5`, including Backend producer closure `de3bf35`. The earlier supersession contract is merged through `c000737` from `e48a84d330d11c130cf13688d7897f200386d449`. This separate follow-up is intentionally unstaged and uncommitted.
- Create responses bind the submitted value, trimmed reason, `draft` status, descriptor, base publication CAS and valid identity/revision. PATCH binds draft/descriptor/value/trimmed reason/unchanged base publication, a strictly advanced server-projected settings revision and editable status. Validation requires matching draft ID, a strictly advanced revision and a legal transition from the captured source status through `canTransitionSettingsLifecycle`, then binds the exact diff. Publish binds both confirmed source ID/revision; rollback accepts only producer-eligible `published | superseded`, rejects `activation_failed | rolled_back`, and binds `rollback_draft`, the target publication and submitted current effective publication CAS. Mismatches fail closed and retain the conflict fence until authoritative reload succeeds.
- Post-validation diff owns a dedicated AbortController and captured actor/generation/draft ID/version/status guard. The validated draft ref updates synchronously before the diff request, preventing both stale commits and incorrectly discarded fast responses; validation requires `validationRevision === draftVersion`. Recovery preserves the mismatch alert during authoritative reload and replaces it with an explicit success status only after reload commits.
- PATCH transport and UI consume `actions.updateDraft`, never `createDraft` as proxy. Create and PATCH value/reason validation have independent messages, `aria-invalid`, `aria-describedby`, and exact invalid-field focus. Errors survive further invalid edits and clear only when that exact field validates; valid controls omit `aria-invalid`. Direct selection and selected draft identity/revision changes clear prior PATCH field errors.
- Backend lifecycle/source-draft revision producer closure is normally merged at `6594d76` from Integration `4fef6fb3cdc148b919d35594a0299050f62ae7a5`. Follow-up verification passes focused S01 `29/29`, fresh complete package contracts `243/243`, `typecheck:web` and `git diff --check`; final correctness and accessibility reviews are `0 Blocker / 0 High / 0 Medium`. Static route/artifact gates remain unchanged from the immediately preceding S01 commit because this follow-up changes only Settings behavior/tests/continuity.

## Previous Current State — 2026-08-05 v1 S01 Settings core Frontend

- Worktree/branch: `.claude/worktrees/frontend` / `feature/frontend`. Final shared-contract closure is normally merged at `0ef86f1e715af87274a7cf7b6e9b5adafe26cd45`, whose second parent is Git-authoritative Integration `d9baaa996c107494c6cb67644dd0eb6c088a305e`; the preceding draft-contract merge is `99202b242f8e4f372f2a5d24edb4f85a79651ea0` with second parent `eaa5a9dbdf83f286b8c04d9624093bdaedbd7513`.
- Desktop-only S01 now owns formal EN/fr Settings Overview/Lifecycle/History routes and static artifacts, server-capability-gated registry/search, the sole non-secret `settings.core.overview_refresh_seconds` draft lifecycle, typed PATCH correction for invalid/rollback drafts, validation/blockers, exact safe diff, explicit publish/rollback confirmations, append-only history and readiness/degraded/error/empty/forbidden/stale/409 states.
- Transport is operation-derived and actor/version/idempotency fenced. Reads and mutations validate standard `{ data }` envelopes and exact DTOs; AbortController/generation/401 fences, current-publication rollback CAS, diff-to-draft binding, exact lifecycle gates, 409 stale-authority clearing and synchronous duplicate-command locking are present.
- Accessibility closes modal-local error, return/destination focus, field-linked PATCH/rollback errors, validation/search/save announcements, busy state, forced-colors and reduced-motion findings. Future S02–S12 groups are status-only and mount no forms or requests.
- Verification passed: focused S01 panel/transport closure `21/21` and preceding S01/shared matrix `40/40`; complete package contracts `238/238`; `typecheck:web`; SEO/security; fr-CA formatting; configured static build/localization `203` French HTML; SEO artifacts `406/308/140-per-locale/300`; French language, 404 and protected artifacts; exact EN/fr nested Settings artifacts; diff check. Host Node `25.9.0` emitted the expected engine warning (`>=22 <23`).
- `qa:error-localization` is intentionally not green before Backend S01 implementation because the Backend catalog does not yet contain `SETTINGS_DESCRIPTOR_UNAVAILABLE`. Authenticated live Backend Settings browser, screen-reader sessions and Backend/DB/Worker gates were not run.
- Detailed evidence: `tasks/checkpoints/frontend-2026-08-05-v1-s01-settings-core.md`.
- No Backend/Worker/Prisma/migration, CG01/S02, provider/secret, mobile gate, public Storefront, production, push or deployment action occurred.

### Backend contract required

- Backend must implement the frozen S01 routes/envelopes and stable error catalog, including typed PATCH draft correction, current-version CAS, validation, safe diff, publication/history/rollback and readiness. Integration must reconcile the exact `{ data }` envelopes and run authenticated desktop Settings/Audit/full-stack scenarios.

### Next action

- Create the authorized focused Frontend commit and hand its SHA to Integration. Do not merge Integration/Main here, deploy, or begin CG01/S02.

## Previous Current State — 2026-08-04 Step3B SAFE STOP; mobile drawer removed from v1 gate

- `feature/frontend` was clean and strictly fast-forwarded from `8e2ad7440d74403f8cfa0c0d7bbf32f2bf9ae86b` to Integration `b445b6ab432fbacf7d3c0fcbedc78e76bbbcfc61`, tree `578c6fe78182d16ae78725ad5f9228f3d8cf29e3`.
- User then stopped Step3B and changed scope: Dashboard v1.0 acceptance is desktop-only; mobile drawer/mobile adaptation is not a v1 release gate. Do not continue the superseded drawer closure prompt.
- Preserved unstaged experiment: `DashboardF0Shell.tsx` stable trigger ref/fallback, shared `useModalFocus.ts` synchronous cleanup restoration, modified `f0-shell.test.ts`, and new `useModalFocus.test.ts`. `next-env.d.ts` is also modified by the diagnostic Next runtime. No staged files, Frontend commit, Integration merge, QA commit or continuity commit exists.
- Real-browser diagnosis found correct focus order and Tab wrapping; baseline restoration was timing-sensitive. The final exact F1-X07 assertion loop ran 100 times with 0 failures after the uncommitted experiment, but formal Frontend gates, Cross-Foundation closure and authenticated journey were not run. The experiment is not accepted.
- Owned fixture/Web tasks were stopped; ports 4470/4471 closed; no container or temporary DB was created. Exact inventory, diagnostics and recovery paths: `tasks/checkpoints/frontend-2026-08-04-v1-step3b-safe-stop.md`.
- Stop and wait for a new prompt to disposition the uncommitted experiment. Do not commit, merge, reset, restore, stash, clean, or continue mobile work.

## Previous Current State — 2026-08-04 F1 v1.5 Phase B Frontend Consumer

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`; bounded parent/HEAD before this commit is `c4af826c3eb2b390bfcb8125ca06783cc0b04232`; shared Phase A Integration parent is `e30125995090f8e60aea090e51442616bdbca88d`; local protected Main remains `f96bb80e9b024352408372440d803072980dbe43`.
- Frozen authority: parent manifest `e6c3cb275b3ecee17022418586613f6739757802b705bd17444b5c95be5a6e8f`; Implementation Authority Clarification manifest `68040ee6b95cdba8439cc4a733d124b7d518fb48a073ac093c2607bbcc7eb0f1`.
- P09 config/flag consumers now use fixed Phase B list routes and exact array DTOs. Empty successful arrays render separately from degraded request/contract failures; key detail is selected locally from the validated array and never falls back to the old detail envelope. Readiness retains independently permission-gated summary/detail DTOs and bigint-safe counters.
- P10 now consumes `validateReleaseFamilies`, binds every family to the requested UTC day, requires deterministic family order and exact privacy-safe cells, renders multiple families, and distinguishes empty/suppressed/published plus sealed/late-excluded/incomplete. Suppressed numeric values remain null and display as privacy-protected, never zero.
- Analytics ingestion is explicitly displayed as `disabled`; no raw-event, request-time metric, provider sink, or ingestion mutation is exposed. Both panels retain actor, request-generation, AbortController, permission-denial and 401 fencing.
- Node `22.22.2` verification passed: focused P09/P10 `21/21`; complete package contracts `212/212`; `typecheck:web`; `git diff --check`. Browser/static/full-stack gates were not run and remain Integration work.
- No Backend/Worker/Prisma/migration implementation, deployment, production access, Stage C, push or stash action.

### Backend contract required

- Integration must verify Backend Phase B serializers emit the exact P09 config/flag array DTOs and P10 release-family array DTOs consumed here, including deterministic family ordering and camelCase fields. Frontend rejects the old envelopes, raw snake_case SQL rows, unknown fields and request-day mismatches.

### Next action

- Hand the focused Frontend commit to Integration. Integration should reconcile serializers and run authenticated P09/P10 browser/full-stack gates; do not deploy or enter Stage C.

## Previous State — 2026-08-03 Dashboard P08 v1.2 Import/Export Foundation

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`; exact parent/shared P07 baseline `f2c3879c58184c951d5dc7b04babf7659f23e12e`. The original dirty draft was preserved and forward-corrected, not reset or reconstructed.
- Frozen authority: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p08-import-export-foundation-contract-v1.2-20260803.md`, SHA-256 `128ae596734963b77269e18e01894789733de782449033a5669bcf8b8f28db9d`.
- Frontend-only P08 adds canonical EN/fr `/dashboard/data-jobs`, strict import/export/list/detail/preview/upload DTO validators, exact `foundation.sample` and formula registries, independent P03 cursors, safe progress/status/expiry, normalized row validation errors and partial commit outcomes. Unknown fields, statuses, objects, formulae, hashes, routes and authority inputs fail closed.
- Global F0 remains read-only. P08 alone uses typed operation-aware transport. Create accepts only `awaiting_upload`; the controlled PUT is the sole finalize operation and binds exact endpoint/token/file bytes/content length/version/idempotency. No upload-complete operation or route exists. Upload/download reject redirects; download creates only a short-lived local object URL after the authenticated same-request byte response.
- Six exact P08 permission keys remain independent; generic Jobs permissions grant nothing. Commit/download/cancel retain top-level + resource double gates, actor/context/generation fencing, object/status/version binding and explicit impact confirmation.
- Simplified Chinese UI retains independent import/export Previous/Next/Restart/Refresh histories, preview pagination, CSV selection, atomic live progress, deep normalized-row validation, separated validation/commit errors, partial outcomes, export creation, cancellation, controlled download and focus-trapped commit failure. `awaiting_upload` is displayed distinctly and upload failure never locally promotes to `uploaded`.
- Node `22.22.2` final evidence: focused P08 `18/18`; complete contracts `190/190`; `typecheck:web`; `git diff --check`. Earlier full static/fr/SEO/artifact results remain historical and must be rerun on Integration after merge; they are not claimed for the final combined v1.2 tree.
- Detailed evidence: `tasks/checkpoints/frontend-2026-08-03-dashboard-p08-import-export-foundation.md`.
- No Backend/Worker/Prisma/migration, merge, push, deploy, production write, Order/Payment/PII, public Artifact delivery or stash action.

### Backend contract required

- Integration must reconcile the committed Backend v1.2 response projections with the strict Frontend validators, especially `awaiting_upload → uploaded`, P03 meta, capabilities, Artifact expiry metadata and controlled download bytes. No additional Backend route or retry authority is requested.

### Next action

- Create the focused Frontend domain commit and hand it to Integration with Backend commit `c132ebd832042014cb7afabf888c3d752e90c536`. Run full static/browser/full-stack gates only after normal two-parent merges. Do not deploy or enter P09.

## Previous State — 2026-08-03 Dashboard P07 Media Library Foundation

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`; parent/shared baseline `a943b0f71d4d04db7fd9b9bb8f3d25f85ef59fc3`.
- Frozen P07 v1.12 contract: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p07-media-library-contract-20260802.md`; SHA-256 `5bfeb0d3ddacdb3be69ce38484adac9953c04ca95492c66a642cd399a621801c` independently matched.
- Frontend-only P07 adds exact safe/sensitive Media Asset/list/detail/upload/usage/adapter/capability validation, canonical EN/fr `/dashboard/media` route ownership, exact filters, in-memory opaque cursors, actor/query/request isolation, real abort signals and 60-second stale expiry. It does not depend on `content.read`.
- The Simplified Chinese presenter exposes controlled single-file upload, server-authoritative processing states, safe preview/original download, bilingual metadata, frozen usage attach/detach and archive/restore only under both top-level P02 capability and required per-Asset computed capability. Unknown/malformed capabilities, request IDs, fields, profiles and registries fail closed; no storage path, public original URL, arbitrary proxy, physical delete, AI, bulk import/export or Product/CMS rewrite is exposed.
- Final review remediation made per-Asset `capabilities` a required exact validated DTO, preserving double gates and closing the prior TypeScript failure. Accessibility remediation keeps preview focus mounted with status announcements, adds drawer focus fallback when a mutation removes the source row, distinguishes loading/refreshing, gives repeated row actions contextual names and models usage loading separately. The new EN/fr Media routes are included in the locale manifest.
- Independent late contract review then closed one High and five Medium findings in a separate follow-up: exact Backend usage-attach body, actor/Asset/generation-fenced and abortable preview/download with independent non-interfering read lifecycles, adapter clearing at 60-second expiry, archived failure evidence acceptance, canonical sorted/deduplicated tags and a listHref-keyed panel that preserves cursor/focus while `assetId` opens and closes the drawer.
- Node `22.22.2` verification passed: focused P07 `14/14`; full package contracts `165/165`; `typecheck:web`; production-configured static build `398/398`; localization `196` French HTML; SEO artifacts `392` application routes / `308` indexable / `140` PDPs per locale / `300` SKUs; fr-language, 404 and protected artifacts; exact Dashboard HTML `44` and zero Chinese routes; diff check.
- Independent correctness/security and accessibility review found no remaining reproducible Blocker/High/Medium after fixes. Not run: authenticated live Backend P07 browser matrix, VoiceOver/NVDA/JAWS, real Windows forced-colors, `qa:browser-current-tree`, Backend/DB/Worker gates or production QA.
- The write-transport acceptance follow-up preserves global F0 `readOnly:true` and gives only P07 a typed operation-aware transport. Exact operation types construct the seven authorized endpoint families and reject caller-supplied URL/method/body, mismatched Asset/Usage/Intent/scope/version, missing top-level or per-Asset capability, stale actor/context and malformed upload/metadata/usage input before fetch. 401 performs centralized invalidation.
- The exact additive `retryBinding` is strictly validated. Retry mounts only with binding plus both capabilities, generates a fresh idempotency key, derives expected Asset version from the current DTO, validates the exact retry response, and on 409 refreshes without automatic retry. Archive → Restore consumes the authoritative returned archived Asset/version.
- Follow-up verification on Node `22.22.2`: focused P07 `20/20`; package contracts `170/170`; `typecheck:web`; production-configured static build `398/398`; French localization `196`; diff check. Final review's same-actor Asset race, stale retry detail and missing per-kind content-PUT capability findings are fixed; focused `20/20` and `typecheck:web` passed again.
- Detailed evidence: `tasks/checkpoints/frontend-2026-08-03-dashboard-p07-media-library-foundation.md`.
- No Backend/Worker/Prisma/migration, merge, push, deploy, production write/migration, external delivery, AI, bulk import/export, payment/refund or stash action.

### Backend contract required

- No additional Backend change is requested. Integration must verify the frozen v1.12 shared DTO/wire after both dirty domain implementations are committed and merged, including global/scoped/denied profiles, 401 invalidation, per-Asset capability double gates, controlled upload/preview/download, mutations, cursor/stale/session races and a11y focus behavior.

### Next action

- Hand the focused Frontend P07 commit to Integration for controlled full-stack verification. Do not deploy or begin P08.

## Previous State — 2026-08-02 Dashboard P06 Work Queue / Notifications

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`; parent/shared baseline `9a3ea56218696ccc6362bd0d3f307c23c12aecf0`.
- Frozen contract SHA-256: `2cfa707b5c64f62206df96951719c8ee01d30d451ab2d65ddbe26097e1f435d3`.
- Frontend-only implementation adds strict Work Item/summary/adapter/Notification/capability validators, canonical Operations `view=work-queue|notifications`, five presets, Apply/Clear, opaque in-memory cursors, actor/context/query isolation and 60-second stale lifecycle.
- Chinese read-only Table/DetailDrawer presents critical-outside-filter warnings, assignment/status/severity/SLA/health/resource/deep-link summaries, separate adapters and recipient Notifications. Notification read is explicitly separate from Item acknowledgement. Capabilities are display-only; no mutation or mark-read controls mount.
- Producer compatibility follow-up aligns foundation summary version, all 14 exact `${source}.v1` adapters, three Notification types, top-level Work Queue summary and top-level Notification unread summary with standard cursor metadata.
- Final Medium remediation adds real preset API mappings, every frozen filter, capability-off Clear/no-fetch, post-await request identity guards, fixed deep-link allowlists, exact cursor/summary registries, unread display and current-response adapter state.
- Final exactness follow-up accepts the Backend-owned query-free `/dashboard/operations` worker-heartbeat adapter deep link while retaining strict query allowlists, requires both non-empty native summary keys `stage` and `issueCode`, makes preset-only direct/reload/BackForward URLs derive canonical concrete filters while rejecting conflicts, and validates every optional Work Item lifecycle timestamp/actor/status/retention/assignment invariant against the Backend serializer. The only frozen type `foundation.attention` rejects `expired` and all `attentionExpiresAt`. Recently-resolved bounds use injectable time and remain stable once explicit.
- Integration controlled-browser verification found authorized P06 routes permanently blocked by the legacy `idle` loading return even though P06 intentionally skips legacy `loadTab`. The focused follow-up mounts authorized Work Queue/Notification views immediately after capability-off fail-closed handling and before legacy resource-state gates; a source-order regression preserves both the independent P06 loading path and disabled no-fetch rollback.
- Verification passed: focused P06 `10/10`; package contracts `151/151`; `typecheck:web`; production-configured build. Initial final-review/localization/fr-CA/SEO/artifact gates, 42 Dashboard HTML / 0 Chinese routes and Chromium `40/40` remain recorded in the checkpoint; diff check passed.
- Detailed evidence: `tasks/checkpoints/frontend-2026-08-02-dashboard-p06-work-queue-notifications.md`.
- No Backend/schema/migration, external delivery, Command Center, P07, deploy, push or stash action.

### Backend contract required

- No additional Backend change is requested. Integration must verify exact P06 capability/list/detail/summary/adapter/Notification wire and P02 scope behavior after both domain commits merge.

### Next action

- Create the focused Frontend commit and hand it to Integration for controlled global/scoped/capability/cursor/stale/detail/adapter/notification/a11y verification. Do not begin P07 or deploy.

## Previous State — 2026-08-02 Dashboard P05 Async Job Foundation

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`; parent/shared baseline `a882dc6e41ffa2cedf3c9df8c55ba76bb3dd08ac`.
- Frozen contract SHA-256: `753001d78f0c65e533cc7220ff7a8e25a54f766a91e1a79c52aaaa796209627b`.
- Frontend-only implementation adds strict `async-job.v1` list/detail/legacy-adapter validation, fail-closed capability consumption, canonical Operations `view=jobs` URL, Apply/Clear filters, opaque in-memory cursors, actor/context/query latest-request isolation and 60-second stale retention.
- The read-only Chinese Table/DetailDrawer displays exact status, progress, attempts, safe actor/scope, cancellation-requested versus cancelled, safe summaries and artifact metadata. Native and legacy adapters remain separate. No mutation/download, Import/Export, AI, Work Queue or Notification surface is mounted.
- Initial commit `8b5cbb8e7ce13b96696da804098b47dd9ad62c03`. Integration then found one Frontend-only Medium: the list/detail validator accepted only the safe visibility profile.
- Independent follow-ups pass the capability-sensitive expectation through list/detail consumers and align exact wire visibility: both profiles require strict SHA-256 artifact checksum integrity metadata; safe omits actor ID and requires empty result/error `entries`; sensitive may include actor ID and bounded entries, while system actors may omit a stable ID. Storage references remain forbidden and cross-profile responses fail closed.
- Final Frontend review follow-up freezes URL/DTO/artifact registries to `foundation.probe` and `foundation.probe.metadata` exact values, rejecting unknown future registry data. Adapter state now persists authoritative completion metadata; a scoped successful empty set is complete with explicit no-readable-adapters copy, while only fetch failure is unavailable and server partial remains partial.
- Latest verification passed: focused P05 `9/9`; package contracts `141/141`; `typecheck:web`; diff check. Initial full gates remain recorded below.
- The first Chromium run was `0/40` only because the harness did not classify `https://vanstro.ca` as the external API origin; the configured rerun passed `40/40`.
- Detailed evidence: `tasks/checkpoints/frontend-2026-08-02-dashboard-p05-async-job-foundation.md`.
- No Backend/Worker/Prisma/migration/deploy/push/stash/P06 or production action occurred.

### Backend contract required

- No additional Backend change is requested. Integration must verify the exact frozen P05 capability, DTO, cursor, adapter and scope behavior against the Backend implementation after both commits merge.

### Next action

- Create the focused Frontend commit and hand it to Integration for controlled live global/scoped/capability/stale/detail/artifact/adapter/a11y verification. Do not start P06 or deploy.

## Previous State — 2026-08-02 Dashboard P04 Audit Foundation

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`; parent `15f9a0436f91e45127cca7170500d429b978d664`.
- Functional commit: `65e1f925410da9a34e5e0bd6ade2c814ac08643c`; tree `139f293ed5ca5a9ac1533efda3768446ebfa0609`.
- Frozen contract SHA: `40181858a76f4f09e47968b4f6c6848eb2c74c462305a8d2f2ae9c0d18738539`.
- P04 Frontend implementation is present and intentionally uncommitted. It adds strict Audit URL/result/detail validation, a separate `auditEvents` data domain, opaque cursor Next/Previous/Restart, exact actor/context/query request isolation, 60-second stale handling, global-neutral-only legacy rollback, and a read-only Chinese Audit presenter with shared responsive Table and accessible DetailDrawer.
- Audit URL ownership runs before legacy canonicalization. Invalid values mount no consumer. Cursor/metadata/raw values never enter browser URL/history. Sensitive fields are fail-closed against the server field-profile capability.
- No Backend, Prisma, migration, business mutation, Export, P05, deploy or production action was performed.
- Iteration evidence includes the recorded 3/4 then 2/4 helper failures, initial type-narrowing failures and the corrected source-contract regex; details are in `tasks/checkpoints/frontend-2026-08-02-dashboard-p04-audit-foundation.md`.
- Verification after the future-time fix: Frontend TypeScript passed; focused P04 8/8; package contracts 132/132; source/localization/SEO gates passed; production-configured static build/artifact gates passed; Chromium current-tree 40/40; Dashboard artifacts 42 EN/fr and 0 Chinese routes; diff check passed.
- Final read-only review’s one Medium future-time finding is fixed; final security/correctness/accessibility re-review found no remaining High/Medium. Backend contract required: Integration must perform live strict/legacy/scope/cursor browser validation; no additional Backend change is requested by this Frontend work unit.
- Next action: hand functional commit `65e1f925410da9a34e5e0bd6ade2c814ac08643c` plus this continuity commit to Integration for live strict/legacy/scope/cursor browser validation. Do not deploy or begin P05.

## Current State — 2026-08-02 Dashboard P03 Common Query / Search Contract

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`; Backend P03 baseline merge `1a88b205702d01f8308ba1583031ecf3c80f6b75`, tree `16d9df4a752674786dcaef30339be755a9d57741`.
- Functional commit: `ac8c90fd892a00b539d22d68577450c2bcbb5961`; tree `f50ffa3208599fe44131eecfa8c15df041e010df`.
- Frozen contract SHA-256: `2bbdf5c4378414defddb71743a0d7898f453c21b1a914f1eb2a1c194edd98684`.
- Products consumes strict offset with canonical browser page/productStatus mapping; Dealers consumes scope-bound opaque cursor with in-memory back/next/restart. F0 owns one Products/Dealers canonicalization pass and retains Back/Forward state.
- Strict results are runtime validated, capability-gated, abortable and isolated by actor/context/query plus per-tab latest-request sequence. Empty/Filtered Empty/OutOfRange/Exhausted/Stale/Error/Forbidden/capability-unavailable are distinct; stale data clears at capturedAt + 60 seconds.
- Capability false falls back to legacy only for neutral state; active strict-only URL state fails closed until cleared. CRM q controls and requests are removed; old q deep links render unsupported without unfiltered fallback; safe optional CRM DTOs and `promotionEligible` are consumed.
- Required Node `22.22.2`: `typecheck:web` passed; package contracts including P03 `124/124`. Focused P03/F0/P02 `32/32`; final review, localization, fr-CA, SEO/security, production-configured build, artifact gates, 42 Dashboard HTML and 0 Chinese Dashboard route passed.
- Detailed evidence: `tasks/checkpoints/frontend-2026-08-02-dashboard-p03-common-query.md`. Final security review found no High/Medium; correctness review’s two Medium findings were fixed and final re-review found no remaining High/Medium.
- No schema/migration, Global Search endpoint/UI, Saved View, Export/Import, business-page rewrite, deployment, push/PR, production action, payment/refund, ERP or stash operation.

### Backend contract required

- No additional Backend change is currently required. Integration must verify exact strict meta/DTO/capability behavior against Backend commit `0199a87f5827fe2ef9d171aba60b00491428ce91`.

### Next action

- Hand functional commit `ac8c90fd892a00b539d22d68577450c2bcbb5961` plus this continuity commit to Integration for controlled browser query/capability scenarios and full-stack verification. Do not deploy or enter P04.

## Previous State — 2026-08-02 Dashboard P02 authorization consumer

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`; shared contract baseline is Backend P02 Integration merge `68ca0e466d09741639423564709c2abda3cbf58d`.
- The existing Foundation boundary now owns one generation-safe Foundation+Authorization snapshot. Legacy rollback remains Foundation-authoritative; Foundation ready waits for strict `dashboard-authorization.v1` validation and matching actor before rendering the internal Shell.
- P02 read actions are the capability truth: scope-aware Dealer reads may be scoped, while unmigrated Domain modules require the action itself to be global so navigation cannot advertise a stable 403. Foundation/module summaries do not elevate or suppress actions; top-level scope is display-only.
- Known denied direct routes retain their URL, render an explicit forbidden state, and do not mount business content. Unknown routes keep the existing F0 fallback.
- Data cache/request identity includes `actor.id:contextRevision`, so same-actor permission revisions clear old data and stale commits. Expired snapshots fail closed and a timer revalidates exactly at `expiresAt`; unavailable authorization uses the explicit retryable unavailable UI.
- Shell displays persisted role keys and a clearly labelled access-range summary while retaining the read-only Chinese UI, 21 logical pages, 42 EN/fr artifacts, zero Chinese routes, and all F0 accessibility/rollback structure.
- Node `22.22.2` verification passed: focused P02 `7/7`, package contracts `119/119`, `typecheck:web`, final review, error localization, SEO/security, production-configured build `396/396`, protected/404/fr-language artifacts, exact Dashboard HTML `42`, Chinese Dashboard artifacts `0`, and diff check.
- Detailed checkpoint: `tasks/checkpoints/frontend-2026-08-02-dashboard-p02-authorization-consumer.md`.
- Independent correctness/security review’s three Medium findings and accessibility review’s unavailable-state Medium are closed; final re-reviews found no remaining High/Medium.
- Frontend P02 commit: `18b1c2c63d8a0f287aae5e16435cf0a26e969596` (parent `68ca0e466d09741639423564709c2abda3cbf58d`, tree `eadcadd9a1377aee088d243c8ed5bd067237d86d`). No Integration Frontend merge, Main promotion, push, deploy, production write, payment/refund, ERP, or P03 action occurred.

### Backend contract required

- No additional Backend change is currently required. Frontend consumes the integrated `dashboard-authorization.v1` contract and keeps action-level scope authoritative.

### Next action

- Coordinator normally merges Frontend commit `18b1c2c63d8a0f287aae5e16435cf0a26e969596` into `integration/fullstack` and performs full-stack authorization, IDOR, F0 rollback, artifact, and browser verification.

## Previous State — 2026-07-31 Dashboard trailing-slash route follow-up

- Follow-up parent: `b31281a9299626108f9dc9676ff2f33b5563db3d`; independent minimal follow-up, no amend/rebase.
- Foundation route resolution now normalizes one or more trailing slashes before EN/fr module matching. Root remains `/dashboard`; section canonical URLs remain slashless.
- `/dashboard/orders/?orderStatus=paid&page=2` resolves Orders and retains its filter/page; `/fr/dashboard/payments///?page=3` resolves Payments; denied and unknown routes still fail closed.
- Targeted/formal/type gates and checkpoint evidence were updated. No API/data/route artifact change, push or deployment.
- Next action: coordinator merges the complete F0 chain through this follow-up and reruns the previously failing Integration URL.

## Current State — 2026-07-31 Dashboard F0 fulfillment and Operations follow-up

- Follow-up parent: `96f65e5c3ca32e35c62da80805435bfa86caa741`; independent minimal follow-up, no amend/rebase.
- Orders and Payment Sessions now present authoritative `fulfillment` enum values through `displayDashboardValue`; F0 shows `自提/配送` while the underlying `pickup/delivery` values remain unchanged. Legacy EN/fr copy behavior and fingerprints remain stable.
- Operations read-only endpoint settlement now matches CMS semantics: 401 clears the session, one success/one failure is Partial, all 403 is Forbidden, and any other all-failed outcome is Error. All-failed results do not commit empty arrays/null as valid success.
- F0 Error/Forbidden UI continues to show fixed Chinese recovery guidance with Retry and does not expose raw technical messages.
- Targeted fulfillment/Operations/copy suite passed `16/16`; formal and closure gates are recorded in the checkpoint. No Backend/API/schema/data/route change.
- Next action: coordinator merges the F0 chain through this follow-up and reruns Integration Orders/Payments/Operations fixtures.

## Current State — 2026-07-31 Dashboard F0 CMS language boundary follow-up

- Follow-up parent: `58343da7e8eb2b0739afca0e4680388443c6689e`; independent minimal follow-up, no amend/rebase.
- Corrected F0 CMS language ownership: Chinese management headings/labels inherit the outer `zh-CN`; only managed JSON/text values use their EN/fr locale. Legal-page and article titles retain per-record locale language attributes.
- CMS subview buttons expose `aria-pressed` selected state. Read-only CMS/Operations structural guards remain intact.
- CMS read-only multi-source loading now uses independent settled results: 401 propagates to centralized clear; single-source 403/network/5xx yields Partial while successful data remains; all-failed becomes Forbidden/Error instead of empty/read-only.
- F0 error states no longer render raw resource paths or English exception messages; users receive fixed Chinese, actionable summaries.
- Targeted CMS/a11y/race tests `12/12`, formal contracts, typecheck, localization/SEO/build/artifact gates recorded in the checkpoint. No Backend/API/schema/data/route change.
- Next action: coordinator merges the complete F0 chain through this follow-up and reruns Integration browser fixtures.

## Current State — 2026-07-31 Dashboard F0 Chinese and session-safety follow-up

- Follow-up parent: `cd662102de414534e614decf6ca9cfe363686d67`; independent minimal commit, no amend/rebase.
- Added complete typed Simplified Chinese `DashboardCopy` through `getDashboardF0Copy()` without expanding `SiteLocale` or adding routes. F0 panels, fields, filters, pagination, actions, statuses, captions, empty/error text are Chinese; legacy `getDashboardCopy(locale)` remains EN/fr. Managed Storefront values remain authoritative and CMS locale content uses explicit EN/fr language boundaries.
- Closed actor race leakage with a centralized generation+actor commit guard around every async data/meta/stats/resource/error/loading write. Deferred actor-A success/error cannot repopulate actor-B state. Overview, CMS and auxiliary read-only calls propagate 401 to centralized clear/invalidation instead of swallowing it; partial 403/non-auth failures remain distinguishable.
- Added typed `dashboard-session-changed` events. Login triggers abortable no-store Foundation revalidation; logout/401 invalidates Foundation and data without polling. Request coordination prevents stale responses from overwriting a newer session.
- CMS read-only paths structurally mount no forms, submit handlers, mutation handlers or editable textareas; Operations read-only no longer exposes a no-op queue button. Canonical queue filter/page state is parsed, injected into GET requests, updated in stable URLs and restored on reload/back-forward.
- Verification: `typecheck:web`; formal contracts `105/105`; Chinese copy `2/2`; targeted CMS/Operations `6/6`; final review; runtime error localization; fr-CA format; SEO/security; configured build `396/396` with `195` French HTML; protected artifacts; exactly 42 Dashboard artifacts/no zh route; diff check.
- VoiceOver/NVDA/JAWS, real Windows forced-colors with assistive technology, production QA and real customer/payment/ERP actions were not run. No Backend/schema/migration/public contract/deployment change.
- Next action: coordinator merges F0 commits through this follow-up into Integration and reruns authenticated actor-switch/login/logout/CMS browser fixtures.

## Current State — 2026-07-31 Dashboard F0 acceptance follow-up

- Follow-up parent: `63990d3f17e4c43b7f2db05ef6b4a4a8fb46e5e0`; this is an independent minimal acceptance follow-up and does not amend or rebase the initial F0 commit.
- Closed coordinator findings: breakpoint drawer closure targets the visible active desktop link/main instead of the hidden mobile trigger; all 25 Dashboard tables now provide unique contextual EN/fr captions and empty messages; legacy `?tab=` canonicalizes to stable EN/fr section routes with safe filter/page retention and denied/unknown fail-closed behavior; popstate is observed.
- F0 now reuses `useDashboardData` and the existing `DashboardPanelRouter`/`DashboardPanels` for actual GET-only module data. Central read-only transport rejects non-GET/HEAD, mutation forms/buttons are structurally omitted, and read-only detail drawers remain. Resource state scaffolding includes loading, refreshing, empty/filtered-empty, partial, stale, forbidden, error, degraded and read-only; Operations/Email use independent endpoint settlement for Partial instead of converting failures to empty.
- Data is actor-keyed and cleared on actor change or 401; 401 invalidates Foundation and restores anonymous/legacy login. Foundation requests are abortable and generation-protected, revalidate on focus/visible recovery and explicit Retry/refresh, clear the prior actor/modules while checking, and safely transition permission revoked/flag disabled responses.
- Verification: `typecheck:web`; formal package contracts `95/95`; targeted F0/table `20/20`; final review; runtime error localization; fr-CA formatting; SEO/security; production-configured export `396/396` and `195` French HTML; protected artifacts; 42 Dashboard artifacts and no zh route; `git diff --check`. Controlled fixture rendered real Products GET data through existing panels, canonicalized `?tab=products` to `/dashboard/products`, showed zero mutation forms/requests, and had zero root overflow.
- Table work in `DashboardPanels.tsx` and its source regression originated from the protected shared Frontend worktree input and was preserved, reviewed, and included in the unified gates.
- VoiceOver/NVDA/JAWS, real Windows forced-colors with assistive technology, real authenticated local API cookie, and production QA remain unrun. No Backend/Worker/Prisma/migration/public contract change, analytics event, push, merge, deploy, production write, payment/refund or ERP action occurred.
- Next action: coordinator should merge the initial F0 commit plus this follow-up into `integration/fullstack` and run full-stack authenticated/403/401 fixture verification before promotion.

## Previous State — 2026-07-31 Dashboard F0 read-only shell

- Worktree/branch: `.claude/worktrees/frontend` on `feature/frontend`; bounded parent `ef68208ba92bd2a1ba41adf25d5570045dca40f2`; shared local `main` baseline `1c4fe35301840fe157437f141df0441861c6125c`. This unit is Frontend-only and consumes the already integrated Backend parent contract.
- Added a server-authoritative Simplified Chinese Dashboard F0 presenter using `GET /dashboard/foundation` and the existing `validateDashboardFoundation` for `dashboard-foundation.v1`. No role/email/query/localStorage/header override chooses the shell.
- Foundation enabled state isolates Storefront Header/Footer/Cart/Support/Location/Cookie UI without a flash. Anonymous, flag-disabled and actor-not-allowed states preserve the established EN/fr Dashboard/AppChrome rollback; forbidden, unavailable and invalid responses fail closed with explicit Chinese states and safe Retry where applicable.
- Existing 21 logical pages, English slugs, EN/fr deep links and 42 static Dashboard artifacts remain. No `/zh-CN/dashboard` route or duplicated business panel was added. `DashboardPanelRouter` is the single legacy/new dispatch boundary; F0 read-only mode does not mount mutation panels or handlers.
- Central F0 transport rejects every method except GET/HEAD before fetch. Navigation is projected only from Foundation modules with `readAllowed=true`; unknown/denied modules fail closed. The shell includes grouped navigation, logo, breadcrumb, readiness/read-only banners, actor/role/module scope, disabled future search/work-queue entries and explicit state presentation.
- Accessibility includes stable skip/main landmarks, `aria-current`, conditional mobile dialog mounting, existing `useModalFocus` trap/inert/Escape/focus restore, visible close control, body lock, breakpoint cleanup, independent drawer scrolling, reduced-motion and forced-colors rules. Shared tables now have captions, named focusable overflow regions, column scopes and explicit empty copy; pagination and detail drawers gained accessible labels/focus behavior.
- Verification on Node `25.9.0` (engine warning expected): `typecheck:web`; package contracts `91/91`; final review; error localization; fr-CA formatting; SEO/security; production-configured static export `396/396` with `195` French files; protected artifacts; exact Dashboard artifacts `42`; no zh Dashboard artifact; `git diff --check`. Controlled local fixture browser checks passed no root overflow at 320/390/680/1100/1440 and effective 200%/400% reflow, storefront chrome isolation, keyboard drawer initial focus/Escape/focus restore, and accessibility-tree modal containment.
- Failed attempts retained: initial formal package test imported `.tsx` and failed `75/76`, then passed after moving the predicate to plain TypeScript; one duplicate test import failed `75/76`, then passed; static Chromium first run failed `0/16` because a static server returned expected 404s for Foundation/Auth, so final enabled-shell QA used a controlled same-origin Foundation fixture.
- VoiceOver/NVDA/JAWS, real Windows forced-colors assistive-technology use, real authenticated local API cookie, and business-domain data rendering were not run. The F0 router intentionally renders a structurally read-only state panel rather than mounting legacy mutation-bearing panels; expanding endpoint-specific read-only presenters is F1/follow-up, not this unit.
- No Backend/Worker/Prisma/schema/migration/seed/backfill/public contract change, analytics event, push, merge, deploy, production write, payment/refund or ERP action occurred.
- Integration parent: `ef68208ba92bd2a1ba41adf25d5570045dca40f2`. Next action: coordinator should merge the focused F0 commit into `integration/fullstack` and rerun full-stack API/session fixtures plus browser forced-colors before promotion.

## Current State — 2026-07-31 Late accepted Payment confirmation follow-up

- Parent Frontend tip: `1ad641db06e49c857b1eae547098654ac90aa639`; this is one new minimal follow-up and does not amend, rebase or rewrite the existing six-commit chain.
- A delayed `{ accepted: true }` confirmation no longer rewrites the latest authoritative Payment Session to `pending`. `preservePaymentSessionAfterAccepted` is typed by the shared `CheckoutSession`, returns `undefined` unchanged, and returns every existing Session object unchanged, preserving status, `orderId`, and all other fields.
- `applyAcceptedPaymentConfirmation` owns the accepted response UI update: it retains the current Session through the pure updater, shows the existing confirmation-processing message, and clears processing. It does not call or restart the poller, create a timer, issue a request, or alter provider/session error channels.
- Old-fail evidence: with the previous `{ ...current, status: "pending" }` semantics, the new source contract plus status/deferred tests failed `3/9`, including `paid → pending`. Current tests pass all shared statuses plus deferred `paid`, `reconciliation_required`, `refund_processing`, and `refunded` races while preserving `orderId`, rendered state, the single poller start, and request count.
- Verification on Node `25.9.0` (repository engine warning expected): accepted-state/confirmation/PaymentClient targeted tests `10/10`; `typecheck:web`; Package/protected/API-client/Payment/Order Detail contracts `74/74`; final review; fr-CA display; error localization; SEO/security; production-configured static export `396/396` with `195` French files; Chromium current-tree `40/40`; `git diff --check`; staged diff check; and secret scan passed.
- Independent Code Review finished with Blocker `0`, Medium `0` after requesting and receiving the deferred accepted handler harness. It confirmed no status rollback, no order-link loss, and no poller restart or second request chain.
- No Backend/Worker/Prisma/migration/public API contract/Dashboard change, push, Integration merge, deployment, production write, payment/refund action, or stash operation occurred.
- Remaining Backend contracts are unchanged: runtime Checkout capabilities, canonical public DealerLocation identity, final dealer in CheckoutSession/Order, and authoritative payment/refund disposition.
- Next action: coordinator should receive the new Frontend tip and rerun the controlled late-accepted browser scenario before the Integration merge gate. Dashboard Phase 0, including traffic analytics, remains deferred until the four standard lines are unified again.

## Previous State — 2026-07-31 Payment lifecycle and Order Detail follow-up

- Parent Frontend tip: `b74036d841b6e016bf15004ccf200b9468643620`; this is one new minimal follow-up and does not amend, rebase or rewrite the existing five-commit chain.
- Payment polling now classifies the shared `CheckoutSessionStatus` exhaustively. Pollable statuses are `pending`, `reconciliation_required`, `refund_pending`, `refund_processing`, and `refund_failed`; terminal statuses are `paid`, `failed`, `expired`, and `refunded`. The two sets are type-constrained by `CHECKOUT_SESSION_STATUSES`, checked complete and disjoint at runtime, and preserve the existing single timer/request, visibility, bounded retry, permanent-error, queued-Retry, callback-reentry, and consumer-error protections.
- Regression coverage verifies `reconciliation_required → paid`, `refund_pending → refund_processing`, `refund_processing → refunded`, `refund_processing → refund_failed`, and `refund_failed → refund_pending`; every terminal status stops timers and visibility reentry. Transitional-state polling errors now remain visible with a Retry control after the bounded budget is exhausted.
- The Payment terminal live region renders the complete EN/fr announcement directly. Rendered-markup tests verify expired and failed messages include their safe Checkout recovery direction; initial terminal loads remain silent, hidden-tab transitions remain delayed until visible, and terminal heading focus is preserved.
- Order Detail summary selectors are limited to `.order-summary-line` direct children. Product names have `min-width: 0`, normal wrapping and `overflow-wrap: anywhere`; the amount remains `nowrap`. Contract tests verify the actual DOM relationship and selector scope.
- Browser geometry on the final production CSS passed at desktop, 390px, 320px, 200% and 400% zoom with long unbroken English and French product names: root/line horizontal overflow `0`, product copy wrap-capable, and both CAD amount formats remained intact and readable.
- Verification on Node `25.9.0` (repository engine warning expected): `typecheck:web`; Package/protected/API-client/Payment/Order Detail contracts `70/70`; final review; fr-CA display; error localization; SEO/security; production-configured static export `396/396` with `195` French files; Chromium current-tree `40/40`; `git diff --check`; staged diff check; and secret scan passed. Independent Code Review and Accessibility review finished with Blocker `0`, Medium `0` after one hidden transitional Retry finding was fixed and re-reviewed.
- No Backend/Worker/Prisma/migration/public API contract change, push, Integration merge, deployment, production write, payment/refund action, or stash operation occurred.
- Remaining Backend contracts are unchanged: runtime Checkout capabilities, canonical public DealerLocation identity, final dealer in CheckoutSession/Order, and authoritative payment/refund disposition.
- Next action: coordinator should receive the new Frontend tip, then run Integration live Payment lifecycle and EN/fr accessibility scenarios before promotion.

## Previous State — 2026-07-31 Payment reentry test cleanup follow-up

- Parent Frontend commit: `7193c1e1ec29023f77d88750d84ff04503410820`; this is a test-only cleanup follow-up.
- The terminal callback-reentry regression now explicitly stops its poller before assertion, so a regressed implementation fails quickly instead of sustaining an unbounded microtask chain after the failure is already observable.
- Production Payment behavior is unchanged. No Backend/Worker/Prisma/migration changes, push, Integration merge, deployment, payment/refund action or stash operation occurred.
- Next action: coordinator should review and receive the latest Frontend tip.

## Previous State — 2026-07-31 Payment callback-retry race follow-up

- Parent Frontend commit: `2fff3ef225aba379ce9202767cee8c4c7997c21c`; this is a new minimal follow-up.
- Closed the final synchronous re-entry path: `retry()` no longer resets terminal/error state while a request is in flight, so a terminal `onSession` callback cannot reopen polling before `finally` evaluates its queued Retry.
- Added a regression where a terminal `paid` consumer synchronously calls `retry()`; request count remains one.
- No Backend/Worker/Prisma/migration changes, push, Integration merge, deployment, payment/refund action or stash operation occurred.
- Next action: coordinator should review and receive the latest Frontend tip, then run Integration Payment scenarios before promotion.

## Previous State — 2026-07-31 Payment queued-retry race follow-up

- Parent Frontend commit: `eed598bfc6e41f3814b9d676e64296c3cef49903`; this is a new minimal follow-up, not an amend or rebase.
- Closed the late independent-review race: an explicit Retry queued while a Payment session request is in flight is now discarded when that request resolves to any non-pending terminal state. Both the request entry point and queued-Retry continuation guard `completed` and `stoppedByError`.
- Added a deterministic regression where an in-flight request receives Retry, then resolves `expired`; request count remains one and no timer remains.
- No Backend/Worker/Prisma/migration changes, push, Integration merge, deployment, payment/refund action or stash operation occurred.
- Next action: coordinator should review and receive the Frontend tip containing this follow-up, then rerun live Payment visibility/Retry/terminal scenarios in Integration.

## Previous State — 2026-07-31 Payment polling coordination follow-up

- Parent Frontend commit: `d6c90affbcc77d247a402053f612ef36ceaf6dcc`; this is a new minimal follow-up, not an amend or rebase.
- Payment session polling is now isolated in a deterministic single-chain controller. Normal polling continues only after a successful `pending` response. HTTP 403/404 and runtime-validation failures terminate automatically; transient network/5xx failures receive bounded 5s/10s/20s retries and then stop.
- Explicit Retry and visibility transitions cancel pending timers and cannot create concurrent request chains; a Retry requested during an in-flight call schedules exactly one follow-up.
- Session-load errors are separate from provider/action messages. Successful session GET clears only session-load errors. Moneris script/provider failures and confirm/simulate errors persist until their own action starts or resolves.
- An asynchronous `pending` to `expired`/`failed` transition emits a persistent assertive EN/fr live announcement and moves focus to the terminal-state heading. Initial terminal render does neither, preventing duplicate first-load announcements.
- Targeted tests cover 403/404 termination, malformed response termination, bounded transient recovery, retry/visibility single-chain behavior, session/provider/action error isolation, pending recovery, terminal EN/fr announcements, and terminal focus/live markup.
- Package contracts now include the Payment poller and component state-contract suites.
- Remaining Backend contracts are unchanged: runtime Checkout capabilities, canonical DealerLocation identity, final dealer, and authoritative payment/refund disposition. Cart currency and duplicate provider-transaction reconciliation are marked resolved in the shared baseline.
- No Backend/Worker/Prisma/migration changes, push, Integration merge, deployment, payment/refund action or stash operation occurred.
- Next action: rerun Integration live Payment scenarios, including denied/missing session, malformed fixture, transient recovery, tab hide/show, Moneris load failure, confirm failure and pending-to-expired transition, before promotion.

## Previous State — 2026-07-31 Auth and Commerce experience correction

- Canonical branch/worktree: `feature/frontend` in `.claude/worktrees/frontend`; shared start baseline `ce349af8e2d085a08f447c52134071289af00ffb`, already containing verified Account/Cart Integration evidence.
- A taste-guided preserve redesign corrected Auth, Cart, Checkout, Payment, public Order and Account Orders task surfaces without changing routes, Backend, schemas or the VanStro brand system. Design read: trust-first commerce, variance `4`, motion `2`, density `5`.
- Removed the global `main` 100dvh height ownership and fixed Footer spacing on Auth/Commerce/Account task pages. Auth pages now use bounded desktop centering, compact mobile rhythm, and a meaningful secure-link loading state instead of a blank card.
- Commerce pages use a compact shared hero and task-surface background. Cart removes repeated fulfillment/checkout-preview content, reduces its summary to authoritative subtotal plus one inventory/dealer explanation, uses text secondary actions, and has a true full-width 320-480px action row.
- Checkout summary is denser on mobile and uses shorter payment/fulfillment labels. Inventory-refreshing now appears before the action with a clear heading and `Check inventory again` retry; the generic secondary button became a lightweight return link. Pre-submit copy no longer claims inventory is already reserved.
- Checkout storage access is fail-open with in-memory token/payment-meta fallback, so a successful server reservation is not mislabeled as a reservation failure when sessionStorage is unavailable.
- Payment now distinguishes loading failure from loading, offers retry, separates failed from expired sessions, keeps pending-status polling active with visibility-safe timer cancellation, clears recovered poll errors, and gives pending/success messages non-error semantics.
- Order detail stops polling all known terminal order states, keeps Account fallback polling, removes current-catalog prices from local historical orders, shows SKU/quantity and authoritative line totals, uses neutral unknown-state copy, and presents status events as completed facts without invented source labels. Account order cards remove lower-value payment/destination/tracking facts to reduce mobile height.
- Sticky task sidebars/summaries now account for the full desktop Header and compact Header, cap short-viewport height, and reset overflow below 980px. Forced-colors focus outlines cover Account nav, quantity, delete and order-link controls.
- Verification on Node `25.9.0` (engine warning expected): `typecheck:web`, contracts `41/41`, final transactional review, fr-CA formatting, runtime error localization, SEO/security, production-configured static export, SEO/French/404/protected artifacts, Chromium current-tree `40/40`, and `git diff --check` passed.
- Browser gates cover static/anonymous states; full live payment/provider behavior, real ERP freshness recovery, screen readers, Windows forced-colors and 200/400% manual zoom were not run. No push, deployment, production write, migration, payment/refund or stash operation occurred.
- Backend contract follow-ups remain: runtime Checkout capabilities, canonical public DealerLocation identity, final dealer in session/order DTOs, and authoritative order payment/refund disposition.
- Recommended payment/refund disposition contract (Backend owner, coordinated with Frontend): add `paymentDisposition` to Account/Commerce Order DTOs with stable enum `unpaid | pending | paid | reconciliation_required | refund_pending | refund_processing | refunded | refund_failed`; add `paymentUpdatedAt`; optionally add safe `providerReference` only when customer-displayable. Acceptance scenarios: pending card confirmation, paid card/manual order, reconciliation-required duplicate/provider ambiguity, requested refund, provider-processing refund, confirmed refund, failed refund, and an unknown future enum that Frontend renders as unavailable without exposing internals. Order detail/history must reflect the authoritative disposition after refresh without inferring it from fulfillment status.
- Next action: merge this Frontend commit into `integration/fullstack`; run live EN/fr Auth, non-empty Cart/Checkout inventory-refresh retry, Payment session/polling, Account Orders and public Order Detail at 390px plus desktop before promotion.

## Previous State — 2026-07-30 Account coordination follow-up

- Parent Frontend tip: `89c90890c203f468e89c4d12d6695e083da38328`; Integration/Main remain at `083c52030c7f2e197bb716a3770ccd899e6b5444` pending this follow-up.
- Closed both coordinator-confirmed range findings: Address Edit now focuses and scrolls the first editable field instead of the section heading before the saved-address list; empty Orders success state no longer renders the invalid `1–0 of 0` range badge.
- Address Cancel still restores focus to the originating Edit button, and delete-confirmation focus behavior is unchanged.
- Verification on Node `25.9.0` (engine warning expected): `typecheck:web`, package contracts `41/41`, final transactional review, fr-CA formatting, and `git diff --check` passed.
- No Backend/Worker/Prisma/migration change, push, Integration merge, Main promotion, deployment, production write, payment/refund, or stash operation occurred.
- Next action: coordinator should merge the full Frontend range through this follow-up commit into `integration/fullstack` and rerun the previously planned full-stack and interactive Account/Cart verification.

## Previous State — 2026-07-30 Cart content-depth work unit

- Worktree/branch: `.claude/worktrees/frontend` on `feature/frontend`; parent Account commit `742bb88e327b9a9826032e3595ff5b7093895c33`; shared `main` remains `083c52030c7f2e197bb716a3770ccd899e6b5444`.
- Cart now follows the richer retail information hierarchy from the supplied references without copying their branding or inventing unsupported commerce promises. Product rows foreground model/SKU, dimensions, authoritative unit/line totals, quantity, and checkout-stage fulfillment validation.
- Order summary distinguishes the API-authoritative products subtotal from delivery and tax values that are calculated only at Checkout, previews the real next steps, and explains that Cart does not reserve inventory while Checkout creates a time-limited reservation.
- Requested dealer wording remains explicitly non-final. Copy says Checkout validates stock against the requested dealer and fulfillment preference; final coordination follows dealer acceptance. No arrival date, free delivery, PayPal, financing, exact store stock, save-for-later mutation, or return promise was added.
- EN/fr-CA Cart copy is centralized and locale-formatted; French delivery/tax agreement and plural rules were reviewed. The checkout preview retains list semantics and quantity mutations avoid duplicate live-region announcements.
- Verification on Node `25.9.0` (engine warning expected): `typecheck:web`; package contracts `41/41`; final transactional review; fr-CA formatting; SEO/security; production-configured static export; Chromium current-tree `40/40`; SEO artifacts `390/308/140-per-locale/300`; French HTML `195`; 404/static fallback; protected artifacts; and `git diff --check` passed.
- Live non-empty Cart browser QA was attempted against the existing local API, but the currently running API did not allow the alternate dev-server origin and a replacement API process could not start because this worktree lacked the built `@vanstro/db` dist dependency. Static/anonymous Cart and the 40-case Chromium regression passed; full non-empty interactive Cart remains an Integration verification item.
- No Backend/Worker/Prisma/migration changes, push, deployment, production write, real payment/refund, or stash operation occurred.
- Next action: merge the focused Cart commit normally into `integration/fullstack`, then run authenticated/guest non-empty Cart quantity/remove/Checkout interaction against the Integration API before promotion.

## Previous State — 2026-07-30 Account Center depth work unit

- Canonical worktree/branch: `.claude/worktrees/frontend` on `feature/frontend`.
- Work-unit parent and shared `main` baseline: `083c52030c7f2e197bb716a3770ccd899e6b5444`; `main`, `integration/fullstack`, `feature/backend`, and `feature/frontend` matched at startup.
- Account Overview, Profile, Addresses, Orders, and Favorites now use a task-focused workspace with denser bilingual content grounded only in existing Account APIs. The UI adds profile/default-address/recent-order summaries, profile readiness and security links, complete address details and guidance, paginated order context, and favorites planning guidance.
- Existing Account contracts are used without Backend changes. `getAccountOrders` now accepts `page/pageSize`; Account address and order payloads have runtime validators, including nested money, address, item, shipment, status-event, and date fields.
- Account profile, addresses, orders, and overview requests are tied to authenticated user identity and guarded by request generations, preventing stale responses or data from a previous customer session from reappearing after an identity transition.
- Orders display locale-formatted ranges and pagination, preserve results while refreshing, clamp out-of-range pages, and announce page changes. Favorites keep cart and saved-product mutation state separate with action-local failure feedback.
- Address edit/delete flows move and restore keyboard focus, retain delete progress while the confirmation remains mounted, and provide stable status feedback. Account focus indicators use a visible solid outline in normal and forced-colors modes; loading shimmer respects reduced motion.
- Verification on local Node `25.9.0` (repository engine warning expected): `typecheck:web`; package/protected/API-client contracts `41/41`; final transactional review; SEO/security; runtime error localization; fr-CA formatting; production-configured static export; SEO `390 routes / 308 indexable / 140 PDPs per locale / 300 SKUs`; French HTML `195`; 404/static fallback; Careers/Contact privacy; protected artifacts; Chromium current-tree `40/40`; and `git diff --check` all passed.
- Browser regression covered static/anonymous route states. No live authenticated API session, screen-reader session, production QA, Backend/Worker/Prisma/migration change, push, deployment, production write, real payment/refund, or stash operation occurred.
- Integration status: the Account work-unit commit is created on `feature/frontend` with this handoff; Integration merge and full-stack verification remain coordinator-owned and pending.
- Next action: merge the focused Frontend commit normally into `integration/fullstack`, run full-stack/API contract and authenticated Account browser verification there, then update the Integration handoff/checkpoint before any Main promotion.

## Previous State — 2026-07-30 production full-stack 3904a440

- Frontend release source `3904a4404ada5b0107a08d5b9c71a3100f22b447` / product baseline `e9bc0a2a17d094e859fee5fa065b318b15d0ad7f` is deployed.
- Active production root: `/www/wwwroot/vanstro.ca/releases/vanstro-3904a440-20260730`.
- Deployed artifact: 5,060 files, 393 HTML, 11 PDFs; homepage 64,319 bytes, SHA-256 `4ecd9c1a4df169a8db245b928abf7583262c043dee522bf7f4a7193f0572128d`.
- EN/fr Homepage, Products, representative PDP, Login, Payment, 404 and PDF checks passed; Payment EN/fr retain `no-referrer`.
- Follow-up Frontend work fixes the authenticated Header layout defect: desktop uses an explicit four-action grid, widths at or below 1220px use the compact Header, and mobile quick actions render as stable anonymous 3-up or authenticated 2×2 layouts. EN/fr visible labels and full accessible names are preserved.
- Previous Fullstack9/Fullstack8 releases remain available for rollback. Detailed checkpoint: `tasks/checkpoints/production-2026-07-30-fullstack-3904a440.md`.

## Authenticated Header responsive fix — 2026-07-30

- `SiteHeader` now marks authenticated desktop and mobile action groups explicitly instead of placing four controls into three desktop columns.
- Desktop authenticated actions use four fixed 64px slots; Account and Logout use concise locale-aware visible labels with complete `aria-label` text. Logout has the same icon/visual rhythm as Account, Saved and Cart.
- Header compact mode begins at 1220px, before the full logo/search/dealer/four-action grid can exceed its container.
- Mobile quick actions preserve anonymous `Sign in / Saved / Cart` as three equal controls and authenticated `Account / Sign out / Saved / Cart` as a stable 2×2 grid. The logout button now shares the same card and minimum-target styles as links.
- Verification on local Node `25.9.0` (repository engine warning expected): `typecheck:web`, package/protected/API-client contracts 40/40, final transactional review, production-configured static export, `git diff --check`, and Chromium current-tree regression 40/40 passed. Browser geometry at 1200px confirmed compact Header/no overflow; 1440px four-action geometry stayed within the Header container.
- No Backend/Worker/Prisma/migration changes, push, deployment, production write, or stash operation occurred.

## Previous State — 2026-07-29 Frontend API contract cycle

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Worktree/branch: `.claude/worktrees/frontend` on `feature/frontend`
- Current Frontend HEAD at cycle start: `d0632581aeeb0d6839165dedc27e8fb27c0d78d9`
- Shared local baseline at cycle start: `main`, `integration/fullstack`, and `feature/backend` at `d0632581aeeb0d6839165dedc27e8fb27c0d78d9`; all four standard branches had tree `86ef0be1c4e0ad48d0cf0947217f5e7730c141ba`.
- Startup inspection found the Frontend worktree completely clean. The four expected API-boundary files had zero diff from HEAD, with no staged, unstaged, untracked, generated, or adjacent work-unit changes. This differs from the incoming task description, so no missing change was reconstructed or overwritten.
- The repository-closure state below is a historical snapshot. Its old Frontend tip, shared baseline, and frozen wording must not override current Git facts.
- The accepted local canonical presentation remains the verified 4177 source/build combination; production remains the separate Fullstack9 release.
- Local commits have not been pushed. This cycle does not authorize deployment, production migration, payment/refund, stash operations, or standard branch/worktree cleanup.

## Frontend API contract boundary work unit — 2026-07-29

- Startup state: `feature/frontend` began at `d0632581aeeb0d6839165dedc27e8fb27c0d78d9`; the four expected API files had zero diff and there was no pre-existing Frontend work to recover.
- Public and `INTERNAL_ERROR` responses are sanitized at the API-client boundary. Unrecognized/internal server messages and field strings are discarded instead of being retained for customer display; exact maintained public errors still localize through stable codes/message fixtures.
- Session-storage access is fail-open. Getter/read/write/remove failures no longer prevent requests or turn an already successful Cart mutation into a customer-visible failure.
- Auth events are browser-guarded, so login/register/logout keep their original result in Node/SSR tests. Authenticated Cart responses without `meta.cartToken` retire the consumed guest token after Backend merge; all configured API requests retain `credentials: include` and the guest token remains an `X-Cart-Token` header.
- Cart mutations enforce the Backend `1..999` integer boundary before fetch, preserve selected SKU identity, and validate the response envelope once. The unused product-ID-only Cart add helper was removed because it could omit variant identity.
- Runtime validation now covers both Backend pagination shapes, declared meta fields, nonnegative money/amount cents, all nine Prisma payment-session statuses from one shared constant, consistent Checkout currencies, valid expiry/token/order identifiers, and structured shipping addresses.
- Website product validation now constructs validated optional fields instead of spreading unchecked wire data. It accepts the real public `category: string` shape as well as the older object shape, validates assets/specifications/price/rating/reviews, and the server mapper handles either category representation.
- Payment pages now emit `Referrer-Policy: no-referrer` while continuing to scrub the Backend-required guest access token from the URL after hydration.
- Functional commit: `d24dcf09612f539972edcb43b0b57944bcc9a1fe`; normal Integration merge: `571e8897404e743d82d06292656e7d3fe39481b4`.
- Verification on Node `22.22.2`: package/protected contracts 40/40; direct API-client tests 6/6; full TypeScript; SEO/security; runtime error localization; final transactional review; fr-CA display formatting; DB 3/3; Backend API 106/106; Worker 11/11; Prisma validation; clean production-configured static export 396/396; 195 French HTML files; SEO/fr/404/privacy/protected artifact gates; Chromium 40/40; 5,060 exported files including 393 HTML and 11 byte/hash-verified PDFs.
- Detailed checkpoint: `tasks/checkpoints/frontend-2026-07-29-api-contract-boundary.md`.
- Evidence commit: `69319575e3317070a90a2aa94cf1c9e5e6d32e3a`; Integration merges: `571e8897404e743d82d06292656e7d3fe39481b4` and `42640b832444c07dabcbc9fb813cedea7ccabf05`.
- The verified work and checkpoint are present in local `main` through Integration evidence commit `c8971c32726c0ca64e28e6c4919f845487b7a057`. No staging, production write checks, real payment/refund, ERP connectivity, production migration, deployment, or push occurred.

## Backend contract required

Resolved in the verified shared baseline:

- Canonical Cart/Price currency enforcement and mixed-currency prevention are complete.
- Duplicate provider-transaction reconciliation handling is complete.

Remaining coordinated contracts:

1. Replace guest Payment/Order access query tokens with a header or HttpOnly/session-bound capability. Until then, Payment pages use `no-referrer` and scrub the query after hydration.
2. If field-level public errors are required, define stable field error codes and locale ownership. Backend currently emits no canonical `fields`, so Frontend discards arbitrary server field strings.

## Fullstack9 presentation reconciliation milestone — 2026-07-29 (historical execution record)

- Recovery worktree: `.claude/worktrees/presentation-reconciliation`
- Recovery branch: `recovery/fullstack9-presentation-on-current`
- Recovery parent: `0e45d23b7c3c021b9ded511b7d2abe18df99a5b7`
- Accepted local presentation: `http://127.0.0.1:4177`, compared against the immutable Fullstack9 snapshot at `http://127.0.0.1:4176`.
- Scope: 12 business source files reconcile unified secondary heroes and compact Cart/Checkout/Payment presentation while preserving current canonical content and contracts. `CheckoutClient.tsx` and `PaymentClient.tsx` remain byte-identical to the parent.
- CSS additions are selector-scoped to `.unified-content-hero*`, `.checkout-layout*`, and `.payment-layout*`; no global palette or shared `.form-grid.two` rule was changed.
- Complete fr-CA, exactly three Careers roles, Resource Center `2/8/1`, 11 PDFs, three Planning Guides, Header, Footer, Homepage, Catalog/PDP, Account, Password Reset, Dashboard, Cart authoritative identity/totals, and `refund_processing` remain protected.
- Node `22.22.2` verification passed full TypeScript, DB 3/3, API 106/106, Worker 11/11, package/protected contracts 30/30, source gates, production-configured static export, artifact gates, PDF hashes, and Chromium 40/40.
- Browser geometry matched Fullstack9 for approved unified heroes and compact Checkout shell. French Dealer Program has no root horizontal overflow; its taller mobile hero is the accepted result of preserving complete French copy.
- Detailed evidence: `tasks/checkpoints/frontend-2026-07-29-presentation-reconciliation.md`.
- At handoff update time the recovery commit, Integration merge, and Main fast-forward were pending. No push, deployment, production migration, real payment/refund, stash operation, or domain-branch modification occurred.
- Next action: create the bounded local recovery commit, merge it normally into `integration/fullstack`, rerun Integration gates, then promote local `main` only by strict fast-forward.

## Canonical content recovery milestone — 2026-07-28

- Recovery worktree: `.claude/worktrees/site-recovery`
- Recovery branch: `recovery/canonical-site-20260728`
- Recovery source baseline: `ba212926076291147dc332b352307d93fc23a567`
- Scope: isolated Frontend content/assets recovery from a separate Recovery branch; it was merged into `integration/fullstack` by merge commit `b0f34277436c7339a78f63287b7f61a5d1483616` after full-stack verification. The `feature/frontend` branch was not modified or synchronized.
- Maintained source now contains exactly three Careers roles in both EN/fr-CA, the Resource Center `2 catalogs + 8 installation guides + 1 warranty`, the three existing planning-guide routes, and 11 tracked local PDFs.
- PDF provenance is deterministic: filename, exact bytes, page count, SHA-256, historical Git source commit, and production URL base are recorded in `qa/fixtures/canonical-pdf-manifest.json`; tracked and clean-export copies all passed.
- About and Contact were not rewritten. Their complete local fr-CA content, Careers topic/privacy disclosure, dealer routing, support email/phone, head-office facts, and MB01 contact remain intact.
- Careers and Resource Center fr-CA intentionally improve the current production fallback while preserving English business facts. No unsupported salary, benefit, hiring guarantee, or legal claim was added.
- Recovery-branch verification passed 14/14 package/protected contracts. Integration verification at `b0f3427` passed frozen install, Prisma generation, full typecheck, DB 3/3, API 106/106, Worker 11/11, combined package contracts 30/30, final review, SEO/security, error localization, fr-CA format, Careers/Contact privacy, clean production API-driven build, SEO/French/404/privacy/protected artifact gates, and Chromium 40/40.
- Clean build produced 5,060 files: 393 HTML, 195 French HTML, and 11 PDFs. SEO inventory remained 390 application routes, 308 indexable URLs, 140 PDPs per locale, and 300 catalog SKUs.
- Protected Account/Cart/Checkout/Payment/Dashboard source blobs remain identical to `ba21292`; required route artifacts, including 20 Dashboard sections in both locales, remain present.
- Detailed evidence: `tasks/checkpoints/frontend-2026-07-28-canonical-content-recovery.md`.
- Performed: normal two-parent merge into `integration/fullstack` and full-stack verification. Not performed: push, deployment, production migration, real payment/refund, release deletion, stash operation, or worktree cleanup.
- Next action: strict fast-forward local `main` after the Integration checkpoint commit; any future canonical full-site release requires separate deployment authorization and a new production checkpoint.

## Current state

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Development branch: `feature/frontend`
- Parent HEAD before the current frontend delivery: `85ff774c9cc6a5e569032e8a1fdd2b254e1ded87`
- Shared `main` baseline: `85ff774c9cc6a5e569032e8a1fdd2b254e1ded87`
- Latest committed frontend delivery: `f2dc1051abe1c50b13ee6b58da14302d99a0dfe1` (`fix: preserve authoritative cart identity and totals`).
- The Cabinet Accessories catalog-filter fix is contained in the `feature/frontend` commit that includes this handoff.
- Current frontend/integration/main code baseline before these frontend deliveries: `ba212926076291147dc332b352307d93fc23a567`
- Original Commerce integration baseline: `d99da7b8ccdaa378209873066a99f272881dd893`
- Baseline source commit from the former independent workspace: `a36486471b225d63745ffb8d993f6f841fa89a5f`
- Last verified: 2026-07-28
- The former frontend session supplied a read-only handoff after the initial continuity commit. Its claims have now been reconciled against current `main`; only findings confirmed in current source are listed as active work below.

## Current frontend baseline

The following state is present in local `main` and was jointly verified:

- Account experience has dedicated overview, profile, addresses, orders, favorites, login, registration, forgot-password, and reset-password routes.
- Account UI uses shared page framing, explicit loading/error/empty states, field-level errors, ARIA associations, and EN/fr-CA copy.
- Favorites has account and storefront flows, authenticated recovery states, and an EN/fr-CA account route.
- Cart, order detail, order lookup, and payment screens use unified commerce state components and clearer retry/error/empty handling.
- Catalog server reads support complete offset pagination, missing-page protection, deterministic ordering, and production fail-closed behavior instead of silent fixture fallback.
- PDP and catalog pages preserve EN/fr-CA counterparts.
- Password Recovery uses the current hardened API contract, keeps the reset token only in memory after hydration, removes it from the address bar, and retains `no-referrer` on reset pages.
- Payment polling retains the accepted-confirmation message while provider state remains `pending`, and paid guest orders preserve the token under the real order ID.
- Existing Dashboard Overview + 20 EN + 20 fr-CA section routes remain in the shared baseline.
- Existing Careers, Resource Center, Contact, About, Checkout, and Payment content was preserved by the integration build gates.
- Release fix `ba21292` extends the existing Payment session contract/UI for `refund_processing` and refreshes canonical Account data after Profile PATCH, preserving email and user identity without discarding prior UI work.

## Verified source milestone

- Integrated frontend/full-stack commit: `d99da7b8ccdaa378209873066a99f272881dd893`
- Parent backend/production-code baseline: `8f001ffe840cc8423322daf22dbed8b2ecad0ad7`
- Integration method: `a364864` was cherry-picked because the former repository had no common Git ancestor. Its frontend behavior was retained while duplicate or regressive backend changes were excluded.

## Verification at shared baseline

- Full TypeScript: passed
- Package contracts: 9/9
- Static locale route verification: 52 static pairs / 3 dynamic families
- SEO/security source gate: passed
- Functional consent storage: passed
- Final transactional review: passed
- Product identifier verification: 140 products; vanity/trim/handle checks passed
- Runtime error localization: 52 maintained backend literals and dynamic commerce messages passed
- fr-CA display formatting: passed
- Static export: 396/396 pages
- French artifacts: 195
- SEO artifacts: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs
- 404 artifacts and static fallback: passed
- Careers/Contact privacy source and artifact gates: passed
- Chromium current-tree regression: 36/36 with `VANSTRO_QA_EXTERNAL_API_ORIGINS=https://vanstro.ca`

The initial Chromium run reported 0/36 solely because the harness default still classified the current same-site `https://vanstro.ca/api/v1` requests as unexpected external traffic. DOM, language, canonical, hreflang, overflow, hydration, and console assertions had passed. The configured rerun passed 36/36.

## Current contract baseline

No unresolved Backend contract was required for the verified `d99da7b` baseline.

Current password-recovery contract:

- Forgot request: `{ email, locale }`
- Forgot response data: `{ ok: true, message }`
- Reset request: `{ token, password }`
- Reset response data: `{ ok: true }`
- Invalid/expired reset code: `AUTH_RESET_INVALID`
- EN/fr email templates: `password_reset` / `password_reset_fr`

If future frontend work needs a contract change, document it here before modifying Backend-owned paths.

## Integration status

- Latest verified frontend release-fix commit: `ba212926076291147dc332b352307d93fc23a567`
- Present in local `main`: yes
- Present in `integration/fullstack`: yes
- Pushed: no
- Production frontend release: `working-tree-20260728-fullstack9-commerce-ui`
- Deployment method: copied immutable fullstack8, then applied a 3,663-file Commerce overlay; protected Careers/Resource Center/About/Contact content and 11 PDFs were retained.
- Overlay archive SHA-256: `796bf0ecada164e29a32ff087c74df122c14f706e43512c6da0f9ce2cb9b0f6f`
- No Backend deploy or database migration was performed.

## Former-session reconciliation

The original frontend scope was Catalog/PDP API-driven static generation followed by the first full Account/Orders/Cart experience pass. The committed implementation was integrated and reverified in the canonical repository. These old-workspace conclusions were explicitly superseded during integration:

- Do not preserve a reset bearer token in SiteHeader language-switch URLs; current code removes it from the address bar and keeps it only in memory.
- Do not restore the old `20260730270000_password_reset_tokens` migration or `revokedAt` model. It duplicated the deployed table and used incompatible UUID foreign-key types. Current invalidation uses the authoritative model and `usedAt` semantics.
- Password-reset URLs use validated `PUBLIC_APP_URL`; `VANSTRO_STOREFRONT_BASE_URL` is not the current contract.
- The current forgot response is `{ ok: true, message }`, and the request includes locale.
- Password Reset DB/API/Worker tests, EN/fr template provision, French artifacts, Dashboard coexistence, and browser gates were completed after the former session ended.

The former workspace has no uncommitted business code after `a364864`. Its modified `CLAUDE.md`, old session handoff, and CP60 audit are historical inputs only and must not overwrite canonical continuity files.

## Current frontend delivery

Cart authoritative identity and totals are implemented in the current `feature/frontend` delivery:

- `CartItem.skuId` is retained by the frontend contract and runtime validator.
- The storefront Cart view model preserves `cartItemId`, `skuId`, SKU code, API `unitPrice`, and API `lineTotal`.
- Quantity and removal mutations directly target the cart-item endpoint; the old product-ID refetch/selection path is removed.
- Cart and pre-checkout summary render API-authoritative totals and currencies instead of recalculating or forcing CAD.
- The add-to-cart drawer uses the authoritative line total for a new variant and the before/after authoritative line-total delta when adding to an existing variant.
- Runtime validation rejects non-positive/non-integer quantities and line/subtotal currency mismatches before Cart state is accepted.
- No Backend-owned path or public endpoint was changed; the existing wire response already supplied the required identity and totals.

Verification for this delivery:

- `pnpm run typecheck`: passed across web, DB, API, Worker, and CLI.
- `pnpm run test:package-contracts`: 14/14 passed, including Cart variant identity, authoritative totals, invalid quantity, mixed-currency cases, new-line add amount, and existing-variant line-total delta.
- `pnpm run qa:seo-security`: passed.
- `pnpm run test:final-review`: passed.
- `pnpm run qa:error-localization`: passed.
- `pnpm run qa:fr-ca-display-format`: passed.
- `VANSTRO_WEBSITE_API_BASE_URL=https://vanstro.ca/api/v1 VANSTRO_QA_EXTERNAL_API_ORIGINS=https://vanstro.ca pnpm run build:pages`: passed.
- `git diff --check`: passed.
- The first unconfigured `pnpm run build:pages` attempt failed as designed because `VANSTRO_WEBSITE_API_BASE_URL` was absent; the configured rerun passed.
- Runtime browser interaction, API/DB integration tests, and production QA were not run. No push, merge to `main`, deploy, Backend change, or database migration was performed.
- Commands ran under local Node `v25.9.0`; the repository requires Node `>=22 <23`, so pnpm emitted an engine warning even though all recorded gates above passed.

Cabinet Accessories catalog-filter follow-up in the current `feature/frontend` delivery:

- EN/fr-CA homepage links now use the explicit stable `subcategory=accessories` facet instead of the hidden `q=Accessories` text query.
- Catalog subcategory state is URL-backed, validated against canonical subcategory IDs, restored by browser back/forward, and visibly reflected by the Accessories checkbox.
- Switching the top-level category removes the stale subcategory parameter; Clear filters removes it while preserving the selected top-level category.
- `pnpm run test:package-contracts`: 16/16 passed, including subcategory query parse/serialize coverage.
- `pnpm run typecheck:web`: passed.
- Static export with `VANSTRO_STATIC_EXPORT=true`, `NEXT_PUBLIC_DEMO_READ_ONLY=true`, and the production read-only API passed; EN/fr artifacts contain `subcategory=accessories` and no `q=Accessories` link.
- Chromium static-artifact QA passed: EN and fr-CA homepage entry each selected Accessories and showed 13 results; category switch cleared the facet/URL; French Clear changed 13 results to 121 and browser Back restored Accessories/13.
- A clean static export requires `VANSTRO_STATIC_EXPORT=true`; omitting it produced no `out` directory and the localization wrapper failed. This was a command-configuration failure, not a source/build failure; the correctly configured export passed.
- No Backend contract, push, merge to `main`, deploy, or database migration was performed for this follow-up.

Catalog business-order follow-up in the current working tree:

- Default “Best match” is now deterministic and independent of API return order: category business priority → product-family priority → approved Bathroom vanity merchandising pins → canonical SKU → ID.
- Kitchen core cabinets precede wall/tall/specialty families, and Accessories remain after primary cabinet families; unknown categories and subcategories sort after known business groups.
- Search and facet subsets retain the same business ordering; price sorting now uses canonical SKU as an equal-price tie-breaker.
- Display names and dimensions are intentionally excluded from the final sort key so EN/fr-CA localization cannot change SKU order.
- `pnpm run test:package-contracts`: 21/21 passed, covering category/family priority, shuffled API input, Bathroom pins, locale-independent display fields, and unknown-group fallback.
- `pnpm run typecheck:web`, static export, Chromium checks for All Products, Handle series, Accessories, and fr-CA Trim passed.
- Independent review found and prompted removal of an earlier display-dimension comparator that was non-transitive for fractional widths and locale-dependent; the current canonical-key comparator resolves both blockers.
- No Backend code, push, merge to `main`, deploy, or database migration was performed.

## Backend contract required

- For long-term ERP-added product ordering, the public Website product DTO should expose canonical `subCategory` (and eventually an explicit merchandising rank) instead of relying on static fallback enrichment. The current 140-product release remains deterministic because canonical SKU/category/subCategory are available after frontend mapping.

Cart / Checkout / Payment experience follow-up in the current working tree:

- Added one bilingual Cart → Details → Payment progress pattern across all three page shells.
- Cart now names each product article and quantity action for assistive technology, clarifies the dealer as requested rather than confirmed, and explains price, fulfillment, and payment checkpoints.
- Checkout now groups contact, fulfillment, delivery address, payment, and notes semantically; replaces select controls with explicit choice cards; presents a complete item review with quantities and line totals; distinguishes requested dealer from Backend confirmation; and exposes submission progress without allowing an unmounted response to redirect the customer.
- Payment now presents authoritative totals, fulfillment/payment context, session reference, shipping address when present, reservation expiry time, secure-card guidance, delivery-aware manual-payment instructions, and financial-action locking before Moneris initialization.
- Background payment polling is silent; client time is display-only and cannot disable a server-valid payment session.
- Responsive styles collapse summary columns and choice grids without changing DOM reading order; mobile step labels remain visible and retain `aria-current`.
- Follow-up visual QA corrected the progress indicator so connector lines only join the numbered circles and never cross labels; desktop and 500 px viewport geometry was measured after build.
- Unknown/internal API failures are now customer-safe in both locales; configuration details such as `The API base URL is not configured.` are never rendered, with a package-contract regression test covering the case.
- `pnpm run test:package-contracts` (21/21), full `pnpm run typecheck`, configured static export, `git diff --check`, and EN/fr static route snapshots passed. Full live Cart → Checkout → Payment E2E was not run because static export has no configured runtime API/session state.
- No Backend code, push, merge to `main`, deploy, real payment, or database migration was performed.

## Backend contract required

The richer frontend remains bounded by existing contracts. Backend/Integration follow-ups required for fully authoritative and resumable payment detail are:

1. Return the final assigned `DealerLocation` in Checkout/Payment session and Order DTOs; current Cart/Checkout dealer is only a requested preference and Backend may choose another location.
2. Return frozen PaymentSession item snapshots and safe contact summary so Payment can remain complete after refresh or cross-tab recovery.
3. Return provider-neutral resumable payment action metadata (or add a resume endpoint); Moneris initialization metadata currently exists only in sessionStorage after session creation.
4. Return authoritative discount/promotion breakdown and validate the financial identity `subtotal - discount + tax + shipping = total`.
5. Provide stable provider-initialization failure semantics that tell Frontend when to discard the previous idempotency key.
6. Align the public payment provider enum with Backend simulation mode (`demo`) or expose an explicit simulation flag.

Homepage representative-products follow-up in the current working tree:

- Popular Products is now an explicit eight-SKU merchandising set rather than the first eight API results.
- The set represents core cabinet purchasing decisions: base cabinet, three-drawer base, sink base, Lazy Susan corner base, wall cabinet, tall cabinet, and two bathroom vanity sizes.
- Handle series, Baseboards & Mouldings, and Kitchen Accessories are intentionally excluded from the homepage showcase.
- Production homepage generation now selects the same canonical SKUs from the complete API catalog; it fails closed if any representative SKU is missing instead of silently filling the showcase with unrelated products.
- `pnpm run test:package-contracts` passed 24/24; static export passed 396/396 with 195 French artifacts. EN/fr homepage artifacts contain all eight representative SKUs and none of the previous handle/baseboard/casing SKUs.
- No Backend code, push, merge, deploy, or database migration was performed.

## Remaining frontend work

The following items were rechecked against current `main` and remain valid. They are candidates, not authorization to implement all of them in one change.

### P1 — authoritative commerce identity and data

1. **DealerLocation identity:** Backend checkout/inventory/order paths use real `dealerLocationId`, while PDP fixture, map, and checkout identifiers are not yet one namespace. Unify map → PDP → cart → checkout → order on the actual public DealerLocation ID.
2. **PDP inventory:** Backend has authoritative inventory data, but PDP still maps fixture `dealerStock` and static dealer data. Connect PDP purchase state to SKU + DealerLocation inventory instead of the compatibility fallback.
3. **Checkout capabilities:** no public `/checkout/capabilities` contract exists. Frontend must not infer card availability from build flags; request a Backend contract driven by runtime payment configuration.

### P1 — account and order depth

4. **Account order pagination:** API defaults to 20 rows and returns pagination metadata; `getAccountOrders()` sends no page and the UI has no pagination/load-more.
5. **Dedicated account order route:** `/account/orders/[id]` and its fr-CA counterpart do not exist. Account orders currently link through the generic lookup flow.
6. **Efficient order polling:** Order Detail polls the complete order every five seconds even though a lightweight `/orders/:id/status` client/backend path exists. Poll status, then refresh detail only after change, with backoff and last-updated feedback.
7. **Session state/race handling:** current state is `loading | authenticated | anonymous | error`. Add explicit unavailable/expired/logout states as justified and prevent an older restore request from overwriting a logout transition.

### Production QA boundary

- Production route/API smoke passed for Account/Favorites/Cart/Orders/Payment/Catalog/PDP/Dashboard and protected content.
- Chromium found no console, page exception, hydration, canonical, hreflang, language, or overflow failure.
- The existing 36-case harness cannot be called a full pass on production: expected anonymous `401` responses are treated as failures, and rapid page opening exhausted the shared Cart rate-limit bucket (`13` cases returned `429`, limit `60`, with Retry-After). Fix the harness cadence/expected-status model; do not weaken production rate limits.

### P1 — security lifecycle and tooling coordination

8. **Reset outbox non-success terminal redaction:** successful EN/fr sends clear payload immediately, but suppressed/cancelled and exhausted-failed paths retain encrypted payload until generic retention. Backend/Worker ownership is required; record the contract before frontend-branch changes.
9. **Pages CI Node version:** root engines require Node 22, Backend CI uses Node 22, but Pages workflow still uses Node 24. Align through a small frontend/tooling change and rerun Pages gates.
10. **Accessibility depth:** automated browser gates pass, but the former session did not complete axe, VoiceOver/NVDA, forced-colors, 320 CSS px, 200%/400% zoom, or a complete keyboard journey. Scope and record manual evidence rather than claiming it implicitly.

## Backend contract required

For future P1 work, likely Backend-owned contracts are:

- public Checkout capabilities derived from actual payment-provider configuration;
- one public DealerLocation DTO and ID across catalog/map/inventory/checkout/order;
- authoritative PDP inventory keyed by product/SKU/DealerLocation;
- confirmed Account Orders pagination metadata and status enums;
- reset-email encrypted payload redaction for failed/cancelled/suppressed terminal paths.

Do not implement those Backend paths silently on `feature/frontend`; add a concrete request here and coordinate through `feature/backend` and `integration/fullstack`.

## Next action

1. Integrate the committed Cart authoritative-identity/totals delivery through `integration/fullstack` when authorized.
2. During integration, run runtime Cart QA with two variants of the same product to verify independent quantity/remove behavior and displayed API totals.
3. The next bounded implementation candidate is Account Orders pagination, which can proceed from the existing response metadata without coupling to DealerLocation work.
4. DealerLocation, PDP inventory, and Checkout capabilities still require concrete Backend contract coordination before editing Backend-owned paths.

## Relevant checkpoint

- `tasks/checkpoints/frontend-2026-07-28-commerce-baseline.md`
- `tasks/checkpoints/integration-2026-07-28-fullstack-baseline.md`
