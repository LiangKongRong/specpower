---
name: specpower-test
description: "Multi-level test execution with verification"
---

# SpecPower: Test

> **HARD GATE**: No "should work" claims -- verification evidence is required.

## Prerequisites

- An active change must exist with implementation work present.
- Test framework must be configured in the project.

## Stage 1: Detect Affected Modules

Analyze the current change to identify which modules are affected.
Determine the appropriate test scope (unit, integration, e2e).

## Stage 2: Execute Tests

Read the file at `.claude/specpower/prompts/test/tdd.md` and follow its instructions.

Run the test suite for affected modules. Capture:
- Pass/fail counts
- Coverage metrics
- Failure details with stack traces

## Stage 3: Verify Results

Read the file at `.claude/specpower/prompts/test/verification.md` and follow its instructions.

Produce a verification report with concrete evidence:
- Actual test output (not summaries)
- Coverage numbers per module
- Any flaky or skipped tests noted

## On Failure: Debug Loop

If tests fail:
Read the file at `.claude/specpower/prompts/fix/debug.md` and follow its instructions.

Diagnose the root cause. Fix and re-run. Repeat until green or escalate to user.

## Stage 4: Report

Present the verification report to the user.
Every claim must be backed by evidence from test output.
