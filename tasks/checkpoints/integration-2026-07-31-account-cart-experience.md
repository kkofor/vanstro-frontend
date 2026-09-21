# Integration checkpoint — Account and Cart experience

Date: 2026-07-31

## Identity

- Shared parent: `083c52030c7f2e197bb716a3770ccd899e6b5444`.
- Frontend commits:
  - `742bb88e327b9a9826032e3595ff5b7093895c33` — deepen customer Account center.
  - `89c90890c203f468e89c4d12d6695e083da38328` — deepen Cart review experience.
  - `c61bc051c66695f3f3d6e9505d62c7685ae185d8` — close Account coordination findings.
- Normal two-parent Integration merge: `0dba987f58ed667694d1c8f6084fd44d115260f9`.
- Merge parents: `083c52030c7f2e197bb716a3770ccd899e6b5444`, `c61bc051c66695f3f3d6e9505d62c7685ae185d8`.
- Merge tree: `5946b75e6c23a89016e819f3403d6b82b5032065`.
- The merged Frontend paths match the Frontend tip exactly. No Backend, Worker, Prisma, migration or deployment path changed.

## Integrated behavior

- Account Overview, Profile, Addresses, Orders and Favorites use a denser bilingual workspace backed by the existing Account APIs.
- Account address and order responses are runtime validated; order reads use the existing page/pageSize Backend contract.
- Authenticated Account reads invalidate stale responses across customer identity transitions.
- Address edit/delete interactions retain deterministic focus management. The coordination follow-up moves Edit focus directly into the first editable field and preserves Cancel/Delete focus restoration.
- Empty Account Orders no longer render the invalid `1–0 of 0` range badge; non-empty pagination ranges remain locale-formatted.
- Product-card Cart and Favorite actions have independent mutation feedback.
- Cart rows foreground Model/SKU, dimensions, authoritative unit/line totals, quantity and truthful Checkout-stage fulfillment validation.
- Cart summary distinguishes the API-authoritative products subtotal from delivery and tax calculated at Checkout, without inventing arrival dates, free delivery, financing, exact dealer stock or return promises.

## Review

Independent review initially confirmed two range regressions:

1. Address Edit focused a heading before the address list rather than the opened form.
2. Empty Orders rendered `Orders 1–0 of 0` / `Commandes 1 à 0 sur 0`.

Frontend follow-up `c61bc05` closed both. A targeted independent re-review confirmed Edit now focuses `#address-first-name`, Cancel returns focus to the originating Edit control, Delete focus behavior remains intact, empty ranges are hidden, and non-empty ranges remain correct. No new reproducible finding survived the final review.

A Profile PATCH→GET continuation without a generation guard was examined but is not a regression in this range: the core continuation already exists in parent `083c520`. It remains a possible separate Frontend follow-up rather than an Integration blocker for these commits.

## Integration verification

All final successful commands used Node `22.22.2` and the local development database where applicable.

- Prisma generation: passed.
- Full TypeScript across Web, DB, API, Worker and CLI: passed.
- DB tests: `3/3`.
- API tests: `121/121`.
- Worker tests: `11/11`.
- Package/protected/API-client contracts: `41/41`.
- Final transactional review, SEO/security, runtime error localization, fr-CA display formatting, functional consent and product identifiers: passed.
- Backend build: passed.
- Existing-database preflight: `{ "ok": true, "failures": [] }`.
- Prisma migration status: 41 migration directories; local schema up to date.
- Production-API static export: `396/396`.
- Export inventory: 5,060 files, 393 HTML, 195 French HTML and 11 PDFs.
- Artifact gates passed: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs, French HTML, 404/static fallback, Careers/Contact privacy and protected content/PDF bytes and hashes.
- Chromium current-tree regression: `40/40`.

### API environment correction

The first serial DB/API/Worker chain produced DB `3/3` and API `120/121`; Worker was not run because the chain stopped. The failing ERP-color test expected the canonical demo SKU `023021412` to be active with an empty ERP product ID, but an earlier local static-catalog import from the separate local-API testing task had reassigned that SKU to a draft formal variant. The failure was reproducible in isolation and was not in any merged path.

The repository's canonical idempotent demo seed was run locally with process-scoped `ALLOW_DEMO_SEED=true`, restoring the documented API test fixture without clearing the formal catalog or business tables. The complete DB → API → Worker chain was then rerun from the start and passed `3/3`, `121/121`, `11/11`. The failed `120/121` attempt is retained here and is not represented as green.

### Live interactive browser verification

An independent temporary Chrome profile exercised the current Integration API and Next dev server with a unique local customer fixture:

- empty Account Orders rendered its empty state with no range badge and no `1–0 of 0` text;
- Address Edit focused `address-first-name` and Cancel returned focus to the original Edit button;
- a non-empty Cart changed quantity `1 → 2 → 1` through the UI;
- the Checkout action navigated to `/checkout/`;
- Remove deleted the Cart row.

Earlier harness attempts failed before completion because of an admin/customer mismatch, a wrong Cart request field, and obsolete DOM selectors; none was counted as passing. The final complete run passed in one execution. Its unique customer, address and Cart fixtures were removed; post-run checks found `0` matching QA users, `0` matching QA addresses and `0` invalid inventory snapshots.

## Boundaries

- This work is locally integrated and verified but not deployed.
- Production remains the `3904a440` full-stack release.
- No production migration, production write, real payment/refund, ERP action, fetch, push, PR or stash operation occurred.
- Integration QA API and Next processes were stopped. The pre-existing `4183` preview and local PostgreSQL remain running.
- A separate locked agent worktree with an active PID was observed and left untouched.
