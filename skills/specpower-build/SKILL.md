---
name: specpower-build
description: "Two-phase build — plan rewrite + subagent TDD execution"
---

# SpecPower: Build

> **HARD GATE (prerequisite)**: phase must be `refined`. Run /specpower:refine first if not.
> **HARD GATE (Stage 0)**: execution mode MUST be chosen and recorded in `.specpower.yaml` before Phase B. Phase B re-checks this (Stage B0).
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

## Stage 0: Execution Mode Selection (hard gate, build start)

At build start — before Phase A — determine and record the execution mode. The choice is persisted in `.specpower.yaml` so the build resumes the same path after interruption or restart. **Phase A's Execution Handoff no longer presents this choice** — Stage 0 owns it.

1. Read the recorded mode: `specpower change mode <name>` (prints `subagent`, `inline`, or `(unset)`).
2. **If a mode is already recorded** → use it. Announce: "Resuming build in `<mode>` execution mode (recorded in `.specpower.yaml`)." Proceed to Phase A. Do NOT re-ask.
3. **If unset** → present the choice (same style as Phase A's handoff) and **ask the user to choose**:
   - **Subagent-Driven (recommended)** — dispatch a fresh implementer subagent per task with a two-stage review (spec compliance, then code quality) between tasks. Best when subagents are available; preserves the controller's context for coordination.
   - **Inline Execution** — execute the plan's tasks in this session with batch checkpoints for review. Use when subagents are unavailable, or when the user prefers same-session execution without subagent handoff.
4. Record the choice: `specpower change mode <name> --set subagent` (or `inline`).
5. Do NOT proceed to Phase A until a mode is recorded. There is no silent default.

> **Why persist:** a build is frequently interrupted (failing test, context limit, user pause) and later resumed with a fresh `/specpower:build` invocation. Without persistence the controller would re-ask every time and could pick a different path mid-build, producing inconsistent review discipline. The recorded `executionMode` is the single source of truth.

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

## Phase B: Execution

Phase B has two paths. Follow the one recorded at Stage 0.

### Stage B0: Execution Mode Hard Gate (Phase B entry)

Before any Phase B execution, verify an execution mode is recorded — this guards against an interrupted/restarted build that skipped Stage 0, or a hand-edited `.specpower.yaml`.

1. Read the recorded mode: `specpower change mode <name>`.
2. **If a mode is recorded** → proceed on the matching path (B1 → subagent path or inline path).
3. **If unset** → STOP. Do NOT silently default. Run Stage 0 (present the choice, record via `specpower change mode <name> --set <value>`) before proceeding. Only after a mode is recorded do you continue to Stage B1.

This hard gate ensures a recorded `executionMode` exists before any task runs, regardless of how the build was entered.

### Stage B1: Worktree Setup (common to both paths)

Read the file at `.claude/specpower/prompts/build/phase-b-worktree.md` and follow its instructions.

Set up the isolated build environment (worktree or branch) for implementation. Worktree setup is mode-independent; run it regardless of the chosen path.

### Phase B (Subagent path)

Used when the recorded `executionMode` is `subagent`.

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

### Phase B (Inline path)

Used when the recorded `executionMode` is `inline`.

Read the file at `.claude/specpower/prompts/shared/executing-plans.md` and follow its instructions.

Execute the plan in this session (no implementer subagent dispatch):
1. Load the rewritten `tasks.md`; review it critically; raise any concerns with the user before starting.
2. Create a TodoWrite with all atomic tasks.
3. For each task: mark in_progress → follow each step exactly (plan has bite-sized steps) → run every `Verify:` line → mark completed. Stop at batch checkpoints (e.g., end of a task group) and present progress to the user for review before continuing.
4. If a step blocks (missing dependency, failing test, unclear instruction), STOP and ask the user — do not guess or force through.

**Review checkpoints:** Because inline mode has no per-task spec/code reviewer subagents, the controller SHALL pause at the end of each task (or task group) and present the implementation + `Verify:` results to the user for confirmation before proceeding to the next. This is the inline-mode equivalent of Gate B.

**Gate B (inline): Per-task confirmation.** Do NOT proceed to the next task until the user confirms the current task is complete and verified.

Once all tasks are confirmed:
- Invoke `specpower change phase <name> --set built` to transition the phase.
- Summarize the build results and overall coverage.
- Inform the user they can now run `/specpower:review` or `/specpower:verify`.

---

## Phase Transition Notes

- **On Phase B success (either path)**: phase → `built` (automatic via the path's final CLI call). The recorded `executionMode` stays in `.specpower.yaml` for audit; it is not consumed by archive.
- **On Phase A gap halt (Outcome 3)**: phase remains `refined`; the recorded `executionMode` is preserved. User runs `/specpower:refine` to close gaps, then re-runs `/specpower:build` — Stage 0 resumes the recorded mode without re-asking.
- **On Phase A reorganization choice C**: phase remains `refined`; `executionMode` preserved. User edits groups manually, then re-runs `/specpower:build`.
- **On Phase B interruption or failing tests (either path)**: phase remains `refined`; `executionMode` preserved. User resumes Phase B later — Stage 0 sees the recorded mode and skips the prompt; Stage B0 passes the hard gate.
