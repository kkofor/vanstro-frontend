# VanStro Frontend

Static storefront demo for VanStro Global Supply, a Canada-focused home
materials commerce and dealer-fulfillment platform.

Live demo:

[https://kkofor.github.io/vanstro-frontend/](https://kkofor.github.io/vanstro-frontend/)

Repository:

[https://github.com/kkofor/vanstro-frontend](https://github.com/kkofor/vanstro-frontend)

## Project Positioning

VanStro is not a cross-border marketplace. The current site is a frontend
foundation for a Canadian commerce and supply-chain platform:

- Homeowners and project buyers browse products, add items to cart, and move
  toward online checkout.
- Contractors and B2B buyers browse the same catalog with dealer-backed
  fulfillment context.
- Paid orders are handed to a selected or local VanStro dealer for pickup,
  delivery coordination, and project support.
- Qualified businesses can apply to become VanStro dealers.

The current implementation is a static demo with typed mock data. It is prepared
so a backend, dashboard, dealer portal, payment system, and inventory service can
replace mock data later without rewriting page components.

## Tech Stack

| Area | Current implementation |
| --- | --- |
| Core platform | Next.js App Router static export |
| Language | TypeScript |
| Runtime versions | Next.js 16.2.9, React 19.2.7, TypeScript 6.0.3 |
| Styling | Global CSS in `src/app/globals.css` |
| Icons | `lucide-react` |
| Data layer | Typed API contracts plus mock data adapters |
| Client state | React context with `localStorage` persistence |
| Package manager | pnpm |
| Deployment | GitHub Pages through GitHub Actions |

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

```bash
pnpm run typecheck
pnpm run build:pages
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
| `/` | Approved homepage direction |
| `/products` | First-level product listing/catalog page |
| `/products/[slug]` | Product detail page |
| `/cart` | Cart preview and quantity management |
| `/checkout` | Checkout placeholder |
| `/orders/demo-order` | Demo order tracking view |
| `/favorites` | Saved products |
| `/account/login` | Customer or partner login entry |
| `/account/register` | Customer registration entry |
| `/dealers/apply` | Dealer application page |
| `/articles` | Resource center listing |
| `/articles/[slug]` | Article detail placeholder |
| `/about` | Company overview |
| `/contact` | Contact page |
| `/privacy` | Privacy placeholder |
| `/cookie-settings` | Cookie preference route |

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

Set the backend URL later with:

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
