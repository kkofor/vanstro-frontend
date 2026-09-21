# Backend checkpoint — API test state isolation

Date: 2026-07-30

## Baseline and blocker

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`
- Backend implementation/evidence commit: `3f1688000825e8e9bf03e143bddbcee2c35425b8` (parent `aeaa54064b18cbcbd5ca1947f2c45f2f801f2b91`, tree `9675a8c903a9dc968429dbf8a3a3d49c81197245`).
- Backend was strictly fast-forwarded from `dc59ba5ca592d74bc39d9482868c672ad6a70f82` to blocked candidate `aeaa54064b18cbcbd5ca1947f2c45f2f801f2b91` (tree `92bd31b2a68f43e29e4d6c82a8f6e185eae1b077`) before editing.
- The blocked candidate’s real `pnpm test:api` command had failed twice at `dashboard-features.test.ts:41` because the response count and a later live database count observed different global Product states.
- A deterministic owned-Product proof observed response `22`, later count `21`, and delta `1` after deleting the fixture between those two reads.

## Changes

- Dashboard overview keeps the exact production Prisma queries, permissions, HTTP DTO and error behavior. A route-factory-only optional observer receives the Product/Category counts after the real queries complete. Production `createApp()` supplies no observer; external HTTP requests cannot inject one.
- The Dashboard test uses real login, real `requireDashboardPermission`, and the real route, then compares the HTTP DTO exactly with the values observed from that same request. It verifies one observer invocation and no longer performs a second global count at another point in time.
- Deployment auth-cookie registration uses a unique RFC 3849 client IP, producing a uniquely owned `auth:<ip>` distributed rate-limit key. It deletes only that exact key and restores `TRUST_PROXY_HEADERS` in a nested `finally`; no table-wide cleanup or production threshold change.
- Cart and Checkout concurrent requests use `Promise.allSettled`-based helpers so every sibling settles before cleanup can begin.
- Checkout tests that consume/reserve inventory use private Product/SKU/Price/InventorySnapshot fixtures. Cleanup uses exact IDs and child-first FK order, including reservation ERP jobs, Payment events/sessions, CRM events/contact, Cart items/Cart, inventory, prices, SKU and Product.
- Checkout cases that only need seed identity now select canonical SKU `011090130` instead of broad unordered `findFirst`, preventing selection of another concurrent test’s private SKU.
- Conflicting Checkout verifies the exact `CHECKOUT_INVALID` 409 contract in addition to winner/session/reservation invariants.
- No public API contract, Product/Cart/Checkout behavior, Frontend, Prisma schema, migration or deployment configuration changed.

## Rejected experiments and recovery

- A PostgreSQL `SHARE` table-lock experiment was rejected because it blocked concurrent fixture cleanup. Its code was fully removed before the final diff.
- Direct Node mocking of Prisma Proxy delegate methods was rejected because Prisma dynamically materializes the methods and they could not be safely restored.
- Precisely identified residual private fixtures from failed experiments were inspected for zero references and deleted by exact IDs. Final database state returned to the original baseline.
- One state-snapshot command hit a transient local PostgreSQL `P1001`; that state check was invalidated and rerun successfully. The associated test result was not counted without a successful immediate state verification.

## Verification

All successful commands used Node `22.22.2`, pnpm `11.13.0`, and local loopback database `vanstro_dev`.

- Backend typecheck: passed.
- Dashboard isolated: `4/4`.
- Dashboard paired with ERP/Cart/Checkout/Payment: `7/7`, `14/14`, `12/12`, `14/14`; each pair repeated ten rounds after the final isolation approach.
- Auth-cookie isolated: `5/5`, ten rounds; exact distributed bucket state returned to baseline each round.
- Auth-cookie plus concurrent registration suites: `18/18`, ten rounds; exact bucket and database state returned to baseline each round.
- Cart isolated: `10/10`, ten rounds.
- Checkout isolated: `8/8`, ten rounds.
- Cart + Checkout: `18/18`, ten rounds.
- Cart + Checkout + Payment: `28/28`, ten rounds.
- Cart + Checkout + Payment + ERP: `31/31`, ten rounds.
- Comprehensive Dashboard + auth-cookie + Cart + Checkout + Payment + ERP: `40/40`, ten rounds after the final review fix.
- Real default `pnpm test:api`: final five consecutive runs `121/121`, zero failed, zero skipped; no concurrency override.
- DB tests: `3/3`.
- Worker tests: `11/11`.
- Package/protected contracts: `40/40`.
- Prisma generate/validate: passed.
- Migration status: 41, up to date.
- Backend builds and existing-database preflight: passed.
- `api:smoke`: safely blocked before destructive requests because `vanstro_dev` is not a test/smoke database; guard not bypassed.

Every counted round restored the complete database baseline:

- Product/SKU/Price: `21/21/21`
- InventorySnapshot: `3`, invalid `0`
- Cart/CartItem: `43/43`
- PaymentSession/PaymentEvent: `7/0`
- Order/OrderItem: `2/2`
- InventoryReservation: `45`
- private Product fixture matches: `0`
- inventory content SHA-256: `9ee0cc030d1488a58be2e857abe6a3ccf89d4702093346cc00884f4d2c484db1`
- distributed rate-limit bucket rows and counts: exact pre-test baseline after each counted rate-limit/default suite.

## Review and boundaries

- Independent Dashboard review found two successive coverage gaps: replacing count readers did not cover production Prisma wiring, and the first observer test did not cover production route mounting. The final implementation observes real query results and also requests the complete `createApp → createDashboardRoutes → no-argument createDashboardSystemRoutes` path. Final re-review confirmed the finding closed with no new reproducible issue.
- Independent test-isolation review confirmed the rate-limit key ownership, unconditional env restoration, private Checkout fixture cleanup order and concurrent settlement behavior; no remaining test-isolation finding.
- No push, fetch, deploy, staging/production write, production migration, real payment/refund, ERP action, stash operation, worktree cleanup or protected Main-untracked mutation occurred.
