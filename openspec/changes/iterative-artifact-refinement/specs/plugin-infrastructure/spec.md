## ADDED Requirements

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
