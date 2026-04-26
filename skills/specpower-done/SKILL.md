---
name: specpower-done
description: "Archive change + merge specs + git branch cleanup"
---

# SpecPower: Done

> **HARD GATE**: Tests must pass before archive options are presented.

## Prerequisites

- An active change must exist with completed implementation.
- `specpower` CLI must be available on PATH.
- **Phase must be `built`** in `.specpower.yaml`. This is set automatically when `/specpower:build` Phase B completes. `specpower change archive` refuses to archive changes whose phase is not `built` unless the caller passes `--force` explicitly. Do NOT pass `--force` from this skill — the flag is reserved for explicit user discretion. If archive fails with a phase check error, route the user back to `/specpower:build` to complete the missing phase transition rather than forcing past the guard.

## Stage 1: Test Gate

Run the project test suite for all affected modules. If implementation was done in a git worktree (common after `/specpower:build`), run tests inside that worktree.

If tests fail:
- Report failures to the user.
- **Do NOT proceed.** Tests must pass before archiving.
- Suggest running `/specpower:fix` or `/specpower:test` to resolve failures.

## Gate: Tests Pass

All tests must pass. Only proceed once green.

## Stage 2: Branch Finish (before archive, when a feature branch exists)

If implementation happened on a feature branch / worktree, finish the branch FIRST so the main branch is clean before `specpower change archive` writes its outputs.

Read the file at `.claude/specpower/prompts/done/branch-finish.md` and follow its instructions to:
- Detect the base branch
- Present 4 options to the user:
  1. **Merge to base branch** — merge the feature branch (no-ff or squash), delete branch, remove worktree
  2. **Create PR** — push branch, open a pull request
  3. **Keep branch** — leave the branch as-is for later
  4. **Delete branch** — discard the branch without merging
- Execute the user's chosen option

**Rationale for doing this before archive**: `specpower change archive` moves the change directory and writes updated main specs. Running it while a feature branch is still un-merged causes the archive outputs to live on the base branch while the implementation still lives on the feature branch — confusing state. Finishing the branch first keeps the commit history linear: implementation commits → merge commit → archive commit.

If no feature branch was used (implementation done directly on base), skip to Stage 3.

## Stage 3: Archive

Run `specpower change archive <change-name>` to archive the completed change.

This merges delta specs into main specs, moves the change directory to `specpower/changes/archive/YYYY-MM-DD-<name>/`, and leaves the resulting changes unstaged in the working tree.

**After archive runs:**
1. Review the working-tree changes with `git status`. Expect:
   - Modified/new files under `specpower/specs/**` (delta merged into main specs)
   - Deleted files under `specpower/changes/<name>/**` (moved)
   - New files under `specpower/changes/archive/YYYY-MM-DD-<name>/**` (the moved copy)
2. Create a dedicated commit: `git add specpower/ && git commit -m "chore(specs): archive <name>"`
3. Do NOT mix the archive commit with unrelated changes.

## Stage 4: Confirmation

Report to the user:
- Change name and archive path
- Updated main spec file paths
- Commit SHA for the archive commit
- Current branch state (merged/pushed/kept as appropriate)

Done.
