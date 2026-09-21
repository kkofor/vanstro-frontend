# VanStro Project Lessons

## Canonical workspace and Git history

- Use only `/Users/zhangguannan/Documents/codex/vanstro` for active development.
- A copied directory with a new `.git` history is not a branch, even when most files are identical. Do not use `git init` in a copied production tree as a parallel development workflow.
- Concurrent frontend/backend work must use branches or registered Git worktrees from the canonical repository. Do not create another standalone repository to simulate isolation.
- Before integrating another directory, inspect its root commits and `merge-base`. If histories are unrelated, migrate reviewed deltas rather than merging unrelated roots.

## Domain continuity

- Frontend, Backend, and Full-stack Integration have separate handoffs because their progress, tests, and next actions diverge.
- A full-stack checkpoint records a jointly verified combination; it does not replace either domain handoff.
- Chat history is not durable project state. Before ending substantive work, persist verified progress and unknowns in the appropriate handoff.
- Never infer another session's uncommitted progress. Request a read-only handoff from that session and reconcile it with Git/source evidence.

## Integration discipline

- Branch names must reflect actual scope. A mixed full-stack commit must not be presented as a pure frontend or backend commit.
- Resolve integration conflicts by behavior and evidence, not by blindly choosing `ours` or `theirs`.
- Review automatically merged files as well as explicit conflicts; semantic regressions can merge without text conflicts.
- Database migrations already applied or released are immutable. Duplicate/reordered migrations must be excluded or replaced by a new forward migration.
- Only promote `integration/fullstack` to `main` after the appropriate full-stack gates pass.

## Repository protection

- Do not bulk-add pre-existing untracked reports, generated artifacts, archives, or unrelated tools.
- Preserve existing stash entries unless the user explicitly authorizes an operation on them.
- Never treat local integration, commit, or build success as proof of production deployment.
