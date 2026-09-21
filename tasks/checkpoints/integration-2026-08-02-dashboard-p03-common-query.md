# Integration checkpoint — Dashboard P03 Common Query / Search Contract

Date: 2026-08-02

## Identity and scope

- Integration branch/worktree: `integration/fullstack`, `.claude/worktrees/integration`.
- Shared P02 parent: `d3665ac9206b53b2a56c35091bf4f2cbd031a40d`.
- Backend commits: functional `0199a87f5827fe2ef9d171aba60b00491428ce91`, continuity `3db5c90eddfce3cbc25354883fe8ca6c646b78dd`; normal Integration merge `b7f53dbe1fa294e35f68ee6a30f650b5615b0fce`.
- Frontend commits: functional `ac8c90fd892a00b539d22d68577450c2bcbb5961`, continuity `3f0e07f72e2ab4e022ebca70e84c6561a042a28e`; normal Integration merge `959f8f60535f0353367c6073d3fb6a1bcaadcd7e`.
- Integration follow-ups: strict field-profile validation `060c1c9e3588a8ed9fb51e04ec6fa4231cee29ed`; CRM trailing-slash q preservation `c0e8b8f8cafa22dd9dfeb95bbbee6b881200e0b5`.
- Frozen contract SHA-256: `2bbdf5c4378414defddb71743a0d7898f453c21b1a914f1eb2a1c194edd98684`.

## Integrated behavior

- `common-query.v1` registry and parser cover all frozen profiles; Products strict offset and Dealers immutable-ID cursor are the only P03 proof consumers.
- Cursor is AES-256-GCM, versioned, actor/context/grant/field/query/order bound, and never enters Frontend history.
- P02 context revision includes scoped-role permission sets; strict capabilities are independently server-owned.
- Products uses exact total and stable ordering; Dealers applies permission-specific Dealer/Location scope and opaque cursor chain.
- Frontend has one occurrence-aware Products/Dealers URL owner, typed filters/search/sort, Back/Forward restoration, capability rollback and distinct Empty/Filtered Empty/OutOfRange/Exhausted/Partial/Stale/Unavailable states.
- CRM q is permanently unsupported and never silently broadens; CRM/Reconciliation use safe optional DTOs; Overview count requires global Dealer read parity.
- Authenticated Dashboard responses are private/no-store, Dashboard pages emit no-referrer, and strict requests use distributed accepted-only dual-window limits.
- No Global Search endpoint/UI, Saved Views, Export/Import, business-page rewrite, new mutation, schema or migration was added.

## Verification

Successful on Node `22.22.2`:

- Full TypeScript: passed.
- Backend builds: passed.
- DB: `5/5`.
- API: `156/156`.
- Worker: `11/11`.
- Package/shared contracts including P03: `124/124`.
- Prisma generate and validate: passed.
- Migration status: 42 migrations; local `vanstro_dev` up to date.
- Existing-database preflight: `{ "ok": true, "failures": [] }`.
- Production-configured static export and SEO/fr-language/404/protected artifacts: passed.
- Dashboard HTML: 42 EN/fr; Chinese Dashboard routes: 0; built EN/fr Product Dashboard artifacts each contain no-referrer metadata.
- `git diff --check`: passed.

Controlled current-source browser fixture passed:

- Products deep link retained canonical `q`/`productStatus`; transport sent `queryVersion=common-query.v1`, offset 0, stable sort/direction, q and API `status`; typed controls and safe row rendered.
- Dealers canonical URL retained status without cursor; Next sent the opaque cursor and rendered Dealer B; Previous rebuilt the first page and rendered Dealer A.
- Capability false with active strict q issued no Products query and rendered fail-closed capability-unavailable; Clear removed strict URL state and permitted neutral legacy first-page loading.
- CRM old-q trailing-slash route retained q and rendered localized unsupported; fixture log proved no CRM list request after the corrected navigation.
- Global Search and work queue remained disabled; no mutation was issued.

Review closure:

- Backend iterative correctness/security reviews closed all High/Medium.
- Frontend security review found no High/Medium. Correctness review found two Medium stale/Exhausted defects; both were fixed and re-reviewed closed.
- Integration browser verification found one Medium CRM trailing-slash q bypass; fixed and browser-reverified with no CRM request.
- No remaining reproduced High/Medium at checkpoint creation.

## Migration and production status

- Source schema/migration added in P03: no.
- Local migration applied for P03: no.
- Production migration/deployment/write: no.
- Production remains release `3904a440` with 41 migrations.
- No push/PR/fetch, stash operation, real payment/refund, ERP action, DNS/TLS or external publish occurred.
