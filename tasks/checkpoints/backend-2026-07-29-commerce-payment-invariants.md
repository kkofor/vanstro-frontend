# Backend checkpoint — Cart currency/quantity and payment reconciliation invariants

Date: 2026-07-29

## Baseline and scope

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`
- Cycle baseline: `626772fd347967a0b067864f605eb63298e90245`
- Backend functional commit: `3baa95609cc3aa773561a49c6bff9b7258ce960c` (tree `7d65b643f853e6aeb5ad91b065303ce2a4350112`).
- Scope: enforce the CAD Cart/Price invariant, enforce final Cart quantities in `1..999`, make duplicate provider transactions operationally visible without repeating order/inventory/Cart/refund effects, and add route/integration regression coverage.
- Schema/migrations: none. The existing PaymentSession, PaymentEvent, Cart, Price, and inventory models were sufficient.

## Verified behavior

- Cart reads and mutations load only active prices matching the Cart currency; current storefront Carts are explicitly CAD.
- Missing CAD prices and persisted mixed-currency Cart states fail closed with `COMMERCE_INVALID` instead of summing unrelated minor units.
- Cart add, PATCH, concurrent add, and guest-to-customer merge enforce a final quantity of `1..999` under a Cart advisory lock.
- Cart add revalidates the resolved Cart after acquiring its lock and returns a stable `409` if a concurrent guest-to-customer merge deleted it; the successful response snapshot is loaded inside the same transaction.
- Checkout reloads the Cart under the same advisory lock before session creation and rejects a changed Cart snapshot.
- Concurrent identical Checkout intents reuse one pending session; concurrent different payloads produce one `201` winner and one `409` conflict with one active reservation.
- Same-session/same-provider-transaction callbacks remain idempotent.
- A second provider transaction for an already ordered session creates a deterministic reconciliation event while preserving the canonical provider transaction, order, inventory, Cart, and refund lifecycle state.
- Cross-session reuse of a unique provider transaction leaves one canonical paid session/order and marks the losing session for reconciliation.
- Paid sessions with a duplicate-transaction reconciliation event are visible in the Dashboard reconciliation queue. Queue DTOs omit `guestOrderToken`, nested order guest tokens, and `paymentInit`; the existing refund mutation cannot refund these paid duplicate entries.
- New Payment and conflicting-Checkout tests create and delete private Product/SKU/Price/InventorySnapshot fixtures instead of mutating shared seeded inventory. Post-suite query found `0` snapshots with negative or over-reserved inventory.

## Verification evidence

All commands used Node `22.22.2` and the local development PostgreSQL database unless noted.

- `pnpm db:generate`: passed.
- `prisma validate --schema prisma/schema.prisma`: passed.
- Cart invariant route tests: `10/10` passed, including a deterministic deleted-Cart lock-wait race.
- Payment callback/recovery tests: `10/10` passed with per-test private catalog/inventory fixtures.
- Checkout integration tests: `8/8` passed; the new conflicting-intent case uses a private catalog/inventory fixture.
- `pnpm test:db`: `3/3` passed.
- `pnpm test:api`: `121/121` passed after independent-review fixes. One earlier run was invalid because it was mistakenly launched in parallel with the three DB-writing target suites and a Dashboard aggregate observed a temporary private fixture (`22 !== 21`); after both processes ended, the full API suite was rerun alone and passed `121/121`.
- `pnpm test:worker`: `11/11` passed.
- `pnpm typecheck:backend`: passed for DB, API, Worker, and CLI.
- `pnpm build:backend`: passed for DB, API, Worker, and CLI.
- `pnpm test:package-contracts`: `40/40` passed.
- `pnpm test:final-review`: passed.
- `pnpm qa:seo-security`: passed.
- `pnpm preflight:existing-database`: passed with `{ "ok": true, "failures": [] }`.
- `prisma migrate status`: 41 migrations found; local `vanstro_dev` schema is up to date.
- `git diff --check` and staged `git diff --cached --check`: passed.
- High-confidence credential scan of the source and staged functional diff: no matches.
- Independent read-only review: all directly scoped findings were fixed and re-reviewed; no new reproducible defect remained.
- `pnpm api:smoke`: not run. Its destructive-smoke guard safely rejected `vanstro_dev`; the guard was not bypassed and no test/smoke database was substituted.

## Boundaries and remaining integration work

- This checkpoint is local evidence only. No push, deploy, production migration, staging/production write, real payment/refund, or ERP action occurred.
- Backend commit, Integration merge/full-stack gates, Integration evidence commit, and Main strict fast-forward are recorded only after they actually occur.
- Follow-up risks outside this work unit remain: a dedicated duplicate-provider-transaction refund workflow keyed to the duplicate event (the existing mutation intentionally stays fail-closed to avoid refunding the canonical transaction); full in-transaction revalidation/recalculation of mutable promotion, tax, dealer capability, shipping-policy, and inventory inputs; dedicated fail-closed test-database enforcement for all DB-backed API tests; migration of guest query tokens; broader Dashboard payment-session DTO minimization; ERP cancellation/refund-state alignment; and deterministic selection when a product has multiple variants but no `skuCode` is supplied.
