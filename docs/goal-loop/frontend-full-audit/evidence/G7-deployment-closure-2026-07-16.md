# G7 Deployment Closure: Performance and Controlled Assets

Status: **PASS. Parent accepted G7 on 2026-07-16.**

## Package D completion

The user approved an early GitHub Pages deployment for the G3/G7/G10 rework. Package D, previously deferred, is now complete.

| Deployment gate | Result |
| --- | --- |
| Runtime commit pushed to `main` | `1eaf29e937333cf88f7f5cf4422c8bef93f313e8` |
| Pages workflow | Run `29483876321`, Pass |
| CI typecheck | Pass |
| Static export and artifact upload | Pass |
| Exported HTML routes | 171 |
| Controlled assets in artifact | 1,216 / 1,216 |
| Missing/hash/parity failures | 0 |
| Base-path failures | 0 |
| MB01 artifact/live/browser references | 0 / 0 / 0 |
| Browser image failures | 0 |

## Local packages retained

Packages A-C remain as documented in `G7-performance-assets-rework-2026-07-16.md`:

- Product/catalog payload containment.
- Intrinsic image sizing, priority/lazy-loading behavior, and generated-image optimization.
- 92 verified single-frame GIF assets converted to WebP with derived provenance.
- Reference-proven duplicate cleanup.
- Controlled-library hash, MIME, dimension, ownership, route, and naming checks.
- Thumbnail aspect correction without changing the approved gallery layout.
- Variant finish synchronization through the purchase panel and Product Overview.

The final controlled library contains 1,216 files and 73,847,074 bytes. There are zero missing exports, provenance hash/MIME/reference failures, filename failures, extension/format failures, or controlled duplicate files.

## Deployed verification

The actual Pages artifact was downloaded and audited rather than inferred from the local `out/` folder. It contains 2,786 files, including 171 HTML files. All 1,216 controlled product assets match both the public source files and provenance hashes.

Every exported route was requested from the live Pages site. All 171 returned the expected success or 404 status, and no response contained an MB01 runtime reference. Browser probes on Home, PLP, Base Cabinet PDP, and Lazy Susan PDP found no failed images and no MB01 DOM/image URLs.

## Evidence

- `G7-rework-2026-07-16/controlled-assets.json`
- `G7-rework-2026-07-16/asset-provenance-derived.json`
- `G7-rework-2026-07-16/measurement-summary.json`
- `G7-rework-2026-07-16/basepath-export-verification.json`
- `G10-postdeploy-2026-07-16/logs/workflow-run.json`
- `G10-postdeploy-2026-07-16/logs/artifact-audit.log`
- `G10-postdeploy-2026-07-16/logs/live-deployment-route-scan.json`
- `G10-postdeploy-2026-07-16/logs/browser-runtime.json`
- `G10-postdeploy-2026-07-16/matrices/postdeploy-gates.csv`

## Residual risks

- Synthetic performance measurements are not field Core Web Vitals and should be supplemented with production RUM when available.
- Responsive multi-width derivatives are not universal; the current direct local assets preserve the approved crop and layout.
- The Pages workflow reports that older Node 20-based action implementations will be forced to Node 24. This is a CI maintenance warning, not a failed release gate.
- Open Graph and Twitter share images remain an open G9 implementation item and are not a G7 asset-integrity failure.
