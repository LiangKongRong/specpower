---
name: specpower-scan
description: "Brownfield project scanner via code-review-graph"
---

# SpecPower: Scan

> **HARD GATE**: User must confirm scan results before they become Source of Truth.

## Prerequisites

- Target project directory must exist and contain source code.
- `specpower` CLI must be available on PATH.

## Stage 1: Execute Scan

Run `specpower scan` against the target project.

If `--module` flag is provided:
Read the file at `.claude/specpower/prompts/shared/dispatching-parallel-agents.md` and follow its instructions to scan modules in parallel.

Otherwise run a single scan pass.

## Stage 2: Present Results

The scan produces `SCAN_REPORT.md` in the `specpower/` directory.
Present the report summary to the user. Highlight:
- Detected modules and their boundaries
- Identified specs and coverage gaps
- Suggested next actions

## Gate: User Confirmation

**Ask the user to confirm the scan results.**
Do NOT proceed until the user explicitly confirms.
Confirmed results become the Source of Truth for all downstream commands.

## Stage 3: Finalize

Once confirmed, the scan results are locked.
Inform the user they can now run `/specpower:plan` to begin requirements planning.
