# Frontend Checkpoint — 2026-07-29 API Contract Boundary

## Identity

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Frontend worktree/branch: `.claude/worktrees/frontend` / `feature/frontend`
- Work-unit parent: `d0632581aeeb0d6839165dedc27e8fb27c0d78d9`
- Functional commit: `d24dcf09612f539972edcb43b0b57944bcc9a1fe`
- Integration merge: `571e8897404e743d82d06292656e7d3fe39481b4`
- Status at checkpoint creation: functionally integrated and fully verified locally; not pushed or deployed

## Startup reconciliation

The incoming task described four existing uncommitted Frontend API-contract files. Real Git inspection found the Frontend worktree completely clean at the shared `d063258` baseline. The specified files had zero diff, and there were no staged, unstaged, untracked, generated, or adjacent work-unit changes. No missing work was reconstructed and no file was reset or overwritten.

## Completed scope

- Sanitized unknown and internal API errors at the client boundary; arbitrary backend messages and field strings are not retained for customer display.
- Kept exact maintained public error compatibility through stable codes and localized message fixtures.
- Made session-storage access fail-open without reversing successful network mutations. A volatile per-tab fallback preserves guest Cart identity when storage is blocked or full.
- Retired a consumed guest Cart token after an authenticated Cart response omits `meta.cartToken`.
- Guarded auth events when `window` is unavailable so login/register/logout retain their request result in Node/SSR tests.
- Removed redundant Cart PATCH envelope validation and enforced Backend quantity bounds `1..999` before fetch.
- Removed the unused product-ID-only add-Cart helper that could omit selected variant identity.
- Validated both Backend pagination shapes and declared metadata fields.
- Preserved Backend wire `amountCents`, added the real `demo` payment provider, and centralized all nine Prisma payment-session statuses.
- Hardened Checkout money, currency, date, token, order ID, and shipping-address validation.
- Rebuilt Website product validation without unchecked object spread. The validator now supports the real public string category and older object category shapes and validates assets, specifications, price, rating, and reviews.
- Updated server product mapping for either category representation.
- Added `no-referrer` to EN/fr Payment pages while retaining hydration-time guest-token URL scrubbing.
- Added direct Node tests for API-client error, storage, credentials, Cart-token, auth-event, and quantity behavior.

## Backend truth used

The work was checked against current Backend source and tests at `d063258`:

- Cart wire includes Cart-item ID, `skuId`, selected variant SKU, authoritative `unitPrice`, `lineTotal`, subtotal, and optional `meta.cartToken`.
- Cart POST/PATCH quantity range is `1..999`.
- GET/PATCH `/account/me` share one canonical formatter.
- Prisma payment statuses are exactly pending, paid, failed, expired, reconciliation_required, refund_pending, refund_processing, refunded, and refund_failed.
- Public errors use top-level `{ error, code }`; Backend currently has no canonical public field-error contract.
- Contact and Dealer submissions validate locale-aware payloads.

No Backend source or migration changed in this work unit.

## Verification

All commands used Node `22.22.2` and pnpm `11.13.0`.

Frontend and Integration passed:

- package/protected contracts: 40/40;
- direct API-client boundary tests: 6/6;
- Frontend and full-workspace TypeScript;
- SEO/security source gate;
- runtime error localization: 52 maintained literals and 2 dynamic Commerce messages;
- final transactional review;
- fr-CA display formatting;
- functional-consent storage;
- Prisma Client generation and schema validation;
- DB tests: 3/3;
- API tests: 106/106;
- Worker tests: 11/11;
- clean production-configured static build: 396/396 routes;
- localized French HTML: 195;
- SEO artifacts: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs;
- EN/fr 404/static fallback, Careers/Contact privacy, and protected artifact gates;
- protected assets: Careers 3 roles per locale, Resource Center 2/8/1, 11 PDF byte/SHA-256 matches, 3 Planning Guides;
- Chromium current-tree gate: 40/40;
- final output: 5,060 files, 393 HTML, 195 French HTML, 11 PDFs;
- EN/fr Payment artifacts contain `no-referrer`.

The initial configured `pnpm build:pages` attempt returned without materializing `out`; direct `next build` exposed the real public category wire mismatch instead of allowing that incomplete artifact result to be treated as success. Final verification used direct `next build` with static-export settings, checked its exit code, then ran the localization script from the correct Frontend working directory.

## Remaining cross-domain work

1. Backend must enforce a canonical Cart/Price currency set and prevent mixed-currency line prices from being summed under `cart.currency`; Frontend remains fail-closed.
2. Backend should reconcile duplicate provider-transaction handling so reconciliation events cannot remain attached to `paid` sessions hidden from the Dashboard reconciliation list.
3. Guest Payment/Order access should migrate from query tokens to a coordinated header or HttpOnly/session-bound capability. Current pages mitigate with `no-referrer` and URL scrubbing.
4. Stable localized field error codes require a future Backend/Frontend contract; arbitrary server field strings remain discarded.

## Explicit boundaries

Not performed: Backend change, schema/migration change, staging QA, production write QA, real payment/refund, ERP connection, deployment, production migration, push, stash operation, standard worktree cleanup, snapshot/release modification, or protected Main-untracked modification.
