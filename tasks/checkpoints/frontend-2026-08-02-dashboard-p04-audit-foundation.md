# Frontend checkpoint — Dashboard P04 Audit Foundation

- Branch/worktree: `feature/frontend`, `/Users/zhangguannan/Documents/codex/vanstro/.claude/worktrees/frontend`.
- Parent: `15f9a0436f91e45127cca7170500d429b978d664`.
- Frozen contract SHA-256: `40181858a76f4f09e47968b4f6c6848eb2c74c462305a8d2f2ae9c0d18738539`.
- Status: implementation present and intentionally uncommitted.

Implemented strict Audit capability consumption, exact runtime list/detail validators, canonical occurrence-aware Audit URL filters, opaque in-memory cursor chain, actor/context/query latest-request isolation, scope-safe capability rollback, P03-style 60-second stale retention, and a read-only Chinese Audit presenter using shared Table and DetailDrawer primitives. Strict Audit data is stored separately from legacy AuditLog rows. No mutation, export, raw JSON, Backend, migration or P05 work was added.

Iteration evidence:

- Initial pure-helper run was 3/4 after UUID hardening exposed stale non-UUID test fixtures; the fixtures were corrected without weakening validation.
- A subsequent intermediate run was 2/4 because the detail-path test still expected malformed ID encoding; it was changed to reject malformed IDs and assert the canonical UUID path.
- Pure helper then passed 4/4.
- Initial P04 consumer typecheck failed on an `unknown` authorization field return and later on a union-scope ternary in the panel; both were fixed through validated narrowing and an exhaustive switch.
- Initial source-contract run was 7/9 because a broad `export` regex matched TypeScript export declarations; the assertion was corrected to target actual export/download UI. The final focused suite passed 8/8.
- Final review found explicit future Audit time ranges were accepted locally; parser now receives an injectable clock and rejects `occurredTo > now`, with deterministic future-invalid and past-valid regressions. Final re-review found no remaining High/Medium.

Verified gates:

- Frontend TypeScript: passed.
- Focused P04 helper/consumer/panel contracts after the future-time fix: 8/8 passed.
- Full package contracts after the future-time fix: 132/132 passed.
- Chromium current-tree QA: 40/40 passed.
- Production artifact gates passed; exact Dashboard HTML remained 42 EN/fr with 0 Chinese Dashboard routes and Audit artifacts retained no-referrer metadata.
- Production-configured static build: passed.
- `git diff --check`: passed.

Not performed here: live Backend P04 browser fixture, assistive-technology matrix, deployment, push, commit or P05. Controlled full-stack strict/legacy/scope/cursor browser verification remains an Integration responsibility.
