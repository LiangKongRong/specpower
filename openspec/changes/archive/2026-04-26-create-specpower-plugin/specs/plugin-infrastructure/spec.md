## ADDED Requirements

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
