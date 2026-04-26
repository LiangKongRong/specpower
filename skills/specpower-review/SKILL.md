---
name: specpower-review
description: "Spec-aware code review with regression checking"
---

# SpecPower: Review

## Prerequisites

- An active change must exist with specs and implementation work in progress.
- Code changes must be present (staged or unstaged).

## Stage 1: Dispatch Reviewer

Read the file at `.claude/specpower/prompts/review/code-review.md` and follow its instructions.

Dispatch the reviewer against the current code changes. The review must be spec-aware:
- Check implementation against delta specs
- Check for regressions against main specs
- Verify naming and structural conventions

## Stage 2: Severity Triage

Categorize findings by severity:
- **CRITICAL**: Blocks merge. Must be fixed before proceeding.
- **HIGH**: Should be fixed. Requires justification to skip.
- **MEDIUM**: Recommended fix. Can defer with acknowledgment.
- **LOW**: Suggestions and style nits.

## Stage 3: Report

Present the triage report to the user.

If any CRITICAL findings exist:
- List them explicitly.
- **CRITICAL findings block merge.** Inform the user that these must be resolved.

If no CRITICAL findings:
- Summarize HIGH/MEDIUM/LOW counts.
- Inform the user the code is eligible to proceed.
