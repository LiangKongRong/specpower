---
name: specpower-snap
description: "Post-hoc change documentation from git diff"
---

# SpecPower: Snap

## Prerequisites

- Git repository must have uncommitted or recent committed changes to document.
- `specpower` CLI must be available on PATH.

## Stage 1: Analyze Changes

Run `git diff` and `git log` to capture what changed.

Collect:
- Files modified, added, removed
- Commit messages (if committed)
- Diff summary per file

## Stage 2: Generate Change

Create a new change with all tasks pre-marked as done:
- Generate proposal from the diff summary
- Generate delta specs inferred from the actual code changes
- Generate tasks.md with all tasks marked complete

## Stage 3: Infer Delta Specs

From the code changes, infer what behavioral specs were added or modified.
Write delta spec files inside the change directory.

## Gate: User Confirmation

Present the generated change documentation to the user.
**Ask the user to confirm the inferred specs are accurate.**
Do NOT archive until confirmed.

## Stage 4: Archive

Once confirmed, run `specpower change archive` to merge the inferred specs into main specs.
