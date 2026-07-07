# VanStro Frontend Handoff

Last updated: 2026-07-07

Repository:

[https://github.com/kkofor/vanstro-frontend](https://github.com/kkofor/vanstro-frontend)

Live demo:

[https://kkofor.github.io/vanstro-frontend/](https://kkofor.github.io/vanstro-frontend/)

Local dev URL used during this handoff:

```text
http://127.0.0.1:3001
```

Related handoffs:

```text
SKILL-HANDOFF.md
PRODUCT.md
```

## Current Status

This is the VanStro storefront frontend foundation. It uses Next.js static
export, typed mock data, and a reserved API boundary for future backend,
dashboard, inventory, dealer, payment, and order integrations.

The approved v1 homepage direction remains the baseline. The latest pass fixed
the homepage collapse, set homepage product windows to 8 in a 4x2 desktop grid, cleaned up catalog
copy, normalized cabinet/vanity color output to white, and revalidated three
primary commerce pages:

- Homepage: `/`
- Product listing: `/products`
- Product detail: `/products/base-cabinet-b33`

## Business Context

VanStro is a Canada-focused home materials commerce and dealer-fulfillment
platform.

Confirmed user flow:

1. C-side and B-side users browse the site and products.
2. Interested users add products to cart and proceed toward online payment.
3. The paid order is assigned to a VanStro dealer for fulfillment.
4. The dealer handles pickup, local delivery coordination, and project support.
5. B-side visitors can also apply to become dealers.

Important rules to preserve:

- Canada-wide delivery/service messaging is valid.
- The site should not read like cross-border ecommerce.
- Keep `Become a Dealer` and `Partner Login` visible.
- Do not add a separate estimate/request workflow unless the business approves it.
- Homepage and listing pages should not display detailed product quantities.
- Product detail, cart, and checkout may show fulfillment quantity context.
- All cabinet and vanity color-facing copy is currently white only.
- Future categories should remain visible enough to make the platform feel broad.

## Latest Completed Work

### Homepage

Files:

```text
src/components/home/HomePage.tsx
src/lib/api/server.ts
src/lib/product/catalog-config.ts
src/app/globals.css
```

Changes:

- Restored a stable hero layout after the headline/navigation change broke the
  first screen.
- Kept the approved v1 visual direction rather than replacing it with the v1.1
  exploration.
- Set homepage popular products through `HOME_PRODUCT_LIMIT = 8`.
- Ensured homepage product image frames are 1:1 and use `object-fit: contain`.
- Preserved Canada-wide delivery/service messaging and local dealer handoff.
- Kept inventory quantities off homepage cards.

### Product Listing Page

Files:

```text
src/app/products/page.tsx
src/components/product/ProductsExplorer.tsx
src/lib/product/catalog-config.ts
src/lib/data/mock-data.ts
```

Changes:

- Catalog categories, sort options, width filters, and page size now live in
  `src/lib/product/catalog-config.ts`.
- Listing renders 24 products per page shell through `CATALOG_PAGE_SIZE`.
- Listing cards show SKU, size, color, price, rating, and cart action.
- Detailed product quantities were removed from listing UI.
- The listing heading no longer uses inventory wording.
- Legacy status and campaign phrasing was replaced with cleaner
  dealer-fulfillment language.
- The nonfunctional dealer button now links to `/contact`.
- Imported original-site catalog colors are normalized so cabinet and vanity
  records expose white-facing color names.

### Product Detail Page

Files:

```text
src/app/products/[slug]/page.tsx
src/components/product/ProductBuyPanel.tsx
src/components/product/ProductDetailMain.tsx
src/components/product/ProductImageGallery.tsx
src/components/product/ProductFinishSelector.tsx
src/components/product/ProductDealerSelector.tsx
src/components/product/ProductPurchaseActions.tsx
src/components/product/ProductVariantContext.tsx
src/lib/product/product-detail-view-model.ts
```

Current PDP capabilities:

- Gallery with thumbnails and finish-aware image sync.
- SKU/model display.
- Price and promotion helpers.
- White finish swatch.
- Quantity and add-to-cart.
- Selected dealer fulfillment block.
- Dealer selector modal.
- Pickup and delivery context.
- Product overview, specs, documents, Q&A, reviews, and related products.
- PDP retains dealer quantity context because this is the purchase decision page.

### Data And API Contracts

Files:

```text
src/lib/api/api-contract.ts
src/lib/api/api-client.ts
src/lib/api/server.ts
src/lib/data/mock-data.ts
src/lib/data/original-site-products.ts
src/lib/data/original-site-image-library.ts
src/lib/commerce/product-commerce.ts
src/lib/commerce/product-inventory.ts
```

Current boundary:

- API contracts reserve product, pricing, promotion, inventory, dealer, cart,
  review, Q&A, document, and asset concepts.
- `ProductPricing.source` now supports catalog, dealer, and promotion sources.
- Mock data composes imported original-site records with commerce and
  fulfillment helpers.
- The UI calls the data/API layer rather than hardcoded backend URLs.

Future backend/admin should own:

- Product titles, slugs, categories, model numbers, SKU and variant SKU.
- Finish variants, image mappings, and variant-level model values.
- Prices, compare-at prices, promotions, and campaign rules.
- Dealer assignment, service areas, product quantity, reservation, and pickup or
  delivery eligibility.
- Product images, documents, specifications, overview copy, reviews, Q&A, and
  related product groups.
- Homepage banners, category cards, campaign surfaces, footer links, and cookie
  copy.

## Validation Performed

Commands run successfully:

```bash
npm.cmd run typecheck
npm.cmd run build:pages
```

Smoke QA run successfully:

```powershell
$env:VANSTRO_QA_BASE_URL='http://127.0.0.1:3001'
node qa\verify_product_pages.mjs
```

QA currently verifies:

- Homepage loads with no horizontal overflow.
- Homepage has exactly 8 product windows.
- Homepage does not show detailed product quantity text.
- Product listing loads with filters and category routes.
- Product listing has no horizontal overflow.
- Product listing does not expose detailed product quantity text.
- Product listing does not expose old non-white cabinet color text.
- Product listing staged categories still show a clear empty/staging state.
- Product detail page shows purchase, fulfillment, specs, documents, reviews,
  Q&A, and related-product content.
- Product detail dealer selector opens, changes dealer, and restores dealer.
- Product detail finish image sync works for the current white finish.
- Product detail has no horizontal overflow on desktop and mobile smoke checks.

Temporary Playwright screenshots were also captured during audit under:

```text
C:\Users\Owner\AppData\Local\Temp\vanstro-full-audit-1783118370605
```

## Visual/UX Audit Notes

The current direction deliberately stays close to the accepted v1 homepage.

Keep:

- Deep VanStro green as the site anchor.
- Orange only for high-intent commerce/dealer actions.
- White content surfaces with restrained borders.
- Ferguson/Home Depot-inspired header proportions without copying their styling.
- Image-led category cards where overlay text is acceptable.
- Square product image windows for homepage/listing.

Watch:

- Avoid making every module a tinted card.
- Avoid repeated oversized headings inside dense commerce surfaces.
- Avoid adding inventory detail to homepage or PLP.
- Avoid importing non-white cabinet/vanity colors into public catalog output.
- Keep modules aligned to the shared container and fixed control heights.
- Keep product image assets crisp; source-image QA is still needed category by
  category.

## Known Gaps

1. Backend, dashboard/admin, dealer portal, payment, and order fulfillment are
   not connected yet.
2. Original-site imported product images are broad but still need manual quality
   review.
3. Category data is static; future dashboard should manage categories, staged
   status, images, and copy.
4. Product listing has a pagination shell but no real server-side pagination yet.
5. PDP review submit is frontend-only and needs backend moderation.
6. Dealer distance and service-area logic are mock/client placeholders.
7. Cookie, privacy, and support widget flows are UI scaffolds and need legal and
   service integration review.
8. Cart/checkout/order pages are demo-level and need payment/order APIs.
9. Accessibility QA should be expanded for keyboard focus and modal focus
   trapping before production.

## How To Continue

Local setup:

```bash
corepack enable
pnpm install
pnpm dev -- -p 3001
```

Validation:

```bash
pnpm run typecheck
pnpm run build:pages
```

Smoke QA:

```powershell
$env:VANSTRO_QA_BASE_URL='http://127.0.0.1:3001'
node qa\verify_product_pages.mjs
```

Deployment:

```bash
git push origin main
```

GitHub Pages workflow:

```text
.github/workflows/deploy-pages.yml
```

Manual Pages deploy:

```bash
gh workflow run deploy-pages.yml
```

## Key Files To Review First

```text
README.md
PRODUCT.md
src/lib/product/catalog-config.ts
src/lib/api/api-contract.ts
src/lib/api/server.ts
src/lib/data/mock-data.ts
src/components/home/HomePage.tsx
src/components/product/ProductsExplorer.tsx
src/components/product/ProductBuyPanel.tsx
src/components/product/ProductDetailMain.tsx
src/app/globals.css
qa/verify_product_pages.mjs
```

## Final Reminder

Treat this repository as a storefront foundation and API-contract prototype. Keep
the accepted v1 homepage as the visual baseline, make improvements by tightening
alignment and data structure, and avoid hardcoding one-off UI behavior that
future dashboard/API modules should own.
