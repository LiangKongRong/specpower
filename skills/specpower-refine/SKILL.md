---
name: specpower-refine
description: "Technical deepening -- multi-round attacking review + 4 challenge behaviors + Superpowers 9-step"
---

# SpecPower: Refine

> **HARD GATE**: No implementation or scaffolding until user confirms refined artifacts.
> Phase MUST advance to `refined` only with explicit user confirmation of the final state.

Refine runs as an **internal auto-multi-round loop** within one invocation. Minimum 2 rounds
unconditional; AI semantically judges convergence after round 2; no upper limit. Each round
runs the Superpowers 9-step brainstorming process with 4 challenge behaviors injected,
produces impact analysis, lets the user pick scope (A/B/C), writes & validates updates, and
emits a round diff summary.

## Prerequisites

- Active change with `.specpower.yaml` `phase=plan` (refine refuses if phase is not `plan`).
- All 4 plan-phase artifacts exist in `specpower/changes/<name>/`:
  - `proposal.md`
  - `specs/**/*.md` (at least one delta spec)
  - `design.md`
  - `tasks.md`
- `specpower` CLI available on PATH (for `specpower validate` and the final phase transition).

If any precondition fails, stop and instruct the user to run `/specpower:plan` first.

## Stage 1: Pre-loop setup

Read, in order:

1. `specpower/changes/<name>/proposal.md`
2. All files under `specpower/changes/<name>/specs/`
3. `specpower/changes/<name>/design.md`
4. `specpower/changes/<name>/tasks.md`
5. `specpower/specs/` main baseline (for context on what this change diffs against)
6. `.claude/specpower/prompts/refine/brainstorm.md` (the 9-step + 4 challenge behaviors process)
7. `.claude/specpower/prompts/refine/update-artifacts.md` (impact analysis + format preservation)

Summarize the current state of the 4 artifacts for the user in 3-5 bullets, then announce
`Round 1 start` and enter the LOOP.

## LOOP (Stages 2-4) — each iteration is one refine round

Repeat Stages 2 → 3 → 4 for every round. Stage 5 decides whether to loop again.

### Stage 2: Execute the 9-step brainstorming (per brainstorm.md)

Follow `.claude/specpower/prompts/refine/brainstorm.md` Steps 1-4:

- Step 1 — Examine existing artifacts (inject Challenge Behavior #1: challenge plan's
  assumptions)
- Step 2 — Ask clarifying questions (inject Challenge Behaviors #3 and #4: explore omitted
  boundaries, question scope)
- Step 3 — Propose 2-3 approaches with trade-offs (inject Challenge Behavior #2: propose
  new options for every existing decision)
- Step 4 — Present design sections for the updates this round proposes

Each round MUST produce visible output for each of the 4 challenge behaviors. Do not let
them be implicit — the user should see the behaviors fire.

### Stage 3: Impact analysis + user scope choice (per update-artifacts.md)

Hand off to `.claude/specpower/prompts/refine/update-artifacts.md`:

- Apply routing rules to decide which files the round's conclusions affect.
- Present the impact analysis block listing every affected file.
- Wait for the user to pick scope A (apply all), B (primary only, defer cascades), or
  C (defer entirely).

Never begin writing without the user's explicit A/B/C choice.

### Stage 4: Apply updates + validate + report round diff summary

Still under update-artifacts.md:

- Apply the writes implied by the user's scope choice, respecting per-artifact format
  preservation rules.
- Run `specpower validate` on any modified spec file. If validation fails, revert the file
  to its pre-edit state and report the issue to the user; do not proceed until resolved.
- Emit the round-end diff summary in the format defined by update-artifacts.md.
- Announce `Round N end`.

## Stage 5: Convergence check

Apply this logic at the end of every round:

- **If round < 2**: `round++`, unconditionally loop back to Stage 2. The 2-round minimum
  is non-negotiable — do not ask the user whether to continue before round 2 completes.
- **If round ≥ 2**: perform AI semantic convergence judgment per brainstorm.md Step 8:
  - Are there still meaningful unaddressed challenges across the 4 behaviors?
  - Are there open clarifying questions?
  - Are there unresolved scope concerns?
  - Is any artifact still stale relative to the discussion?
  - Did the latest round introduce new considerations not yet propagated?
  - If ANY answer is yes: NOT converged → `round++`, loop back to Stage 2.
  - If ALL answers are no: converged → proceed to Stage 6.
- **User override**: the user may request additional rounds at any time, even after AI
  judges convergence. User override takes precedence — `round++` and loop back to Stage 2.

Announce each round's convergence decision (and its reasoning) to the user as part of the
Stage 4 round-end output.

## Stage 6: Final confirmation

Only reached after Stage 5 declared convergence AND the user did not request another round.

1. Present a **cross-round summary**: what changed in each round, which artifacts now differ
   from the plan-phase baseline, which decisions were resolved, which questions remained
   open (if any).
2. **HARD GATE**: Wait for the user's explicit confirmation of the final refined state.
   A mere acknowledgement of a round's diff summary is NOT confirmation of the overall
   refined state — ask explicitly: "Confirm this refined state is final and I should mark
   the phase as `refined`?"
3. On explicit confirmation: invoke `specpower change phase <name> --set refined` to
   advance `.specpower.yaml` `phase` from `plan` to `refined`.
4. Suggest `/specpower:build` as the next slash command.

If the user declines to confirm and requests more exploration, treat it as a user-requested
extra round (loop back to Stage 2, phase stays `plan`).

## Not covered by refine

- No Phase A rewriting of `tasks.md` at writing-plans precision — that belongs to
  `/specpower:build` Phase A.
- No code scaffolding, no implementation, no worktree setup — build owns all of that.
- Refine only updates artifacts and advances phase to `refined`; it never touches code.
