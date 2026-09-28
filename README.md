# VanStro

**An open-source, bilingual (EN / fr-CA) commerce and dealer-fulfillment platform built for the Canadian market.**

Most open-source storefronts assume a single warehouse shipping to one country's conventions. Canadian home-materials businesses work differently: orders are fulfilled by a network of local dealers, customers expect French and English, addresses follow Canada Post formats, and payment happens by card, in-store POS, or cash on pickup. VanStro is a full-stack TypeScript monorepo that handles that workflow end to end.

## What it does

- **Storefront.** Catalog browsing with search, filters, and sort; product pages with finish variants (SKU, model, and image); cart; pickup or delivery checkout; English and French (fr-CA) routes.
- **Dealer fulfillment.** A selected dealer location fulfills the order for pickup or delivery. Businesses can apply to become dealers at `/dealers/apply`.
- **Addresses.** Delivery checkout can call Canada Post AddressComplete when `CANADA_POST_API_KEY` is set. Without a key, the customer enters the address by hand.
- **Payments and orders.** Checkout accepts card (Moneris), in-store POS, or cash. The order page shows a status timeline, and guests can look an order up at `/orders/lookup`.
- **Operations.** The dashboard is role-based (RBAC). It includes CRM contacts, an email outbox, ERP sync jobs, audit logs, media, and first-party page analytics that are stored only when `consentAnalytics` is true.

## Architecture

| Area | Implementation |
| --- | --- |
| Storefront and dashboard | Next.js App Router, React 19, TypeScript, Tailwind CSS |
| HTTP API | Hono on Node (`apps/api`), base path `/api/v1` |
| Background worker | Node poll loop (`apps/worker`): email outbox, ERP sync, catalog sync |
| Database | PostgreSQL 16 and Prisma (`packages/db`), including migrations, seed data, and RBAC |
| Local runtime | Docker Compose for PostgreSQL; disposable PostgreSQL 16 containers for API and migration tests |
| Contract snapshot | `pnpm generate:openapi` writes OpenAPI 3.1 to `docs/openapi/vanstro-api.json` |
| Static demo | GitHub Pages workflow in `.github/workflows/deploy-pages.yml` |

## Quick start

Requirements: Node.js 22, pnpm 11.13.0 via Corepack, and Docker. Compose starts PostgreSQL 16 on port `15432`, which is what `.env.example` expects.

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm stack:dev
```

`pnpm stack:dev` starts the API (`:4000`), the worker, and the Next.js app (`:3000`).

| Surface | URL |
| --- | --- |
| Storefront | http://localhost:3000 |
| Dashboard | http://localhost:3000/dashboard |
| API | http://localhost:4000/api/v1 (readiness: `/health/ready`) |

Replace the placeholder secrets in `.env` before seeding. Do not commit `.env`.

## Live demo

A static storefront build is published at [https://kkofor.github.io/vanstro-frontend/](https://kkofor.github.io/vanstro-frontend/). It can lag this monorepo. It does not run the API, worker, or dashboard.

## Quality gates

`pnpm qa:ci` is the combined check: typecheck, API tests on disposable PostgreSQL 16, consent and storefront contract tests, a static Pages build, and artifact checks (SEO, French document language, 404s). Run it before a release. For a smaller change, run `pnpm typecheck` and the tests that cover the files you touched. Details are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues privately; see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Copyright (c) 2026 kkofor.

## Maintainer documentation

| Doc | Audience |
| --- | --- |
| [tasks/handoff.md](tasks/handoff.md) | **Structured backend takeover (continuity)** |
| [CLAUDE.md](CLAUDE.md) | Agent operating rules |
| [SPEC.md](SPEC.md) | Product / tech spec |
| [DECISIONS.md](DECISIONS.md) | Architecture decisions |
| [docs/backend/README.md](docs/backend/README.md) | Backend quick start |
| [docs/BACKEND-HANDOFF-2026-07-26.md](docs/BACKEND-HANDOFF-2026-07-26.md) | Deep backend handoff |
| [docs/SESSION-HANDOFF-FULL-LAUNCH-2026-07-26.md](docs/SESSION-HANDOFF-FULL-LAUNCH-2026-07-26.md) | Session deliverables list |
| [docs/DEVELOPING.md](docs/DEVELOPING.md) | Local full-stack commands |
| [docs/API-CONTRACT-ALIGNMENT.md](docs/API-CONTRACT-ALIGNMENT.md) | API route alignment |
| [docs/FRONTEND-HANDOFF-2026-07-26.md](docs/FRONTEND-HANDOFF-2026-07-26.md) | Frontend handoff |

## Project positioning

VanStro is not a cross-border marketplace. It is a Canadian commerce and
dealer-fulfillment platform:

- Shoppers browse products, cart, and checkout (card / POS / cash).
- Delivery uses Canadian address capture (Canada Post AddressComplete when keyed).
- Paid orders go to a selected or local dealer for pickup or delivery.
- Website CRM, email outbox, ERP sync jobs, and consent-gated first-party analytics
  support operations from the Dashboard.
- Qualified businesses can apply to become VanStro dealers.

## Backend

Production-oriented packages in this monorepo:

- `apps/api` — Hono API (`/api/v1`)
- `apps/worker` — email outbox, ERP outbound, catalog sync cron
- `packages/db` — Prisma schema, migrations, seed, RBAC

Quick start and gates: [docs/backend/README.md](docs/backend/README.md).  
Agent takeover: [docs/BACKEND-HANDOFF-2026-07-26.md](docs/BACKEND-HANDOFF-2026-07-26.md).

```bash
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm api:dev      # :4000
pnpm worker:dev
pnpm typecheck && pnpm test:api && pnpm api:smoke
```

**Production DNS / migrate deploy / live payment credentials require explicit user authorization.**

## Tech Stack

| Area | Current implementation |
| --- | --- |
| Storefront / Dashboard | Next.js App Router, React 19, TypeScript |
| API | Hono on Node (`apps/api`) |
| Worker | Node poll loop (`apps/worker`) |
| Database | PostgreSQL + Prisma (`packages/db`) |
| Styling | Global CSS in `src/app/globals.css` |
| Icons | `lucide-react` |
| Contracts | `src/lib/api/api-contract.ts` + Dashboard client |
| Package manager | pnpm |

## Run Locally

```bash
corepack enable
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

If port `3000` is busy:

```bash
pnpm dev -- -p 3001
```

## Validate

Frontend:

```bash
pnpm run typecheck
pnpm run build:pages
```

Backend gates (required after API/worker/db changes):

```bash
pnpm typecheck
pnpm test:api
pnpm api:smoke
```

Product and homepage smoke QA:

```powershell
$env:VANSTRO_QA_BASE_URL='http://127.0.0.1:3001'
node qa\verify_product_pages.mjs
```

Current verified routes:

- `/`
- `/products`
- `/products/base-cabinet-b33`

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/products` | Catalog listing |
| `/products/[slug]` | Product detail |
| `/cart` | Cart |
| `/checkout` | Checkout (pickup/delivery + payment method) |
| `/checkout/payment` | Card / POS / cash payment |
| `/orders/[id]` | Order status timeline + shipment |
| `/orders/lookup` | Guest order lookup |
| `/favorites` | Saved products |
| `/account` | Customer account overview |
| `/account/profile` | Profile |
| `/account/addresses` | Address book |
| `/account/orders` | Order history |
| `/account/login` | Sign in |
| `/account/register` | Register |
| `/dashboard` | Admin dashboard |
| `/dealers/apply` | Dealer application |
| `/articles` | Resource center |
| `/about` | Company overview |
| `/contact` | Contact |
| `/privacy` | Privacy |
| `/cookie-settings` | Cookie preferences |

## Current Page Rules

Homepage:

- Preserve the approved v1 visual direction.
- Hero copy must communicate Canada-wide delivery/service and local dealer
  fulfillment.
- Popular products must show exactly 8 product windows in a 4x2 desktop grid.
- Product windows use 1:1 image frames with `object-fit: contain`.
- Homepage must not expose detailed inventory numbers.

Product listing:

- `/products` shows catalog browsing, search, filters, sort, category tiles,
  dealer fulfillment support, and product cards.
- Listing cards show category, title, SKU, size, color, rating, price, and cart
  action.
- Listing cards must not show detailed inventory numbers.
- Cabinet and vanity colors are white-facing only in the current catalog.
- Future categories such as flooring and doors/windows remain visible so the
  platform does not look too narrow.

Product detail:

- PDP is where buyer decision detail belongs: gallery, SKU/model, price, finish,
  quantity, add to cart, selected dealer, pickup/delivery context, overview,
  specifications, documents, Q&A, reviews, and related products.
- PDP may show dealer fulfillment quantity because the buyer is near a purchase
  decision.
- Finish selection is wired for variant SKU/model/image mapping.

## Project Structure

```text
src/app/                         App Router pages and layout
src/app/globals.css              Brand tokens, layout, responsive CSS
src/components/home/             Homepage sections
src/components/layout/           Header, footer, cookie UI, support widget
src/components/product/          Product listing, product detail, purchase UI
src/components/checkout/         Cart, checkout, order detail, cart drawer
src/components/storefront/       Cart/favorites/dealer context
src/lib/api/                     Reserved API contracts and client wrapper
src/lib/commerce/                Price, promotion, inventory helpers
src/lib/data/mock-data.ts        Composed mock storefront data
src/lib/data/original-site-*     Imported original-site product/image data
src/lib/product/                 Catalog config and PDP view model
src/lib/assets.ts                GitHub Pages-safe asset path helper
public/assets/                   Brand, generated, and original-site assets
qa/                              Smoke QA scripts and screenshots
.github/workflows/               GitHub Pages deployment
```

## Backend/API Boundary

Visual components should receive data from `src/lib/api/server.ts`,
`src/lib/api/api-client.ts`, and typed contracts in `src/lib/api/api-contract.ts`.
Do not call raw backend URLs directly from page components.

Important future backend/admin data:

- Product title, brand, slug, category, model, SKU
- Finish variants and variant-level SKU/model/image data
- Price, compare-at price, price labels, promotions, campaign rules
- Dealer assignment, service areas, fulfillment mode, product quantity by dealer
- Product images, documents, specifications, overview copy
- Reviews, Q&A, related products, saved products, cart and checkout state
- Homepage sections, category cards, campaign banners, footer links, cookie text

Config and composition files:

```text
src/lib/product/catalog-config.ts
src/lib/product/product-detail-view-model.ts
src/lib/data/mock-data.ts
src/lib/api/api-contract.ts
src/lib/api/server.ts
```

Form submissions and future dashboard-backed API calls use an external backend
base URL. Override the default VanStro API host with:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.example/api/v1
```

## Customer Support / Tiledesk

The support entry is Tiledesk-ready. During the static demo phase, the site falls
back to the VanStro-branded mock AI support widget. When a Tiledesk project is
available, set:

```text
NEXT_PUBLIC_TILEDESK_PROJECT_ID=your_tiledesk_project_id
NEXT_PUBLIC_TILEDESK_DEPARTMENT_ID=optional_department_id
NEXT_PUBLIC_TILEDESK_WIDGET_URL=https://widget.tiledesk.com/v6/launch.js
```

The frontend passes page, selected dealer, postal code, and cart count as
`customAttributes` so the later AI/human handoff can keep order and dealer
context. Contact-page chat buttons dispatch `vanstro:support-request`; with
Tiledesk enabled, that event opens the Tiledesk widget.

## Design Direction

- Use VanStro deep green as the site-wide brand anchor.
- Use orange for purchase, dealer, and high-intent actions.
- Keep content surfaces mostly white with restrained borders.
- Avoid heavy repeated overlays outside image-led category modules.
- Keep navigation, search, logo, and CTA modules aligned on fixed heights.
- Keep product imagery crisp, square where expected, and never destructively
  cropped when the buyer needs to inspect the item.
- Keep `Become a Dealer` and `Partner Login` visible as B2B entry points.
- Do not introduce a separate estimate/request workflow unless the business
  explicitly approves it.

## Deployment

The repository deploys automatically to GitHub Pages on pushes to `main`.

Workflow:

```text
.github/workflows/deploy-pages.yml
```

For GitHub project pages, `NEXT_PUBLIC_BASE_PATH` is set automatically to the
repository name. Use `assetPath("/assets/...")` for public assets so images work
both locally and under `/vanstro-frontend/`.

Manual redeploy:

```bash
gh workflow run deploy-pages.yml
```

## Related Notes

Detailed handoff:

[HANDOFF.md](./HANDOFF.md)

Product experience notes:

[PRODUCT.md](./PRODUCT.md)
