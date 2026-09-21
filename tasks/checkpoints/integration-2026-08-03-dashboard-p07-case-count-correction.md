# Integration checkpoint — Dashboard P07 case-count correction

Status: **P07 COMPLETE; evidence classification corrected; correction commit pending**. This docs-only checkpoint corrects the relationship between the retained focused and full authenticated browser acceptance results. It changes no product, test, migration, acceptance result, or prior pass/fail conclusion.

## Canonical full matrix: 24 cases

The canonical case IDs below follow the exact `results[].name` order in:

`/Users/zhangguannan/.claude/jobs/4deaf7fc/tmp/p07-final-browser/followup-full/acceptance-results.json`

| ID | Canonical `name` |
| --- | --- |
| P07-A01 | `authenticated global Media list` |
| P07-A02 | `authenticated global Media detail` |
| P07-A03 | `capability double gate` |
| P07-A04 | `preview controlled read and fencing` |
| P07-A05 | `original download fencing and attachment` |
| P07-A06 | `controlled upload intent and PUT` |
| P07-A07 | `metadata canonical tags` |
| P07-A08 | `Usage attach` |
| P07-A09 | `Usage detach` |
| P07-A10 | `archive` |
| P07-A11 | `restore` |
| P07-A12 | `retry binding/idempotency/stale conflict` |
| P07-A13 | `detail focus restore` |
| P07-A14 | `opaque cursor next/previous` |
| P07-A15 | `query canonicalization` |
| P07-A16 | `invalid query fail-closed` |
| P07-A17 | `denied capability fail-closed` |
| P07-A18 | `scoped profile fail-closed` |
| P07-A19 | `401 session invalidation` |
| P07-A20 | `390px reflow` |
| P07-A21 | `320px reflow` |
| P07-A22 | `absence AI/import/export/delete/arbitrary proxy` |
| P07-A23 | `PDF no-inline preview` |
| P07-A24 | `browser network localhost restriction` |

The retained full result remains `24/24` passed, `0` failed, and `0` not executed.

## Focused rerun mapping

The focused result source is:

`/Users/zhangguannan/.claude/jobs/4deaf7fc/tmp/p07-final-browser/rerun-focused/focused-results.json`

| Focused ID | Focused `name` | Canonical full case | Relationship |
| --- | --- | --- | --- |
| P07-F01 | `controlled upload intent and PUT` | P07-A06 | Same case |
| P07-F02 | `metadata canonical tags` | P07-A07 | Same case |
| P07-F03 | `Usage attach` | P07-A08 | Same case |
| P07-F04 | `Usage detach` | P07-A09 | Same case |
| P07-F05 | `archive` | P07-A10 | Same case |
| P07-F06 | `restore` | P07-A11 | Same case |
| P07-F07 | `retry binding and idempotency` | P07-A12 | First focused substep of the combined full case |
| P07-F08 | `retry stale conflict no automatic replay` | P07-A12 | Second focused substep of the combined full case |

Therefore, focused `8/8` is not an additional set outside full `24/24`. It covers seven unique canonical full cases: P07-A06 through P07-A12. The full matrix contains 17 remaining canonical cases outside that unique focused coverage:

`7 unique focused-covered cases + 17 remaining cases = 24 canonical full cases`.

Any earlier wording that classified the result as “8 focused cases plus 17 other cases” overlapped P07-A12 and implied 25 cases. The corrected classification changes only the evidence taxonomy, not the executions or results.

## Repository and evidence integrity verification

Verified before this docs-only correction:

- Standard branches `main`, `integration/fullstack`, `feature/frontend`, and `feature/backend` all point to `05d968431676ac93618e80ece8fc65ddada9e814`.
- Commit `05d9684` is the docs-only P07 completion evidence commit whose parent is tested Integration HEAD `11d2c83a81e23c45a92b9fed6822d9b3364adca6`; the shared four-line state is a fast-forward descendant of that tested head.
- Standard Integration, Frontend, and Backend worktrees are clean with zero untracked files. The protected Main workspace has 80 pre-existing untracked paths by `git ls-files --others --exclude-standard`; they remain untouched and outside this correction.
- `stash@{0}` (`pre-github-sync-20260708-141840`) remains untouched.
- Migration 56–62 SHA-256 values still match the certified chain:
  - 56: `3319634df960a24c23f64bd26c4bef0169438cf3626dda32dcfa079c2106e413`
  - 57: `14ef85ea337145b07333046f04c15f91a6271e2c07f997939fedf3e3c29c2c6b`
  - 58: `2670324b81c180ad70d42df726d92871546fdbc45374833c19ca327eefd7fe38`
  - 59: `3cb2a3248f3f6d625cb1522dedeac12cfced4625cb572a6021ae18ca584d1f77`
  - 60: `e21c71a427413675719fa25c22f64cdbd65d4b400624ce8a9a10937b5120f2c3`
  - 61: `3662535ddce270f4a251c784d55deb8e7373ba3eae8b04fdd6e00ccb44e77af3`
  - 62: `ed56e2d7e919dcca6d12913bb4c502bffd2e53a60cdae40d0c8975b4ac51e3a1`
- The retained full and focused JSON files and their corresponding `acceptance.py` and `focused.py` scripts were read directly. The scripts confirm that full P07-A12 combines binding/idempotency and stale-conflict no-replay, while the focused script records those as two result rows.
- Ports `4390` and `4391` have no listening process. No retained P07 acceptance/fixture harness is running.
- No product, test, migration, generated artifact, production environment, stash, or protected Main-untracked file was changed.

## Boundary and next action

P07 remains complete. Create one docs-only correction commit containing this checkpoint and the minimal completion/handoff pointer updates. After that correction commit, P08 may start as a separately scoped work unit. This checkpoint does not itself implement or verify P08, deploy, promote, push, or authorize any production action.
