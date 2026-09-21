# Frontend Checkpoint — 2026-07-29 Fullstack9 Presentation Reconciliation

## Identity

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Recovery worktree: `.claude/worktrees/presentation-reconciliation`
- Recovery branch: `recovery/fullstack9-presentation-on-current`
- Recovery parent/full HEAD before the local recovery commit: `0e45d23b7c3c021b9ded511b7d2abe18df99a5b7`
- Visual acceptance baseline: immutable Fullstack9 snapshot served locally at `http://127.0.0.1:4176`
- Accepted candidate: static export served locally at `http://127.0.0.1:4177`
- Status at checkpoint creation: source and artifact verification passed; local recovery commit pending

## Accepted scope

The accepted candidate preserves the current canonical source, complete fr-CA content, and all current functional/security/data contracts while reconciling only the confirmed presentation differences with Fullstack9:

- About, Contact, Dealer Program, Dealer Map, Dealer Application, Careers, Resource Center, and Legal pages use the approved unified secondary-hero geometry.
- Cart, Checkout, and Payment remove the visual progress strip and use the compact Fullstack9 presentation.
- Cart removes only the redundant assurance list; authoritative item identity, API money, mutation states, errors, and accessible controls remain.
- Checkout and Payment functional clients are unchanged; compactness is implemented through scoped CSS only.
- Careers remains exactly three roles in both locales with no unsupported compensation copy.
- Resource Center remains exactly 2 catalogs, 8 installation guides, 1 warranty document, 11 tracked PDFs, and 3 Planning Guides in both locales.
- Complete local fr-CA is retained even where it creates a taller mobile hero than the older production fallback.

## Business-source changes

Exactly 12 business source files differ from the parent:

- `src/app/about/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/checkout/payment/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/dealer-program/page.tsx`
- `src/app/dealers/apply/page.tsx`
- `src/app/dealers/map/page.tsx`
- `src/app/globals.css`
- `src/components/checkout/CartClient.tsx`
- `src/components/layout/SecondaryPageHero.tsx`
- `src/components/legal/LegalPageTemplate.tsx`

The final business diff is 12 files, 449 insertions, and 32 deletions. The accepted 440/35 visual candidate received one pre-commit accessibility correction: the bilingual Commerce progress navigation and `aria-current="step"` semantics were restored inside the existing `.visually-hidden` utility while the progress strip remained visually absent.

## CSS and protected-boundary review

- New presentation CSS is restricted to `.unified-content-hero*`, `.checkout-layout*`, and `.payment-layout*`, plus their explicit responsive descendants.
- The content-hero custom properties are local to `.unified-content-hero`; no `:root`, `html`, `body`, global palette, or existing color-token definition is changed.
- The only new `.form-grid.two` rule is `.checkout-layout .form-grid.two` within the `max-width: 640px` responsive block.
- `CheckoutClient.tsx` and `PaymentClient.tsx` have zero-byte diffs.
- Header, Footer, Homepage, Catalog, PDP, Account, Password Reset, Dashboard, API, Worker, DB, Prisma, migrations, deployment, and public API-contract paths have no business-source diff.
- No production HTML, RSC, hashed chunk, snapshot artifact, environment file, or secret is committed as source.

## 4176 / 4177 browser evidence

- Both previews used one known local listener and returned HTTP 200 for representative routes.
- About desktop geometry matched exactly: hero `340px`, visual `230px`.
- About mobile geometry matched exactly at the tested viewport: hero `585.125px`, visual `230px`.
- Contact, Careers, Resource Center, Legal, and Dealer Map desktop heroes measured `340px`; image/summary panels measured `230px`; tested pages had no root horizontal overflow.
- Careers DOM retained exactly three roles.
- `/fr/dealer-program/` had zero root-page horizontal overflow. Its operating-model table remains intentionally scrollable inside its own container.
- The complete F2 French Dealer Program copy produces a taller mobile hero than the older production fallback; this is an accepted content-preservation difference, not overflow.
- Checkout static hero geometry matched Fullstack9 at `169.5625px` with no progress strip and no root overflow.
- Static preview cannot establish a live populated Cart/Checkout/Payment journey because the static server has no runtime API/session state; functional protection is instead covered by source-diff, contract, API, and browser gates below.

## Node 22 verification

All final verification used Node `22.22.2` and pnpm `11.13.0`.

Passed:

- Prisma Client generation.
- Full TypeScript across Web, DB, API, Worker, and CLI.
- DB tests: 3/3.
- API tests: 106/106 using the canonical local environment without copying or printing secrets.
- Worker tests: 11/11.
- Package/protected contracts: 30/30.
- Final transactional review.
- SEO/security source gate.
- Runtime error localization: 52 maintained backend literals and 2 dynamic Commerce messages.
- fr-CA display formatting.
- Functional-consent storage.
- Careers/Contact privacy source and artifact gates.
- Product localization and identity: 140 parents, 294 variants, all invariant fields retained.
- Static export with production URL/API settings.
- SEO artifacts: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs.
- French HTML language gate: 195 artifacts.
- EN/fr 404 artifacts and static fallback.
- Protected artifacts: 3 Careers roles per locale, Resource split 2/8/1, 11 exported PDFs with byte/SHA-256 matches, 3 Planning Guides, bilingual About/Contact, and protected route shells.
- Chromium current-tree browser gate: 40/40.
- `git diff --check`.

Browser console review found no runtime errors. Two cross-page image-preload warnings were observed after navigating among pages in one preserved DevTools session; they did not indicate a route or rendering failure.

## Protected regressions retained

The combined contracts and full-stack tests retain coverage for:

- authoritative Cart `cartItemId`, `skuId`, variant SKU, `unitPrice`, `lineTotal`, subtotal, and currency;
- Checkout safe errors, idempotency, semantic controls, and unmount protection;
- Payment polling, guest-order token handoff, provider locking, reconciliation, and `refund_processing`;
- canonical Account GET/PATCH;
- Password Reset lifecycle and localization;
- deny-by-default Dashboard access;
- Catalog filtering and deterministic business order;
- eight-SKU curated Homepage selection;
- Header/navigation, Footer content, 404, EN/fr, desktop/mobile, and protected content artifacts.

## Explicit boundaries

Not performed:

- no merge to `integration/fullstack` or `main` at checkpoint creation;
- no push or deployment;
- no production migration, DNS/TLS change, real payment, or refund;
- no stash operation;
- no modification of `feature/frontend` or `feature/backend`;
- no worktree, snapshot, Fullstack8, Fullstack9, or release deletion.
