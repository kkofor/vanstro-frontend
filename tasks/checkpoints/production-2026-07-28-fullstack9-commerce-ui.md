# Production Frontend Checkpoint — Fullstack9 Commerce UI

## Identity

- Date: 2026-07-28
- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Local code commit: `ba212926076291147dc332b352307d93fc23a567`
- Production frontend release: `/www/wwwroot/vanstro.ca/releases/working-tree-20260728-fullstack9-commerce-ui`
- Rollback release: `/www/wwwroot/vanstro.ca/releases/working-tree-20260728-fullstack8-dashboard`
- Backend deployed: no
- Database migration: no
- Push: no
- Real payment/refund: not executed

## Release composition

A full static rebuild from current source was rejected because it would have rolled back approved production-only content:

- Careers 3-role board;
- Resource Center with 11 local PDFs;
- approved About and Contact content;
- EN/fr counterparts.

The release was therefore produced as:

1. immutable server-side copy of fullstack8 to a new fullstack9 directory;
2. verified Commerce overlay from local `main`;
3. nginx root switch only after content and overlay hash checks.

Commerce overlay:

- files: `3,663` including deployment metadata;
- archive SHA-256: `796bf0ecada164e29a32ff087c74df122c14f706e43512c6da0f9ce2cb9b0f6f`;
- protected content paths in overlay: `0`.

The overlay contains the verified Account/Favorites/Cart/Orders/Payment/Catalog-PDP route trees, homepage route artifacts, their referenced immutable chunks/assets, and sitemap. It does not replace Careers, Resource Center, About, Contact, or PDFs.

## Pre-release fixes

Two source-level release blockers were fixed without discarding prior frontend work:

- Frontend CheckoutSession contract, runtime validator, and Payment UI now accept Backend status `refund_processing` and reuse the existing EN/fr refund-in-progress presentation.
- Profile PATCH is followed by canonical GET `/account/me`, preserving email and user ID when the current Backend PATCH response returns a profile-shaped object.

Commit: `ba212926076291147dc332b352307d93fc23a567`.

## Build and verification

Built with Node `22.22.2` and pnpm `11.13.0`.

Passed before release:

- full TypeScript;
- package contracts `9/9`, including `refund_processing`;
- final deterministic review;
- SEO/security;
- runtime error localization;
- fr-CA display formatting;
- static export `396` pages;
- French artifacts `195`;
- SEO artifacts `390` application routes;
- 404 artifacts and static fallback;
- Careers/Contact privacy gates.

Server-side pre-switch checks:

- 8 protected EN/fr content pages matched fullstack8 SHA-256 after copy and after overlay;
- `resources/` retained `11` files;
- representative Account/Favorites/Cart/Orders/PDP/Payment files matched the local overlay manifest.

## Nginx and rollback evidence

Previous root:

`/www/wwwroot/vanstro.ca/releases/working-tree-20260728-fullstack8-dashboard`

Current root:

`/www/wwwroot/vanstro.ca/releases/working-tree-20260728-fullstack9-commerce-ui`

Previous nginx configuration backup:

`/www/backup/vanstro-production/20260728T-commerce-ui-release/vanstro.ca.conf.fullstack8`

Previous config SHA-256:

`68e620e873c3b412736651f2f90ea10dca884b0a0eed6ced595d890691b798e5`

Current config SHA-256 after root replacement:

`06bbbd48b1e3e00cd2df08572f188d6d219185cbc0c54468cc536f9ecb2a384c`

BaoTa validated and reloaded nginx while saving the configuration. Fullstack8 remains present and was not overwritten or deleted.

## Production smoke

HTTP 200 confirmed for key EN/fr routes across:

- homepage;
- Account overview/login/register/profile/addresses/orders/favorites/forgot/reset;
- Cart;
- Order Lookup;
- Checkout Payment;
- Catalog and PDP;
- Dashboard and Dashboard Products;
- Careers;
- Resource Center;
- About;
- Contact.

API evidence:

- `/health/ready`: API/database `ok`;
- Catalog pagination: HTTP 200, live total `140`;
- Cart: HTTP 200 before the browser stress run;
- anonymous Favorites: expected HTTP 401 `AUTH_REQUIRED`;
- Forgot Password: HTTP 202 generic response.

## Browser verification limitation

Production Chromium did not reveal console errors, uncaught exceptions, hydration failures, language errors, canonical/hreflang errors, or horizontal overflow.

The existing 36-case harness cannot be reported as 36/36 on production:

- expected anonymous `/auth/me` and `/account/favorites` HTTP 401 are currently classified as failures;
- after filtering those expected responses, rapid page loading exhausted the Cart rate-limit bucket;
- 13 cases returned Cart HTTP 429;
- observed limit headers: limit `60`, remaining `0`, Retry-After `457` seconds at the time checked.

This is a QA harness cadence/expectation issue. Production rate limits were not weakened. The result must be reported as page-behavior checks passed with the network gate rate-limited, not as a full Chromium pass.

## Follow-up

Before any future full-site replacement release, restore the approved Careers/Resource Center/PDF/About/Contact production content into canonical Git source and prove that a clean static build reproduces fullstack9 without overlay dependence.
