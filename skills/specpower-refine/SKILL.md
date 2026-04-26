---
name: specpower-refine
description: "Technical deepening -- brainstorming + design"
---

# SpecPower: Refine

> **HARD GATE**: No implementation or scaffolding until design is confirmed by the user.

## Prerequisites

- An active change must exist with a confirmed proposal and delta specs.
- The proposal and specs files must be present in the change directory.

## Stage 1: Read Context

Read the proposal and delta specs from the active change directory.
Summarize the current state for the user.

## Stage 2: Brainstorm

Read the file at `.claude/specpower/prompts/refine/brainstorm.md` and follow its instructions.

Engage the user in interactive brainstorming. Explore:
- Alternative approaches
- Edge cases and failure modes
- Trade-offs and constraints
- Integration concerns

Continue until the user signals they are satisfied with the direction.

## Stage 3: Generate Design

Read the file at `.claude/specpower/prompts/refine/design-output.md` and follow its instructions.

Generate `design.md` inside the change directory.

## Gate: Design Confirmation

Present the design document to the user.
**Ask the user to confirm the design.**
Do NOT allow implementation or scaffolding to begin until confirmation is received.

## Stage 4: Finalize

Once confirmed, inform the user they can now run `/specpower:build` to begin implementation.
