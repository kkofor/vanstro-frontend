# Integration Checkpoint — 2026-07-29 Frontend API Contract Boundary

## Identity

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Integration worktree/branch: `.claude/worktrees/integration` / `integration/fullstack`
- Shared parent: `d0632581aeeb0d6839165dedc27e8fb27c0d78d9`
- Frontend functional commit: `d24dcf09612f539972edcb43b0b57944bcc9a1fe`
- Functional merge: `571e8897404e743d82d06292656e7d3fe39481b4`
- Frontend evidence commit: `69319575e3317070a90a2aa94cf1c9e5e6d32e3a`
- Evidence merge: `42640b832444c07dabcbc9fb813cedea7ccabf05`
- Backend source change: none
- Status at checkpoint creation: locally integrated and verified; Integration evidence commit and Main strict fast-forward pending

## Integration review

Both Frontend merges were normal two-parent merges with no explicit conflicts. Integration had not advanced independently, and the functional merge tree matched the Frontend functional tip exactly. The functional delta contains only Frontend API types/validation/client/server mapping, Payment referrer policy, tests, package gate registration, and Frontend continuity files. No Backend, Prisma, migration, Worker, Dashboard access, deployment, production asset, or protected Main-untracked path changed.

## Verified behavior

- Unknown and internal API messages/field strings are discarded before customer display.
- Storage errors cannot block requests, reverse successful mutations, or lose same-tab guest Cart continuity; a volatile fallback carries the token until storage recovers or authenticated Cart merge retires it.
- Login/register/logout are safe when `window` is absent.
- Cart mutations use selected SKU identity, validate once, enforce `1..999`, preserve authoritative IDs/money, and reject currency mismatch.
- Both Backend pagination formats and declared meta fields are validated.
- Static and runtime Checkout statuses use one exact nine-status set matching Prisma.
- Checkout money, currencies, date, identifiers, and shipping address are validated.
- Website product validation matches the real production public wire (`category: string`) while accepting the older object category shape and validating optional product fields used by server mapping.
- Payment pages add `no-referrer` while retaining query-token URL scrubbing.
- GET/PATCH Account uses the canonical DTO and validator.
- Contact and Dealer submission payloads retain canonical locale-aware shapes.

## Full-stack verification

All final commands used Node `22.22.2` and pnpm `11.13.0`.

Passed on Integration functional merge `571e8897404e743d82d06292656e7d3fe39481b4`:

- Prisma Client generation;
- full TypeScript across Web, DB, API, Worker, and CLI;
- Prisma schema validation;
- DB 3/3;
- API 106/106;
- Worker 11/11;
- package/protected contracts 40/40;
- direct API-client tests 6/6;
- final transactional review;
- SEO/security source gate;
- runtime error localization: 52 maintained literals and 2 dynamic Commerce messages;
- fr-CA display formatting;
- functional consent storage;
- clean production-configured static export: 396/396 routes;
- localized French HTML: 195;
- SEO inventory: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs;
- EN/fr 404 and static fallback;
- Careers/Contact privacy source/artifact gates;
- protected artifacts: Careers 3 roles per locale, Resource Center 2/8/1, 11 PDFs with byte/SHA-256 matches, 3 Planning Guides, protected Account/Cart/Checkout/Payment/Dashboard route shells;
- Chromium current-tree browser gate: 40/40;
- final export: 5,060 files, 393 HTML, 195 French HTML, 11 PDFs;
- EN/fr Payment artifacts include `no-referrer`.

## Remaining Backend-owned issues

1. Cart and Price currencies are unconstrained strings, active prices are not selected by Cart currency, and mixed currencies can be summed under `cart.currency`. Frontend remains fail-closed; Backend must enforce the invariant.
2. A duplicate provider transaction can create a reconciliation event while the session remains `paid`; Dashboard reconciliation filtering can then hide it.
3. Guest Payment/Order query tokens require a coordinated migration to a header or HttpOnly/session-bound capability. Current Frontend mitigates with `no-referrer` and URL scrubbing.
4. Stable localized field-level errors require a future code-based public contract; Backend currently emits no canonical public `fields`.

## Boundaries

Not performed: Backend implementation change, schema/migration change, staging, production write verification, real payment/refund, ERP connectivity, push, deployment, production migration, stash operation, branch/worktree cleanup, snapshot/release mutation, or protected Main-untracked mutation. Production remains separately evidenced as Fullstack9.
