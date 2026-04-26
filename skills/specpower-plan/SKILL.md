---
name: specpower-plan
description: "Requirements planning -- proposal + delta specs"
---

# SpecPower: Plan

> **HARD GATE**: User must confirm proposal before specs generation begins.

## Prerequisites

- `specpower/specs/` directory should exist, indicating this is a specpower-initialized project. For a brand-new greenfield change with no existing specs, proceed — the prompt handles that case. If `specpower/` itself does not exist, suggest running `specpower init` first.
- `specpower` CLI must be available on PATH.

## Stage 1: Create Change

Run `specpower change new <name>` to initialize a new change directory.

## Stage 2: Generate Proposal

Read the file at `.claude/specpower/prompts/plan/proposal.md` and follow its instructions.

**Important**: That prompt file contains the required interactive Q&A flow, the exact proposal format (`## Why` / `## What Changes` / `## Capabilities` / `## Impact`), and the user confirmation gate. You MUST read it before writing the proposal — do not invent the format.

Generate the proposal document inside the change directory at `specpower/changes/<name>/proposal.md`.

## Gate: Proposal Confirmation

Present the proposal to the user.
**Ask the user to confirm the proposal.**
Do NOT proceed to specs generation until the user explicitly confirms.

## Stage 3: Generate Specs

Read the file at `.claude/specpower/prompts/plan/specs.md` and follow its instructions.

Generate delta specs inside the change directory.

## Stage 4: Present Specs

Present the generated specs to the user for review.
Inform the user they can now run `/specpower:refine` to deepen the technical design.
