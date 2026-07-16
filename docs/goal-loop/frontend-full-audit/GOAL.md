# GOAL: VanStro Frontend Full Audit

Status: Rework required after asset-localization scope expansion (previous release recommendation: FAIL)

## Final Objective

Perform a complete, evidence-based audit of the VanStro deployed frontend project without changing the approved design or implementation during the audit phase.

The audit covers source code, architecture, public routes, product data, MB01 catalog alignment, frontend interactions, layout and rendering, responsive behavior, accessibility, compatibility, performance, image assets, security, privacy, SEO, content, build configuration, and the GitHub Pages deployment chain.

## Audit Baseline

- The primary code baseline is the commit deployed from `origin/main` to GitHub Pages.
- Local uncommitted backend and infrastructure work is excluded unless it directly changes the deployed frontend.
- The deployed storefront is the behavior baseline for public-page verification.
- `mb01.vanstro.ca` is the authoritative public comparison source for current product content.
- MB01 is a comparison and acquisition source only. The deployed storefront must not hotlink or otherwise depend on MB01 asset URLs at runtime.
- The current controlled asset library is the repository's `public/` tree. A future migration may use VanStro-owned object storage, but third-party or MB01 runtime hotlinks remain prohibited.
- Root-level backend `GOAL.md` and `GOALS.md` are outside this parent goal and must not be modified.

## Completion Criteria

- Build a complete inventory of frontend routes, modules, components, data sources, assets, configuration, dependencies, and deployment workflows.
- Mark every review area as `done`, `blocked`, or `not_applicable`, with evidence.
- Record every finding with an ID, P0-P3 severity, impact, reproduction steps, code or page evidence, and a remediation recommendation.
- Verify all public clickable, selectable, editable, expandable, closable, and submit-capable elements.
- Compare every locally published product with MB01 by SKU and, when necessary, model or source URL.
- Compare product status, name, SKU, model, category, subcategory, variants, parameters, price, descriptions, primary image, gallery images, and image order.
- Inventory every MB01-sourced asset, preserve source provenance, and map it to a separately stored VanStro-controlled asset path.
- Verify that source code, generated catalog data, built artifacts, and deployed pages contain no runtime MB01 asset references.
- Verify that locally stored asset files exist, resolve, retain the correct product/variant association and gallery order, and have integrity evidence.
- Enforce SEO-safe asset names: lowercase ASCII, hyphen-separated, descriptive, stable, and free of spaces, underscores, opaque source IDs, timestamps, or random hashes when a semantic name is available.
- Product asset names must identify the product or product family, SKU or variant token, asset role, and sequence where applicable, using a stable pattern such as `{product-slug}-{sku}-{variant}-{role}-{sequence}.{ext}`. Extensions must be lowercase and accurate.
- Review image alternative text and surrounding product metadata independently from filenames; filenames must not use keyword stuffing as a substitute for accessible text.
- Run a dedicated SEO optimization workstream covering page titles, meta descriptions, canonical URLs, structured data (Schema), Open Graph metadata, and image alternative text across every indexable public route and every product/variant surface.
- Require route-specific, truthful, non-duplicated SEO output derived from the approved page purpose and exact product/SKU data. Homepage defaults must not silently replace page-level metadata.
- Verify that canonical, Schema, Open Graph, and image references use the approved production origin, correct base path, and VanStro-controlled asset URLs.
- Keep SEO optimization outside the visual Design Freeze: metadata, structured data, semantic markup, and image alt changes must not alter approved layout, modules, styling, or visible content hierarchy unless separately approved.
- Review all public pages at the required desktop, tablet, and mobile viewports.
- Complete type checks, static builds, existing automated tests, dependency review, and browser regression without changing tracked source files.
- Verify parity between the selected source commit, local build, and GitHub Pages deployment.
- Produce a consolidated risk register and a `PASS`, `CONDITIONAL PASS`, or `FAIL` recommendation.
- Audit completion does not mean the site has no defects. A complete audit may validly end with a failed release recommendation.

## Design Freeze

The current information architecture, page structure, module order, module count, layout, visual direction, brand colors, typography system, image direction, and primary component styles are approved and locked.

The `design-taste-frontend` and `impeccable` skills may be used only as audit lenses to identify implementation defects, rendering problems, accessibility issues, responsive defects, or inconsistencies against the existing design.

The audit must not:

- Redesign pages or change information hierarchy.
- Reorder, add, remove, or restructure approved modules.
- Replace the established Header, Hero, category, product, PDP, form, Footer, Cookie, or support layouts.
- Change the brand palette, typography direction, image style, or overall visual language.
- Introduce new cards, decoration, gradients, motion, or layout patterns because a skill prefers them.
- Treat subjective aesthetic opinions as mandatory defects.

Skill recommendations that conflict with the approved design must be recorded as `Rejected by Design Freeze` and excluded from remediation requirements.

## Automatic Actions

The parent and child goals may automatically:

- Read source code, documentation, Git history, configuration, public pages, and public MB01 product pages.
- Run read-only Git commands, type checks, static builds, existing tests, dependency scans, and browser checks.
- Start or stop a local frontend development server when required for read-only testing.
- Capture screenshots, measurements, console output, and non-secret diagnostic evidence.
- Create audit reports, inventories, comparison tables, and test matrices inside this goal directory.
- Download public MB01 asset bytes only into temporary or audit-evidence storage when needed to calculate hashes, dimensions, or provenance. This does not authorize adding them to application assets.

## Approval Boundaries

Pause and ask the user before:

- Modifying source code, tests, product data, assets, configuration, dependencies, or CI/CD workflows.
- Applying SEO optimization changes to metadata, canonical logic, Schema, Open Graph, image alt text, sitemap, robots, or semantic markup. Audit findings and an implementation-ready change matrix may be produced automatically, but source changes require approval.
- Downloading, renaming, converting, optimizing, or adding MB01-derived files to the application asset library, and replacing runtime URLs with local paths.
- Installing, upgrading, removing, or automatically fixing dependencies.
- Changing approved design, layout, module structure, content hierarchy, or brand treatment.
- Running database migrations, seeds, repairs, or any database write.
- Calling real ERP, email, MCP, payment, account, or other external write interfaces.
- Creating commits, pushing branches, opening pull requests, deploying, rolling back, or changing production settings.
- Performing authenticated tests that create, modify, or delete real user or business data.

## Prohibited Actions

- Do not expose, copy, or record secrets, tokens, passwords, cookies, or private connection strings.
- Do not delete, overwrite, revert, or clean user changes or untracked work.
- Do not use destructive Git, filesystem, database, container, or deployment commands.
- Do not modify production data or bypass access controls.
- Do not silently expand the audit into backend, ERP, Dashboard, database, or infrastructure implementation.
- Do not treat an MB01 URL inventory or successful remote response as proof that the asset has been localized.
- Do not approve a release that still relies on MB01 asset URLs or SEO-nonconforming application asset names without an explicit, documented user exception.
- Do not mark a child goal complete without checking its acceptance evidence.

## Required Viewports

- 1920 x 1080
- 1440 x 900
- 1366 x 768
- 1024 x 768
- 768 x 1024
- 430 x 932
- 390 x 844
- 360 x 800

## Parent Goal Responsibilities

- Read this file and `GOALS.md` before dispatching work.
- Identify only dependency-satisfied child goals as ready.
- Generate one independent `/goal` instruction for each ready child goal.
- Review child reports against their acceptance evidence.
- Mark a child `done` only after evidence passes review.
- Issue specific rework requirements when evidence is incomplete or invalid.
- Unlock and dispatch newly ready goals as dependencies complete.
- Pause at every Approval Boundary and ask the user before continuing.
