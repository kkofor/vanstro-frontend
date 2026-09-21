# Integration — F1 v1.5 Authority Package FROZEN

## Conclusion

F1 v1.5 Authority Package is FROZEN. The P08 cancel expand/contract decision closed the final rollout conflict, both independent reviews found no Blocker/High on the same candidate, and the final frozen package regenerated deterministically.

## Authority chain

- Continuous Goal SHA: `c1d71c2d867560859672b5665df200f05a80ac726de25b881e26c798755f0cfc`.
- HMAC/Consent decision SHA: `21fb4121ea844f2e22029ca28bfad29f8d1ca24e9431a987ace84ac07d3ace7d`.
- Exact CHECK/ACL/Owned Probe decision SHA: `85b59d06a83d98a819b012afa3da6ce385be6a23469f769cfc79742cc7755da1`.
- P08 Cancel decision SHA: `7b22253709bba2f94d603eb9c57a73da24a2624c873196c703a9059d5a3b8b2d`.

## P08 cancel closure

- Migration69/70 row predicate permits exactly one source-bound cancelled compatibility class: `authorityVersion=1`, source Artifact present, token consumed.
- Source-bound expired is always rejected.
- `authorityVersion=2 + cancelled + Artifact` is always rejected.
- New v2 source-bound business cancel requests Job cancellation and reaches existing source-bound terminal `failed` with reason `cancelled_after_source_bound`; Artifact/token evidence is retained and no FK unlink/source deletion occurs.
- Migration70 revokes runtime/PUBLIC EXECUTE on the exact old `p08_transition_import` signature and preserves legacy rows.
- 12 statuses × Artifact × token × authorityVersion vectors are closed; focused package tests pass 5/5.

## Reviewed candidate

Both independent reviews bound candidate manifest:

`20262d0ffca66c7352796d3de98634fa2dc792195c7eaa5c314bedc619b6d28c`

- Contract/architecture/rollout: no Blocker/High/Medium/Low.
- Security/privacy/database: no Blocker/High.
- Candidate manifest: 25/25 members.
- Manifest-bound tests: 56/56.
- Semantic verifier: PASS, 448 indexed objects.

## Final frozen package

Review results were recorded in the model and package status changed from `CANDIDATE — NOT AUTHORITY` to `FROZEN`; generated members were rebuilt. Per the authority rules, the final manifest externally authenticated by this Integration checkpoint is:

`e6c3cb275b3ecee17022418586613f6739757802b705bd17444b5c95be5a6e8f`

Metadata SHA:

`9404122d1a36c7d65ac07739173b57a7ac1ddcc2ad17ac0b9b63481f3e106d06`

Final identities:

- Model: `924233520e1e96990a8a998b8dc0b0953f0cd726a24f7eaed863ea5349f69f48`
- Schema: `aee92f071a21cb1979ad0b9b469c8360893391f81988f3de2d59a0336a6bf194`
- Baseline: `bfa3a3e2f0ec6a40cd09dd0cccb7ebeb9fa655856f3a9586d172cfd0a95abcfc`
- Owned PostgreSQL 16 probe: `53e677f4ffb3994479dee969226b1e634ccf29cef9fcfa5f20069f9e275ba416`
- Generator: `1072e893901b776fbecce34b5b6d34ec481400e6446ceac7ff588d824a0d4cef`

All 13 generated members carry `status: FROZEN`.

## Final gates

- Manifest-bound tests: 56 discovered / 56 passed / 0 failed / 0 skipped / 0 not-executed.
- Actual semantic verifier: PASS, 448 objects / 13 generated artifacts.
- Final manifest: 25/25 members, verify PASS.
- Baseline deterministic regeneration: PASS.
- Generator byte verification: PASS.
- HMAC Node/PostgreSQL vectors: PASS.
- P08 cancel vectors: PASS.
- Owned PostgreSQL 16 probes: migrations1–68 applied; overload/checksum/owner/membership/effective-privilege unknowns resolved to zero.
- Secret scan: no match.
- Diff check: PASS.

## Boundaries

- This freeze is authority/docs/tooling only and remains on Integration.
- No product code, Prisma schema, product tests or migrations1–68 changed.
- No migration69/70/71 was created.
- Main/Backend/Frontend were not promoted.
- No production database, Stage C, provider, GA4/PostHog/Search Console or deployment was entered.
- No push/fetch/PR, stash, reset/rebase/force/clean or historical worktree cleanup occurred.

`production deploy: deferred until full Dashboard completion`
