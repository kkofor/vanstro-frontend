# G10 Post-Deployment Gate Report

Status: **PASS for G10. Parent accepted G10 on 2026-07-16.**

## Decision

The deployed frontend satisfies G10's build, GitHub Pages, base-path, controlled-asset parity, and zero-MB01-runtime requirements. G10 is complete. This decision does not replace G11 full browser regression or G12's final release recommendation.

## Deployment boundary

| Item | Verified value |
| --- | --- |
| Runtime commit | `1eaf29e937333cf88f7f5cf4422c8bef93f313e8` |
| Local HEAD / `origin/main` / remote `main` at runtime gate | Same commit |
| GitHub Actions run | `29483876321` |
| Pages artifact | `8369587941` |
| Pages deployment | `5470340026` |
| Public URL | `https://kkofor.github.io/vanstro-frontend/` |

The workflow completed dependency installation, typecheck, static Pages build, artifact upload, and deployment successfully. The candidate build generated 170 application pages plus the not-found output, producing 171 HTML files in the deployed artifact.

## Artifact and route gates

| Gate | Result |
| --- | --- |
| Downloaded deployed artifact files | 2,786 |
| HTML files | 171 |
| Deployed source MB01 occurrences | 0 |
| Deployed artifact MB01 occurrences | 0 |
| Live routes scanned | 171 |
| Live route failures | 0 |
| Live MB01 occurrences | 0 |
| Controlled assets expected/present | 1,216 / 1,216 |
| Public/export/provenance hash failures | 0 |
| Base-path missing/root references | 0 / 0 |
| Missing image `alt` attributes in artifact | 0 |

The live scan includes the homepage, catalog, every generated PDP/content route, and expected 404 behavior. It does not rely on sampling for the zero-MB01 response gate.

## Browser runtime

Four representative live routes were rendered in the in-app browser: Home, Products, Base Cabinet B12 PDP, and Lazy Susan Base LSB36 PDP. No rendered product image failed and no DOM/image URL referenced MB01.

The Lazy Susan finish was switched to Light Grey. Model, SKU, URL, finish label, Product Overview, and image set synchronized to SKU `013790230`. This closes the previously reported overview/variant drift on the deployed build.

## Metadata observation

All 171 HTML routes emit a title, meta description, canonical, valid JSON-LD, Open Graph title/description, Twitter card, and image `alt` attributes. The artifact audit also found:

- 171 routes without an Open Graph image.
- 171 routes without a Twitter image.
- The Products route currently canonicalizes to the homepage.

These are retained as visible G9 implementation findings. They do not invalidate G10's build/deployment/asset gate, but they remain release work for G11/G12 to track rather than being silently treated as complete SEO optimization.

## Remaining risk

- The workflow uses actions that emit a Node 20 deprecation warning and will be forced to Node 24. Upgrade should be scheduled before GitHub removes compatibility.
- There is no broad portable automated frontend test suite beyond typecheck, static build, audit scripts, route scans, and browser probes.
- G11 must still exercise all public interactions and viewports; G12 must issue the final release recommendation.

## Evidence index

Directory: `docs/goal-loop/frontend-full-audit/evidence/G10-postdeploy-2026-07-16/`

- `logs/deployment-boundary.txt`
- `logs/workflow-run.json`
- `logs/pages-config.json`
- `logs/deployments.json`
- `logs/artifact-audit.log`
- `logs/live-deployment-route-scan.json`
- `logs/browser-runtime.json`
- `matrices/controlled-asset-export-parity.csv`
- `matrices/live-deployment-routes.csv`
- `matrices/mb01-runtime-reference-scan.csv`
- `matrices/basepath-reference-failures.csv`
- `matrices/final-metadata-export.csv`
- `matrices/postdeploy-gates.csv`
- `deployed-light-grey-variant.png`
- `audit-deployed-artifact.mjs`
- `scan-live-deployment.mjs`
