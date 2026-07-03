# VanStro Product Experience Notes

Last updated: 2026-07-03

This document captures current homepage, product listing, and product detail
rules for the VanStro storefront.

## Product Purpose

VanStro product experiences should help buyers answer:

- What product am I viewing?
- Which SKU/model/finish am I buying?
- What does it cost right now?
- Which dealer will fulfill it?
- Can I pick it up or arrange delivery after checkout?
- What specs, documents, reviews, and related products help me decide?

The experience should feel like a North American home-materials supplier with
dealer-backed fulfillment, not a generic marketplace page.

## Homepage Rules

- Keep the accepted v1 direction as the baseline.
- The hero should quickly communicate home materials, Canada-wide delivery or
  service, and local VanStro dealer fulfillment.
- `Popular products` must show exactly 8 product windows in a 4x2 desktop grid.
- Homepage product image frames are 1:1.
- Homepage product images use `object-fit: contain`.
- Homepage and listing pages do not show detailed product quantities.
- `Shop by category` remains broad enough to include future categories.

Primary config:

```text
src/lib/product/catalog-config.ts
HOME_PRODUCT_LIMIT = 8
```

## Product Listing Page Direction

The first-level `/products` page is a catalog browsing page. It should support:

- Category showcase
- Dealer fulfillment support strip
- Filter rail
- Search within products
- Sort
- Applied filter chips
- Product card grid
- Staged/coming-soon category state
- Pagination shell for future backend paging

Card rules:

- Image frame is 1:1.
- Image uses `object-fit: contain`.
- Show category, title, SKU, size, color, rating, price, and cart action.
- Do not show detailed product quantity on listing cards.
- Keep cards aligned and consistent with homepage product windows.

Primary config:

```text
src/lib/product/catalog-config.ts
CATALOG_PAGE_SIZE = 24
CATALOG_CATEGORY_OPTIONS
CATALOG_SORT_OPTIONS
CATALOG_WIDTH_OPTIONS
```

## Product Detail Page Direction

The PDP uses a two-column commerce layout:

- Left/main area: breadcrumb, gallery, overview, specs, documents, Q&A, reviews,
  related products.
- Right/sticky area: title, identifiers, rating, price, finish selection,
  quantity, add-to-cart, selected dealer, pickup/delivery.

Information order in the buy panel:

1. Brand/category context
2. Product title
3. Model/SKU
4. Rating and `Write a Review`
5. Price
6. Color/finish swatch
7. Quantity and add-to-cart
8. Save
9. Dealer fulfillment, pickup, and delivery context

PDP may show selected-dealer product quantity because it is the buyer decision
page. Homepage and listing pages should not.

## Gallery Rules

- PDP thumbnails sit beside the main image.
- Product gallery supports hover zoom.
- Finish selection updates the main image.
- Product imagery should use `contain` so cabinets and vanities are not cropped.
- PLP and homepage product-card image frames are 1:1.
- Product image backgrounds should stay quiet and mostly white.

## Color/Finish Rules

Current business rule:

- Kitchen cabinets: `PVC white`
- Bathroom vanities: `White`
- Baseboards/mouldings: `Primed white`

Do not introduce extra cabinet or vanity colors into the public catalog unless
the real VanStro catalog and business team approve them.

Each finish must remain ready to map to backend-managed fields:

```text
finish name
swatch color/image
primary image
variant SKU
variant model number
price override, if needed
fulfillment quantity override, if needed
availability state
```

## Price And Promotion Rules

Price is dynamic and should be backend/admin controlled.

Required backend-ready concepts:

```text
current price
compare-at price
unit label
price label
promotion type
promotion label
promotion date range
dealer/campaign eligibility
```

Savings and campaign badges should be associated with price areas. Avoid
floating badge rows that add visual noise.

## Dealer And Fulfillment Rules

Dealer selection is part of the buying decision.

Current PDP behavior:

- User sees selected dealer fulfillment.
- User can open a dealer selector modal.
- Dealer list shows fulfillment quantity and estimated distance.
- User can manually select dealer if location is wrong.
- Pickup and delivery are shown as separate fulfillment rows.

Future backend should provide:

```text
dealer list
dealer coordinates/service areas
postal-code distance estimate
quantity by dealer/product/variant
pickup eligibility
delivery eligibility
reservation result
dealer confirmation state
```

## Add-To-Cart Rules

Clicking add-to-cart should feel responsive:

- Animate the button/action.
- Add the selected quantity.
- Open the right-side cart confirmation drawer.
- Update header cart count immediately.
- Show added item, quantity, subtotal, and suggestions.

The drawer must reopen correctly after being closed.

## Review Rules

`Write a Review` opens a modal form.

The modal currently includes:

- Overall rating
- Review body
- Suggested review topics
- Review title
- Nickname
- Email address
- Terms checkbox
- Writing guidelines modal
- Submit status placeholder

Production backend needs review moderation before publishing. Current submit is
frontend-only and should be replaced by a product review API.

## Backend/Admin Variables

All of the following should come from backend/admin eventually:

```text
product id
slug
brand
category
title
subtitle
description
overview bullets
model number
SKU
variant SKU/model
dimensions
specifications
documents
images
finish options
price
compare-at price
promotions
dealer assignment
fulfillment quantity
reviews
questions and answers
related products
you may also like
on sale products
recently viewed
SEO metadata
schema.org data
```

Primary contract file:

```text
src/lib/api/api-contract.ts
```

Primary mock composition file:

```text
src/lib/data/mock-data.ts
```

## Component Map

```text
src/components/home/HomePage.tsx
src/components/product/ProductsExplorer.tsx
src/components/product/ProductBuyPanel.tsx
src/components/product/ProductDetailMain.tsx
src/components/product/ProductImageGallery.tsx
src/components/product/ProductFinishSelector.tsx
src/components/product/ProductDealerSelector.tsx
src/components/product/ProductPurchaseActions.tsx
src/components/product/ProductVariantContext.tsx
src/components/checkout/CartAddedDrawer.tsx
src/lib/product/catalog-config.ts
src/lib/product/product-detail-view-model.ts
src/lib/commerce/product-commerce.ts
src/lib/commerce/product-inventory.ts
```

## QA Checklist

Before considering homepage/product work stable, verify:

- Homepage hero does not clip or cover the CTAs.
- Homepage product windows count is exactly 8.
- Homepage and listing pages have no horizontal overflow.
- PLP product image windows are square.
- PDP gallery thumbnails and hover zoom work.
- Finish swatch updates main image.
- Finish-specific SKU/model displays correctly once data is wired.
- Dealer selector opens, closes, and updates selected dealer.
- Add-to-cart opens drawer every time, including after closing the drawer.
- Header cart count updates after every add.
- Sticky buy panel remains scrollable/page-scroll friendly.
- Review modal opens from every `Write a Review` entry.
- Mobile PDP, PLP filters, cart drawer, dealer modal, and review modal are usable.

Run:

```bash
pnpm run typecheck
pnpm run build:pages
```

And with the dev server running:

```powershell
$env:VANSTRO_QA_BASE_URL='http://127.0.0.1:3001'
node qa\verify_product_pages.mjs
```
