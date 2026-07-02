# VanStro Frontend

Frontend rebuild demo for VanStro Global Supply, a Canada-focused home materials
commerce and supply platform.

The site is designed for two primary audiences:

- Homeowners and project buyers who browse products, add items to cart, checkout
  online, and have the paid order fulfilled by a local VanStro dealer.
- Contractors, dealers, and B2B partners who evaluate the platform and apply for
  the dealer program.

Live demo:

[https://kkofor.github.io/vanstro-frontend/](https://kkofor.github.io/vanstro-frontend/)

## Tech Stack

| Area | Current implementation |
| --- | --- |
| Core platform | Next.js App Router static export |
| Language | TypeScript |
| Framework versions | Next.js 16.2.9, React 19.2.7 |
| Styling | Global CSS with design tokens in `src/app/globals.css` |
| Icons | `lucide-react` plus a small inline social icon set |
| Data layer | Typed mock data and API contracts |
| Client state | React context with `localStorage` persistence |
| Runtime used in CI | Node.js 24 |
| Package manager | pnpm |
| Deployment | GitHub Pages through GitHub Actions |
| Character encoding | UTF-8 |

This repository is currently a frontend/static demo. It does not include the
production backend, database, ERP, payment gateway, dealer portal backend, or
inventory system.

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

If port `3000` is already in use:

```bash
pnpm dev -- -p 3001
```

## Build And Validate

```bash
pnpm run typecheck
pnpm run build:pages
```

The static export is written to:

```text
out/
```

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Current VanStro homepage direction |
| `/v1-1` | Earlier alternate homepage iteration kept for reference |
| `/products` | Product listing |
| `/products/[slug]` | Product detail page with stock-oriented structure |
| `/cart` | Cart preview and quantity management |
| `/checkout` | Checkout flow placeholder |
| `/orders/demo-order` | Demo order tracking view |
| `/favorites` | Saved products |
| `/account/login` | Customer or partner login entry |
| `/account/register` | Customer registration entry |
| `/dealers/apply` | Dealer application page |
| `/articles` | Resource center listing |
| `/articles/[slug]` | Article detail placeholder |
| `/about` | Company overview |
| `/contact` | Contact page |
| `/cookie-settings` | Cookie preference drawer route |

## Project Structure

```text
src/app/                         App Router pages and layout
src/app/globals.css              Brand tokens, layout, responsive CSS
src/components/home/             Homepage sections
src/components/layout/           Header, footer, cookie UI, support widget
src/components/product/          Product cards and purchase actions
src/components/checkout/         Cart, checkout, order detail clients
src/components/storefront/       Client-side cart/favorites/order context
src/lib/api/                     Reserved API contracts and client wrapper
src/lib/data/mock-data.ts        Temporary mock data
src/lib/assets.ts                GitHub Pages-safe asset path helper
public/assets/                   Brand, generated, and legacy site assets
.github/workflows/deploy-pages.yml  GitHub Pages deployment workflow
```

## API Boundary

The frontend reserves a typed API layer so production backend integration can
replace mock data without rewriting UI components.

Important files:

```text
src/lib/api/api-contract.ts
src/lib/api/api-client.ts
src/lib/api/server.ts
src/lib/data/mock-data.ts
```

Reserved endpoint groups include:

- Homepage products, banners, and articles
- Product list and product detail
- Cart add/list/remove
- Favorites add/list/remove
- Dealer list and dealer selection
- Direct product order and cart checkout order
- Payment callback
- Customer login and registration
- Dealer application submission

When backend endpoints are ready, replace the mock functions in
`src/lib/api/server.ts` with calls to `vanstroApi` or a backend-for-frontend
adapter. Page components should continue to call the server/data layer instead
of calling raw backend URLs directly.

Set the backend URL with:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.example/api/v1
```

## Design Direction

The current homepage follows the approved v1.0 direction with incremental
refinements:

- Brand color is the primary visual anchor: deep VanStro green with orange as
  the action/accent color.
- Header proportions are informed by large North American commerce sites while
  keeping VanStro-specific navigation and dealer CTAs.
- The nav keeps `Become a Dealer` and `Partner Login` as separate B2B actions.
- `Quote` is intentionally not part of the current business flow.
- Stock is not shown on homepage product cards; stock belongs on product detail
  and checkout/dealer selection flows.
- Shop by category uses image cards with text overlay. This style is intentional
  and should be preserved unless the whole category system is redesigned.
- Cabinet-related product imagery should remain white to match the actual
  product line.

## Deployment

The repository deploys automatically to GitHub Pages whenever `main` is pushed.

Workflow:

```text
.github/workflows/deploy-pages.yml
```

The workflow:

1. Installs dependencies with pnpm.
2. Runs TypeScript validation.
3. Builds a static Next.js export.
4. Uploads `out/` to GitHub Pages.

For project pages, `NEXT_PUBLIC_BASE_PATH` is set automatically to the repository
name so static assets load correctly under `/vanstro-frontend/`.

Manual redeploy:

```bash
gh workflow run deploy-pages.yml
```

## Handoff

For a detailed continuation guide, see:

[HANDOFF.md](./HANDOFF.md)
