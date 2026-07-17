# GOALS: VanStro Frontend Full Audit Loop

## Status

| Goal | State | Dependencies | Evidence |
| --- | --- | --- | --- |
| G0 | done | None | `evidence/G0-baseline.md` (parent verified 2026-07-15) |
| G1 | done | G0 | `evidence/G1-surface-inventory.md` plus G1a/G1b/G1c packages (parent verified 2026-07-15) |
| G2 | done | G0, G1 | `evidence/G2-architecture-code-quality.md` (parent verified 2026-07-15) |
| G3 | done | G0, G1 | Full catalog, controlled-asset, deployment, and variant-runtime evidence parent verified 2026-07-16 |
| G4 | done | G0, G1 | `evidence/G4-interaction-audit.md` plus `evidence/G4/` matrices (parent verified 2026-07-15) |
| G5 | done | G0, G1 | `evidence/G5-visual-layout-rendering.md` plus the complete 1,344-pair visual matrix and 19-state package (parent verified 2026-07-15) |
| G6 | done | G0, G1 | `evidence/G6-accessibility-compatibility.md` plus `evidence/G6/` matrices (parent verified 2026-07-15) |
| G7 | done | G0, G1 | Packages A-D, controlled-library integrity, performance, and deployed-runtime gates parent verified 2026-07-16 |
| G8 | done | G0, G1 | `evidence/G8-security-privacy.md` plus sanitized `evidence/G8/` manifests (parent verified 2026-07-15) |
| G9 | done | G0, G1 | `evidence/G9-dedicated-seo-rework-2026-07-16.md` plus `evidence/G9-rework-2026-07-16/` matrices and machine checks (parent verified 2026-07-16) |
| G10 | done | G0, G1 | CI, deployed artifact, 171-route live scan, asset parity, base-path, and browser gates parent verified 2026-07-16 |
| G11 | done | G2-G10 | `evidence/G11-full-browser-regression-rework-2026-07-16.md` plus complete route, interaction, history, product-variant, visual, runtime SEO, blocked-check and self-audit evidence (parent verified 2026-07-16) |
| G12 | done | G0-G11 | `evidence/G12-consolidated-findings-release-recommendation-2026-07-16.md` plus `evidence/G12-rework-2026-07-16/` matrices and self-audit (parent verified 2026-07-16; release recommendation remains `FAIL`) |
| G13 | done | G3, G4, G10-G12 | `evidence/G13-product-content-correction-2026-07-16.md` plus live-source, localization, 300-SKU verification, build, SEO, and browser evidence (parent verified 2026-07-16; no deployment) |

## Loop Rules

1. Execute each child as `Inventory -> Inspect -> Verify -> Record -> Gate`.
2. A child cannot mark itself `done`; it submits evidence to the parent goal.
3. Missing evidence results in `rework`, not completion.
4. Findings are recorded during this audit and are not automatically fixed.
5. Every source, configuration, or deployment change requires user approval.
6. Every child report belongs under `docs/goal-loop/frontend-full-audit/evidence/`.

## G0. Scope and Baseline Lock

State: done. Parent verified on 2026-07-15 against `evidence/G0-baseline.md`.

Goal: establish the exact repository, deployment, route, MB01 comparison, and approved-design baseline for the frontend audit.

Acceptance evidence:

- Local HEAD, `origin/main`, GitHub Pages URL, workflow run, and deployed-version evidence.
- Full working-tree status with explicit included and excluded paths.
- Public route and static-generation inventory.
- Frontend source, component, data, asset, configuration, dependency, and workflow inventory.
- MB01 source scope, observation timestamp, matching rules, and access limitations.
- Design-freeze statement and viewport screenshot plan.
- Confirmed automatic actions, approval boundaries, and prohibited actions.

## G1. Frontend Surface Inventory

State: done. Parent verified on 2026-07-15 against `evidence/G1-surface-inventory.md` and the G1a/G1b/G1c evidence packages after one rework cycle.

Goal: map every public page, shared component, frontend data source, interactive control, content module, and deployment-facing configuration.

Acceptance evidence:

- Route-to-page-to-component matrix.
- Shared component and state-provider inventory.
- Data-source and API-boundary map.
- Interactive-element inventory.
- Asset, font, icon, and image inventory.
- Unused, duplicated, orphaned, or unreachable surface list with code evidence.

## G2. Architecture and Code Quality Audit

State: done. Parent verified on 2026-07-15 against `evidence/G2-architecture-code-quality.md`.

Goal: review frontend ownership boundaries, composition, state flow, type safety, duplication, error handling, and maintainability without refactoring.

Acceptance evidence:

- Findings with file and line evidence.
- Component ownership and state-flow map.
- Mock, hard-coded, generated, and API-backed data inventory.
- Error, loading, empty, and unavailable-state coverage map.
- Typecheck and existing-test results.

## G3. MB01 Product Content Alignment

State: done. Parent verified on 2026-07-16 against `evidence/G3-implementation-revalidation-2026-07-16.md`, `evidence/G3-deployment-closure-2026-07-16.md`, and the G3 implementation matrices.

Goal: compare the complete published catalog with `mb01.vanstro.ca`, using SKU as the primary identity key.

Acceptance evidence:

- Timestamped MB01 source URL inventory.
- Field-level comparison for status, name, SKU, model, categories, variants, parameters, price, descriptions, primary image, gallery images, and image order.
- `Matched`, `Mismatch`, `Missing Locally`, `Missing on MB01`, and `Blocked` status for every product.
- Variant-parent and color-SKU relationship report.
- Duplicate, stale, extra, and unmatched product lists.
- PLP, search, filter, and PDP browser spot checks supporting the full data comparison.
- Coverage and unresolved-difference totals. Sampling cannot replace the full comparison.
- Complete MB01 source-asset inventory covering every primary and gallery image for every parent and variant SKU.
- Source URL -> content hash -> SEO-safe controlled filename -> local asset path mapping, with duplicate-byte detection and provenance retained outside the public filename.
- Per-SKU proof that primary image, complete gallery set, and gallery order map to local controlled assets without flattening variant galleries.
- Explicit `Localized`, `Missing Local Asset`, `Hash Mismatch`, `Naming Failure`, or `Blocked` status for every unique source asset.
- A scan proving that published product data contains no MB01 asset URL. A remote URL manifest alone is not localization evidence.

## G4. Frontend Click and Interaction Audit

State: done. Parent verified on 2026-07-15 against `evidence/G4-interaction-audit.md` and the 115-row interaction, 168-route, and 139-PDP matrices.

Goal: test every public click, input, selection, toggle, expansion, close action, form submission, navigation, and browser-history behavior.

Acceptance evidence:

- Page x control x action x expected result x actual result matrix.
- Coverage for navigation, search, dealer selector, filters, sorting, pagination, product cards, gallery, variants, favorites, cart, checkout, authentication UI, forms, Cookie controls, support widget, drawers, modals, accordions, anchors, and external links.
- Applicable default, hover, focus, active, loading, success, failure, disabled, and empty-state results.
- Mouse, touch, keyboard, outside-click, Escape, refresh, back, and forward behavior.
- `Pass`, `Fail`, `Blocked`, or `N/A` for every interactive element.
- Reproduction steps, URL, viewport, screenshot or recording, and console evidence for failures.

## G5. Frozen-Design Visual, Layout, and Rendering Audit

State: done. Parent verified on 2026-07-15 against `evidence/G5-visual-layout-rendering.md`; Taste and Impeccable findings were constrained by the Design Freeze.

Goal: audit visual quality, layout, typography, rendering, responsive behavior, and alignment while preserving the approved design exactly.

Required method:

- Capture the approved baseline before evaluation.
- Run separate `design-taste-frontend` and `impeccable` audit passes.
- Use taste only for brand consistency, hierarchy, rhythm, template-like drift, and cross-module consistency.
- Use impeccable only for technical visual quality, accessibility, responsive behavior, typography, spacing, overflow, stacking, and rendering.
- Reject redesign, layout-change, colorize, bolder, distill, animate, or module-restructure recommendations.

Acceptance evidence:

- All-public-route screenshot matrix at every required viewport.
- Container, module, control, image, card, heading, price, button, form, Header, Footer, Cookie, and support-widget measurements.
- Overflow, clipping, overlap, z-index, sticky, fixed, independent-scroll, and layout-shift results.
- Dynamic-content checks for long names, SKUs, models, promotions, prices, variants, errors, and empty states.
- Separate taste and impeccable reports plus a deduplicated consolidated report.
- Findings classified as implementation, rendering, alignment, responsive, accessibility, approved-design deviation, subjective-rejected, or design-change-approval-required.

## G6. Accessibility and Browser Compatibility Audit

State: done. Parent verified on 2026-07-15 against `evidence/G6-accessibility-compatibility.md`; unavailable browser engines remain explicit limitations.

Goal: review semantic structure, keyboard access, focus, labels, contrast, reduced motion, assistive behavior, and supported browser rendering.

Acceptance evidence:

- Keyboard and focus-order matrix.
- Accessible-name, landmark, heading, form-label, and error-announcement review.
- Contrast and reduced-motion results.
- Desktop and mobile browser compatibility results.
- Blocking accessibility findings with page and element evidence.

## G7. Performance and Asset Audit

State: done. Parent verified on 2026-07-16 against `evidence/G7-performance-assets-rework-2026-07-16.md`, `evidence/G7-deployment-closure-2026-07-16.md`, and the G7 controlled-asset/performance package.

Goal: identify frontend loading, rendering, JavaScript, CSS, font, image, cache, and Core Web Vitals risks without optimization changes.

Acceptance evidence:

- Build output and route-size evidence.
- Image resolution, aspect-ratio, format, duplication, and loading inventory.
- Font-loading and layout-stability evidence.
- Render-blocking, hydration, client-component, and request findings.
- Desktop and mobile performance measurements with limitations noted.
- Controlled asset-library inventory with local path, byte size, MIME type, dimensions, content hash, owning page/SKU, and source provenance reference.
- Zero broken local asset references and zero runtime requests to `mb01.vanstro.ca` across source data, build output, representative browser sessions, and the deployed route set.
- Duplicate-content report that distinguishes intentional cross-SKU reuse from unnecessary duplicate files.
- Filename conformance report for lowercase ASCII, hyphen separation, semantic stability, accurate lowercase extension, and the approved product naming pattern.
- Explicit failures for spaces, underscores, opaque MB01 IDs, timestamp-only names, random hashes, misleading extensions, or query-dependent filenames unless the parent approves a documented exception.

## G8. Frontend Security and Privacy Audit

State: done. Parent verified on 2026-07-15 against `evidence/G8-security-privacy.md`; backend/authenticated controls remain explicit limitations.

Goal: review client-exposed data, forms, navigation, cookies, storage, third-party resources, dependency risk, and public security controls.

Acceptance evidence:

- Client-secret and sensitive-data exposure review.
- Cookie, consent, local-storage, and privacy-flow map.
- Form, link, redirect, external-resource, and injection-surface review.
- Dependency and public-header findings.
- No secrets or private values included in evidence.

## G9. Dedicated SEO Optimization, Content, and Legal Surface Audit

State: done. Rework evidence, route/product matrices, implementation manifest, and SEO release gate were parent verified on 2026-07-16. Implementation remains separately approval-gated.

Goal: audit and prepare implementation-ready optimization for Title, Meta Description, Canonical, Schema, Open Graph, image Alt, indexability, links, public copy, legal pages, and content consistency without changing the frozen visual design.

Acceptance evidence:

- Route metadata and canonical matrix.
- Sitemap, robots, structured-data, status, and 404 review.
- Broken-link and content-consistency report.
- Product metadata alignment with displayed content.
- Legal and privacy navigation coverage.
- Every public route classified as `Index`, `Noindex`, `Redirect`, `Canonicalized`, or `Blocked`, with the approved canonical target and reason.
- Route-by-route current and proposed Title and Meta Description matrix, including uniqueness, truthfulness, length review, route intent, and duplicate detection.
- Canonical matrix proving one absolute, self-consistent canonical per indexable route, correct origin/base path, normalized case/trailing-slash policy, and no accidental canonical collapse to the homepage.
- Schema matrix by route type, including Organization/WebSite, BreadcrumbList, Product/Offer/AggregateRating where supported by verified data, Article where applicable, and validation results. Do not publish unsupported ratings, inventory, pricing, or business claims.
- Open Graph and Twitter-sharing matrix covering route-specific title, description, URL, type, locale, and VanStro-controlled image with valid dimensions and public reachability.
- Image Alt matrix covering every meaningful rendered image, with decorative images explicitly empty, product images tied to the exact product/SKU/view, and no mechanical filename repetition or keyword stuffing.
- Implementation-ready SEO change manifest identifying route/file/data owner, exact current value, approved proposed value or generation rule, dependency, and verification method. Applying it remains approval-gated.
- Before/after verification requirements for rendered head tags, JSON-LD validation, social preview metadata, image accessibility, sitemap/robots output, and duplicate metadata counts.
- Route and product image matrix covering local asset URL, SEO-safe filename, alt text, image role, product/SKU association, and metadata/schema use.
- Proof that filenames are descriptive without keyword stuffing and that alt text describes the rendered image rather than repeating the filename mechanically.
- Canonical, Open Graph, Twitter, structured-data, and sitemap image references must use publicly reachable VanStro-controlled asset URLs, never MB01 URLs.

## G10. Build, CI/CD, and Deployment Audit

State: done. Parent verified on 2026-07-16 against `../../reports/goal-loop-g10-postdeployment-gate-2026-07-16.md` and `evidence/G10-postdeploy-2026-07-16/`.

Goal: verify frontend typecheck, static export, base path, asset paths, workflow behavior, caching, deployment parity, and rollback visibility.

Acceptance evidence:

- Typecheck, build, and existing-test output.
- GitHub Pages workflow and configuration review.
- Base-path and static-asset verification.
- Source-commit-to-deployment parity evidence.
- CI warnings, deployment risks, and missing checks.
- Source, generated data, exported HTML/JavaScript/CSS, and browser-network scans proving zero MB01 asset URLs in the deployed application.
- Manifest parity proving every referenced controlled asset exists in the exported artifact at the expected base-path-correct URL.

## G11. Full Frontend Browser Regression

State: done. Parent verified on 2026-07-16 against `evidence/G11-full-browser-regression-rework-2026-07-16.md` and `evidence/G11-rework-2026-07-16/`. The audit coverage is complete; the recorded runtime release gate remains `FAIL` and flows into G12.

Goal: consolidate G2-G10 into a full public-route and interaction regression across required viewports.

Acceptance evidence:

- Every public route visited.
- Every interactive control exercised on its primary path.
- Critical commerce controls include failure and repeated-action tests where safely possible.
- Desktop and mobile console, visual, navigation, and interaction results.
- Confirmed open failures, blocked checks, and residual risk list.
- Product primary/gallery image rendering and order checks must use local controlled URLs, include variant switches, and record any MB01 network request as a release-blocking failure.
- Representative and generated-route checks must verify final Title, Meta Description, Canonical, Schema, Open Graph, and image Alt output after any approved G9 implementation.

## G12. Consolidated Findings and Release Recommendation

State: done. Parent verified on 2026-07-16 against `evidence/G12-consolidated-findings-release-recommendation-2026-07-16.md` and `evidence/G12-rework-2026-07-16/`. Audit completion is `PASS`; runtime readiness and production release readiness remain `FAIL`, and external integration verification remains `BLOCKED`.

Goal: consolidate all evidence, remove duplicates, check traceability, prioritize findings, and issue the final audit recommendation.

Acceptance evidence:

- Complete P0-P3 finding register.
- Coverage matrix showing no unexplained gaps.
- Finding-to-evidence and finding-to-recommendation traceability.
- Approval-required remediation backlog separated from audit results.
- Design-freeze conflicts explicitly rejected or approval-gated.
- Final `PASS`, `CONDITIONAL PASS`, or `FAIL` recommendation with residual risks.
- Dedicated release gate for complete asset localization, zero MB01 runtime dependency, local-asset integrity, and SEO-safe filename compliance.
- Dedicated SEO release gate for Title, Meta Description, Canonical, Schema, Open Graph, and image Alt completeness, uniqueness, validity, and product-truth alignment.

## G13. Product Content Correction and Full Catalog Revalidation

State: done. Parent verified on 2026-07-16 against `evidence/G13-product-content-correction-2026-07-16.md`, `evidence/G13-live-audit-2026-07-16/`, and `evidence/G13-implementation-2026-07-16/` after the user explicitly approved source and catalog changes.

Goal: verify the business issue workbook against the current public MB01 catalog, repair confirmed product-content and PDP behavior defects, then revalidate every published parent product, SKU variant, and controlled product asset without changing the approved page structure or visual design.

Acceptance evidence:

- Workbook issue-to-source verification for Bathroom Vanity Hardware, cabinet-only configurations, Handle series products, and Accessories material.
- Timestamped current MB01 inventory and field-level comparison for every parent and SKU variant.
- Exact local coverage of all current MB01 products and SKUs, with no stale local-only SKU.
- Bathroom Vanity variant proof covering SKU, model, price, color, configuration, Hardware, images, description, and Product overview updates.
- Handle CTC-96mm and Handle CTC-192mm represented as separate products under the Handle series filter.
- Approved business correction proving Accessories content uses MDF and does not publish the known MB01 `MDF / Plywood` error.
- Complete current asset-source-to-controlled-library mapping, including source hash, local hash, local path, and blocked-source handling.
- Source, generated catalog, build, and browser checks proving no MB01 runtime asset dependency.
- Typecheck, static build, SEO/security QA, generated SEO artifact counts, and browser interaction evidence.
- Design Freeze confirmation and explicit record that no commit, push, deployment, external write, or production change occurred.
