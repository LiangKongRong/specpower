---
name: specpower-build
description: "Two-phase build — plan rewrite + subagent TDD execution"
---

# SpecPower: Build

> **HARD GATE (prerequisite)**: phase must be `refined`. Run /specpower:refine first if not.
> **HARD GATE (Phase A)**: rewritten tasks.md must be user-confirmed before Phase B.
> **HARD GATE (Phase B)**: each task must be reviewed (spec + code quality) and user-confirmed before next task.

## Prerequisites

- An active change exists with `.specpower.yaml` and `phase: refined`.
  - If phase is not `refined`, REFUSE to proceed and suggest: "This change is in phase `<phase>`. Run `/specpower:refine` first to complete deep review before build."
- `design.md` is finalized (refine closed any ambiguity).
- `specs/` is finalized (delta specs present for all modified/added capabilities).
- Existing `tasks.md` is present (coarse first-iteration from `/specpower:plan`, or a refine-updated version).
- `specpower` CLI is available on PATH.

---

## Phase A: Task Rewrite

Phase A transforms the existing coarse `tasks.md` into writing-plans precision. It has three possible outcomes: Normal Rewrite, Reorganization Proposal, or Gap Detection halt.

### Stage A1: Load Inputs

Read the file at `.claude/specpower/prompts/build/phase-a-plan.md` and follow its instructions.

Then read, in this order:
1. `design.md` (finalized)
2. `specs/**/*.md` (delta specs for this change)
3. Existing `tasks.md` (coarse or refine-updated)

### Stage A2: Analyze and Classify

Analyze the inputs jointly and classify the situation into exactly one of the three outcomes:

- **Outcome 1 — Normal Rewrite**: design.md is sufficient, existing groups are well-suited. Proceed to Stage A3.
- **Outcome 2 — Reorganization Proposal**: a different top-level grouping would be significantly better. Present the proposal (rationale + old→new mapping) and wait for user choice A (accept), B (keep original), or C (user edits manually). On A or B, proceed to Stage A3. On C, halt Phase A and exit.
- **Outcome 3 — Gap Detection**: design.md lacks information required for precise atomic tasks. Halt rewriting, report ALL gaps at once, preserve any already-rewritten tasks, leave coarse tasks intact, suggest `/specpower:refine` to close the gaps. Phase remains `refined`; no transition. Exit Phase A (do NOT proceed to Phase B).

### Stage A3: Rewrite tasks.md

Rewrite `tasks.md` following writing-plans rigor:
- 2-5 minute atomic tasks
- Zero placeholders
- Every command has a `Verify:` line with expected output
- Complete code blocks or exact diff instructions
- Exact file paths

### Stage A4: Before/After Audit

Present the audit summary to the user: per-group task count (coarse → atomic), total count, any groups added/removed/renamed.

### Gate A: Rewrite Confirmation

Present the rewritten `tasks.md` to the user. **Ask the user to confirm the rewrite.** Do NOT proceed to Phase B until the user explicitly confirms.

---

## Phase B: Subagent TDD Execution

### Stage B1: Worktree Setup

Read the file at `.claude/specpower/prompts/build/phase-b-worktree.md` and follow its instructions.

Set up the isolated build environment (worktree or branch) for implementation.

### Stage B2: Per-task Loop

For each atomic task in the confirmed rewritten plan:

#### B2a: Execute Task (implementer subagent)

Read the file at `.claude/specpower/prompts/build/phase-b-execute.md` and follow its instructions.

Dispatch a fresh implementer subagent to implement the task using TDD:
1. Write failing tests first
2. Implement minimal code to pass
3. Refactor
4. Verify coverage

#### B2b: Review Task (spec reviewer → code reviewer)

Read the file at `.claude/specpower/prompts/build/phase-b-review.md` and follow its instructions.

Dispatch a two-stage review: first a spec reviewer (does the implementation match the spec?), then a code quality reviewer (does the code meet quality standards?).

#### Gate B: Per-task Confirmation

Present the task output and both review reports to the user. **Ask the user to confirm the task is complete.** Do NOT proceed to the next task until confirmation is received.

If the user rejects, return to Stage B2a for the same task.

### Stage B3: Phase Transition

Once all tasks are confirmed:
- Invoke `specpower change phase <name> --set built` to transition the phase.
- Summarize the build results and overall coverage.
- Inform the user they can now run `/specpower:review` or `/specpower:verify`.

---

## Phase Transition Notes

- **On Phase B success**: phase → `built` (automatic via Stage B3 CLI call).
- **On Phase A gap halt (Outcome 3)**: phase remains `refined`. No transition. User runs `/specpower:refine` to close gaps, then re-runs `/specpower:build`.
- **On Phase A reorganization choice C**: phase remains `refined`. No transition. User edits groups manually, then re-runs `/specpower:build`.
- **On Phase B interruption or failing tests**: phase remains `refined`. User resumes Phase B later.
