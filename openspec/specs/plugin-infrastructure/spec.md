# plugin-infrastructure Specification

## Purpose
TBD - created by archiving change create-specpower-plugin. Update Purpose after archive.
## Requirements
### Requirement: Unified npm package with CLI and plugin
The system SHALL be distributed as a single npm package (`specpower`) that provides both a CLI binary and a plugin/skills generator.

#### Scenario: Global installation
- **WHEN** user runs `npm install -g specpower`
- **THEN** the `specpower` CLI command is available globally in the terminal

#### Scenario: Project initialization
- **WHEN** user runs `specpower init` in a project directory
- **THEN** system generates `.claude/skills/specpower-*/SKILL.md` for all 10 commands, `.claude/commands/specpower/` for slash command aliases, `openspec/` directory structure, and `openspec/config.yaml`

#### Scenario: Direct embed alternative
- **WHEN** user cannot or does not want to install globally
- **THEN** skills and commands can be manually copied into a project's `.claude/` directory and function identically

### Requirement: Progressive prompt loading architecture
Each SKILL.md SHALL act as a lightweight orchestrator (~50-100 lines) that routes execution through stages by instructing Claude Code to Read detailed prompt files from the prompts/ directory.

#### Scenario: Orchestrator pattern
- **WHEN** a `/specpower:*` command is invoked
- **THEN** Claude Code loads the SKILL.md orchestrator, which directs it to Read stage-specific prompt files as needed, rather than containing all prompt content inline

#### Scenario: Stage isolation
- **WHEN** execution moves from one stage to another (e.g., plan → execute)
- **THEN** the new stage's prompt is loaded fresh via Read, keeping the execution context focused on the current stage

### Requirement: specpower CLI with redesigned command structure
The system SHALL provide a `specpower` CLI binary with commands redesigned for the specPower workflow, not copied from OpenSpec.

#### Scenario: CLI operations
- **WHEN** SKILL.md needs complex operations (delta merge, artifact status, validation)
- **THEN** it SHALL invoke `specpower` CLI commands which execute deterministic TypeScript logic

### Requirement: Ported OpenSpec core runtime
The system SHALL include 6 TypeScript modules ported from OpenSpec: artifact-graph, specs-apply/archive, validation, change-utils, parsers, and templates/instruction-loader.

#### Scenario: Self-contained execution
- **WHEN** any specpower CLI command runs
- **THEN** it SHALL NOT require OpenSpec CLI to be installed — all logic is ported into specPower

### Requirement: Full Superpowers skill integration
The system SHALL include all 14 Superpowers SKILL.md skills + 3 subagent prompts + all supporting reference materials, rewritten for specPower style with logic preserved.

#### Scenario: Rewritten content
- **WHEN** a prompt file contains content originating from Superpowers
- **THEN** skill names, file paths, and next-step references SHALL be updated to specPower equivalents while preserving the original logic, hard gates, and fail-stops

#### Scenario: Reference materials
- **WHEN** supporting materials (testing-anti-patterns, anthropic-best-practices, etc.) are referenced
- **THEN** they SHALL be available in prompts/reference/superpowers/ for on-demand Read loading

### Requirement: Prompts directory hybrid organization
The prompts/ directory SHALL use a hybrid organization: execution-layer files organized by command, source-layer reference files organized by origin.

#### Scenario: Execution layer access
- **WHEN** a SKILL.md orchestrator needs a stage prompt
- **THEN** it reads from prompts/<command>/<stage>.md (e.g., prompts/build/phase-a-plan.md)

#### Scenario: Cross-command shared prompts
- **WHEN** multiple commands need the same prompt (e.g., implementer-prompt)
- **THEN** it SHALL be in prompts/shared/ and referenced by path

### Requirement: code-review-graph integration for scan
The system SHALL include code-review-graph as an npm dependency for codebase analysis in the scan command.

#### Scenario: Scan dependency
- **WHEN** specpower is installed
- **THEN** code-review-graph SHALL be available as a dependency for `/specpower:scan` to use

### Requirement: Change phase metadata
The `.specpower.yaml` file in each change directory SHALL contain a `phase` field with one of four values: `plan`, `refined`, `built`, `archived`. The phase tracks workflow progression and enables gatekeeping.

#### Scenario: New change initialized with plan phase
- **WHEN** `specpower change new <name>` is executed
- **THEN** the generated `.specpower.yaml` SHALL contain `phase: plan` in addition to existing fields `schema` and `created`

#### Scenario: Phase field persisted across operations
- **WHEN** any CLI command reads `.specpower.yaml`
- **THEN** the `phase` field SHALL be preserved when the file is rewritten (the schema must support the field without stripping it)

#### Scenario: Invalid phase value rejected
- **WHEN** `.specpower.yaml` contains a `phase` value outside the enum (`plan`, `refined`, `built`, `archived`)
- **THEN** `specpower change status` and `specpower change archive` SHALL report an error indicating the invalid value

### Requirement: Archive requires built phase
The `specpower change archive` command SHALL refuse to archive a change whose `.specpower.yaml` phase is not `built`, unless the user explicitly passes `--force` to override the check.

#### Scenario: Archive blocked when phase is not built
- **WHEN** user runs `specpower change archive <name>` and the change's phase is `plan` or `refined`
- **THEN** CLI SHALL exit with non-zero status and report: "Cannot archive: change `<name>` is in phase `<phase>`, expected `built`. Complete `/specpower:build` first, or pass `--force` to archive anyway."

#### Scenario: Force flag bypasses check
- **WHEN** user runs `specpower change archive <name> --force`
- **THEN** CLI SHALL archive regardless of phase (useful for snap or legacy changes), but SHALL emit a warning noting the phase was bypassed

#### Scenario: Archive sets phase to archived
- **WHEN** archive completes successfully
- **THEN** the `.specpower.yaml` in the archive directory SHALL have `phase: archived` (the phase is moved along with the file)

### Requirement: Phase transition on workflow skill completion
SKILL orchestrators SHALL update `phase` when their workflow completes successfully with user confirmation.

#### Scenario: Refine skill updates phase
- **WHEN** `/specpower:refine` completes with user confirming final state
- **THEN** the orchestrator SHALL invoke a CLI subcommand (or file update) to set `.specpower.yaml` `phase: refined`

#### Scenario: Build skill updates phase
- **WHEN** `/specpower:build` Phase B completes all tasks with user per-task confirmation
- **THEN** the orchestrator SHALL invoke a CLI subcommand (or file update) to set `.specpower.yaml` `phase: built`

### Requirement: CLI command for phase manipulation
The `specpower` CLI SHALL provide a `change phase` subcommand to view and set phase manually for cases where the automated flow doesn't fit (e.g., legacy changes, recovery).

#### Scenario: Read phase
- **WHEN** user runs `specpower change phase <name>`
- **THEN** CLI outputs the current phase (plain text, for scripting) and exits 0

#### Scenario: Set phase
- **WHEN** user runs `specpower change phase <name> --set <phase>`
- **THEN** CLI SHALL validate the phase value, update `.specpower.yaml`, and confirm the change

#### Scenario: Invalid phase value on set
- **WHEN** user runs `specpower change phase <name> --set invalid`
- **THEN** CLI SHALL exit with error listing valid values

