# G3 Deployment Closure: MB01 Product Content and Controlled Assets

Status: **PASS. Parent accepted G3 on 2026-07-16.**

## Scope

This closure verifies that the locally accepted G3 implementation is the same frontend runtime published to GitHub Pages. It adds deployment evidence to the full local catalog and controlled-asset verification; it does not repeat the MB01 collection or modify product content.

## Final gates

| Gate | Result |
| --- | --- |
| MB01 parent products represented locally | 139 / 139, Pass |
| Public variants matched by SKU | 300 / 300, Pass |
| Field or gallery mismatches | 0 |
| Unique controlled product assets | 1,216 |
| Missing local/exported assets | 0 |
| Public/provenance/export hash failures | 0 |
| Filename-policy failures | 0 |
| MB01 references in deployed source/artifact | 0 / 0 |
| MB01 references across 171 live routes | 0 |
| Browser product-image failures | 0 |
| Runtime variant synchronization | Pass |

The catalog verifier was corrected to consume G7's derived-provenance map for 92 static GIF assets converted to WebP. This keeps G3 byte and gallery verification valid after the approved G7 format optimization. The rerun returned 300 matched variants, 1,216 controlled assets, and zero missing, hash, naming, export, source-reference, or output-reference failures.

## Deployment identity

- Runtime commit: `1eaf29e937333cf88f7f5cf4422c8bef93f313e8`
- GitHub Actions run: `29483876321`
- Pages artifact: `8369587941`
- Public site: `https://kkofor.github.io/vanstro-frontend/`

The downloaded Pages artifact contained all 1,216 controlled assets at the expected base-path URLs with matching SHA-256 values. A scan of all 171 exported/live routes found no `mb01.vanstro.ca` reference.

## Browser proof

The deployed Lazy Susan Base LSB36 PDP was switched from White to Light Grey. The following values changed together:

- Model: `LSB36-W-PWMS-LG`
- SKU: `013790230`
- URL query: `?sku=013790230`
- Purchase-panel finish: `Light Grey`
- Product Overview finish: `Light Grey`
- Main/gallery images: local `assets/products/` Light Grey files

All rendered PDP product images loaded successfully and none used MB01.

## Evidence

- `G3-implementation-2026-07-16/verification-summary.json`
- `G3-implementation-2026-07-16/variant-verification.csv`
- `G3-implementation-2026-07-16/verification-rerun-2026-07-16.log`
- `G10-postdeploy-2026-07-16/logs/artifact-audit.log`
- `G10-postdeploy-2026-07-16/logs/live-deployment-route-scan.json`
- `G10-postdeploy-2026-07-16/logs/browser-runtime.json`
- `G10-postdeploy-2026-07-16/deployed-light-grey-variant.png`

## Residual boundary

This is a timestamped alignment against the 2026-07-16 MB01 snapshot. Future MB01 catalog changes require a new approved collection and the same localization, hash, field, gallery, build, deployment, and browser gates.
