## ADDED Requirements

### Requirement: Two-phase build with progressive prompt loading
The system SHALL execute builds in two phases using the progressive loading pattern: SKILL.md orchestrates, detailed prompts loaded per stage via Read.

#### Scenario: Phase A plan generation
- **WHEN** user runs `/specpower:build` on a change with design.md and specs
- **THEN** orchestrator SKILL.md directs Claude Code to Read prompts/build/phase-a-plan.md, which generates tasks.md with 2-5 minute atomic tasks containing TDD steps, and pauses for user confirmation

#### Scenario: Phase B subagent execution
- **WHEN** user confirms the task plan
- **THEN** orchestrator directs Claude Code to Read prompts/build/phase-b-worktree.md for isolation setup, then prompts/build/phase-b-execute.md for per-task TDD execution

### Requirement: Task atomicity and TDD enforcement
Each task SHALL be atomic (2-5 minutes), self-contained, and follow the test-driven development cycle.

#### Scenario: TDD per task
- **WHEN** a subagent executes a task
- **THEN** it SHALL follow the rewritten TDD prompt: write failing test first (RED), implement minimal code (GREEN), then refactor (REFACTOR)

#### Scenario: No placeholder tolerance
- **WHEN** tasks.md is generated
- **THEN** it SHALL contain zero placeholders — every code block complete, every command exact

### Requirement: Worktree isolation
The system SHALL create an isolated git worktree for build execution.

#### Scenario: Worktree setup
- **WHEN** Phase B begins
- **THEN** system reads prompts/build/phase-b-worktree.md and creates a new git worktree, installs dependencies, and runs tests to establish a clean baseline

### Requirement: Subagent isolation with per-task user confirmation
Each task subagent SHALL receive isolated context and the user SHALL confirm review results before proceeding to the next task.

#### Scenario: Two-phase review per task
- **WHEN** a subagent completes a task
- **THEN** orchestrator loads prompts/shared/spec-reviewer-prompt.md for spec compliance, then prompts/shared/code-reviewer-prompt.md for code quality

#### Scenario: User confirmation gate
- **WHEN** review results are presented for a task
- **THEN** system SHALL wait for user confirmation before starting the next task

### Requirement: CLI integration for task tracking
The system SHALL use `specpower` CLI commands to track task progress.

#### Scenario: Task status via CLI
- **WHEN** a task is completed
- **THEN** SKILL.md orchestrator invokes specpower CLI to update task checkbox status in tasks.md
