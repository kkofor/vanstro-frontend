# VanStro Frontend Handoff

Last updated: 2026-07-02

Repository:

[https://github.com/kkofor/vanstro-frontend](https://github.com/kkofor/vanstro-frontend)

Live demo:

[https://kkofor.github.io/vanstro-frontend/](https://kkofor.github.io/vanstro-frontend/)

## Current Status

The project is a static frontend demo for the VanStro.VIP rebuild. It is built
with Next.js App Router, TypeScript, React, and a typed mock data layer. It is
already deployed through GitHub Pages and can be continued from any machine by
cloning the repository.

The current branch is `main`. GitHub Pages is configured to deploy from the
GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

## Business Context

VanStro is not being positioned as cross-border ecommerce. The site should read
as a North American, Canada-focused home materials commerce and supply platform.

Primary business loops:

1. C-side and B-side users browse the site and product catalog.
2. Interested users add products to cart and checkout online.
3. Paid orders are handed to a selected/local VanStro dealer for pickup,
   delivery, or project fulfillment.
4. B-side visitors can review the dealer program and apply to become dealers.

Important product decisions:

- The site is commerce-first, not a pure marketing page.
- The dealer network is a fulfillment layer, not just a store locator.
- `Become a Dealer` and `Partner Login` should remain visible B2B actions.
- Do not introduce a `Quote` flow unless the business adds it later.
- Product listing/homepage cards should not display stock; inventory should be
  handled on product detail, dealer selection, cart, and checkout flows.
- Current cabinet products are white. Do not introduce other cabinet colors
  unless the real catalog changes.

## Technical Composition

| Item | Detail |
| --- | --- |
| Core platform/system | Next.js App Router static frontend |
| Version number | Frontend demo v1.0, repository package version `1.0.0` |
| Programming language | TypeScript |
| Frontend framework | Next.js 16.2.9, React 19.2.7 |
| Styling | Plain global CSS in `src/app/globals.css` |
| Icons | `lucide-react` plus inline SVG social icons |
| Database | None in this frontend demo |
| Data source | `src/lib/data/mock-data.ts` and typed API contract placeholders |
| Client persistence | `localStorage` for cart, favorites, orders, dealer, postal code, cookies |
| Runtime | Node.js 24 in GitHub Actions |
| Package manager | pnpm |
| Deployment target | GitHub Pages static export |
| Character encoding | UTF-8 |

## Local Setup On A New Computer

Prerequisites:

- Git
- Node.js 24 or a compatible recent Node version
- Corepack enabled for pnpm
- Optional: GitHub CLI if you want to trigger deployments manually

Clone and run:

```bash
git clone https://github.com/kkofor/vanstro-frontend.git
cd vanstro-frontend
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

Validation:

```bash
pnpm run typecheck
pnpm run build:pages
```

## GitHub Pages Deployment

Deployment is automatic on pushes to `main`.

The workflow file is:

```text
.github/workflows/deploy-pages.yml
```

The workflow sets `NEXT_PUBLIC_BASE_PATH` to `/vanstro-frontend` for GitHub
project pages. This is required because the demo is served from a subpath, not
from the root domain.

If a new repository name is used, the workflow will automatically use that
repository name as the base path. Do not hardcode `/vanstro-frontend` inside UI
components. Use `assetPath()` for public assets.

Manual deployment:

```bash
gh workflow run deploy-pages.yml
```

Useful checks:

```bash
gh run list --workflow deploy-pages.yml
gh run view --log
```

## Important Files

| File | Purpose |
| --- | --- |
| `src/app/page.tsx` | Main homepage route |
| `src/components/home/HomePage.tsx` | Current homepage sections |
| `src/components/home/HomePageV11.tsx` | Earlier v1.1 alternate retained for reference |
| `src/app/globals.css` | Brand tokens, layout rules, responsive CSS |
| `src/components/layout/SiteHeader.tsx` | Header, search, dealer selector, nav, mobile menu |
| `src/components/layout/SiteFooter.tsx` | Footer, social icons, legal links, cookie preferences entry |
| `src/components/layout/CookieBar.tsx` | Bottom cookie notice |
| `src/components/layout/CookiePreferenceDrawer.tsx` | Right-side cookie settings drawer |
| `src/components/layout/LocationDetector.tsx` | Browser geolocation request and nearest dealer selection |
| `src/components/layout/FloatingSupportWidget.tsx` | Bottom-right online support placeholder |
| `src/components/storefront/StorefrontProvider.tsx` | Cart, favorites, order, dealer, and postal code state |
| `src/components/product/ProductCard.tsx` | Product card UI |
| `src/components/product/ProductPurchaseActions.tsx` | Product detail add-to-cart/favorite controls |
| `src/lib/api/api-contract.ts` | TypeScript API types and reserved endpoint names |
| `src/lib/api/api-client.ts` | Future backend fetch client |
| `src/lib/api/server.ts` | Current mock data access layer |
| `src/lib/data/mock-data.ts` | Temporary products, articles, banners, dealers, cart, favorites |
| `src/lib/assets.ts` | Public asset path helper for GitHub Pages base path |
| `public/assets/` | Logo, generated images, legacy/original-site assets |

## Current Routes

| Route | Status |
| --- | --- |
| `/` | Main current homepage |
| `/v1-1` | Older alternate homepage |
| `/products` | Product listing |
| `/products/base-cabinet-b33` | Static product detail |
| `/products/vanity-cabinet-v3021-doors-tdr` | Static product detail |
| `/products/tall-pantry-cabinet` | Static product detail |
| `/products/primed-mdf-baseboard` | Static product detail |
| `/cart` | Client cart |
| `/checkout` | Client checkout placeholder |
| `/orders/demo-order` | Static demo order detail |
| `/favorites` | Client favorites |
| `/account/login` | Login placeholder |
| `/account/register` | Register placeholder |
| `/dealers/apply` | Dealer application placeholder |
| `/articles` | Resource center |
| `/articles/how-to-measure-for-cabinets` | Static article detail |
| `/articles/what-finishes-are-available` | Static article detail |
| `/articles/pickup-and-delivery-options` | Static article detail |
| `/about` | About page |
| `/contact` | Contact page |
| `/cookie-settings` | Cookie preference route that opens the side drawer |

Because the app uses static export, dynamic routes require static params. If
new product, article, or order demo routes are added, update the corresponding
`generateStaticParams()` function.

## Design System Notes

Primary colors are defined in `src/app/globals.css`:

```text
--color-ink: #003f3f
--color-ink-2: #0f5554
--color-accent: #f28a0b
--color-accent-dark: #c86700
--color-line: #d9e1df
--color-soft: #f5f8f7
```

Current design direction:

- Keep VanStro green as the brand anchor across navigation, headings, borders,
  and primary surfaces.
- Use orange for purchase and dealer actions.
- Avoid adding unrelated color families that weaken the logo-driven palette.
- Keep the header commerce-focused: location/dealer selection, search, account,
  saved products, cart, and B2B actions.
- Keep `Shop by category` as image cards with text overlay. This is approved.
- Avoid making every section a card. Use cards only where they represent an item,
  tool, or contained action.
- Keep product image frames square on product cards because current product
  assets are treated as 1:1 images.
- Avoid overly heavy overlay effects outside category cards.
- Add VanStro-specific details over time through real dealer data, catalog
  content, support workflows, and fulfillment states.

Header-specific notes:

- The logo has been intentionally enlarged relative to the search control.
- Search, dealer selector, saved, cart, sign-in, and B2B buttons must remain
  aligned as one commerce header system.
- `Become a Dealer` and `Partner Login` are not part of the primary text nav;
  keep them as action buttons.

## API Contract Reserved For Backend

The current frontend API boundary is in `src/lib/api/api-contract.ts`.

Reserved endpoints:

```text
GET    /home/products
GET    /home/banners
GET    /home/articles
GET    /articles/:articleId
GET    /products/:productId
GET    /cart
POST   /cart/items
DELETE /cart/items/:cartItemId
GET    /favorites
POST   /favorites
DELETE /favorites/:favoriteId
GET    /dealers
POST   /orders/direct
POST   /orders/cart
POST   /payments/callback
POST   /auth/login
POST   /auth/register
POST   /dealer-applications
```

Backend migration plan:

1. Keep `api-contract.ts` as the shared frontend contract.
2. Confirm backend response shapes match `ApiResult<T>`.
3. Implement real calls in `src/lib/api/server.ts` or introduce a small BFF
   adapter that wraps `vanstroApi`.
4. Keep UI components isolated from raw endpoint URLs.
5. Add auth/session handling before replacing login/register placeholders.
6. Replace local cart/favorites/order state with backend-backed state only after
   the API is stable.

Environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

## Current Frontend Behaviors

Implemented or scaffolded:

- Homepage with hero, category cards, popular products, dealer/contractor band,
  resource content, footer, support widget, cookie notice, and location request.
- Product listing cards with SKU, size, color, rating, price, favorite, and cart
  action.
- Product detail page with inventory-ready data model.
- Cart and checkout shell using client state.
- Demo order status page.
- Favorites page.
- Dealer application page.
- Login and register placeholders.
- Cookie notice plus right-side preferences drawer.
- Browser geolocation prompt that selects the nearest mock dealer.
- Floating support widget with hooks for future live support and assistant
  integrations.

Not production-ready yet:

- Real authentication
- Real payment
- Real backend inventory
- Real order creation and dealer assignment
- Real support chat integration
- Real legal/privacy documents
- Full multilingual content
- Analytics/consent integrations
- Production SEO content and sitemap

## Asset Notes

Assets are split into three groups:

```text
public/assets/original-site/   Pulled from the existing VanStro site
public/assets/generated/       Generated or designed demo visuals
public/assets/legacy/          Earlier extracted legacy assets
```

For all image references from code, use:

```ts
assetPath("/assets/...")
```

This keeps assets working both locally and under the GitHub Pages subpath.

## Static Export Caveats

This project uses:

```js
output: "export"
```

That means:

- No Next.js server runtime is available on GitHub Pages.
- API routes are not available in this deployment target.
- Dynamic routes must be listed through `generateStaticParams()`.
- Browser-only features must be guarded in client components.
- Real backend integration should use public API URLs or a separate hosted BFF.

## Continuation Priorities

Recommended next work:

1. Product detail depth: add richer specs, gallery behavior, detail stock display,
   dealer fulfillment details, and related products.
2. Checkout realism: shipping/pickup selection, payment placeholder replacement,
   order confirmation, and dealer handoff status.
3. Backend contract alignment: confirm endpoints, response envelopes, error
   shapes, auth/session behavior, and order state transitions.
4. Content pass: replace placeholder legal/resource pages with real copy.
5. Visual QA: recheck desktop, tablet, and mobile alignment after every major
   section change.
6. Image QA: replace low-resolution legacy images with high-quality originals or
   approved generated assets.
7. Accessibility: keyboard navigation, focus states, form errors, contrast,
   aria labels, and drawer/menu focus management.
8. Performance: image sizing, static asset compression, preloading critical
   hero image, and reducing unused CSS when the design stabilizes.

## Commands Reference

```bash
pnpm dev
pnpm dev -- -p 3001
pnpm run typecheck
pnpm run build:pages
gh workflow run deploy-pages.yml
gh run list --workflow deploy-pages.yml
```

## Git Notes

Standard update flow:

```bash
git pull
pnpm install
pnpm run typecheck
pnpm run build:pages
git status
git add .
git commit -m "Describe the change"
git push
```

Generated local folders such as `.next/`, `out/`, `node_modules/`, and `qa/` are
ignored by `.gitignore`.

## Final Reminder

Treat this repo as the frontend foundation, not the final production platform.
Preserve the API boundary, keep design decisions consistent with the VanStro
brand, and avoid adding business flows that have not been confirmed by VanStro.
