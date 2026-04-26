# specpower-fix Specification

## Purpose
TBD - created by archiving change create-specpower-plugin. Update Purpose after archive.
## Requirements
### Requirement: Bugfix fast-track workflow
The system SHALL provide a single-command bugfix workflow that creates a lightweight change, debugs systematically against specs, applies TDD fix, reviews, tests, and auto-archives.

#### Scenario: Standard bugfix
- **WHEN** user runs `/specpower:fix "login fails on expired tokens"`
- **THEN** system creates a lightweight change, locates relevant specs for expected behavior, activates systematic-debugging, writes a reproducing test (RED), fixes (GREEN), runs code review, tests, and archives

#### Scenario: Urgent mode
- **WHEN** user runs `/specpower:fix --urgent "production crash"`
- **THEN** system skips review step, marks the change with URGENT flag, and generates a TODO for follow-up review

### Requirement: Specs-guided debugging
The system SHALL reference main specs during debugging to understand expected behavior rather than guessing.

#### Scenario: Specs as debugging context
- **WHEN** systematic debugging activates
- **THEN** system reads relevant specs from openspec/specs/ to understand what the correct behavior SHOULD be, comparing against actual behavior

