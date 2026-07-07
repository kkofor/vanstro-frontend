# VanStro Skill And Agent Handoff

Last updated: 2026-07-07

This document records the skills, agent workflows, and supporting tools used
while rebuilding the VanStro storefront frontend. It is meant for continuing the
project on another computer or in a future Codex thread without losing the
reasoning process behind the current design.

## Project Context

VanStro is a Canada-focused home materials commerce and dealer-fulfillment
platform. The frontend goal is not a generic landing page. The site must support
two connected outcomes:

- C-side and B-side buyers browse products, add items to cart, and move toward
  online checkout.
- Qualified B-side visitors can apply to become VanStro dealers.

Important business rules:

- Canada-wide delivery/service messaging is valid.
- Paid orders are fulfilled by selected or local VanStro dealers.
- This is not cross-border ecommerce.
- Do not add a separate estimate/request workflow unless the business approves
  it.
- Homepage and product listing do not show detailed product quantities.
- Product detail, cart, and checkout can show fulfillment quantity context.
- Cabinet and vanity color-facing copy is currently white only.

## Skills Actually Used

### `skill-installer`

Purpose:

- Installed external Codex skills from GitHub repositories.
- Used at the beginning of the project when the user asked to install several
  skill repos.

Used for:

- `Leonxlnx/taste-skill`
- `pbakaus/impeccable`
- `nextlevelbuilder/ui-ux-pro-max-skill`
- Other skill-related setup requests

When to reuse:

- When adding another GitHub-hosted skill.
- When reinstalling a skill after updating its source.
- When moving the project to another machine and rebuilding the same working
  environment.

Caution:

- Installing a skill does not mean it is automatically the right tool for every
  task. Read the skill's `SKILL.md` before applying it.

### `design-taste-frontend` / `taste-skill`

Purpose:

- Anti-template frontend design review.
- Used to judge whether layouts felt generic, over-decorated, or visually weak.

Used for:

- Initial VanStro homepage review.
- Comparing the early v1 direction against the old VanStro site and the
  exploratory `taste-demo.html`.
- Reviewing navigation, category sections, mobile spacing, and product-window
  density.
- Guarding against designs that looked like a generic AI-generated ecommerce
  template.

Useful output:

- Preserve the accepted v1 direction instead of replacing it wholesale.
- Use real product/category imagery instead of abstract decoration.
- Keep brand green as the anchor and orange as the commerce/dealer action color.
- Avoid excessive layout novelty when the user had already approved a stable
  direction.

When to reuse:

- Before major homepage redesigns.
- Before changing navigation, hero, category, footer, or product-card style.
- When a section starts feeling templated or visually disconnected from VanStro.

Caution:

- Use it as a critique lens, not as permission to overhaul the approved design.

### `impeccable`

Purpose:

- Full UI/UX audit skill for interface polish, responsive behavior, visual
  hierarchy, accessibility, typography, layout, and product UI quality.

Used for:

- Secondary reviews of the v1 homepage.
- Diagnosing module alignment, spacing, text density, overlay weight, repeated
  card structure, and responsive issues.
- Reviewing homepage, product listing, and product detail as a connected
  commerce experience.
- Helping frame the P1/P2/P3 cleanup passes.

Useful output:

- Keep homepage close to the accepted v1 system.
- Reduce unrelated visual experiments.
- Check horizontal overflow and mobile behavior.
- Keep product images square where buyers expect product inspection.
- Treat listing/PDP as commerce surfaces, not marketing cards.

When to reuse:

- Before declaring a page visually done.
- When adding new commerce pages such as checkout, dealer application, account,
  order tracking, or dashboard modules.
- When a page has spacing/alignment issues that are difficult to see from code
  alone.

Caution:

- It can generate broad recommendations. Apply only the recommendations that
  fit VanStro's confirmed business model and approved visual baseline.

### `ui-ux-pro-max`

Purpose:

- More systematic UI/UX diagnosis across layout, spacing, typography, ecommerce
  flows, responsive behavior, and visual consistency.

Used for:

- Homepage diagnostics without immediate edits.
- Product/listing/detail page audit thinking.
- Checking whether the design supports a buying path and dealer-program path.

Useful output:

- Keep navigation and page modules easy to scan.
- Do not overfill the homepage with operational information.
- Keep primary actions consistent and commerce-focused.
- Preserve recognizable ecommerce behavior while keeping VanStro's brand color
  system.

When to reuse:

- For formal page diagnostics before a redesign pass.
- For mobile/desktop UX review on high-value pages.
- Before building admin/dashboard surfaces.

Caution:

- Some palette/style recommendations may be generic or mismatched. VanStro's
  logo green and commerce orange should remain the primary color system unless
  the brand is intentionally redesigned.

### `frontend-design`

Purpose:

- Practical frontend design guidance for layout, typography, visual density,
  and design judgment.

Used for:

- Fine-tuning the homepage product showcase layout.
- Moving from 6 items in one row to 3x2, then to the current 4x2 product-window
  structure.
- Keeping the change narrow rather than redesigning surrounding modules.

Useful output:

- 4x2 is a better homepage commerce layout than six products squeezed into one
  row.
- Product windows should keep a curated storefront feel while still showing
  enough merchandise breadth.
- Small layout changes should not create new visual language.

When to reuse:

- For focused layout choices where the user is tuning density, rhythm, or
  hierarchy.
- For section-level changes that should preserve the approved page direction.

Caution:

- Do not use it to justify a brand-new style direction unless the user asks for
  a redesign.

### `imagegen`

Purpose:

- Generate or edit raster images when real assets are missing or need a visual
  concept.

Used for:

- Early full-page UI design drafts.
- Supporting generated visuals for sections where original VanStro material was
  unavailable.
- Category imagery exploration such as doors/windows when original imagery did
  not match the category.

Useful output:

- Helped fill gaps in the visual system before enough original-site assets were
  recovered.
- Helped create more complete design mockup directions.

When to reuse:

- When a category has no usable real image yet.
- When a temporary hero/category visual is required for demo continuity.
- When producing design references before final production photography exists.

Caution:

- Prefer original VanStro site materials when they are usable.
- Do not generate non-white cabinet color variants. Current cabinet/vanity color
  output should remain white.
- Generated assets should be treated as placeholders unless approved for
  production.

### `webapp-testing`

Purpose:

- Playwright/browser-based local web app testing, screenshots, and UI
  verification.

Used for:

- Checking homepage, product listing, and product detail locally.
- Verifying no horizontal overflow.
- Checking product-card image ratios.
- Confirming homepage product count and desktop/mobile grid behavior.
- Testing product detail gallery, dealer selector, and staged-category behavior.

Useful output:

- Current QA script:

```text
qa/verify_product_pages.mjs
```

- Current validation commands:

```bash
npm.cmd run typecheck
npm.cmd run build:pages
```

```powershell
$env:VANSTRO_QA_BASE_URL='http://127.0.0.1:3001'
node qa\verify_product_pages.mjs
```

When to reuse:

- After every UI/layout change.
- Before pushing to GitHub Pages.
- Before changing any route that affects static export.

Caution:

- Local screenshots and browser profiles should not be committed. The repo
  intentionally keeps only the QA script, not the generated screenshot folders.

### `browser:control-in-app-browser`

Purpose:

- Inspect and interact with local pages inside the Codex app browser.

Used for:

- Reviewing `http://127.0.0.1:3001/`.
- Comparing the working VanStro homepage with screenshots and references.
- Inspecting mobile menu, product cards, footer, cookie drawer, and hero layout.

When to reuse:

- For quick visual checks while the dev server is running.
- For comparing the live page to a screenshot the user gives.

Caution:

- Visual browser inspection is not a replacement for typecheck/build/static
  export validation.

## Agent/Workflow References Used

### `msitarzewski/agency-agents`

Role in this project:

- Used as a business/marketing-agent reference, not as a stable visible Codex
  skill in the current available-skill list.

Used for:

- Thinking through conversion intent.
- Clarifying that the homepage needs to support both product browsing and dealer
  program interest.
- Reframing the site from generic ecommerce to Canadian dealer-fulfilled
  supply-chain commerce.

Useful output:

- Primary homepage job: get C-side and B-side users interested enough to browse
  products and move toward checkout.
- Secondary homepage job: get qualified B-side visitors to apply for the dealer
  program.
- Dealer trust and fulfillment should be visible, but not overpower product
  shopping.

When to reuse:

- Before rewriting homepage copy.
- Before adding campaign sections.
- Before building dealer application, partner login, or B2B onboarding flows.

Caution:

- Treat marketing-agent suggestions as hypotheses. Match them against VanStro's
  confirmed business model before implementation.

### `anthropics/skills`

Role in this project:

- Requested as a general skills reference repo.
- It was not the primary design or implementation driver for the current
  storefront pages.

When to reuse:

- As a pattern/reference source if creating new internal skills or documenting
  future repeatable workflows.

Caution:

- Do not assume it defines VanStro-specific product, UX, or commerce rules.

## Supporting Tools That Are Not Skills

### GitHub CLI and GitHub Pages

Used for:

- Pushing the project to:

```text
https://github.com/kkofor/vanstro-frontend
```

- Deploying the static demo to:

```text
https://kkofor.github.io/vanstro-frontend/
```

Current deployment flow:

- Push to `main`.
- GitHub Actions runs `.github/workflows/deploy-pages.yml`.
- Workflow runs typecheck and static export.
- Pages deploys `out/`.

Notes:

- The GitHub Pages deploy once failed with a temporary GitHub-side message:
  `Deployment failed, try again later.`
- Rerunning the failed job succeeded.

### Multi-Agent Attempts

During one audit pass, subagents were requested for:

- Code review
- UX architecture
- Content/copy review

Those subagent calls hit a usage/availability limit, so the work continued in
the main thread using the installed skills and local QA.

Future recommendation:

- Use subagents only when they are available and the task is large enough to
  justify parallel review.
- Do not block implementation if subagents fail; continue with local skill-based
  review and browser QA.

## Recommended Skill Workflow For Future Work

### Homepage Or Major Visual Changes

1. Use `design-taste-frontend` to protect the approved v1 visual direction.
2. Use `impeccable` to audit layout, spacing, hierarchy, and responsive issues.
3. Use `frontend-design` for narrow section-level layout decisions.
4. Use `webapp-testing` for browser checks and screenshots.

### Product Listing Or PDP Changes

1. Use `impeccable` for ecommerce UX and component hierarchy.
2. Use `ui-ux-pro-max` for structured diagnostic review.
3. Use `webapp-testing` to verify filters, product cards, PDP gallery, dealer
   selector, and overflow.
4. Update `PRODUCT.md` if a product-page rule changes.

### Copy, Marketing, Dealer Program, Or Conversion Work

1. Use `agency-agents` concepts for business and marketing framing.
2. Cross-check copy against VanStro's confirmed business rules.
3. Use `design-taste-frontend` to ensure copy does not feel generic.
4. Verify visible text in browser on desktop and mobile.

### Missing Visual Assets

1. Search/recover original VanStro site assets first.
2. Use `imagegen` only for missing temporary visuals or approved mockups.
3. Keep generated images aligned with white cabinet/vanity product rules.
4. Document generated assets if they become part of the demo.

### Before Pushing To GitHub

Run:

```bash
npm.cmd run typecheck
npm.cmd run build:pages
```

Run with local dev server active:

```powershell
$env:VANSTRO_QA_BASE_URL='http://127.0.0.1:3001'
node qa\verify_product_pages.mjs
```

Then commit and push:

```bash
git push origin main
```

## Current Skill-Driven Decisions To Preserve

- Keep the accepted homepage v1 direction as the baseline.
- Use VanStro deep green as the brand anchor.
- Use orange for purchase, dealer, and high-intent actions.
- Homepage product showcase is currently 8 products in a 4x2 desktop grid.
- Product images in homepage/listing are 1:1 and use `object-fit: contain`.
- Homepage and PLP do not show detailed product quantities.
- PDP can show selected-dealer fulfillment quantity.
- All cabinet/vanity color-facing copy is currently white only.
- Future categories stay visible enough to show platform breadth.
- Original VanStro assets are preferred over generated assets.

## Files To Keep In Sync

When skill-driven design rules change, update these files together:

```text
HANDOFF.md
PRODUCT.md
README.md
SKILL-HANDOFF.md
qa/verify_product_pages.mjs
src/lib/product/catalog-config.ts
src/app/globals.css
```

## Final Note

The skills were most useful as review lenses and workflow discipline. The
project should not become a collage of skill outputs. VanStro's confirmed
business model, approved v1 visual direction, and real catalog behavior should
remain the source of truth.
