# VanStro Frontend Module API Readiness v1

Date: 2026-07-07

This document maps each visible frontend module to the future backend/dashboard API surface. The source of truth for typed contracts is `src/lib/api/dashboard-contract.ts`; callable client methods are reserved in `src/lib/api/api-client.ts`.

## Current Rule

- Frontend pages may continue using mock data during demo phase.
- Backend/dashboard integration should happen behind the API wrapper, not inside page components.
- Dashboard-owned content should become typed module config instead of hard-coded JSX copy.
- Commerce-owned flows must move from localStorage demo state to session/account/cart/order APIs before production.

## Module Matrix

| Module | Current frontend surface | Current source | Reserved API/dashboard surface | Status |
| --- | --- | --- | --- | --- |
| Navigation | Global header, product menu, CTAs | `SiteHeader.tsx` | `/dashboard/navigation` | Reserved |
| Homepage hero | `/` first screen | `mock-data.ts` banners | `/dashboard/home-page` | Mocked |
| Shop by category | `/`, `/products` category tiles | `catalog-config.ts` | `/dashboard/catalog` | Reserved |
| Homepage products | `/` product rail | `HOME_PRODUCT_LIMIT`, mock products | `/home/products` | Client-ready |
| Catalog listing | `/products` | `productsWithCommerce` | `/products`, `/products/commerce`, `/products/inventory` | Needs backend |
| PDP detail | `/products/[slug]` | `getProductBySlug` mock wrapper | `/products/{productId}` | Client-ready |
| PDP variants/media | Gallery, finish selector, SKU/model | `finishOptions` | product detail payload plus assets endpoint | Client-ready |
| PDP reviews | Reviews and write-review modal | `ProductReviewSection.tsx` | `/products/{productId}/reviews`, moderation endpoint | Reserved |
| Cart | Cart page and add-to-cart drawer | `StorefrontProvider` localStorage | `/cart`, `/cart/items` | Reserved |
| Checkout | `/checkout` | localStorage demo order | `/orders/cart`, `/payments/sessions`, `/inventory/reservations` | Needs backend |
| Orders | `/orders/[id]` | localStorage and demo order | `/orders/{id}`, dealer assignment | Needs backend |
| Dealer selector | Header and PDP dealer selection | `mock-data.ts` dealers | `/dealers`, postal-code resolver | Reserved |
| Dealer program | `/dealer-program` | static page | `/dashboard/modules/dealerProgram` | Reserved |
| Dealer application | `/dealers/apply` | external form action via `FORM_ENDPOINTS` | `/dealer-applications` | Reserved |
| Contact/support lead | `/contact` | external form action and support button | `/contact/leads` | Reserved |
| Articles/resources | `/articles`, `/articles/[slug]` | `mock-data.ts` articles | `/home/articles`, `/articles/{id}` | Reserved |
| Legal/policy pages | `/privacy`, `/terms`, `/return-policy`, etc. | `content/legalPages.ts` | `/dashboard/legal-pages` | Reserved |
| Footer/social | Global footer | `SiteFooter.tsx` | `/dashboard/footer` | Reserved |
| Cookie consent | Cookie bar, drawer, settings page | local cookie/localStorage | `/privacy/consent-events` | Reserved |
| AI/customer support | Global floating widget, optional Tiledesk | custom widget plus env config | `/support/handoffs`, Tiledesk project settings | Third-party-ready |
| Auth | Login/register/partner login | static forms and API contract | `/auth/login`, `/auth/register` | Reserved |
| Favorites | Product cards and `/favorites` | localStorage | `/favorites` | Reserved |

## Fixes Completed In This Pass

- Removed PDP inline DOM-control scripts and moved interactions back to React components.
- Added global React cart-added drawer to all pages.
- Added variant resolution helper so selected finish controls SKU, model, image, cart line and favorite key.
- Rebuilt PDP review modal as a React client component with staged payloads matching future review API.
- Gated Tiledesk third-party script behind functional cookie consent while keeping the custom support widget available.
- Hardened localStorage reads/writes for cookie and storefront state.
- Added dashboard contract types and API client methods for future admin/backend work.

## Remaining Backend Work

- Replace `src/lib/api/server.ts` mock reads with real API calls or a provider switch.
- Add backend session/cart/order/payment models and move checkout away from localStorage.
- Implement dealer postal-code resolver and fulfillment assignment APIs.
- Add dashboard CRUD for navigation, homepage modules, catalog categories, footer, legal pages and support settings.
- Add consent-event persistence if required by legal/compliance scope.
