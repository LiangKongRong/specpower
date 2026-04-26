## ADDED Requirements

### Requirement: Brownfield project scanning via code-review-graph
The system SHALL scan an existing codebase using code-review-graph for analysis, then convert the results into an OpenSpec specs baseline.

#### Scenario: Full project scan
- **WHEN** user runs `/specpower:scan` in a project directory
- **THEN** system invokes code-review-graph to analyze the codebase, converts the analysis output into `openspec/specs/` with one spec file per detected capability, generates `openspec/config.yaml` with project context, and creates `openspec/SCAN_REPORT.md` summarizing findings

#### Scenario: Confidence-level tagging
- **WHEN** system generates spec requirements from code-review-graph output
- **THEN** each requirement SHALL be tagged with a confidence level: HIGH (test-backed or explicit behavior), MEDIUM (inferred from code, no tests), or LOW (speculative, needs human confirmation)

### Requirement: Module-scoped incremental scanning
The system SHALL support scanning individual modules via `--module <name>` flag for large projects.

#### Scenario: Single module scan
- **WHEN** user runs `/specpower:scan --module auth`
- **THEN** system scans only the specified module and generates/updates its specs without affecting other module specs

#### Scenario: Parallel module scanning
- **WHEN** scanning multiple modules in a large project
- **THEN** system SHALL use subagent parallel dispatch to scan modules concurrently

### Requirement: Scan output generation
The system SHALL generate three outputs: specs directory, config.yaml, and SCAN_REPORT.md.

#### Scenario: Config generation
- **WHEN** scan completes
- **THEN** `openspec/config.yaml` SHALL contain detected tech stack, architecture type, testing framework, and coding conventions

#### Scenario: Report generation with user confirmation
- **WHEN** SCAN_REPORT.md is generated
- **THEN** system SHALL present findings per-module to the user for confirmation or correction before locking as Source of Truth
