# Frontend checkpoint — Dashboard F0 read-only shell

Date: 2026-07-31

## Identity and scope

- Branch: `feature/frontend`
- Parent: `ef68208ba92bd2a1ba41adf25d5570045dca40f2`
- Shared Main baseline: `1c4fe35301840fe157437f141df0441861c6125c`
- Backend/Integration parent contract: `GET /api/v1/dashboard/foundation`, `dashboard-foundation.v1`, validated through the shared `validateDashboardFoundation`.
- Scope is strictly F0 Frontend read-only shell. No F1 business rewrite, Backend change, mutation endpoint, schema, migration, seed, backfill or deployment.

## Implemented architecture

- `DashboardFoundationBoundary` fetches one server-authoritative no-store Foundation resource and distinguishes checking, anonymous, forbidden, unavailable, invalid-response, legacy and ready states.
- Flag-disabled, actor-not-allowed and anonymous paths retain the established EN/fr Dashboard and complete AppChrome rollback. Ready/error F0 paths isolate storefront chrome without a flash.
- `DashboardPanelRouter` is the single active-tab dispatch boundary shared by legacy and F0 presenters. Legacy behavior remains intact. F0 read-only mode structurally omits legacy mutation panels and action handlers.
- The central F0 transport permits only GET/HEAD and rejects writes before fetch. No query, localStorage, email, role or caller header selects shell state.
- Foundation module projection is navigation authority. Denied modules are hidden and unknown routes fail closed.
- The new presenter is Simplified Chinese inside existing EN/fr route artifacts. No Chinese route tree was added.

## UI and accessibility

- Deep-green grouped sidebar, compact branded topbar, breadcrumbs, page heading, readiness/read-only banners, actor/role/module scope summary, disabled future global search/work queue and explicit state panel.
- Mobile drawer is conditionally mounted and uses the existing modal-focus utility for initial focus, full focus containment, Escape, background inerting and trigger restoration. It has a visible named close button, independent vertical scrolling, body scroll lock and desktop-breakpoint cleanup.
- Stable skip link/main landmark and live checking/error status; visible focus, reduced-motion and forced-colors coverage.
- Shared Dashboard Table now supports a caption, named focusable overflow region, `scope=col` and explicit empty copy. Pagination arrows have accessible labels. Existing DetailDrawer uses the shared modal focus utility.

## Verification

Passed on local Node `25.9.0` with the expected repository Node-engine warning:

- `pnpm run typecheck:web`
- `pnpm run test:package-contracts`: `91/91`
- `pnpm run test:final-review`
- `pnpm run qa:error-localization`
- `pnpm run qa:fr-ca-display-format`
- `pnpm run qa:seo-security`
- production-configured `pnpm run build:pages`: `396/396`
- localized French HTML: `195`
- `pnpm run qa:protected-artifacts`
- Dashboard artifact invariant: `42` EN/fr HTML artifacts
- no `/zh-CN/dashboard` artifact
- `git diff --check`

Controlled same-origin Foundation fixture browser evidence:

- zero root overflow at 320, 390, 680, 1100 and 1440 CSS px;
- zero root overflow at effective 200% (640px) and 400% (320px) reflow;
- enabled shell has no Storefront Header/Footer/Cart drawer/Support/Location/Cookie chrome;
- accessibility tree contains Chinese skip link, landmarks, heading hierarchy, readiness/read-only regions and actor scope;
- keyboard opens the drawer, focus starts at the visible close control, Escape closes it and restores focus to the trigger;
- closed drawer is absent from the accessibility tree.

## Failed attempts retained

- First package-contract integration imported a `.tsx` module under the Node strip-types runner and failed `75/76`; moving the pure route predicate to `.ts` corrected it.
- One intermediate test edit duplicated a `readFile` import and failed `75/76`; removing the duplicate corrected it.
- Static Chromium run failed `0/16` solely because the static server returned 404 for runtime Foundation/Auth requests. Final enabled-shell checks used a controlled same-origin Foundation fixture instead of treating static 404s as product success.

## Acceptance follow-up

Independent follow-up parent: `63990d3f17e4c43b7f2db05ef6b4a4a8fb46e5e0`.

- Corrected breakpoint focus restoration, contextualized all 25 Dashboard table captions/empty messages, and added EN/fr legacy `?tab=` canonical routing with back/forward support.
- Added abortable/generation-protected Foundation revalidation on focus/visibility and explicit Retry; old actor/module presentation is cleared during checking, and 401 invalidates both Foundation and read-only data.
- Reused `useDashboardData`, `DashboardPanelRouter` and existing `DashboardPanels` for actual GET-only F0 data. Mutation forms and controls are structurally absent under centralized panel `readOnly` props; detail viewing remains.
- Operations and Email independently settle their endpoints and expose Partial rather than pretending denied/failed endpoints returned empty data.
- Follow-up gates passed: `typecheck:web`, targeted F0/table `20/20`, formal contracts `95/95`, final review, error localization, fr-CA display, SEO/security, configured build `396/396`, `195` French HTML, protected artifacts, 42 Dashboard artifacts/no zh route and diff check.
- Controlled fixture evidence: `/dashboard?tab=products&page=3` canonicalized to `/dashboard/products`; Foundation plus Categories/Products/Pricing were GET-only; existing Products panel rendered `受控只读产品`; no forms or mutation requests existed; root overflow was zero.
- The contextual table edits were received as protected same-domain shared-worktree input, preserved and reverified during unified closure.

## Chinese and session-safety follow-up

Independent follow-up parent: `cd662102de414534e614decf6ca9cfe363686d67`.

- Added a full typed Simplified Chinese Dashboard copy while leaving public locale routing and legacy EN/fr copy unchanged. F0 always selects Chinese management copy; managed content values remain unmodified.
- Added generation+actor guarded commits for every asynchronous Dashboard state write and deterministic deferred A→B success/error regressions.
- Added same-origin Dashboard session events: login revalidates Foundation; logout/401 aborts requests and clears Foundation/data.
- Read-only Overview/CMS/auxiliary requests no longer swallow 401. CMS read-only renders semantic previews without forms or mutation handlers, and Operations omits no-op controls.
- Canonical queue filter/page state now reaches GET options and remains synchronized across interaction, reload and back/forward.
- Gates passed: `typecheck:web`, formal contracts `105/105`, Chinese copy `2/2`, CMS/Operations `6/6`, final/error/fr/SEO, configured export `396/396`, `195` French HTML, protected artifacts, 42 Dashboard artifacts/no zh route and diff check.

## CMS language-boundary follow-up

Independent follow-up parent: `58343da7e8eb2b0739afca0e4680388443c6689e`.

- CMS read-only cards no longer apply EN/fr `lang` to Chinese management labels; managed JSON values retain the selected locale. Legal-page/article titles retain record-level language metadata.
- CMS subnavigation buttons expose `aria-pressed` selected state.
- Read-only CMS endpoints use independent settled outcomes: partial failure displays Partial, all-failed becomes Forbidden/Error, and 401 clears the session instead of appearing empty.
- Raw technical/English resource errors are not rendered in F0; fixed Chinese recovery guidance is shown.
- Targeted CMS/a11y/race suite passed `12/12`; formal and artifact gates were rerun before the independent commit.

## Fulfillment and Operations follow-up

Independent follow-up parent: `96f65e5c3ca32e35c62da80805435bfa86caa741`.

- Orders and Payment Sessions route `pickup/delivery` through Dashboard copy for Chinese F0 presentation without mutating authoritative data.
- Operations uses Partial only when one source succeeds; all 403 becomes Forbidden, other all-failed becomes Error, and 401 invalidates the session. No all-failed result commits a legal-looking empty success.
- Finding: Orders and Payment Sessions previously rendered raw `pickup/delivery`; Operations previously treated two failed sources as Partial with legal-looking empty alerts/analytics.
- Fix: both fulfillment columns now use `displayDashboardValue` with F0-only Chinese enum labels; Operations checks all-failed before committing any empty data, maps all-403 to Forbidden and other all-failed to Error, and retains Retry through the safe F0 state UI.
- Evidence: targeted fulfillment/Operations/copy suite passed `16/16`; formal contracts passed `110/110`; `typecheck:web`, runtime error localization and fr-CA formatting passed. The authoritative enum values and legacy EN/fr fingerprints remain unchanged.
- Boundaries: no Backend/API/schema/migration/business-data change, deployment, push, payment/refund or ERP operation.

## Trailing-slash route follow-up

Independent follow-up parent: `b31281a9299626108f9dc9676ff2f33b5563db3d`.

- Real Integration reproduction showed Next supplied `/dashboard/orders/` while Foundation declared `/dashboard/orders`, incorrectly selecting Overview.
- Route resolution now removes one or more trailing slashes before matching, while emitting the existing slashless canonical href.
- Tests cover EN Orders with filter/page, fr Payments, Dashboard root and denied/unknown fail-closed behavior.

## Not run or bounded follow-up

- VoiceOver, NVDA and JAWS were not run.
- Real Windows forced-colors with assistive technology was not run; source/system-color coverage exists.
- No real authenticated local API cookie/browser session or production QA.
- F0 intentionally does not mount mutation-bearing legacy business panels. Endpoint-specific read-only business presenters and richer partial/stale domain data are a later bounded phase, not silently expanded here.
- No migration, deployment, push, payment/refund or ERP operation occurred.
