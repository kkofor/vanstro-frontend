# Integration Checkpoint — 2026-07-28 Catalog, Checkout, and Homepage

## Identity

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Integration branch: `integration/fullstack`
- Integration parent: `cbe6d05d44809d2f31bd6ccc7714c205657cbdd0`
- Frontend tip: `10e74f0081fd5cb3234ff2fd05d12bfe3a99c305`
- Backend tip already integrated: `9ec365f3087986d112a1a691bd216cb071431eb6`
- Frontend merge: `58d95a9760e66aa98ee9909556316d7e282836a7`
- Status: locally integrated and verified; not pushed or deployed

## Integrated scope

The merge brings the five consecutive Frontend commits after already-integrated `f2dc1051`:

1. Cabinet Accessories URL-backed filter synchronization.
2. Deterministic Catalog business ordering.
3. Deeper bilingual Cart/Checkout/Payment experience.
4. Checkout progress, unmount, and customer-safe error hardening.
5. Eight representative homepage cabinet/vanity products selected from the complete API catalog.

Existing integrated behavior remains intact:

- authoritative Cart `cartItemId`, `skuId`, variant SKU, `unitPrice`, `lineTotal`, subtotal, and currency validation;
- canonical GET/PATCH `/account/me` Customer Account DTO;
- `refund_processing` contract, validation, and Payment UI;
- Profile PATCH-then-GET compatibility behavior;
- Backend Auth, Payment, Inventory, Worker, CRM, Dashboard, and 41-migration baseline.

## Merge review

- Normal two-parent Git merge; no cherry-pick repetition.
- No explicit conflict.
- `qa/package-a-contracts.test.ts` merged automatically and retains both Frontend and Backend coverage.
- No shared API contract, client, or runtime validator regression.
- No Prisma schema or migration change.
- The Frontend range does not change Careers, About, Contact, Resource Center, or PDF paths.

## Node 22 verification

All final gates used Node `22.22.2`.

- Prisma client generation: passed.
- Full TypeScript: passed.
- DB tests: 3/3.
- API tests: 106/106.
- Worker tests: 11/11.
- Package contracts: 25/25.
- Final transactional review: passed.
- SEO/security source gate: passed.
- Runtime error localization: passed.
- fr-CA display formatting: passed.
- Production API-driven static export: 396/396 pages.
- French localization: 195 HTML files.
- SEO artifacts: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs.
- French HTML, 404/static fallback, and Careers/Contact privacy artifact gates: passed.
- Chromium current-tree regression: 36/36.
- EN/fr homepage artifacts contain all eight configured representative SKUs.
- EN/fr homepage links contain `subcategory=accessories`; no `q=Accessories` remains.

## Production and source boundary

Production remains the frontend release:

`/www/wwwroot/vanstro.ca/releases/working-tree-20260728-fullstack9-commerce-ui`

No deployment occurred in this cycle. The canonical source still does not reproduce all approved production-only Resource Center/PDF content, so this verified Integration commit must not be used for an unprotected full-site replacement until those assets are restored and checked.

No push, production migration, real payment/refund, stash operation, or worktree cleanup occurred.
