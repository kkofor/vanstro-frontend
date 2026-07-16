# G7 Rework Evidence: Performance and Controlled Asset Audit

Status: **Packages A-C implemented and locally verified. Package D deployment is explicitly deferred by the user until all goals are complete.** This report does not self-approve G7 and does not modify `GOALS.md`.

Working-tree baseline: current post-G3 implementation over Git HEAD `b8f59ea91547979627be4307a0523a7c6125d129`. The worktree was already dirty. No unrelated change was reverted, and no commit, push, pull request, or deployment was performed.

Local verification date: 2026-07-16, America/Winnipeg.

## 1. Parent recommendation

Accept the local implementation and evidence for Packages A-C, but keep the parent G7 deployment gate open:

- Current source, normal static export, base-path static export, and 12 browser probes contain zero `mb01.vanstro.ca` runtime references.
- All approved source and asset changes have been implemented without changing the frozen module structure, page layout, visual hierarchy, branding, or interaction model.
- The user instructed that GitHub Pages must not be deployed now. Package D and deployed-route verification must run once, after the complete goal set is ready for unified deployment.
- The previous read-only deployed scan remains historical evidence only: it showed the currently deployed artifact was stale. It was not replaced or rescanned in this package.

## 2. Approval boundary observed

Approved and performed:

1. Package A source payload containment.
2. Package B image delivery optimization.
3. Package C static GIF conversion and reference-proven duplicate cleanup.
4. Local typecheck, normal export, base-path export, controlled-asset audit, browser performance, and visual regression.

Not performed:

1. Git commit or push.
2. GitHub Pages deployment.
3. Production mutation of any kind.
4. External ERP, email, payment, MCP, or API write call.

## 3. Package A: payload containment

Implemented changes:

- Added server-side product-card and catalog projections so initial routes receive only fields needed by the rendered UI.
- Removed the global cart drawer's client import of the complete `productsWithCommerce` catalog.
- Passed two projected cart suggestions from `AppChrome` instead.
- Split dealer data into a small dedicated module so header/location components no longer pull the large product mock module.
- Added product-link prefetch containment on catalog-heavy links. Visible links and click behavior are unchanged.
- Added a server-only 1,216-entry product image dimension map. It is not shipped as a client catalog payload.

Measured build effect:

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| `/products/` raw HTML | 1,289,153 B | 272,603 B | -78.9% |
| Linked JS/CSS raw bytes | 2,152,334 B | 867,611 B | -59.7% |
| Largest shared chunk | 1,312,933 B | 227,522 B | -82.7% |
| Controlled asset path occurrences in shared chunk | 4,711 | 0 | -100% |

The final catalog HTML is slightly larger than the first Package A measurement because intrinsic image dimensions were added afterward. It remains approximately 79% below the audited baseline.

## 4. Package B: image delivery

Implemented changes:

- Converted seven generated PNG assets to WebP while preserving approved imagery and composition.
- Replaced the 1.71 MB global support portrait with a dedicated 192x192 WebP at 7,316 bytes.
- Added intrinsic width and height to all 34 literal `<img>` sites.
- Added explicit eager/high-priority behavior for route hero/LCP images.
- Added lazy loading and asynchronous decoding for below-fold category, product, resource, footer, cart, review, and recommendation images.
- Added a local `favicon.ico`, removing the only observed browser 404.

Generated-image result:

| Measure | Result |
| --- | ---: |
| Source PNG bytes | 12,941,559 |
| Active WebP bytes | 602,382 |
| Bytes removed | 12,339,177 |
| Reduction | 95.3% |

The source inventory now reports 34/34 loading attributes and 34 image sites with intrinsic dimensions. Responsive `srcSet` generation was not added; static direct assets remain in place to preserve the existing crop and visual behavior. Product and content images now defer when outside the viewport.

## 5. Package C: controlled assets and cleanup

Static GIF conversion:

| Measure | Before | After |
| --- | ---: | ---: |
| Controlled GIF files | 92 | 0 |
| Controlled WebP files | 0 | 92 |
| Bytes | 4,030,783 | 1,537,880 |
| Reduction |  | 2,492,903 B / 61.8% |

All 92 source GIFs were verified as single-frame before conversion. The conversion script verifies each WebP before updating the generated product mapping, writes derived provenance, and removes the source GIF only after the complete batch succeeds. It is idempotent after conversion.

Duplicate cleanup used two independent gates: zero source reference and zero current-export reference. Legacy/original-site candidates also required a byte-identical retained file outside the deletion set.

| Cleanup phase | Files removed | Bytes removed | Retained basis |
| --- | ---: | ---: | --- |
| Generated PNG, full support image, `assets/legacy` | 24 | 14,793,888 | Active WebP or byte-identical retained file |
| Unreferenced original-site duplicates | 281 | 15,553,288 | Byte-identical controlled product file |
| Total | 305 | 30,347,176 | Recorded per path in result manifests |

The obsolete featured-product data branch and two unreferenced original-site data modules were removed so they could not falsely preserve dead asset URLs. The live product source remains the localized MB01 catalog.

Whole public-tree result:

| Measure | Before | After |
| --- | ---: | ---: |
| Public files | 1,553 | 1,256 |
| Public bytes | 109,178,428 | 77,025,113 |
| Duplicate groups | 258 | 2 |
| Redundant bytes | 17,413,224 | 91,989 |
| Controlled-library duplicate files | 0 | 0 |

The two remaining groups are retained shared/controlled copies. No further deletion was attempted without stronger ownership evidence.

## 6. Controlled library acceptance

| Check | Result |
| --- | ---: |
| Controlled assets | 1,216 |
| Controlled bytes | 73,847,074 |
| Formats | 1,123 JPG; 92 WebP; 1 PNG |
| Missing exported assets | 0 |
| Provenance hash failures | 0 |
| Provenance MIME failures | 0 |
| Provenance reference failures | 0 |
| Page ownership failures | 0 |
| Parent-page export failures | 0 |
| Filename policy failures | 0 |
| Extension/format failures | 0 |
| Controlled duplicate files | 0 |

The audit parser now reads VP8, VP8L, and VP8X WebP dimensions directly from file bytes. It does not trust file extensions alone.

## 7. Browser performance before and after

Method: Chrome DevTools Protocol against the local static export, cache disabled per route, desktop plus Lighthouse-like mobile throttling, one run per route/profile. These are synthetic lab observations, not CrUX field data. INP was not measured.

| Profile | Route | LCP before | LCP after | Encoded bytes before | Encoded bytes after |
| --- | --- | ---: | ---: | ---: | ---: |
| Desktop | Home | 7,520 ms | 868 ms | 17,607,435 | 2,460,565 |
| Desktop | Alternate home | 7,468 | 784 | 17,695,745 | 2,491,242 |
| Desktop | Catalog | 4,228 | 1,212 | 7,011,225 | 2,484,851 |
| Desktop | PDP | 1,340 | 788 | 5,034,639 | 1,894,561 |
| Desktop | Article | 2,100 | 896 | 4,404,705 | 1,618,808 |
| Desktop | Dashboard | 1,084 | 724 | 4,392,313 | 1,417,711 |
| Mobile | Home | 46,744 | 4,504 | 13,609,472 | 1,519,103 |
| Mobile | Alternate home | 46,680 | 4,544 | 13,711,982 | 1,412,808 |
| Mobile | Catalog | 26,180 | 5,692 | 6,601,883 | 1,276,005 |
| Mobile | PDP | 5,424 | 5,456 | 4,623,850 | 1,510,228 |
| Mobile | Article | 7,640 | 5,328 | 4,133,780 | 1,193,378 |
| Mobile | Dashboard | 5,308 | 4,024 | 3,932,955 | 992,281 |

The mobile PDP LCP difference is +32 ms in a single synthetic run and is treated as measurement noise; encoded transfer fell 67.3%, request failures stayed zero, and the LCP image remained the correct primary product image.

Final browser checks across all 12 probes:

- Failed requests: 0.
- Real broken images: 0.
- MB01 requests: 0.
- Desktop CLS: 0 on all sampled routes.
- Mobile CLS: 0.0234 on home/catalog/PDP/article and 0 on dashboard; no new layout shift was introduced.
- Deferred lazy images are reported separately and are not counted as broken.

## 8. Frozen-design verification

The approved design was treated as immutable. No CSS layout, module order, visual hierarchy, colors, copy, or interaction behavior was changed for G7. Source edits are limited to payload projection, image metadata/loading, asset formats, references, dead data removal, and audit tooling.

Desktop and mobile screenshots for home, catalog, and PDP were captured before and after optimization. Visual inspection confirms:

- Existing header, hero, category grid, catalog filter/product grid, PDP gallery/buy panel, cookie surface, and support launcher remain in their established positions.
- Product images retain their intended aspect behavior and crops.
- No overlap, blank active image, or missing visible asset was observed.

### Post-review regression correction

User review identified that intrinsic `width`/`height` attributes added during image optimization could stretch PDP thumbnail images because the thumbnail CSS did not explicitly neutralize the intrinsic height. The gallery CSS now sets `height: auto` on both the main product image and thumbnail images. Runtime geometry after the correction is:

- Main PDP image: 618 x 618 px in the desktop verification viewport.
- Seven visible thumbnail controls: 74 x 78 px each.
- Thumbnail image content: 58 x 45 px each.

The correction changes image sizing behavior only; it does not change the approved gallery layout or visual design.

The same runtime pass verified variant-state propagation on `Lazy Susan Base LSB36`. Switching from White to Light Grey updates the selected swatch, main image set, model number, SKU, URL query, purchase-panel finish, Product overview `Color / Finish`, and variant specification value together:

- Model: `LSB36-W-PWMS-LG`
- SKU: `013790230`
- Purchase-panel finish: `Light Grey`
- Product overview finish: `Light Grey`
- URL: `?sku=013790230`

## 9. Verification commands

- `pnpm run typecheck`: pass for web, DB, API, worker, and CLI.
- `pnpm run build:pages`: pass; 170 generated pages and 171 HTML files including not-found output.
- `NEXT_PUBLIC_BASE_PATH=/vanstro-frontend pnpm run build:pages`: pass.
- Base-path verification: 171 HTML files, 1,216 unique controlled references, 0 missing local assets, 0 MB01 files.
- Final normal export rebuilt after base-path verification.
- Controlled source/build MB01 matches: 0/0.
- Browser MB01 requests: 0 across 12 probes.
- Browser request failures and real broken images: 0/0 across 12 probes.

## 10. Remaining risks and deferred work

1. **Deployment gate remains open by user instruction.** The current GitHub Pages artifact is not evidence for the local candidate until the final unified deployment occurs.
2. **Responsive derivatives are not universal.** The largest performance defects were removed through payload containment, WebP conversion, correct priority, and lazy loading; a future CDN/image service can add multi-width delivery without changing layout.
3. **Single-run lab measurements fluctuate.** Production acceptance should repeat browser measurements after deployment and use field data when available.
4. **Two small duplicate groups remain.** They are not deleted without stronger ownership proof.

## 11. Evidence index

Directory: `evidence/G7-rework-2026-07-16/`

- `controlled-assets.json`: 1,216-file inventory with dimensions, hashes, MIME, ownership, routes, and provenance.
- `asset-provenance-derived.json`: G7 derived provenance for static GIF-to-WebP conversions.
- `product-gif-conversion.log`: conversion run evidence.
- `generated-image-optimization.json`: seven generated-image before/after byte results.
- `asset-cleanup-plan-phase1.json` and `asset-cleanup-result-phase1.json`: generated/legacy cleanup proof.
- `asset-cleanup-plan.json` and `asset-cleanup-result-phase2.json`: original-site duplicate cleanup proof.
- `duplicate-content.json`: final whole-public-tree duplicate groups.
- `route-build-analysis.json`: every exported route and linked resource measurement.
- `source-analysis.json`: client-module and image-markup inventory.
- `summary.json`: final aggregate asset/build checks.
- `browser-performance-before-optimization.json`: baseline CDP observations.
- `browser-performance.json`: final CDP observations.
- `browser-performance-comparison.json`: route-by-route before/after comparison.
- `measurement-summary.json`: final browser/build/asset digest.
- `basepath-export-verification.json`: GitHub Pages base-path candidate verification.
- `screenshot-*-before-optimization.png` and `screenshot-{desktop,mobile}-{home,catalog,pdp}.png`: frozen-design evidence.
- `thumbnail-regression-fixed-desktop.png` and `thumbnail-regression-fixed-mobile.png`: post-review gallery sizing evidence.
- `variant-light-grey-synchronized.png`: selected Light Grey SKU, image set, and purchase-panel state evidence; DOM verification also confirms the Product overview finish is `Light Grey`.
- `typecheck.log`, `build-pages.log`, `build-pages-basepath.log`, `build-pages-final.log`: verification logs.
- `audit.mjs`, `summarize.mjs`, `cdp-performance.mjs`, `verify-basepath-export.mjs`, `plan-asset-cleanup.mjs`: reproducible collectors.

Parent action requested: accept Packages A-C as locally verified, leave G7 deployment acceptance open, and execute Package D only during the user-approved unified deployment after the complete goal set is finished.
