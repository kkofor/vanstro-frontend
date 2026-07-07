# VanStro Frontend Handoff

Last updated: 2026-07-07

Repository:

```text
https://github.com/kkofor/vanstro-frontend
```

Local dev URL used today:

```text
http://127.0.0.1:3001
```

Primary working area:

```text
C:\Users\Owner\Documents\Codex\design\vanstro-frontend
```

## Current Status

The project is a Next.js static-export storefront for VanStro Global Supply. It
now includes the core storefront pages plus a rebuilt set of secondary pages for
legal, support, company, dealer-program, and dealer-application flows.

The current visual baseline is:

- White page background and restrained bordered surfaces.
- Deep VanStro green as the primary brand color.
- Orange only for high-intent dealer/commerce actions.
- Secondary pages should use one unified top module: left copy and CTAs, right
  contextual image, then detailed page content below.
- B2B pages must be professional and procurement-friendly, not decorative or
  consumer-marketing heavy.

## Today'S Main Work

Today focused on completing and tightening the secondary-page system around the
footer links, Contact, About, Dealer Program, and Dealer Application.

### 1. Legal And Footer Secondary Pages

Implemented and populated the seven footer secondary pages from supplied docs
and source-site context.

Routes:

```text
/legal-disclaimer
/terms-and-conditions
/privacy
/cookie-settings
/return-policy
/dealer-services-and-responsibility
/careers
```

Key files:

```text
src/content/legalPages.ts
src/components/legal/LegalPageTemplate.tsx
src/app/legal-disclaimer/page.tsx
src/app/terms-and-conditions/page.tsx
src/app/privacy/page.tsx
src/app/cookie-settings/page.tsx
src/app/return-policy/page.tsx
src/app/dealer-services-and-responsibility/page.tsx
src/app/careers/page.tsx
```

Important details:

- Legal pages use structured content from `src/content/legalPages.ts`.
- Important terms are visually emphasized through the template.
- Legal support cards were improved with stronger support contact information.
- Cookie settings were rebuilt around a reusable settings client and drawer.

### 2. Contact Page

Route:

```text
/contact
```

Key files:

```text
src/app/contact/page.tsx
src/components/contact/ContactChatButton.tsx
public/assets/generated/contact-support-hero-v1.png
```

Completed:

- Rebuilt Contact page into the approved secondary-page pattern.
- Added hero image, contact CTAs, dealer contact routing, preferred dealer
  selector in the form, and right-side "Best for" support cards.
- Added `Chat with us` actions that dispatch the support widget event.
- Made support/contact icons more colorful and larger.
- Aligned right-side support card content vertically after image/section height
  changes.

Current behavior:

- Contact form posts to the external lead endpoint through `FORM_ENDPOINTS`.
- `Chat with us` opens the AI support widget fallback, or Tiledesk if configured
  and allowed by consent.

### 3. AI Support / Customer Support Widget

Key files:

```text
src/components/layout/CustomerSupportWidget.tsx
src/components/layout/FloatingSupportWidget.tsx
src/lib/support/ai-support.ts
src/components/contact/ContactChatButton.tsx
```

Completed:

- Added a site-wide support widget wrapper.
- Added Tiledesk-ready integration controlled by:

```text
NEXT_PUBLIC_TILEDESK_PROJECT_ID
NEXT_PUBLIC_TILEDESK_DEPARTMENT_ID
NEXT_PUBLIC_TILEDESK_WIDGET_URL
```

- If third-party support is not configured or functional-cookie consent is not
  granted, the custom VanStro AI support widget is used.
- Contact page buttons dispatch `vanstro:support-request`.

Known behavior:

- Cookie consent can determine whether the third-party Tiledesk script loads.
- The fallback AI widget is local/frontend-only and should later connect to the
  real support handoff/dashboard endpoint.

### 4. About Us Page

Route:

```text
/about
```

Key file:

```text
src/app/about/page.tsx
```

Direction:

- User rejected an earlier overly decorative version.
- Page was adjusted to be a company profile, not a flashy campaign page.
- Content should stay close to the source-site/company-introduction tone:
  Canadian company, headquartered in Winnipeg, national supply chain and
  distribution platform for building materials.

Important rule:

- About Us should remain sober and corporate. Do not over-design it.

### 5. Dealer Program Page

Route:

```text
/dealer-program
```

Key files:

```text
src/app/dealer-program/page.tsx
public/assets/generated/dealer-program-handshake-v1.png
```

Completed:

- Added Dealer Program page and footer group entry.
- Reworked the page several times after review feedback.
- Final direction is B2B/procurement-oriented, not decorative.
- Hero now follows the secondary-page pattern: text/CTA plus a handshake image.
- Content clarifies:
  - VanStro platform role.
  - Dealer role.
  - Application review status.
  - Final terms requiring written approval or agreement.
  - Dealer service boundary.
  - Operating rules before applying.

Current sections:

```text
Program at a glance
Partner qualification
Operating model
Application review
Operating rules before applying
Important application notes
Final CTA
```

Important warning:

- Footer still contains `Dealer benefits` and `Trade resources` links pointing
  to future Dealer Program anchors. The user explicitly asked to leave these
  for now because the page will be further expanded.

### 6. Dealer Application Page

Route:

```text
/dealers/apply
```

Key files:

```text
src/app/dealers/apply/page.tsx
src/components/layout/SecondaryPageHero.tsx
src/app/globals.css
src/lib/api/form-endpoints.ts
```

Completed:

- Rebuilt from a bare form into a full B2B dealer intake page.
- Added company profile, contact details, business type, service area,
  province, product focus, local capabilities, application notes, legal
  acknowledgement, and submit guidance.
- Added right-side cards for:
  - Application overview.
  - Prepare before submitting.
  - Review path.
  - Important responsibility boundary.
- Added hidden `source=dealer-application-page`.
- Submit action uses the external endpoint:

```text
https://api.vanstro.ca/api/v1/dealer-applications
```

The endpoint is generated through:

```text
FORM_ENDPOINTS.dealerApplication
```

Important process correction:

- The first Dealer Application pass looked visually similar to the secondary
  pages but did not reuse a shared module.
- This was corrected by creating `SecondaryPageHero`.
- Dealer Application now uses the unified module for breadcrumb, title, copy,
  CTAs, and image.

### 7. Unified Secondary Page Hero Module

New component:

```text
src/components/layout/SecondaryPageHero.tsx
```

Purpose:

- Standardize secondary page hero layout across pages.
- Prevent each page from hand-rolling a slightly different "text plus image"
  block.
- Supports:
  - Breadcrumbs.
  - Page title.
  - Body copy.
  - Optional CTAs.
  - Optional image through `assetPath`.
  - Optional page-specific className.

Current adoption:

```text
/dealers/apply
```

Recommended next adoption:

```text
/contact
/about
/dealer-program
legal page template hero
```

Important:

- This component was introduced late today. Other pages still visually follow
  the same pattern but are not yet all wired to the reusable component.

## API / Dashboard Boundary

New API form endpoint helper:

```text
src/lib/api/form-endpoints.ts
```

Default base URL:

```text
https://api.vanstro.ca/api/v1
```

Override:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.example/api/v1
```

Current form endpoints:

```text
FORM_ENDPOINTS.contactLead
FORM_ENDPOINTS.dealerApplication
```

Current values:

```text
https://api.vanstro.ca/api/v1/contact/leads
https://api.vanstro.ca/api/v1/dealer-applications
```

Rationale:

- The app uses `output: "export"` in `next.config.mjs`.
- Local Next API routes are not available in static export.
- Forms should not post to fake `/api/v1/*` local routes.
- Future dashboard/backend integration should connect behind this boundary.

Related files:

```text
src/lib/api/api-client.ts
src/lib/api/dashboard-contract.ts
docs/API-MODULE-READINESS-v1.md
README.md
```

## Generated Assets

Active generated assets:

```text
public/assets/generated/contact-support-hero-v1.png
public/assets/generated/dealer-program-handshake-v1.png
public/assets/generated/support-agent-v1.png
public/assets/generated/vanstro-dealer-white-v1.png
public/assets/generated/vanstro-guide-white-v1.png
public/assets/generated/vanstro-hero-white-v1.png
public/assets/generated/category-doors-windows.png
```

Removed during cleanup:

```text
public/assets/generated/dealer-program-hero-v1.png
public/assets/generated/dealer-program-showroom-v1.png
```

Reason:

- They were unused alternative Dealer Program images.
- Keeping unused generated assets adds confusion and repo weight.

## Git / Ignore Notes

Updated ignore rules:

```text
tmp/
```

Reason:

- Visual QA screenshots are saved under `tmp/screenshots`.
- They should not be committed.

Current screenshot examples from today:

```text
tmp/screenshots/dealer-program-desktop.png
tmp/screenshots/dealer-application-unified-module-desktop.png
tmp/screenshots/dealer-application-unified-module-mobile.png
```

## Validation Performed Today

Commands run successfully:

```bash
npm.cmd run typecheck
npm.cmd run build
```

Build confirmed static routes including:

```text
/about
/careers
/contact
/cookie-settings
/dealer-program
/dealer-services-and-responsibility
/dealers/apply
/legal-disclaimer
/privacy
/return-policy
/terms-and-conditions
```

Browser/visual checks performed with system Chrome through Playwright:

```text
/dealer-program
/dealers/apply
```

Dealer Application final verification:

```text
desktop heroCount: 1
desktop heroImageCount: 1
desktop horizontal overflow: false
desktop grid columns: two columns
mobile heroCount: 1
mobile heroImageCount: 1
mobile horizontal overflow: false
mobile grid columns: one column
```

Important visual observation:

- Cookie banner and AI support widget can overlay screenshots on first visit.
- This is expected global UI behavior, not a Dealer Application layout bug.

## Four-Step Review Process Used / Expected

The user expects the following workflow for important secondary pages:

1. First review: TASTE + UI/UX architecture assessment.
2. First proposal: define page structure, module boundaries, image strategy,
   content hierarchy, and B2B/consumer tone.
3. Implementation: build according to the reviewed proposal.
4. Final review: Impeccable + UI/UX/accessibility/responsive QA with build and
   screenshots.

Important lesson from today:

- Do not treat "looks visually consistent" as enough.
- The user means module consistency at the code/component level.
- When a pattern becomes shared, extract it into a reusable component before
  declaring it complete.

## Known Gaps / Follow-Up Items

High priority:

1. Adopt `SecondaryPageHero` across Contact, About, Dealer Program, and legal
   template hero so the secondary-page module is truly unified.
2. Expand Dealer Program with the currently reserved footer anchors:

```text
/dealer-program#benefits
/dealer-program#resources
```

3. Connect external form endpoints to real backend/dashboard workflows.
4. Add form success/error states. Current forms are static POST forms and do not
   show client-side status.
5. Add dashboard/admin ownership for legal content, footer links, dealer program
   copy, and contact routing.

Medium priority:

1. Review Contact page and Dealer Application page with cookie banner present,
   because the banner overlays lower-left form content on first visit.
2. Decide whether Dealer Application should use the same handshake image as
   Dealer Program or get a dedicated "application review / business intake"
   image.
3. Add a clear backend contract for:
   - Contact leads.
   - Dealer applications.
   - Support handoffs.
   - Dealer program module config.
4. Improve accessibility QA for form error states, focus order, and support
   widget behavior.
5. Re-run a full mobile pass for all secondary pages after `SecondaryPageHero`
   adoption.

Lower priority:

1. Consolidate repeated CSS around legal/contact/about/dealer page cards.
2. Consider moving route-specific constants into content/config files once copy
   stabilizes.
3. Replace remaining page-specific hero CSS with shared hero tokens.

## Key Files To Review First

```text
src/components/layout/SecondaryPageHero.tsx
src/app/dealers/apply/page.tsx
src/app/dealer-program/page.tsx
src/app/contact/page.tsx
src/app/about/page.tsx
src/components/legal/LegalPageTemplate.tsx
src/content/legalPages.ts
src/components/layout/FloatingSupportWidget.tsx
src/components/layout/CustomerSupportWidget.tsx
src/lib/api/form-endpoints.ts
src/lib/api/dashboard-contract.ts
src/app/globals.css
```

## Continue From Here

Local dev:

```bash
npm.cmd run dev -- -p 3001
```

Validation:

```bash
npm.cmd run typecheck
npm.cmd run build
```

Recommended next task:

```text
Refactor Contact, About, Dealer Program, and LegalPageTemplate to use
SecondaryPageHero, then re-run desktop/mobile screenshot QA.
```

Secondary recommended task:

```text
Expand Dealer Program with real #benefits and #resources sections so footer
anchors are no longer placeholders.
```

## Final Reminder

The site is now moving from page-by-page design into a secondary-page system.
Future work should preserve the approved VanStro storefront template, extract
shared modules when patterns repeat, and keep B2B pages disciplined,
clear, and operational rather than decorative.
