# Integration checkpoint — Dashboard F0 Read-only Shell

Date: 2026-07-31

## Identity

- Program baseline: `1c4fe35301840fe157437f141df0441861c6125c` (tree `bd4ab2dba09c60022ba7b437a3797f7f74406679`).
- Backend commits:
  - `a1bae346a9399ec6cab40921addfe53dc94baba1` — add `dashboard-foundation.v1`.
  - `017e9c6ee02b01723e51a590e97ae59b14799b28` — constrain the three legal Shell state tuples.
- Backend normal two-parent merge: `ef68208ba92bd2a1ba41adf25d5570045dca40f2`, parents `1c4fe35301840fe157437f141df0441861c6125c` and `017e9c6ee02b01723e51a590e97ae59b14799b28`.
- Frontend commits:
  - `63990d3f17e4c43b7f2db05ef6b4a4a8fb46e5e0` — add the F0 Shell.
  - `cd662102de414534e614decf6ca9cfe363686d67` — complete GET-only business-panel parity and state handling.
  - `58343da7e8eb2b0739afca0e4680388443c6689e` — add Simplified Chinese management copy and session/actor safety.
  - `96f65e5c3ca32e35c62da80805435bfa86caa741` — refine CMS language boundaries and partial/error semantics.
  - `b31281a9299626108f9dc9676ff2f33b5563db3d` — localize fulfillment and distinguish Operations total failure.
  - `334407b36f9aec81294537a83d9381a0f2199d32` — preserve section deep links with trailing slashes.
- Frontend normal two-parent merges:
  - `1e13af9ebc216941b9c7b935982e889d9c4e8fb5`, parents `ef68208ba92bd2a1ba41adf25d5570045dca40f2` and `96f65e5c3ca32e35c62da80805435bfa86caa741`.
  - `6d185ade6b4fd73ad0203733cc6967c5411502f7`, parents `1e13af9ebc216941b9c7b935982e889d9c4e8fb5` and `b31281a9299626108f9dc9676ff2f33b5563db3d`.
  - `f312033ccd095b8b1b565fa445602e7c2c93b662`, parents `6d185ade6b4fd73ad0203733cc6967c5411502f7` and `334407b36f9aec81294537a83d9381a0f2199d32`.
- Verified pre-evidence Integration tree: `877459826bc7657eadd3a577c89647e92b2c5c3d`.

## Integrated behavior

- `GET /api/v1/dashboard/foundation` is a minimal, validated, no-store `dashboard-foundation.v1` contract.
- `dashboard.shell.v2` is server-authoritative and supports only `disabled` and `internal`; missing/invalid configuration fails closed.
- Internal activation requires an active admin, `dashboard.access`, and exact server-side actor allowlisting. Client query, storage, role name, email, cookie override, or custom header cannot enable it.
- The contract returns a minimal actor projection, permission-derived known modules, honest unavailable/permission-only scope summaries, read-only status, safe readiness and request ID. It exposes no email, password, token, secret or arbitrary Prisma payload.
- F0 retains all 21 logical pages and all 42 EN/fr route artifacts. It adds no Chinese route tree and preserves existing section slugs, bookmarks and legacy `?tab=` links.
- The new presenter uses Simplified Chinese management UI while managed Storefront EN/fr values retain their locale and language boundaries.
- Existing Domain APIs and Dashboard panels remain the only business fact source. F0 performs real GET-only reads; mutation forms, submit handlers and no-op action controls are structurally absent. A central method guard rejects non-GET/HEAD calls.
- Foundation and data requests are abortable and generation/actor guarded. Login revalidates Foundation; logout, 401 and actor changes clear Foundation, data, metadata, stats and resource states. Late responses from an earlier actor cannot repopulate another actor’s UI.
- Loading, refreshing, empty, partial, forbidden, error, degraded and read-only states are represented. CMS, Operations and Email preserve successful partial data, propagate 401, distinguish total forbidden/error and do not present total failure as valid empty data.
- New Shell isolates Storefront Header/Footer, Cart drawer, Support, Location and Cookie UI. Flag-disabled, actor-not-allowed and anonymous states retain the legacy Dashboard/AppChrome rollback path.
- Mobile navigation supports a named close control, initial focus, focus trap, Escape, background inerting, body scroll lock and visible focus restoration. Dashboard tables have contextual localized captions, column scope, named focusable overflow regions and explicit empty text.

## Review closure

- Backend security and correctness reviews closed with no remaining Blocker/High/Medium finding after the legal Shell tuple follow-up.
- Frontend correctness and accessibility reviews found and closed: impossible Shell tuple acceptance; incomplete read-only business parity; legacy query/deep-link drift; stale actor/Foundation state; cross-actor late-response leakage; swallowed 401s; mutation-bearing CMS DOM; canonical filter/page mismatch; drawer breakpoint focus; duplicate table names; language-of-parts errors; CMS selected-state semantics; no-op Operations controls; partial/all-failed misclassification; raw technical error exposure; untranslated common F0 enums; and trailing-slash section fallback.
- Exact final reviews of the latest ranges found no remaining reproducible Blocker or Medium issue.
- VoiceOver, NVDA, JAWS, Dragon/Voice Control and real Windows forced-colors with assistive technology were not run.

## Deterministic verification

Final successful runs used Node `22.22.2` unless otherwise noted.

- Prisma Client generate: passed.
- Prisma schema validate: passed.
- Migration status: 41 migrations; local schema up to date.
- Full TypeScript: Web, DB, API, Worker and CLI passed.
- Backend build: DB, API, Worker and CLI passed.
- DB tests: `3/3`.
- API tests: `126/126`.
- Worker tests: `11/11`.
- Package/F0/protected/API-client/Payment/Order contracts: `110/110` before the final route-only follow-up; final route-focused suite `20/20` and formal contracts `111/111` passed on the Frontend tip.
- Final review, runtime error localization, fr-CA formatting, SEO/security, functional-consent and product-identifier gates passed.
- Production-configured static build: `396/396`.
- Final artifacts: 5,061 files, 393 HTML, 195 French HTML and 11 PDFs.
- Dashboard artifacts: exactly 42 EN/fr HTML artifacts; Chinese Dashboard artifacts: 0.
- SEO artifacts: 390 application routes, 308 indexable URLs, 140 PDPs per locale and 300 catalog SKUs.
- French HTML, 404/static fallback, Careers/Contact privacy and protected content/PDF gates passed.
- Chromium current-tree: `40/40` with canonical external API origin `https://vanstro.ca`.

## Controlled local browser verification

A unique local admin/role/session fixture and isolated API/Web ports `4004/3004` exercised the merged Integration tree. No production or provider was used.

Verified:

- server-authoritative `internal` activation and new Simplified Chinese Shell;
- no Storefront Header/Footer/Cart/Support/Location/Cookie chrome in the new Shell;
- real Overview, Products, Categories, Pricing, Orders and Dealers GET requests;
- Products rendered 50 local catalog rows;
- `/dashboard/orders/?orderStatus=paid&page=2` canonicalized to `/dashboard/orders?orderStatus=paid&page=2`, issued the matching filtered/page-2 GET and rendered the Orders table;
- no Dashboard business POST/PUT/PATCH/DELETE request;
- no mutation form in Products or Orders main content;
- mobile drawer initial focus, Escape close and focus restoration;
- zero root horizontal overflow at 320, 390, 640, 680, 1100 and 1440 CSS px, covering effective 200% and 400% reflow;
- flag `disabled` restored the legacy Dashboard plus Storefront Header/Footer for the same admin.

The temporary fixture was deleted exactly; matching users and roles are both 0. Ports `3004/4004` were stopped. Temporary credentials and harness files were deleted from the session job directory. Invalid inventory snapshots remained 0.

## Failed attempts retained

- The first Prisma chain omitted the canonical local environment, so `prisma validate` stopped on missing `DATABASE_URL`; the complete chain was rerun with the canonical local environment and passed.
- The first direct Foundation test used a runner/path that could not resolve `.js` TypeScript imports; the API package `tsx` runner was then used.
- A later Foundation test attempt lacked the Backend worktree `.env`; the canonical repository environment was loaded and the test passed `5/5`.
- The first static Chromium run was `0/40` only because its default external-API allowlist named `api.vanstro.ca`, while the canonical build uses same-domain `https://vanstro.ca/api/v1`. Every page assertion except external-origin classification passed. Rerunning with `VANSTRO_QA_EXTERNAL_API_ORIGINS=https://vanstro.ca` passed `40/40`.
- The first live F0 browser run reached the new Shell and Products GETs but timed out on Orders. Diagnosis showed Next dev supplied `/dashboard/orders/`, while Foundation routes were slashless; the focused Frontend follow-up normalized trailing slashes. The merged tree then preserved the filtered/page-2 Orders deep link and the full live run passed.
- Browser console recorded expected 401s from Customer favorites/session probes while using an admin-only account. Dashboard business requests remained successful GET-only calls; no F0 mutation or uncaught page error occurred.

## Data, migration, production and rollback boundary

- Schema changes: 0.
- Migration files added: 0.
- Migration/backfill/seed actions: 0.
- Production deployment/config/default-navigation change: 0.
- Real payment/refund/ERP action: 0.
- Main protected untracked: 80 records, exact manifest match.
- Stash: 1 pre-existing entry, unchanged.
- Production remained release `3904a440`; homepage stayed HTTP 200, 64,319 bytes, SHA-256 `4ecd9c1a4df169a8db245b928abf7583262c043dee522bf7f4a7193f0572128d`; same-origin liveness/readiness stayed HTTP 200.
- Immediate rollback is `dashboard.shell.v2=disabled`; legacy Shell/routes/APIs/permissions remain intact. F0 contains no data migration, so rollback requires no data recovery.
- This work is not deployed. Production rollout remains unauthorized. F1 and every business-module migration remain `PLAN / FROZEN`.
