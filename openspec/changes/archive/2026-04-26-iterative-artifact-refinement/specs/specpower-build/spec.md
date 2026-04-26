## MODIFIED Requirements

### Requirement: Two-phase build with progressive prompt loading
The system SHALL execute builds in two phases using the progressive loading pattern: SKILL.md orchestrates, detailed prompts loaded per stage via Read. Phase A **rewrites** the tasks.md from plan/refine into a precise executable task plan using Superpowers writing-plans strict rules, rather than generating tasks.md from scratch. If Phase A discovers gaps in design.md that prevent writing precise tasks, it SHALL stop and hand back to refine.

#### Scenario: Phase A rewrites existing tasks
- **WHEN** user runs `/specpower:build` on a change whose `.specpower.yaml` phase is `refined` and tasks.md contains plan/refine-phase coarse tasks
- **THEN** orchestrator reads `prompts/build/phase-a-plan.md`, reads existing tasks.md, finalized design.md, and delta specs, and rewrites tasks.md as a precise 2-5 minute atomic task plan following Superpowers writing-plans rules, then pauses for user confirmation

#### Scenario: Phase B subagent execution
- **WHEN** user confirms the rewritten task plan
- **THEN** orchestrator directs Claude Code to Read prompts/build/phase-b-worktree.md for isolation setup, then prompts/build/phase-b-execute.md for per-task TDD execution

#### Scenario: Phase prerequisite check
- **WHEN** user runs `/specpower:build` and `.specpower.yaml` phase is not `refined`
- **THEN** system SHALL refuse to proceed and suggest: "This change is in phase `<phase>`. Run `/specpower:refine` first to complete deep review before build."

## ADDED Requirements

### Requirement: Writing-plans rigor enforcement in Phase A
The system SHALL enforce Superpowers writing-plans rigor when rewriting tasks.md in Phase A: no placeholders, every code block complete, every command has expected output.

#### Scenario: Placeholder rejection
- **WHEN** Phase A rewrites tasks.md
- **THEN** the resulting tasks.md SHALL contain zero instances of "TBD", "similar to above", "fill in later", or other placeholder phrases

#### Scenario: Command verification inclusion
- **WHEN** a task involves running a command (npm install, npx tsc, git push, etc.)
- **THEN** the task SHALL include an explicit "Verify:" line with expected output or exit condition

#### Scenario: Code block completeness
- **WHEN** a task involves writing or modifying code
- **THEN** the task SHALL include complete file path and either the full code snippet or exact diff instructions

### Requirement: Grouping reorganization with user approval
Phase A MAY reorganize the top-level task group structure (`## N. <Group Name>`) if writing-plans analysis reveals a better organizational pattern (e.g., switching from "by technical layer" to "by end-to-end scenario"). Such reorganization MUST be explicitly reported and confirmed by the user.

#### Scenario: Reorganization proposal
- **WHEN** Phase A analysis suggests a different grouping is significantly better
- **THEN** system SHALL present: "Writing-plans analysis suggests reorganizing groups. Rationale: [...]. Old grouping → New grouping mapping: [...]. Choose: (A) accept reorganization, (B) keep original grouping and force writing-plans to fit, (C) I'll edit groups manually."

#### Scenario: No reorganization when original fits
- **WHEN** the plan/refine-phase grouping is already well-suited to writing-plans precision
- **THEN** Phase A SHALL keep the original top-level groups and only rewrite internal tasks

#### Scenario: Reorganization requires explicit user choice
- **WHEN** reorganization is proposed
- **THEN** Phase A SHALL NOT proceed until user explicitly picks one of the options; there is no silent default

### Requirement: Gap detection returns to refine
If Phase A determines that design.md lacks sufficient detail to produce precise executable tasks (e.g., missing error handling strategy, undefined interface, ambiguous data flow), it SHALL halt rewriting and instruct the user to return to refine to close the gap.

#### Scenario: Gap halts Phase A
- **WHEN** Phase A encounters a specific task it cannot write precisely because design.md is ambiguous or silent on the needed topic
- **THEN** system SHALL stop, report the gap clearly (specific task name, specific missing design decision needed), and suggest: "Run `/specpower:refine` to close this gap. Refine may update design.md, specs, or even proposal as needed."

#### Scenario: Partial rewrite preserved on halt
- **WHEN** Phase A halts due to a gap
- **THEN** any already-rewritten tasks SHALL be preserved in tasks.md (not discarded), and tasks not yet rewritten SHALL remain in their coarse form for user visibility

#### Scenario: Gap resolution resumes build
- **WHEN** refine completes closing the gap and user re-runs `/specpower:build`
- **THEN** Phase A SHALL re-examine tasks.md and continue rewriting from where it halted, not restart from scratch

### Requirement: Rewrite audit presentation
The system SHALL show the user a before/after summary when Phase A rewrites the tasks.

#### Scenario: Rewrite summary
- **WHEN** Phase A completes rewriting (without halting on gap)
- **THEN** system presents: previous task count, rewritten atomic task count, per-group expansion (e.g., "Group 1: 3 coarse tasks → 8 atomic tasks"), and flags any added/removed groups for user review

### Requirement: Phase transition to built
The system SHALL update `.specpower.yaml` `phase` to `built` only after Phase B completes all tasks successfully (all TDD cycles green, all per-task reviews confirmed).

#### Scenario: Phase transition after successful build
- **WHEN** Phase B finishes all tasks with green tests and user confirmation per task
- **THEN** system SHALL update `.specpower.yaml` `phase: built`

#### Scenario: Incomplete build does not transition phase
- **WHEN** Phase B is interrupted, has failing tests, or user stops early
- **THEN** phase SHALL remain `refined`; user can resume Phase B later
