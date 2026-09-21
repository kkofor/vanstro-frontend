# Integration checkpoint — API test state isolation

Date: 2026-07-30

## Identity

- Pre-merge blocked candidate: `aeaa54064b18cbcbd5ca1947f2c45f2f801f2b91` (tree `92bd31b2a68f43e29e4d6c82a8f6e185eae1b077`).
- Backend implementation/evidence commit: `3f1688000825e8e9bf03e143bddbcee2c35425b8`.
- Backend continuity tip: `9c08d27e7a39ff7fd1ef8de1125d8cd73d20eea7`.
- Normal two-parent Integration merge: `5532e210c6cf56c317b83974ea509b053a1c1fb8`.
- Merge parents: `aeaa54064b18cbcbd5ca1947f2c45f2f801f2b91`, `9c08d27e7a39ff7fd1ef8de1125d8cd73d20eea7`.
- Merge tree: `fd2ff9aa63fac2f4c06864768052c21048fe0dd2`.

## Integrated scope

- Dashboard test observes Product/Category counts from the same real Prisma request and separately covers the production `createApp` route mounting. Production queries, permissions, DTO and error behavior are unchanged.
- Deployment auth-cookie test owns and precisely removes a unique distributed `auth:<test-ip>` bucket while restoring proxy env unconditionally.
- Cart/Checkout concurrent test requests settle before cleanup.
- Successful Checkout tests own private Product/SKU/Price/InventorySnapshot fixtures and clean every related row child-first by exact ID.
- Seed-only Checkout tests use canonical SKU identity instead of broad unordered SKU selection.
- No public API/Frontend contract, Product/Cart/Checkout behavior, schema, migration or deployment configuration changed.

## Independent review

- Dashboard review initially found count-reader replacement did not cover production Prisma wiring, then found observer-only routing did not cover production mounting. Both findings were fixed. Final review confirmed the real Prisma queries, exact same-request DTO mapping and complete production mount path are covered, with no remaining finding.
- State-isolation review confirmed exact rate-limit key ownership, nested-finally env restoration, private fixture ownership/FK cleanup, all-settled concurrent request handling and preserved business assertions. No remaining finding.

## Integration verification

All successful commands used Node `22.22.2`, pnpm `11.13.0`, and local loopback `vanstro_dev`.

- Prisma generate/validate: passed.
- Migration status: 41 migrations, up to date.
- DB tests: `3/3`.
- Dashboard: `4/4`.
- Auth-cookie/rate-limit: `5/5`.
- Cart invariants: `10/10`.
- Checkout integration: `8/8`.
- Payment callback/recovery: `10/10`.
- Real default `pnpm test:api`: five consecutive runs `121/121`, zero failed/skipped.
- Worker: `11/11`.
- Package/protected contracts: `40/40`.
- Full TypeScript and Backend builds: passed.
- Existing-database preflight: passed.
- Error localization, final-review, SEO/security, fr-CA format, functional consent and product identifiers: passed.
- Production-API static export: `396/396`.
- Artifact gates: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 SKUs, 195 French HTML, 404/static fallback, privacy and protected content passed.
- Chromium: `40/40`.
- Export inventory: 393 HTML, 11 PDFs.
- Payment EN/fr no-referrer: `2/2`.
- Static embedded guest token/paymentInit/query token/private/access key values: `0`.
- `api:smoke`: safely blocked before destructive requests because `vanstro_dev` is not test/smoke-named; guard not bypassed.

Every counted API/targeted round returned both complete database state and distributed rate-limit buckets to the exact pre-test baseline. Invalid inventory and private Product fixtures remained zero; inventory content hash remained `9ee0cc030d1488a58be2e857abe6a3ccf89d4702093346cc00884f4d2c484db1`.

## Boundaries

- Main promotion, new candidate tag and recovery assets remain pending this checkpoint/Integration evidence commit.
- No push, fetch, deploy, staging/production write, production migration, real payment/refund, ERP action, stash operation, worktree cleanup or protected Main-untracked mutation occurred.
