# G13 Product Content Correction and Full Catalog Revalidation

Date: 2026-07-16
Source observation: 2026-07-17T03:21:10Z
Decision: **PASS**
Deployment: **Not performed**

## Scope

G13 was opened after the business issue workbook `新网站上问题(1).xlsx` identified four possible catalog defects. The user approved verifying those claims, applying only confirmed repairs, and checking the same content classes across the complete storefront catalog.

This is a frontend post-audit remediation goal. It does not replace the original G0-G12 release recommendation and does not modify the root backend goal loop.

## Issue verification

| Workbook claim | Verification source | Result before repair | G13 disposition |
| --- | --- | --- | --- |
| Bathroom Vanities Product overview omitted Hardware | Current MB01 vanity descriptions and local PDP renderer | Substantiated. Current MB01 exposed Hardware, but the local overview truncated highlights to three rows. | Render every verified highlight; Hardware is now visible. |
| Bathroom Vanities omitted cabinet-only configurations | Current MB01 V3021 and all vanity variants | Substantiated. MB01 currently exposes top and cabinet-only SKUs for White and Light Grey, but the PDP presented them as undifferentiated finish swatches. | Separate Color / finish from Configuration while retaining SKU-driven data. |
| Handle product data and category were incorrect | Current MB01 product/category pages | Substantiated. MB01 now publishes two products, CTC-96mm and CTC-192mm, under Handle series. | Regenerate both products and add Handle series to the existing filter. |
| Accessories should be MDF, not Plywood | Business workbook compared with current MB01 copy | Business correction accepted. MB01 still publishes `MDF / Plywood Thermofoil Finish`; the workbook identifies this as incorrect product copy. | Apply a narrowly scoped Accessories-only correction to `MDF Thermofoil Finish`. |

## Implemented repair

- Regenerated the catalog from the current 140 MB01 parent products and 300 SKU variants.
- Kept SKU as the identity key and retained model, price, descriptions, parameters, images, and image order per variant.
- Added separate PDP controls for `Color / finish` and vanity `Configuration` without changing the approved PDP module structure.
- Removed the three-item overview truncation so Hardware and any other verified highlights render.
- Added `Handle series` to the existing subcategory filter and included the two current handle products.
- Applied the approved MDF correction only when the MB01 subcategory is `Accessories`.
- Reused the existing controlled asset library. No new runtime asset URL was introduced.

## Full-catalog result

| Gate | Result |
| --- | --- |
| Current MB01 parent products | 140 |
| Current MB01 SKU variants | 300 |
| Matched local SKU variants | 300 |
| Field-mismatched variants | 0 |
| Extra local SKUs | 0 |
| Bathroom Vanity variants | 52 |
| Bathroom Vanity variants with Hardware | 52 / 52 |
| Bathroom Vanity cabinet-only variants | 26 |
| Handle series products | 2 / 2 |
| Accessories containing `Plywood` after approved correction | 0 |
| Current source asset occurrences mapped locally | 1,726 |
| Missing controlled assets | 0 |
| Runtime MB01 references in generated catalog | 0 |

The full verifier compares name, category, subcategory, model, price, description, highlights, specifications, gallery order, and controlled local paths for every SKU. The only allowed content divergence is the documented Accessories MDF business correction.

## Asset exception

One current MB01 gallery URL returns `404 Not Found`:

`https://mb01.vanstro.ca/uploads/products/20260715080317_f640e3d7d853.jpg`

It is recorded as `Blocked` and omitted from affected local galleries. G13 did not invent a replacement or add a broken reference. All other 1,726 current source occurrences map to 1,216 existing controlled files with verified hashes.

## Browser verification

- V3021 default: SKU `023021311`, model `V3021STDL-PWMS-WH-TOP`, `$538.00`, White, Cabinet + Top, Hardware visible.
- V3021 cabinet-only: SKU `023021312`, model `V3021STDL-PWMS-WH`, `$368.00`, overview updated.
- V3021 Light Grey cabinet-only: SKU `023021314`, model `V3021STDL-PWMS-LG`, `$368.00`, overview updated.
- Handle series filter: two products, SKUs `060101111` and `060102411`.
- Toe Kick Accessories PDP: `MDF Thermofoil Finish`, with no `Plywood` text.

Detailed evidence: `evidence/G13-implementation-2026-07-16/browser-verification.json`.

## Automated verification

- `pnpm run typecheck:web`: pass.
- `NEXT_PUBLIC_SITE_URL=https://vanstro.ca pnpm run build:pages`: pass; 173 generated Next pages.
- `pnpm run qa:seo-security`: pass.
- `pnpm run qa:seo-artifacts`: pass; 171 HTML routes, 157 sitemap URLs, 140 ProductGroups, 300 variants.
- `node scripts/verify-g13-product-content.mjs`: pass.

## Approval and design boundaries

- Source and generated product data changes were explicitly approved for G13.
- The approved page order, module set, brand colors, typography direction, and visual language were not redesigned.
- No dependency was installed or upgraded for G13.
- No database, ERP, email, payment, MCP, account, or production write was performed.
- No commit, push, pull request, GitHub Pages deployment, or production setting change was performed.

## Residual risk

- MB01 is mutable; this evidence is tied to the recorded source timestamp.
- The Accessories MDF correction is business-authoritative but intentionally differs from the current public MB01 wording until MB01 is corrected.
- The one blocked upstream image remains unavailable. Its omission is safer than publishing a broken or unverified replacement.
