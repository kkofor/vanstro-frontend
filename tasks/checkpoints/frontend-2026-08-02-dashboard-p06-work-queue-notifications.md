# Frontend checkpoint — Dashboard P06 Work Queue / Notifications

- Branch/worktree: `feature/frontend`, `.claude/worktrees/frontend`
- Parent: `9a3ea56218696ccc6362bd0d3f307c23c12aecf0`
- Frozen contract SHA-256: `2cfa707b5c64f62206df96951719c8ee01d30d451ab2d65ddbe26097e1f435d3`

## Delivered

Frontend-only P06 adds fail-closed Work Queue/summary/adapter/Notification/capability validation and canonical Operations `view=work-queue|notifications` ownership. URL filters reject unknown/repeated/unsupported values; cursors remain in memory. My Queue, Unassigned, Critical, Overdue and Recently Resolved presets plus Apply/Clear are present without fetching during typing.

The Simplified Chinese read-only presenter uses shared Table and DetailDrawer, exact critical-outside-filter warning, safe assignment/status/severity/SLA/health/resource/deep-link summaries, separate adapters and recipient Notifications. Notification read is explicitly distinct from Work Item acknowledgement. Action capabilities are descriptive only. No assignment, acknowledge, resolve, dismiss, reopen, mark-read or other mutation is mounted.

Integration producer/consumer reconciliation aligned the frozen foundation summary version, all 14 adapter sources with exact `${source}.v1`, the three Notification types, top-level Work Queue summary and top-level Notification unread summary with standard cursor metadata. Producer-shaped compatibility fixtures now cover these boundaries.

Final review remediation maps every preset to real API filters and deterministic recent-resolved bounds; exposes every frozen queue filter; adds strict capability-off Clear/no-fetch; guards every post-await state/cursor/detail commit by request identity; validates fixed deep-link routes/query keys; enforces exact cursor sort/bounds/profile and summary registries/counts; stores and displays unread count; and derives adapter partial state from the current response rather than a stale closure.

The final exactness follow-up permits the Backend-owned query-free `/dashboard/operations` worker-heartbeat adapter link while retaining strict query rules for every other route, and requires both non-empty registry-owned foundation summary keys `stage` and `issueCode`. Exact Backend adapter and missing-summary negative fixtures cover both findings.

Preset parser closure derives concrete filters during direct-load and Back/Forward parsing, canonicalizes preset-only URLs to include them, and rejects contradictory explicit preset/filter combinations. `recently-resolved` uses injectable time to derive deterministic 30-day resolved bounds; URLs that already carry a valid 30-day bound remain stable.

Final Work Item lifecycle validation checks every optional timestamp, exact actor shapes, active/terminal retention, acknowledgement/resolution/dismissal mutual consistency and assignment timestamp pairing against the actual Backend serializer. Bogus dates, actors and contradictory states fail before rendering; positive fixtures cover open, acknowledged, resolved, dismissed and assigned states. Because `foundation.attention` is the sole frozen v1 type and has no attention-expiry policy, both `status=expired` and any `attentionExpiresAt` fail closed.

Controlled Integration browser verification then reproduced an authorized P06 route permanently stuck in the legacy loading gate: P06 intentionally skips `loadTab`, so its legacy resource state remains `idle`. The focused follow-up now mounts an authorized Work Queue/Notification panel after the capability-off fail-closed branch but before all legacy resource-state returns. A source-order regression locks both authorized views to this independent loading path while retaining capability-disabled no-fetch rollback.

No Backend/Worker/Prisma/migration, external delivery, Email/SMS/Push, Command Center, P07, deploy, push or stash action occurred.

## Verification

- Initial focused P06: 7/7; producer compatibility follow-up: 8/8; final Medium remediation: 9/9; loading-gate follow-up: 10/10.
- Package contracts including P06 and F0–P05 regressions after loading-gate remediation: 151/151.
- `typecheck:web`: passed.
- Final review, error localization, fr-CA formatting and SEO/security: passed after synchronizing the already-present Backend P05 public Job error catalog into the shared Frontend contract/localization.
- Production-configured static build: passed.
- SEO artifacts: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs.
- French HTML: 195 passed; 404, privacy and protected artifact gates passed.
- Dashboard HTML: 42; Chinese Dashboard routes: 0.
- Chromium current-tree: 40/40.
- `git diff --check`: passed.

Not run: live merged Backend P06 fixtures, VoiceOver/NVDA/JAWS, or real Windows forced-colors. Integration owns controlled global/scoped/capability/cursor/stale/detail/adapter/notification browser verification.

## Next action

Commit the focused Frontend work and hand it to Integration. Stop before P07, external delivery, Command Center or deployment.
