# Integration checkpoint — Commerce and payment invariants

Date: 2026-07-29

## Identity

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Integration worktree/branch: `.claude/worktrees/integration` / `integration/fullstack`
- Shared parent and pre-merge Main: `626772fd347967a0b067864f605eb63298e90245`
- Backend functional commit: `3baa95609cc3aa773561a49c6bff9b7258ce960c`
- Backend evidence tip: `dc59ba5ca592d74bc39d9482868c672ad6a70f82`
- Normal two-parent Integration merge: `fd31cfd7f8d5e5ebeaaa2a22863b1b7a439912d0`
- Merge parents: `626772fd347967a0b067864f605eb63298e90245`, `dc59ba5ca592d74bc39d9482868c672ad6a70f82`
- Verified Integration evidence baseline: `5e12abda87ab14aa3d61959e71a9b02736ea18ec` (tree `6a584aa6b00b09552309f7e65ce50eaaf57a0457`); final continuity-only closure is recorded at the current Integration/Main tip.
- Main promotion: strict fast-forward from `626772fd347967a0b067864f605eb63298e90245` to the Integration evidence commit after confirming 13 incoming tracked paths had zero collisions with 80 protected untracked paths.

## Integrated behavior

- Cart and Checkout enforce the current CAD storefront currency invariant and reject missing/mixed-currency active prices without summing unrelated minor units.
- Cart add, PATCH, repeated/concurrent add, and guest-to-customer merge enforce final quantities in `1..999` under advisory locks.
- Cart add revalidates the resolved Cart after lock acquisition, preventing a concurrent guest merge/delete from turning an old Cart ID into an FK/500 path.
- Checkout reloads Cart items and matching prices under the creation lock, rejects Cart snapshot changes, reuses identical concurrent intents, and rejects different concurrent payloads with one winner.
- Same provider transaction replay remains idempotent. Same-session second transactions and cross-session provider ID reuse become visible reconciliation records without duplicating Order, inventory, Cart, email, CRM, ERP, or refund lifecycle effects.
- Paid duplicate-transaction sessions are visible in the Dashboard reconciliation queue. The queue excludes guest order tokens, nested guest tokens, and payment initialization data.
- Existing refund mutation remains fail-closed for paid duplicate-transaction queue entries so it cannot refund the canonical provider transaction by mistake.
- No Prisma schema or migration changed.

## Review and regression closure

Independent read-only review found and verified fixes for:

- guest Cart add waiting while merge/delete removes the resolved Cart;
- shared seeded inventory mutation/restoration in Payment and conflicting-Checkout tests;
- target advisory-lock waiter matching in the Cart deletion race test;
- deterministic creation-time Checkout conflict interleaving;
- ERP release-job cleanup in alternate Checkout paths.

Final read-only re-review confirmed all directly scoped findings closed and found no new reproducible defect. Two broader designs remain explicit follow-ups rather than being silently expanded into this work unit: a duplicate-event-specific refund workflow, and full in-transaction revalidation/recalculation of mutable promotion, tax, dealer, shipping-policy, and inventory inputs.

## Integration verification

All successful commands used Node `22.22.2` and pnpm `11.13.0`.

Passed on Integration merge `fd31cfd7f8d5e5ebeaaa2a22863b1b7a439912d0`:

- Prisma Client generation and schema validation;
- full TypeScript across Web, DB, API, Worker, and CLI;
- API `121/121`;
- DB `3/3`;
- Worker `11/11`;
- package/protected contracts `40/40`;
- Backend builds for DB, API, Worker, and CLI;
- SEO/security, final transactional review, functional consent, product identifiers, error localization (`52` maintained literals + `2` dynamic messages), and fr-CA display formatting;
- existing-database preflight: `{ "ok": true, "failures": [] }`;
- local migration status: 41 migrations, schema up to date;
- production-API-driven static export and localization;
- artifact gates: SEO, fr HTML, 404/static fallback, Careers/Contact privacy, protected content, and current-tree Chromium browser QA;
- final export inventory: `393` HTML and `11` PDF files;
- post-test database checks: `0` invalid inventory snapshots and `0` private fixture products;
- tracked Integration tree clean after build; `git diff --check` passed.

Build-attempt evidence:

- Two initial `build:pages` attempts failed before page generation because `VANSTRO_WEBSITE_API_BASE_URL` was absent, first without loading an env file and then after loading the root `.env`, which does not define that public build variable.
- The guard was not bypassed and no URL was guessed. The final rerun used the repository handoff’s previously verified public read-only configuration: `VANSTRO_WEBSITE_API_BASE_URL=https://vanstro.ca/api/v1` and `VANSTRO_QA_EXTERNAL_API_ORIGINS=https://vanstro.ca`; build and all artifact/browser gates passed.
- Backend `api:smoke` was not executed because its destructive-smoke guard rejects the local `vanstro_dev` database. No test/smoke database was substituted and the guard was not bypassed.

## Boundaries and next step

- No push, deployment, production migration, staging/production write, real payment/refund, ERP connection/action, DNS/TLS change, stash operation, snapshot/release mutation, or branch/worktree cleanup occurred.
- Main promotion completed locally by strict fast-forward. A final continuity-only closure commit will be strictly fast-forwarded after the same collision protection check; no development occurs directly on Main.
- The harness created a locked read-only agent worktree/branch during review. It was not modified or removed because this cycle explicitly prohibits another branch/worktree cleanup.
