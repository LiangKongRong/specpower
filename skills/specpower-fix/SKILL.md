---
name: specpower-fix
description: "Bugfix fast-track -- debug + TDD + auto-archive"
---

# SpecPower: Fix

## Prerequisites

- `specpower` CLI must be available on PATH.
- The bug must be reproducible or described clearly by the user.

## Flags

- `--urgent`: Skip review stage and add URGENT marker to the change.

## Stage 1: Create Change

Run `specpower change new fix-<desc>` where `<desc>` is a short bug description.

## Stage 2: Locate Specs

Identify which specs are relevant to the bug.
Read the affected spec files to understand expected behavior.

## Stage 3: Diagnose

Read the file at `.claude/specpower/prompts/fix/debug.md` and follow its instructions.

Perform root-cause analysis:
- Reproduce the bug
- Trace to the source
- Identify the minimal fix scope

## Stage 4: TDD Fix

Read the file at `.claude/specpower/prompts/build/tdd.md` and follow its instructions.

1. Write a failing test that reproduces the bug
2. Implement the minimal fix to pass the test
3. Run the full affected test suite to check for regressions

## Stage 5: Review (skip if --urgent)

Read the file at `.claude/specpower/prompts/review/code-review.md` and follow its instructions.

Review the fix for correctness and regression safety.

If `--urgent` is set, skip this stage and add an URGENT marker to the change.

## Stage 6: Verify

Run the full test suite for affected modules.
Confirm all tests pass including the new regression test.

## Stage 7: Archive

A fix change MUST include at least one delta spec file under `specpower/changes/fix-<desc>/specs/<capability>/spec.md`. The archive command will reject the change if the `specs/` directory has no `.md` files. A pure implementation regression fix typically writes a `## MODIFIED Requirements` delta that makes the previously-implicit contract explicit (e.g., tightening wording, adding a missed scenario). This closes the coverage gap at the spec level, not just the test level.

If the fix addresses a genuinely new scenario that existing specs did not cover, write a `## ADDED Requirements` delta with the new scenario.

Then run `specpower change archive fix-<desc>` to finalize:
- Delta merged into main specs
- Change moved to `specpower/changes/archive/YYYY-MM-DD-fix-<desc>/`

Commit the archive outputs: `git add specpower/ && git commit -m "chore(specs): archive fix-<desc>"`
