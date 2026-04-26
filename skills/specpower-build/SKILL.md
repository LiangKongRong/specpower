---
name: specpower-build
description: "Two-phase build -- plan generation + subagent TDD execution"
---

# SpecPower: Build

> **HARD GATE (Phase A)**: Plan must be confirmed by the user before execution begins.
> **HARD GATE (Phase B)**: Each task must be reviewed and confirmed before the next task starts.

## Prerequisites

- An active change must exist with confirmed proposal, specs, and design.
- All prerequisite documents (proposal.md, specs, design.md) must be present in the change directory.
- `specpower` CLI must be available on PATH.

---

## Phase A: Plan Generation

### Stage A1: Generate Task Plan

Read the file at `.claude/specpower/prompts/build/phase-a-plan.md` and follow its instructions.

Generate `tasks.md` inside the change directory. The plan must include:
- Ordered task list with dependencies
- Acceptance criteria per task
- Estimated scope per task

### Gate A: Plan Confirmation

Present the task plan to the user.
**Ask the user to confirm the plan.**
Do NOT proceed to Phase B until the user explicitly confirms.

---

## Phase B: Subagent TDD Execution

### Stage B1: Worktree Setup

Read the file at `.claude/specpower/prompts/build/phase-b-worktree.md` and follow its instructions.

Set up the isolated build environment (worktree or branch) for implementation.

### Stage B2: Task Loop

For each task in the confirmed plan, execute the following sequence:

#### B2a: Execute Task

Read the file at `.claude/specpower/prompts/build/phase-b-execute.md` and follow its instructions.

Implement the task using TDD:
1. Write failing tests first
2. Implement minimal code to pass
3. Refactor
4. Verify coverage

#### B2b: Review Task

Read the file at `.claude/specpower/prompts/build/phase-b-review.md` and follow its instructions.

Review the task output:
- Tests pass
- Coverage meets threshold
- Implementation matches spec
- No regressions introduced

#### Gate B: Task Confirmation

Present the task results to the user.
**Ask the user to confirm the task is complete.**
Do NOT proceed to the next task until confirmation is received.

If the user rejects, return to Stage B2a for the same task.

### Stage B3: Finalize

Once all tasks are confirmed:
- Summarize the build results
- Report overall coverage
- Inform the user they can now run `/specpower:review` or `/specpower:verify`
