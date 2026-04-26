## ADDED Requirements

### Requirement: Change archiving with specs merging
The system SHALL archive a completed change by merging delta specs into main specs and moving the change to the archive directory.

#### Scenario: Delta to main merge
- **WHEN** user runs `/specpower:done` on a verified change
- **THEN** system applies ADDED/MODIFIED/REMOVED/RENAMED operations from delta specs to main openspec/specs/, then moves the change to openspec/changes/archive/

#### Scenario: Git branch cleanup options
- **WHEN** archiving completes
- **THEN** system presents 4 options: merge locally, push and create PR, keep as-is, or discard — following Superpowers finishing-a-development-branch flow

### Requirement: Pre-archive verification
The system SHALL verify all tests pass before presenting archive options.

#### Scenario: Test gate
- **WHEN** user initiates done
- **THEN** system SHALL run tests first; archive options are only presented after tests pass
