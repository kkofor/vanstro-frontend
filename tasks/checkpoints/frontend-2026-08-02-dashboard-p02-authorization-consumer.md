# Frontend checkpoint — Dashboard P02 authorization consumer

Date: 2026-08-02

## Identity and boundary

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`.
- Shared contract baseline: Integration Backend merge `68ca0e466d09741639423564709c2abda3cbf58d` containing Backend functional commit `793d9aa269fc92411e68d54ccd557b9f19ffa343` and handoff `eaa215b36d62b9324480dd07925e4f6429e33f43`.
- Scope is the read-only consumer for `dashboard-authorization.v1`. No business mutation, schema/migration, P03, deployment, production write, payment/refund, ERP, push, or PR action occurred.

## Implementation

- The existing Foundation boundary remains the single session/request coordinator. Foundation still decides whether the internal F0 Shell is enabled; disabled/actor-not-allowed states immediately preserve the legacy Dashboard without requiring P02.
- When Foundation is ready, the same generation and AbortController fetch and validate `GET /dashboard/authorization` before the new Shell becomes ready. Actor IDs must match; 401/403/network/invalid responses fail closed.
- P02 read actions are the module capability truth. The Dealer module accepts its scope-aware global/dealer/location read action; unmigrated Domain modules require their read action itself to be global so the Shell never advertises a route that the Backend will deterministically reject. Foundation and module summary fields do not elevate or suppress action authority. Top-level authorization scope is used only as a display summary.
- Known denied direct routes remain at their requested URL and show an explicit Chinese forbidden state without mounting business content. Unknown routes retain the existing F0 fallback behavior.
- Business data request identity and React content key include `actor.id:contextRevision`; a permission revision for the same actor clears old resource state and rejects stale commits through the existing generation/actor guard. Expired snapshots are rejected at receipt and an expiry timer forces generation-safe revalidation at `expiresAt`; unavailable status enters the explicit retryable unavailable state.
- Shell identity shows persisted role keys, display-only scope summary, and the P02-filtered module count while preserving GET-only/read-only behavior and the existing mobile drawer/landmarks.
- Added strict transport/policy tests for action-scope authority, unavailable fail-closed behavior, direct-route forbidden vs unknown, actor mismatch, revision identity, display-only scope summaries, and cookie/no-store HTTP classification.

## Verification

Successful on Node `22.22.2`:

- Focused P02 tests: `7/7`.
- Frontend package contracts: `119/119`, 0 failed, 0 skipped.
- `typecheck:web`: passed.
- Final transactional review, runtime error localization, and SEO/security: passed.
- Production-configured static build: `396/396` pages.
- Protected content, 404 fallback, and French HTML language artifact gates: passed.
- Exact Dashboard HTML artifacts: `42`; Chinese Dashboard artifacts: `0`.
- `git diff --check`: passed.

Review and limitations:

- Independent correctness/security review reproduced three Medium findings in action authority, scope-aware route capability, and authorization TTL handling; all were fixed and final re-review found no remaining Medium/High.
- Independent accessibility review reproduced the unavailable-state announcement/recovery Medium; it is closed by the explicit retryable unavailable state, and final re-review found no remaining Medium/High.
- Browser interaction against a live authenticated P02 API is deferred to Integration after the Frontend merge.
- VoiceOver/NVDA/JAWS/Dragon and real Windows forced-colors assistive-technology checks were not run.

## Next action

- Close all independent High/Medium findings, update the Frontend handoff, audit the staged set, then create the focused local Frontend commit.
- Integration must normally merge the Frontend tip into the existing Backend P02 merge and rerun full-stack API/static/browser gates before any Main promotion.
