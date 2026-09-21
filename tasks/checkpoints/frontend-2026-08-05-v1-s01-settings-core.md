# Frontend — v1 S01 Settings core

Date: 2026-08-05
Status: FRONTEND FOLLOW-UP IMPLEMENTED AND LOCALLY VERIFIED

## Scope

Desktop-only S01 implements the internal Settings workspace for the sole non-secret descriptor `settings.core.overview_refresh_seconds`. It owns canonical EN/fr App Router artifacts for Overview, Lifecycle and History, searchable registry presentation, draft creation and correction, validation, safe diff, explicit publish confirmation, append-only history, rollback-draft confirmation and readiness/degraded/error states.

Future groups remain status-only `coming_in_v1` / `not_implemented`; they mount no forms and issue no group-specific requests. This work does not implement CG01, S02–S12, provider settings, secrets, environment reads, mobile acceptance, public Storefront changes, Backend handlers, migrations or production operations.

## Contract synchronization

- Frontend contract merge `99202b242f8e4f372f2a5d24edb4f85a79651ea0` has second parent `eaa5a9dbdf83f286b8c04d9624093bdaedbd7513`.
- Final closure merge `0ef86f1e715af87274a7cf7b6e9b5adafe26cd45` has second parent `d9baaa996c107494c6cb67644dd0eb6c088a305e`.
- The final closure restores protected legacy EN/fr Dashboard copy and supplies invalid-time validation behavior. S01 copy remains local to the internal Settings presenter.

## Implementation

- `DashboardF0Shell` calls `parseSettingsCenterLocation`, preserves invalid URL fail-close, and dispatches every Settings subroute to the single Settings Foundation module.
- Dedicated EN/fr `[view]` wrappers statically own `overview`, `lifecycle` and `history`.
- `SettingsFoundationPanel` consumes strict `{ data }` API envelopes and exact Settings DTO validators.
- Reads and mutations are actor-, generation- and AbortController-fenced; 401 invalidates the session.
- Operation-derived transport constructs only fixed Settings routes/methods/bodies. PATCH is restricted to editable draft states and consumes the server-projected `actions.updateDraft` capability independently from create authority. Validation and publish enforce authoritative lifecycle states.
- Follow-up response binding fails closed and authoritatively reloads on mismatches: create binds descriptor/value/trimmed reason/draft status/base publication/version/id; PATCH binds submitted draft/descriptor/value/trimmed reason/unchanged base publication, strictly advanced settings revision and resulting editable status; validation binds ID, strictly advanced settings revision and a legal captured-source transition; diff binds that exact validation; publish binds confirmed source ID/revision; rollback binds target publication, rollback-draft status and the submitted current effective publication CAS.
- Post-validation diff uses a dedicated abort controller and captured actor/generation/draft ID/version/status guard, including a synchronous validated-draft ref update before the request can resolve. Validation also requires `validationRevision === draftVersion`. Mismatch recovery keeps the conflict fence active and preserves its alert through reload; successful authoritative reload replaces it with an explicit recovery status announcement.
- Create and PATCH value/reason controls now own separate errors, `aria-invalid`, `aria-describedby`, and exact invalid-field focus rather than sharing one error. Draft and rollback errors persist through further invalid edits and clear only when that exact field becomes valid; valid controls omit `aria-invalid`. Draft selection, including direct select and selected draft identity/version changes, clears prior PATCH field errors.
- Safe diff is bound to exact draft ID/version/descriptor. Publish requires a validated draft, current diff and explicit modal confirmation.
- Rollback targets only current producer-eligible `published` or `superseded` history rows and CAS-binds the current effective publication version; `activation_failed` and legacy compatibility `rolled_back` remain ineligible.
- 409 clears stale validation/diff authority, closes confirmation, disables mutations and requires authoritative refresh; it never auto-retries.
- A synchronous in-flight lock prevents rapid duplicate mutations before React state commits.
- Accessibility includes modal-local errors, field-linked PATCH/rollback errors, focus restoration/destination focus, validation and registry announcements, busy state, forced-colors and reduced-motion support.

## Verification

Executed under host Node `25.9.0`; repository engine warning expects Node `>=22 <23`.

Passed:

- Follow-up focused S01 helper/panel/transport tests: `29/29`.
- Fresh complete package contracts after revision authority, create-field and selection-error regressions: `243/243`.
- `pnpm run typecheck:web`.
- `git diff --check`.
- The preceding S01/shared `40/40`, static and artifact gates below are historical evidence from the committed S01 baseline and were not rerun for this follow-up.
- `pnpm run qa:seo-security`.
- `pnpm run qa:fr-ca-display-format`.
- Configured static build with `NEXT_PUBLIC_SITE_URL=https://vanstro.ca`, `VANSTRO_STATIC_EXPORT=true`, `NEXT_PUBLIC_DEMO_READ_ONLY=true`, `VANSTRO_WEBSITE_API_BASE_URL=https://vanstro.ca/api/v1`; localization verified `203` French HTML files.
- Static artifacts: `406` application routes, `308` indexable URLs, `140` PDPs per locale, `300` SKUs; French language, 404 fallback and protected artifacts passed.
- Exact nested Settings artifacts exist for EN/fr Overview, Lifecycle and History.
- `git diff --check`.

Not run:

- Authenticated live Backend Settings browser journey because Backend S01 handlers are not part of this Frontend work unit.
- VoiceOver/NVDA/JAWS runtime sessions.
- Full Backend/DB/Worker tests, production QA or deployment.
- `qa:error-localization` remains Backend-implementation dependent: before Backend S01 implementation it reports the Backend catalog is missing `SETTINGS_DESCRIPTOR_UNAVAILABLE`.

## Reviews

Independent review iterations found and drove closure of rollback CAS, safe-diff binding, invalid lifecycle actions, 409 stale authority, duplicate mutations, API envelope handling, PATCH validation and keyboard/screen-reader feedback. Final review is bound to this documented S01 state; no production claim is made.

## Integration status

The original S01 implementation commit `735e7b8`, mutation-authority contract `127a447561b4595d21949e66a36d52c858f7133f`, supersession contract `e48a84d330d11c130cf13688d7897f200386d449` and producer closure Integration `4fef6fb3cdc148b919d35594a0299050f62ae7a5` are synchronized on `feature/frontend` through merge `6594d76`. This response-binding/accessibility follow-up is intentionally unstaged and uncommitted pending final clean reviews. It has not been merged to Integration/Main, pushed or deployed.

## Next action

Review and hand the unstaged follow-up to the owning Frontend workflow for disposition. Integration must rerun authenticated desktop Settings/full-stack scenarios after any later commit and merge. Do not begin CG01 or S02.
