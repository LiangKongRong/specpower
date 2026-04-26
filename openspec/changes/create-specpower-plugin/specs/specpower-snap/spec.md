## ADDED Requirements

### Requirement: Post-hoc change documentation
The system SHALL generate a complete OpenSpec change record from git diff analysis, retroactively documenting changes that were made without following the standard workflow.

#### Scenario: Git diff analysis
- **WHEN** user runs `/specpower:snap "refactored auth module"`
- **THEN** system analyzes git diff + git log, infers affected specs, generates a complete change with all tasks marked done, and presents to user for confirmation

#### Scenario: Delta specs inference
- **WHEN** snap analyzes code changes
- **THEN** system SHALL infer which specs are affected and generate appropriate delta specs (ADDED/MODIFIED/REMOVED) with user confirmation

### Requirement: Snap archiving
The system SHALL archive the generated change and merge inferred delta specs to main specs after user confirmation.

#### Scenario: Archive after confirmation
- **WHEN** user confirms the generated change record
- **THEN** system archives the change and updates main specs, maintaining Source of Truth consistency
