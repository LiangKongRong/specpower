---
name: specpower-verify
description: "Dual validation -- delta specs + main specs regression"
---

# SpecPower: Verify

## Prerequisites

- An active change must exist with delta specs and implementation.
- Main specs must exist in `specpower/specs/`.
- `specpower` CLI must be available on PATH.

## Stage 1: CLI Validation

Run `specpower validate` to perform structural validation of specs.

If validation fails, report errors and stop. The user must fix spec issues before proceeding.

## Stage 2: Verification

Read the file at `.claude/specpower/prompts/verify/verification.md` and follow its instructions.

Perform three verification passes:

### Pass 1: Delta Acceptance
Verify that the implementation satisfies all delta specs in the active change.
Check each spec scenario against actual behavior.

### Pass 2: Regression
Verify that existing main specs still pass.
Flag any regressions introduced by the change.

### Pass 3: Scope Creep
Check that the implementation does not introduce behavior beyond what the delta specs describe.
Flag any undocumented changes.

## Stage 3: Report

Present a consolidated verification report:
- Delta acceptance: pass/fail per spec
- Regression: pass/fail summary
- Scope creep: any findings
- Overall verdict: PASS or FAIL with reasons
